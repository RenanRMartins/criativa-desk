import { Router, type Request, type Response } from 'express'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()

const CANVA_REDIRECT = `${process.env.BACKEND_URL ?? 'https://criativa-desk-production.up.railway.app'}/api/canva/callback`
const CANVA_SCOPES = 'design:content:read design:content:write design:meta:read profile:read'

function basicAuth() {
  return Buffer.from(`${process.env['CV_ID'] ?? ''}:${process.env['CV_SEC'] ?? ''}`).toString('base64')
}

// Renova o token se estiver a menos de 60s de expirar (tokens do Canva duram ~4h)
async function getCanvaToken(userId: string): Promise<string | null> {
  const conn = await prisma.appConnection.findUnique({
    where: { userId_provider: { userId, provider: 'CANVA' } },
  })
  if (!conn) return null

  const stillValid = conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 60_000
  if (stillValid || !conn.refreshToken) return conn.accessToken

  try {
    const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth()}`,
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refreshToken }),
    })
    if (!res.ok) return conn.accessToken
    const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number }
    const updated = await prisma.appConnection.update({
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

// GET /api/canva/auth-url
router.get('/auth-url', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!process.env['CV_ID']) {
    res.status(503).json({ message: 'Canva não configurado (CV_ID/CV_SEC ausentes)' })
    return
  }
  // PKCE obrigatório no Canva Connect
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = Buffer.from(JSON.stringify({ userId: req.userId, verifier })).toString('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env['CV_ID'] ?? '',
    scope: CANVA_SCOPES,
    redirect_uri: CANVA_REDIRECT,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })
  res.json({ url: `https://www.canva.com/api/oauth/authorize?${params}` })
})

// GET /api/canva/callback (redirect do Canva)
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  if (error || !code || !state) { res.redirect(`${frontend}/designdesk?canva_error=cancelled`); return }

  try {
    const { userId, verifier } = JSON.parse(Buffer.from(state, 'base64url').toString())

    const tokenRes = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth()}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: CANVA_REDIRECT,
      }),
    })
    const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number }
    if (!tokens.access_token) throw new Error('Canva não retornou access_token')

    let profileName: string | undefined
    try {
      const me = await fetch('https://api.canva.com/rest/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      profileName = ((await me.json()) as { profile?: { display_name?: string } }).profile?.display_name
    } catch { /* usa undefined */ }

    await prisma.appConnection.upsert({
      where: { userId_provider: { userId, provider: 'CANVA' } },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        profileName,
      },
      create: {
        userId,
        provider: 'CANVA',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        profileName,
      },
    })
    res.redirect(`${frontend}/designdesk?canva_success=1`)
  } catch (err) {
    console.error('Canva OAuth error:', err)
    res.redirect(`${frontend}/designdesk?canva_error=failed`)
  }
})

// GET /api/canva/status
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const conn = await prisma.appConnection.findUnique({
    where: { userId_provider: { userId: req.userId!, provider: 'CANVA' } },
    select: { profileName: true },
  })
  res.json({ connected: !!conn, profileName: conn?.profileName ?? null })
})

// POST /api/canva/create-design { title, width, height }
router.post('/create-design', authMiddleware, async (req: AuthRequest, res: Response) => {
  const token = await getCanvaToken(req.userId!)
  if (!token) { res.status(404).json({ message: 'Canva não conectado' }); return }

  const { title, width, height } = (req.body ?? {}) as { title?: string; width?: number; height?: number }
  const r = await fetch('https://api.canva.com/rest/v1/designs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      design_type: { type: 'custom', width: width ?? 1080, height: height ?? 1080 },
      title: title ?? 'Arte CrIAtiva Desk',
    }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({})) as { message?: string }
    res.status(r.status).json({ message: err.message ?? 'Erro ao criar design no Canva' })
    return
  }
  const data = await r.json() as { design?: { id: string; urls?: { edit_url?: string; view_url?: string } } }
  res.json({
    id: data.design?.id,
    editUrl: data.design?.urls?.edit_url ?? null,
    viewUrl: data.design?.urls?.view_url ?? null,
  })
})

// DELETE /api/canva
router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.appConnection.deleteMany({ where: { userId: req.userId!, provider: 'CANVA' } })
  res.json({ message: 'Desconectado' })
})

export default router
