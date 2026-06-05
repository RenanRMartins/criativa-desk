import { Router, type Request, type Response } from 'express'
import { google } from 'googleapis'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()

const REDIRECT_URI = `${process.env.BACKEND_URL ?? 'https://criativa-desk-production.up.railway.app'}/api/social/google/callback`

function oauthClient() {
  return new google.auth.OAuth2(
    process.env['GAUTH_ID'],
    process.env['GAUTH_SEC'],
    REDIRECT_URI,
  )
}

const SCOPES: Record<string, string[]> = {
  YOUTUBE: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  GOOGLE_BUSINESS: [
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
}

// GET /api/social/google/auth-url?network=YOUTUBE&projectId=xxx
// Returns { url } — frontend faz window.location.href = url
router.get('/google/auth-url', authMiddleware, (req: AuthRequest, res: Response) => {
  const network = (req.query.network as string ?? 'YOUTUBE').toUpperCase()
  const projectId = req.query.projectId as string

  if (!projectId) { res.status(400).json({ message: 'projectId obrigatório' }); return }

  const state = Buffer.from(JSON.stringify({ network, projectId, userId: req.userId })).toString('base64url')
  const url = oauthClient().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES[network] ?? SCOPES.YOUTUBE,
    state,
    prompt: 'consent',
  })

  res.json({ url })
})

// GET /api/social/google/callback (redirect do Google)
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000'

  if (error || !code || !state) {
    res.redirect(`${frontend}/settings?oauth_error=cancelled`); return
  }

  try {
    const { network, projectId, userId } = JSON.parse(Buffer.from(state, 'base64url').toString())
    const client = oauthClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    let profileId = userId as string
    let profileName = 'Conta conectada'
    let profileAvatar: string | undefined

    if (network === 'YOUTUBE') {
      try {
        const yt = google.youtube({ version: 'v3', auth: client })
        const ch = await yt.channels.list({ part: ['snippet'], mine: true })
        const item = ch.data.items?.[0]
        if (item) {
          profileId = item.id ?? userId
          profileName = item.snippet?.title ?? 'Canal YouTube'
          profileAvatar = item.snippet?.thumbnails?.default?.url ?? undefined
        }
      } catch { /* usa defaults */ }
    } else {
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: client })
        const me = await oauth2.userinfo.get()
        profileId = me.data.id ?? userId
        profileName = me.data.name ?? 'Google Business'
        profileAvatar = me.data.picture ?? undefined
      } catch { /* usa defaults */ }
    }

    // Upsert — remove existing and recreate (sem unique composto no schema)
    await prisma.socialAccount.deleteMany({
      where: { projectId, provider: network as never },
    })
    await prisma.socialAccount.create({
      data: {
        projectId,
        provider: network as never,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        profileId,
        profileName,
        profileAvatar,
        status: 'CONNECTED',
      },
    })

    res.redirect(`${frontend}/settings?oauth_success=${network.toLowerCase()}`)
  } catch (err) {
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    console.error('OAuth error:', err)
    res.redirect(`${frontend}/settings?oauth_error=failed`)
  }
})

// ─── LINKEDIN ────────────────────────────────────────────────────────────────

const LI_REDIRECT = `${process.env.BACKEND_URL ?? 'https://criativa-desk-production.up.railway.app'}/api/social/linkedin/callback`

router.get('/linkedin/auth-url', authMiddleware, (req: AuthRequest, res: Response) => {
  const projectId = req.query.projectId as string
  if (!projectId) { res.status(400).json({ message: 'projectId obrigatório' }); return }

  const state = Buffer.from(JSON.stringify({ projectId, userId: req.userId })).toString('base64url')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env['LI_ID'] ?? '',
    redirect_uri: LI_REDIRECT,
    scope: 'openid profile email',
    state,
  })
  res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params}` })
})

router.get('/linkedin/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  if (error || !code || !state) { res.redirect(`${frontend}/settings?oauth_error=cancelled`); return }

  try {
    const { projectId, userId } = JSON.parse(Buffer.from(state, 'base64url').toString())

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: LI_REDIRECT,
        client_id: process.env['LI_ID'] ?? '',
        client_secret: process.env['LI_SEC'] ?? '',
      }),
    })
    const tokenData = await tokenRes.json() as Record<string, string>
    const accessToken = tokenData.access_token

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profile = await profileRes.json() as Record<string, string>

    await prisma.socialAccount.deleteMany({ where: { projectId, provider: 'LINKEDIN' } })
    await prisma.socialAccount.create({
      data: {
        projectId,
        provider: 'LINKEDIN',
        accessToken,
        profileId: profile.sub ?? userId,
        profileName: profile.name ?? 'LinkedIn',
        profileAvatar: profile.picture,
        status: 'CONNECTED',
      },
    })
    res.redirect(`${frontend}/settings?oauth_success=linkedin`)
  } catch (err) {
    console.error('LinkedIn OAuth error:', err)
    res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/settings?oauth_error=failed`)
  }
})

// GET /api/social/accounts?projectId=xxx
router.get('/accounts', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query as { projectId: string }
  if (!projectId) { res.json([]); return }
  const accounts = await prisma.socialAccount.findMany({
    where: { projectId, status: 'CONNECTED' },
    select: { id: true, provider: true, profileName: true, profileAvatar: true, status: true },
  })
  res.json(accounts)
})

// DELETE /api/social/accounts/:id
router.delete('/accounts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.socialAccount.delete({ where: { id: req.params.id as string } })
  res.json({ message: 'Desconectado' })
})

export default router
