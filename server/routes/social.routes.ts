import { randomBytes } from 'node:crypto'
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
    // w_member_social é o que autoriza publicar em nome do membro
    scope: 'openid profile email w_member_social',
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
// Publicar exige App Review aprovado na Meta; sem isso o consentimento volta só com public_profile.
// business_management é obrigatório quando a Página pertence a um portfólio empresarial: sem ele
// /me/accounts volta VAZIO mesmo com pages_show_list concedida (confirmado no Graph API Explorer —
// com a permissão as Páginas aparecem, sem ela não). Vale para o config_id também: a permissão
// precisa estar na configuração do Login para Empresas, senão o scope daqui nem é enviado.
const META_SCOPES: Record<string, string> = {
  FACEBOOK: 'public_profile,business_management,pages_show_list,pages_manage_posts,pages_read_engagement',
  INSTAGRAM: 'public_profile,business_management,pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement',
}

// IDs das configurações do Login para Empresas (painel da Meta → Configurations).
// Sem eles o fluxo cai no scope tradicional, do app antigo.
const META_CONFIG_IDS: Record<string, string | undefined> = {
  FACEBOOK: process.env['META_CONFIG_FACEBOOK'],
  INSTAGRAM: process.env['META_CONFIG_INSTAGRAM'],
}

type MetaPage = {
  id: string
  name: string
  access_token: string
  picture?: { data?: { url?: string } }
  instagram_business_account?: { id: string; username?: string; profile_picture_url?: string }
}

const META_PAGE_FIELDS = 'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}'

async function graphGet(path: string, token: string) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}${sep}access_token=${encodeURIComponent(token)}`)
  const text = await res.text()
  let json: { data?: unknown[] } | null = null
  try { json = JSON.parse(text) } catch { /* corpo não-JSON fica só em text */ }
  return { ok: res.ok, status: res.status, text, json }
}

// Quando nenhuma Página aparece, o token é descartado e não sobra nada para
// investigar depois. Então registramos aqui mesmo o que ele é e o que a Meta
// de fato concedeu — granular_scopes diz a quais Páginas o consentimento valeu.
async function diagnosticarTokenMeta(userToken: string) {
  // me/accounts sem fields: separa "token não enxerga Página nenhuma" de
  // "um dos fields pedidos é que está barrando a resposta"
  for (const rota of ['me?fields=id,name', 'me/accounts', 'me/permissions', 'me/businesses?fields=id,name']) {
    const r = await graphGet(rota, userToken)
    console.log(`[meta:diag] /${rota} → HTTP ${r.status} ${r.text.slice(0, 600)}`)
  }

  const appId = process.env['META_ID']
  const appSecret = process.env['META_SEC']
  if (!appId || !appSecret) { console.log('[meta:diag] META_ID/META_SEC ausentes — debug_token não consultado'); return }

  const dbg = await graphGet(`debug_token?input_token=${encodeURIComponent(userToken)}`, `${appId}|${appSecret}`)
  console.log(`[meta:diag] debug_token → HTTP ${dbg.status} ${dbg.text.slice(0, 1200)}`)
}

// Renan administra a Página pelo portfólio empresarial, não por papel pessoal.
// /me/accounts lista Páginas com papel direto, então pode voltar vazio mesmo com
// tudo concedido — nesse caso as Páginas estão penduradas no portfólio.
async function paginasDoPortfolio(userToken: string): Promise<MetaPage[]> {
  const negocios = await graphGet('me/businesses?fields=id,name', userToken)
  const lista = (negocios.json?.data ?? []) as { id: string; name: string }[]
  if (!lista.length) { console.log('[meta] nenhum portfólio empresarial visível para este token'); return [] }

  const encontradas: MetaPage[] = []
  for (const negocio of lista) {
    for (const borda of ['owned_pages', 'client_pages']) {
      const r = await graphGet(`${negocio.id}/${borda}?fields=${META_PAGE_FIELDS}`, userToken)
      const paginas = (r.json?.data ?? []) as MetaPage[]
      console.log(`[meta] portfólio ${negocio.name}/${borda} → ` +
        (r.ok ? `${paginas.length} Página(s): ${paginas.map(p => `${p.name}${p.access_token ? '' : ' (SEM token)'}`).join(', ')}`
              : `HTTP ${r.status} ${r.text.slice(0, 250)}`))
      for (const p of paginas) {
        if (p.access_token && !encontradas.some(e => e.id === p.id)) encontradas.push(p)
      }
    }
  }
  return encontradas
}

type AlvoMeta = {
  profileId: string
  provider: 'FACEBOOK' | 'INSTAGRAM'
  nome: string
  avatar?: string
  paginaNome: string
  token: string          // token da Página — nunca sai numa resposta HTTP
}

/**
 * Quem gere várias contas (a própria, a da clínica, as dos clientes) recebe TODAS
 * as Páginas que administra numa autorização só. Salvar todas no projeto ativo
 * encheria cada cliente com as contas dos outros, então primeiro listamos e a
 * pessoa escolhe quais pertencem a este projeto.
 */
function alvosDasPaginas(network: string, pages: MetaPage[]): AlvoMeta[] {
  const alvos: AlvoMeta[] = []
  for (const page of pages) {
    if (network === 'INSTAGRAM') {
      const ig = page.instagram_business_account
      if (!ig) { console.log(`[meta] Página ${page.name} não tem conta Instagram Business vinculada`); continue }
      alvos.push({
        profileId: ig.id, provider: 'INSTAGRAM', nome: ig.username ?? page.name,
        avatar: ig.profile_picture_url, paginaNome: page.name, token: page.access_token,
      })
    } else {
      alvos.push({
        profileId: page.id, provider: 'FACEBOOK', nome: page.name,
        avatar: page.picture?.data?.url, paginaNome: page.name, token: page.access_token,
      })
    }
  }
  return alvos
}

async function listarAlvosMeta(network: string, userToken: string) {
  const res = await graphGet(`me/accounts?fields=${META_PAGE_FIELDS}`, userToken)
  if (!res.ok) console.error(`[meta] /me/accounts falhou (HTTP ${res.status}): ${res.text.slice(0, 300)}`)

  let pages = (res.json?.data ?? []) as MetaPage[]
  console.log(`[meta] ${network}: /me/accounts devolveu ${pages.length} Página(s)` +
    (pages.length ? ` — ${pages.map(p => `${p.name}${p.instagram_business_account ? ' (com IG)' : ''}`).join(', ')}` : ''))

  if (pages.length === 0) {
    await diagnosticarTokenMeta(userToken)
    pages = await paginasDoPortfolio(userToken)
    console.log(`[meta] ${network}: portfólio devolveu ${pages.length} Página(s)`)
  }

  return { alvos: alvosDasPaginas(network, pages), paginas: pages.length }
}

// O accessToken guardado é o token da Página — é ele que publica.
async function salvarAlvosMeta(projectId: string, alvos: AlvoMeta[]) {
  for (const a of alvos) {
    await saveSocialAccount({
      projectId,
      provider: a.provider,
      accessToken: a.token,
      profileId: a.profileId,
      profileName: a.nome,
      profileAvatar: a.avatar,
    })
  }
  return alvos.length
}

// Ponte entre o callback do OAuth e a tela de escolha. Em memória de propósito:
// são tokens de publicação, e a escolha acontece em segundos. Se o processo
// reiniciar no meio, a pessoa reconecta — melhor que persistir token à toa.
const META_PENDENTES = new Map<string, {
  userId: string; projectId: string; network: string; alvos: AlvoMeta[]; expira: number
}>()
const PENDENTE_TTL = 10 * 60 * 1000

function guardarPendente(dados: { userId: string; projectId: string; network: string; alvos: AlvoMeta[] }) {
  for (const [id, p] of META_PENDENTES) if (p.expira < Date.now()) META_PENDENTES.delete(id)
  const id = randomBytes(16).toString('hex')
  META_PENDENTES.set(id, { ...dados, expira: Date.now() + PENDENTE_TTL })
  return id
}

function lerPendente(id: string, userId: string) {
  const p = META_PENDENTES.get(id)
  if (!p || p.expira < Date.now()) { META_PENDENTES.delete(id); return null }
  return p.userId === userId ? p : null
}

router.get('/meta/auth-url', authMiddleware, (req: AuthRequest, res: Response) => {
  const network = (req.query.network as string ?? 'FACEBOOK').toUpperCase()
  const projectId = req.query.projectId as string
  if (!projectId) { res.status(400).json({ message: 'projectId obrigatório' }); return }

  const state = Buffer.from(JSON.stringify({ network, projectId, userId: req.userId })).toString('base64url')
  const params = new URLSearchParams({
    client_id: process.env['META_ID'] ?? '',
    redirect_uri: META_REDIRECT,
    response_type: 'code',
    state,
  })

  // App com casos de uso de Página/Instagram usa Login para Empresas: as permissões
  // vivem numa "configuração" do painel e a URL leva o config_id no lugar do scope.
  const configId = META_CONFIG_IDS[network]
  if (configId) params.set('config_id', configId)
  else params.set('scope', META_SCOPES[network] ?? META_SCOPES.FACEBOOK)

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

    // Publicar acontece na Página (FB) ou na conta Instagram Business vinculada a ela,
    // nunca no perfil pessoal — por isso guardamos a Página e o token dela.
    const { alvos, paginas } = await listarAlvosMeta(network, accessToken)

    if (alvos.length === 0) {
      // "sem_ig" separa os dois becos: Página visível mas sem Instagram Business
      // vinculado ≠ nenhuma Página visível para o token
      const motivo = paginas > 0 && network === 'INSTAGRAM' ? 'sem_ig' : 'sem_paginas'
      res.redirect(`${frontend}/settings?oauth_error=${motivo}`); return
    }

    // com uma conta só não há o que escolher — perguntar seria atrito à toa
    if (alvos.length === 1) {
      await salvarAlvosMeta(projectId, alvos)
      res.redirect(`${frontend}/settings?oauth_success=${network.toLowerCase()}`); return
    }

    const pendente = guardarPendente({ userId, projectId, network, alvos })
    res.redirect(`${frontend}/settings?meta_escolher=${pendente}`)
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
    // video.publish depende da aprovação do app no painel do TikTok
    // user.info.stats traz seguidores e curtidas para os Relatórios.
    // Precisa estar habilitado no painel do TikTok também: pedir aqui um
    // escopo que o app não tem devolve scope_not_authorized.
    scope: 'user.info.basic,user.info.stats,video.publish',
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

    // o token do TikTok vale 24h: sem guardar o refresh, a conta parava de
    // publicar no dia seguinte e ninguém sabia por quê
    const refreshTiktok = tokenData.refresh_token as string | undefined
    const validadeTiktok = Number(tokenData.expires_in ?? 0)

    await saveSocialAccount({
      projectId,
      provider: 'TIKTOK',
      accessToken: String(accessToken),
      refreshToken: refreshTiktok,
      expiresAt: validadeTiktok ? new Date(Date.now() + validadeTiktok * 1000) : undefined,
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
// GET /api/social/meta/escolher/:id — o que a autorização encontrou.
// Devolve nome e avatar; o token da Página nunca sai daqui.
router.get('/meta/escolher/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const pendente = lerPendente(req.params.id as string, req.userId!)
  if (!pendente) { res.status(404).json({ message: 'Escolha expirada. Conecte novamente.' }); return }
  res.json({
    network: pendente.network,
    projectId: pendente.projectId,
    contas: pendente.alvos.map(a => ({
      profileId: a.profileId, provider: a.provider, nome: a.nome, avatar: a.avatar, paginaNome: a.paginaNome,
    })),
  })
})

// POST /api/social/meta/escolher/:id  { profileIds: string[] }
router.post('/meta/escolher/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const pendente = lerPendente(req.params.id as string, req.userId!)
  if (!pendente) { res.status(404).json({ message: 'Escolha expirada. Conecte novamente.' }); return }

  const { profileIds } = (req.body ?? {}) as { profileIds?: string[] }
  const escolhidos = pendente.alvos.filter(a => profileIds?.includes(a.profileId))
  if (escolhidos.length === 0) { res.status(400).json({ message: 'Escolha ao menos uma conta.' }); return }

  const salvos = await salvarAlvosMeta(pendente.projectId, escolhidos)
  META_PENDENTES.delete(req.params.id as string)   // token de Página não fica na memória à toa
  res.json({ salvos, network: pendente.network })
})

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

// Escopos sem os quais a conta aparece CONNECTED mas não publica.
// Foi assim que o Spotify enganou a gente: status conectado, token sem os escopos novos.
const ESCOPOS_EXIGIDOS: Record<string, string[]> = {
  FACEBOOK: ['pages_show_list', 'pages_manage_posts'],
  INSTAGRAM: ['instagram_basic', 'instagram_content_publish'],
}

// POST /api/social/accounts/:id/test
// Conectar não prova escopo. Aqui o token guardado é interrogado de verdade:
// quais permissões ele carrega e se a conta ainda responde. Nada é publicado.
router.post('/accounts/:id/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  const conta = await prisma.socialAccount.findUnique({ where: { id: req.params.id as string } })
  if (!conta) { res.status(404).json({ message: 'Conta não encontrada' }); return }

  const base = { provider: conta.provider, profileName: conta.profileName }

  if (conta.provider !== 'FACEBOOK' && conta.provider !== 'INSTAGRAM') {
    res.json({ ...base, ok: false, erro: `Teste ainda não implementado para ${conta.provider}` })
    return
  }

  const appId = process.env['META_ID']
  const appSecret = process.env['META_SEC']
  if (!appId || !appSecret) {
    res.json({ ...base, ok: false, erro: 'META_ID/META_SEC ausentes no servidor' }); return
  }

  // 1. quais escopos o token REALMENTE tem — não o que a tela de consentimento mostrou
  const dbg = await graphGet(`debug_token?input_token=${encodeURIComponent(conta.accessToken)}`, `${appId}|${appSecret}`)
  const info = (dbg.json as { data?: { scopes?: string[]; is_valid?: boolean; expires_at?: number } } | null)?.data
  if (!dbg.ok || !info) {
    res.json({ ...base, ok: false, erro: `debug_token falhou (HTTP ${dbg.status}): ${dbg.text.slice(0, 300)}` }); return
  }

  const escopos = info.scopes ?? []
  const faltando = (ESCOPOS_EXIGIDOS[conta.provider] ?? []).filter(e => !escopos.includes(e))

  // 2. a conta ainda responde? (leitura pura, sem efeito nenhum)
  const alvo = conta.provider === 'INSTAGRAM'
    ? `${conta.profileId}?fields=id,username,media_count`
    : `${conta.profileId}?fields=id,name,fan_count`
  const leitura = await graphGet(alvo, conta.accessToken)

  const problemas: string[] = []
  if (!info.is_valid) problemas.push('token inválido segundo a própria Meta')
  if (faltando.length) problemas.push(`escopos ausentes: ${faltando.join(', ')}`)
  if (!leitura.ok) problemas.push(`conta não respondeu (HTTP ${leitura.status}): ${leitura.text.slice(0, 200)}`)

  res.json({
    ...base,
    ok: problemas.length === 0,
    escopos,
    faltando,
    expiraEm: info.expires_at ? new Date(info.expires_at * 1000).toISOString() : 'não expira',
    leitura: leitura.ok ? leitura.text.slice(0, 200) : null,
    ...(problemas.length ? { erro: problemas.join(' | ') } : {}),
  })
})

// DELETE /api/social/accounts/:id
router.delete('/accounts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.socialAccount.delete({ where: { id: req.params.id as string } })
  res.json({ message: 'Desconectado' })
})

export default router
