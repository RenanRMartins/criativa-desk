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

// Multi-conta: se o mesmo perfil (profileId) reconectar, atualiza tokens;
// perfis diferentes do mesmo provider viram contas adicionais no projeto
async function saveSocialAccount(data: {
  projectId: string
  provider: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  profileId: string
  profileName: string
  profileAvatar?: string
}) {
  const existing = await prisma.socialAccount.findFirst({
    where: { projectId: data.projectId, provider: data.provider as never, profileId: data.profileId },
  })
  if (existing) {
    return prisma.socialAccount.update({
      where: { id: existing.id },
      data: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? existing.refreshToken,
        expiresAt: data.expiresAt,
        profileName: data.profileName,
        profileAvatar: data.profileAvatar,
        status: 'CONNECTED',
      },
    })
  }
  return prisma.socialAccount.create({
    data: { ...data, provider: data.provider as never, status: 'CONNECTED' },
  })
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

    await saveSocialAccount({
      projectId,
      provider: network,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      profileId,
      profileName,
      profileAvatar,
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

    await saveSocialAccount({
      projectId,
      provider: 'LINKEDIN',
      accessToken,
      profileId: profile.sub ?? userId,
      profileName: profile.name ?? 'LinkedIn',
      profileAvatar: profile.picture,
    })
    res.redirect(`${frontend}/settings?oauth_success=linkedin`)
  } catch (err) {
    console.error('LinkedIn OAuth error:', err)
    res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/settings?oauth_error=failed`)
  }
})

// ─── META (Facebook + Instagram) ─────────────────────────────────────────────

const META_REDIRECT = `${process.env.BACKEND_URL ?? 'https://criativa-desk-production.up.railway.app'}/api/social/meta/callback`
const META_SCOPES: Record<string, string> = {
  FACEBOOK: 'public_profile',
  INSTAGRAM: 'public_profile',
}

router.get('/meta/auth-url', authMiddleware, (req: AuthRequest, res: Response) => {
  const network = (req.query.network as string ?? 'FACEBOOK').toUpperCase()
  const projectId = req.query.projectId as string
  if (!projectId) { res.status(400).json({ message: 'projectId obrigatório' }); return }

  const state = Buffer.from(JSON.stringify({ network, projectId, userId: req.userId })).toString('base64url')
  const params = new URLSearchParams({
    client_id: process.env['META_ID'] ?? '',
    redirect_uri: META_REDIRECT,
    scope: META_SCOPES[network] ?? META_SCOPES.FACEBOOK,
    response_type: 'code',
    state,
  })
  res.json({ url: `https://www.facebook.com/v19.0/dialog/oauth?${params}` })
})

router.get('/meta/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  if (error || !code || !state) { res.redirect(`${frontend}/settings?oauth_error=cancelled`); return }

  try {
    const { network, projectId, userId } = JSON.parse(Buffer.from(state, 'base64url').toString())

    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env['META_ID'] ?? '',
        client_secret: process.env['META_SEC'] ?? '',
        redirect_uri: META_REDIRECT,
        code,
      })
    )
    const tokenData = await tokenRes.json() as Record<string, string>
    const accessToken = tokenData.access_token

    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,picture&access_token=${accessToken}`
    )
    const profile = await profileRes.json() as Record<string, unknown>

    await saveSocialAccount({
      projectId,
      provider: network,
      accessToken,
      profileId: (profile.id as string) ?? userId,
      profileName: (profile.name as string) ?? network,
      profileAvatar: (profile.picture as Record<string, unknown>)?.data
        ? ((profile.picture as Record<string, Record<string, string>>).data.url) : undefined,
    })
    res.redirect(`${frontend}/settings?oauth_success=${network.toLowerCase()}`)
  } catch (err) {
    console.error('Meta OAuth error:', err)
    res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/settings?oauth_error=failed`)
  }
})

// ─── TIKTOK ───────────────────────────────────────────────────────────────────

// rota neutra: o revisor do TikTok exige que a redirect URI não contenha "tiktok"
const TT_REDIRECT = `${process.env.BACKEND_URL ?? 'https://criativa-desk-production.up.railway.app'}/api/social/clip/callback`

router.get('/tiktok/auth-url', authMiddleware, (req: AuthRequest, res: Response) => {
  const projectId = req.query.projectId as string
  if (!projectId) { res.status(400).json({ message: 'projectId obrigatório' }); return }

  const state = Buffer.from(JSON.stringify({ projectId, userId: req.userId })).toString('base64url')
  const params = new URLSearchParams({
    client_key: process.env['TT_KEY'] ?? '',
    response_type: 'code',
    scope: 'user.info.basic',
    redirect_uri: TT_REDIRECT,
    state,
  })
  res.json({ url: `https://www.tiktok.com/v2/auth/authorize/?${params}` })
})

router.get('/clip/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  if (error || !code || !state) { res.redirect(`${frontend}/settings?oauth_error=cancelled`); return }

  try {
    const { projectId, userId } = JSON.parse(Buffer.from(state, 'base64url').toString())

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env['TT_KEY'] ?? '',
        client_secret: process.env['TT_SEC'] ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: TT_REDIRECT,
      }),
    })
    const tokenData = await tokenRes.json() as Record<string, unknown>
    const accessToken = (tokenData.access_token ?? tokenData.data) as string

    const profileRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const profileData = await profileRes.json() as Record<string, unknown>
    const profile = (profileData.data as Record<string, unknown>)?.user as Record<string, string> ?? {}

    await saveSocialAccount({
      projectId,
      provider: 'TIKTOK',
      accessToken: String(accessToken),
      profileId: profile.open_id ?? userId,
      profileName: profile.display_name ?? 'TikTok',
      profileAvatar: profile.avatar_url,
    })
    res.redirect(`${frontend}/settings?oauth_success=tiktok`)
  } catch (err) {
    console.error('TikTok OAuth error:', err)
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
    orderBy: [{ provider: 'asc' }, { profileName: 'asc' }],
  })
  res.json(accounts)
})

// DELETE /api/social/accounts/:id
router.delete('/accounts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.socialAccount.delete({ where: { id: req.params.id as string } })
  res.json({ message: 'Desconectado' })
})

export default router
