import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()

const SPOTIFY_REDIRECT = `${process.env.BACKEND_URL ?? 'https://criativa-desk-production.up.railway.app'}/api/music/spotify/callback`
const SPOTIFY_SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-private'

function basicAuth() {
  return Buffer.from(`${process.env['SPOT_ID'] ?? ''}:${process.env['SPOT_SEC'] ?? ''}`).toString('base64')
}

// Renova o token se estiver a menos de 60s de expirar
async function getSpotifyToken(userId: string): Promise<string | null> {
  const conn = await prisma.musicConnection.findUnique({
    where: { userId_provider: { userId, provider: 'SPOTIFY' } },
  })
  if (!conn) return null

  const stillValid = conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 60_000
  if (stillValid || !conn.refreshToken) return conn.accessToken

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth()}`,
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refreshToken }),
    })
    if (!res.ok) return conn.accessToken
    const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string }
    const updated = await prisma.musicConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? conn.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    })
    return updated.accessToken
  } catch {
    return conn.accessToken
  }
}

// GET /api/music/spotify/auth-url
router.get('/spotify/auth-url', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!process.env['SPOT_ID']) {
    res.status(503).json({ message: 'Spotify não configurado (SPOT_ID/SPOT_SEC ausentes)' })
    return
  }
  const state = Buffer.from(JSON.stringify({ userId: req.userId })).toString('base64url')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env['SPOT_ID'] ?? '',
    scope: SPOTIFY_SCOPES,
    redirect_uri: SPOTIFY_REDIRECT,
    state,
  })
  res.json({ url: `https://accounts.spotify.com/authorize?${params}` })
})

// GET /api/music/spotify/callback (redirect do Spotify)
router.get('/spotify/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  if (error || !code || !state) { res.redirect(`${frontend}/?music_error=cancelled`); return }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64url').toString())

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth()}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT,
      }),
    })
    const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number }

    let profileName: string | undefined
    try {
      const me = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      profileName = ((await me.json()) as { display_name?: string }).display_name
    } catch { /* usa undefined */ }

    await prisma.musicConnection.upsert({
      where: { userId_provider: { userId, provider: 'SPOTIFY' } },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        profileName,
      },
      create: {
        userId,
        provider: 'SPOTIFY',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        profileName,
      },
    })
    res.redirect(`${frontend}/?music_success=spotify`)
  } catch (err) {
    console.error('Spotify OAuth error:', err)
    res.redirect(`${frontend}/?music_error=failed`)
  }
})

// GET /api/music/status
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const conn = await prisma.musicConnection.findUnique({
    where: { userId_provider: { userId: req.userId!, provider: 'SPOTIFY' } },
    select: { profileName: true },
  })
  res.json({ connected: !!conn, profileName: conn?.profileName ?? null })
})

// GET /api/music/spotify/now-playing
router.get('/spotify/now-playing', authMiddleware, async (req: AuthRequest, res: Response) => {
  const token = await getSpotifyToken(req.userId!)
  if (!token) { res.status(404).json({ message: 'Spotify não conectado' }); return }

  const r = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (r.status === 204) { res.json({ playing: false, track: null }); return }
  if (!r.ok) { res.status(r.status).json({ message: 'Erro ao consultar o Spotify' }); return }

  const data = await r.json() as {
    is_playing: boolean
    progress_ms: number
    device?: { volume_percent?: number }
    item?: {
      name: string
      duration_ms: number
      artists: { name: string }[]
      album: { images: { url: string }[] }
      external_urls?: { spotify?: string }
    }
  }
  res.json({
    playing: data.is_playing,
    progressMs: data.progress_ms,
    volume: data.device?.volume_percent ?? null,
    track: data.item ? {
      title: data.item.name,
      artist: data.item.artists.map(a => a.name).join(', '),
      cover: data.item.album.images.at(-1)?.url ?? data.item.album.images[0]?.url ?? null,
      durationMs: data.item.duration_ms,
      url: data.item.external_urls?.spotify ?? null,
    } : null,
  })
})

// POST /api/music/spotify/control { action: 'play'|'pause'|'next'|'previous'|'volume', volume? }
router.post('/spotify/control', authMiddleware, async (req: AuthRequest, res: Response) => {
  const token = await getSpotifyToken(req.userId!)
  if (!token) { res.status(404).json({ message: 'Spotify não conectado' }); return }

  const { action, volume } = (req.body ?? {}) as { action?: string; volume?: number }
  const calls: Record<string, { method: string; path: string }> = {
    play: { method: 'PUT', path: '/me/player/play' },
    pause: { method: 'PUT', path: '/me/player/pause' },
    next: { method: 'POST', path: '/me/player/next' },
    previous: { method: 'POST', path: '/me/player/previous' },
    volume: { method: 'PUT', path: `/me/player/volume?volume_percent=${Math.max(0, Math.min(100, volume ?? 50))}` },
  }
  const call = action ? calls[action] : undefined
  if (!call) { res.status(400).json({ message: 'Ação inválida' }); return }

  const r = await fetch(`https://api.spotify.com/v1${call.path}`, {
    method: call.method,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (r.status === 403) {
    res.status(403).json({ message: 'Controle remoto exige Spotify Premium' })
    return
  }
  if (r.status === 404) {
    res.status(404).json({ message: 'Nenhum dispositivo ativo — dê o play no app do Spotify primeiro' })
    return
  }
  res.json({ ok: r.ok })
})

// DELETE /api/music/spotify
router.delete('/spotify', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.musicConnection.deleteMany({ where: { userId: req.userId!, provider: 'SPOTIFY' } })
  res.json({ message: 'Desconectado' })
})

export default router
