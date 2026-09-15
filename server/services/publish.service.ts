import { Readable } from 'node:stream'
import { google } from 'googleapis'
import { prisma } from '../lib/prisma'

// Versão da API do LinkedIn no formato YYYYMM exigido no header LinkedIn-Version
const LINKEDIN_VERSION = '202608'
const GRAPH = 'https://graph.facebook.com/v21.0'

export type PublishAccount = {
  id: string
  provider: string
  accessToken: string
  refreshToken: string | null
  profileId: string
  profileName: string
}

export type PublishPost = {
  id: string
  title: string
  format: string
  caption: string | null
  hashtags: string[]
  link: string | null
  media: { url: string; type: string; order: number }[]
}

export type PublishOutcome = {
  accountId: string
  provider: string
  profileName: string
  ok: boolean
  externalId?: string
  url?: string
  error?: string
}

export function isMockMode() {
  return process.env.SOCIAL_MOCK_MODE !== 'false'
}

function buildCaption(post: PublishPost) {
  const tags = post.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ')
  return [post.caption?.trim(), tags, post.link].filter(Boolean).join('\n\n')
}

function sortedMedia(post: PublishPost) {
  return [...post.media].sort((a, b) => a.order - b.order)
}

async function describeError(res: Response, fallback: string) {
  let detail = ''
  try {
    detail = (await res.text()).slice(0, 300)
  } catch { /* corpo ilegível */ }
  return `${fallback} (HTTP ${res.status})${detail ? `: ${detail}` : ''}`
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── YOUTUBE ─────────────────────────────────────────────────────────────────

async function publishYoutube(account: PublishAccount, post: PublishPost) {
  const video = sortedMedia(post).find(m => m.type === 'VIDEO')
  if (!video) throw new Error('YouTube exige um vídeo anexado ao post')

  const client = new google.auth.OAuth2(process.env['GAUTH_ID'], process.env['GAUTH_SEC'])
  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken ?? undefined,
  })
  // o refresh é automático; persistimos o token novo para as próximas publicações
  client.on('tokens', tokens => {
    if (!tokens.access_token) return
    prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        ...(tokens.expiry_date ? { expiresAt: new Date(tokens.expiry_date) } : {}),
      },
    }).catch(() => { /* falha de persistência não deve abortar a publicação */ })
  })

  const download = await fetch(video.url)
  if (!download.ok || !download.body) throw new Error(`Falha ao baixar o vídeo (HTTP ${download.status})`)

  const created = await google.youtube({ version: 'v3', auth: client }).videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: { title: post.title.slice(0, 100), description: buildCaption(post) },
      status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
    },
    media: { body: Readable.fromWeb(download.body as Parameters<typeof Readable.fromWeb>[0]) },
  })

  const id = created.data.id
  if (!id) throw new Error('YouTube não retornou o ID do vídeo')
  return { externalId: id, url: `https://www.youtube.com/watch?v=${id}` }
}

// ─── LINKEDIN ────────────────────────────────────────────────────────────────

// Texto puro: imagens/vídeos exigem o fluxo separado das Images/Videos API
async function publishLinkedin(account: PublishAccount, post: PublishPost) {
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: `urn:li:person:${account.profileId}`,
      commentary: buildCaption(post) || post.title,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })
  if (!res.ok) throw new Error(await describeError(res, 'LinkedIn recusou a publicação'))

  const urn = res.headers.get('x-restli-id') ?? undefined
  return {
    externalId: urn,
    url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : undefined,
  }
}

// ─── FACEBOOK ────────────────────────────────────────────────────────────────

// profileId é o ID da Página e accessToken é o token da Página (ver saveMetaAccounts)
async function publishFacebook(account: PublishAccount, post: PublishPost) {
  const message = buildCaption(post) || post.title
  const image = sortedMedia(post).find(m => m.type === 'IMAGE')

  const endpoint = image
    ? `${GRAPH}/${account.profileId}/photos`
    : `${GRAPH}/${account.profileId}/feed`
  const body = new URLSearchParams({ access_token: account.accessToken })
  if (image) {
    body.set('url', image.url)
    body.set('caption', message)
  } else {
    body.set('message', message)
  }

  const res = await fetch(endpoint, { method: 'POST', body })
  if (!res.ok) throw new Error(await describeError(res, 'Facebook recusou a publicação'))

  const data = await res.json() as { id?: string; post_id?: string }
  const id = data.post_id ?? data.id
  return { externalId: id, url: id ? `https://www.facebook.com/${id}` : undefined }
}

// ─── INSTAGRAM ───────────────────────────────────────────────────────────────

// Cria um container de mídia e devolve o id. Stories não aceitam legenda.
async function createInstagramContainer(
  account: PublishAccount,
  params: Record<string, string>,
) {
  const body = new URLSearchParams({ access_token: account.accessToken, ...params })
  const res = await fetch(`${GRAPH}/${account.profileId}/media`, { method: 'POST', body })
  if (!res.ok) throw new Error(await describeError(res, 'Instagram recusou o container de mídia'))
  const { id } = await res.json() as { id: string }
  return id
}

async function publishInstagramContainer(account: PublishAccount, creationId: string) {
  const res = await fetch(`${GRAPH}/${account.profileId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: account.accessToken, creation_id: creationId }),
  })
  if (!res.ok) throw new Error(await describeError(res, 'Instagram recusou a publicação'))

  const { id } = await res.json() as { id: string }
  // o id publicado não é o shortcode da URL — o permalink vem da própria API
  let url: string | undefined
  try {
    const permaRes = await fetch(`${GRAPH}/${id}?fields=permalink&access_token=${account.accessToken}`)
    if (permaRes.ok) url = (await permaRes.json() as { permalink?: string }).permalink
  } catch { /* link é opcional */ }

  return { externalId: id, url }
}

// profileId é o ID da conta Instagram Business vinculada à Página
async function publishInstagram(account: PublishAccount, post: PublishPost) {
  const media = sortedMedia(post)
  if (media.length === 0) throw new Error('Instagram exige uma imagem ou vídeo anexado ao post')

  const caption = buildCaption(post)
  const urlParam = (m: { url: string; type: string }): Record<string, string> =>
    m.type === 'VIDEO' ? { video_url: m.url } : { image_url: m.url }

  // Carrossel: um container por item, depois um container CAROUSEL com os filhos
  if (post.format === 'CAROUSEL_INSTAGRAM' && media.length > 1) {
    const children: string[] = []
    for (const item of media) {
      const childId = await createInstagramContainer(account, {
        ...urlParam(item),
        is_carousel_item: 'true',
      })
      if (item.type === 'VIDEO') await waitForInstagramContainer(childId, account.accessToken)
      children.push(childId)
    }
    const carouselId = await createInstagramContainer(account, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption,
    })
    return publishInstagramContainer(account, carouselId)
  }

  const first = media[0]!

  // Stories não aceitam legenda nem hashtags no corpo da requisição
  if (post.format === 'STORIES_INSTAGRAM') {
    const storyId = await createInstagramContainer(account, {
      media_type: 'STORIES',
      ...urlParam(first),
    })
    if (first.type === 'VIDEO') await waitForInstagramContainer(storyId, account.accessToken)
    return publishInstagramContainer(account, storyId)
  }

  const creationId = await createInstagramContainer(account, {
    caption,
    ...(first.type === 'VIDEO' ? { media_type: 'REELS' } : {}),
    ...urlParam(first),
  })
  // vídeo é processado de forma assíncrona — publicar antes de FINISHED falha
  if (first.type === 'VIDEO') await waitForInstagramContainer(creationId, account.accessToken)

  return publishInstagramContainer(account, creationId)
}

async function waitForInstagramContainer(creationId: string, accessToken: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    await sleep(3000)
    const res = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${accessToken}`)
    if (!res.ok) continue
    const { status_code } = await res.json() as { status_code?: string }
    if (status_code === 'FINISHED') return
    if (status_code === 'ERROR') throw new Error('Instagram falhou ao processar o vídeo')
  }
  throw new Error('Instagram não terminou de processar o vídeo a tempo')
}

// ─── TIKTOK ──────────────────────────────────────────────────────────────────

async function publishTiktok(account: PublishAccount, post: PublishPost) {
  const video = sortedMedia(post).find(m => m.type === 'VIDEO')
  if (!video) throw new Error('TikTok exige um vídeo anexado ao post')

  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: buildCaption(post).slice(0, 2200) || post.title,
        // App sem auditoria do TikTok (e o sandbox) só publica privado; o padrão
        // conservador evita post público acidental antes da aprovação sair
        privacy_level: process.env.TIKTOK_PRIVACY ?? 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: 'PULL_FROM_URL', video_url: video.url },
    }),
  })
  if (!res.ok) throw new Error(await describeError(res, 'TikTok recusou a publicação'))

  const data = await res.json() as { data?: { publish_id?: string }; error?: { code?: string; message?: string } }
  if (data.error?.code && data.error.code !== 'ok') {
    throw new Error(`TikTok: ${data.error.message ?? data.error.code}`)
  }
  return { externalId: data.data?.publish_id }
}

// ─── DISPATCHER ──────────────────────────────────────────────────────────────

const PUBLISHERS: Record<
  string,
  (account: PublishAccount, post: PublishPost) => Promise<{ externalId?: string; url?: string }>
> = {
  YOUTUBE: publishYoutube,
  LINKEDIN: publishLinkedin,
  FACEBOOK: publishFacebook,
  INSTAGRAM: publishInstagram,
  TIKTOK: publishTiktok,
}

export async function publishToAccounts(post: PublishPost, accounts: PublishAccount[]): Promise<PublishOutcome[]> {
  const outcomes: PublishOutcome[] = []

  for (const account of accounts) {
    const base = { accountId: account.id, provider: account.provider, profileName: account.profileName }
    const publisher = PUBLISHERS[account.provider]

    if (!publisher) {
      outcomes.push({ ...base, ok: false, error: `Publicação automática ainda não suportada para ${account.provider}` })
      continue
    }

    try {
      const result = await publisher(account, post)
      outcomes.push({ ...base, ok: true, ...result })
      await logIntegration(account, post.id, 'publish', null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      outcomes.push({ ...base, ok: false, error: message })
      await logIntegration(account, post.id, 'publish', message)
    }
  }

  return outcomes
}

async function logIntegration(account: PublishAccount, postId: string, action: string, error: string | null) {
  await prisma.integrationLog.create({
    data: {
      socialAccountId: account.id,
      postId,
      action,
      network: account.provider as never,
      error,
      retryable: Boolean(error),
    },
  }).catch(() => { /* log é best-effort */ })
}

export function mockOutcomes(accounts: { id: string; provider: string; profileName: string }[]): PublishOutcome[] {
  return accounts.map(a => ({
    accountId: a.id,
    provider: a.provider,
    profileName: a.profileName,
    ok: true,
    error: undefined,
  }))
}
