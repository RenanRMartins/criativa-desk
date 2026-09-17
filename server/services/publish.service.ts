import { Readable } from 'node:stream'
import { google } from 'googleapis'
import { prisma } from '../lib/prisma'
import { tokenTiktokValido } from './tiktok-token.service'

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

/**
 * Quais contas recebem um post. Regra única: as escolhidas no post; sem escolha,
 * todas as contas conectadas das redes do post.
 *
 * Existia duplicada no worker e na rota de publicação manual, e a cópia da rota
 * não tinha o fallback — post agendado publicava, post publicado na mão era
 * marcado como PUBLISHED sem enviar nada a lugar nenhum.
 */
export function selectPublishAccounts(post: {
  projectId: string
  networks: string[]
  targetAccountIds: string[]
}, override?: string[]): Promise<PublishAccount[]> {
  const ids = override?.length ? override : post.targetAccountIds
  return prisma.socialAccount.findMany({
    where: {
      projectId: post.projectId,
      status: 'CONNECTED',
      ...(ids.length ? { id: { in: ids } } : { provider: { in: post.networks as never } }),
    },
    select: {
      id: true, provider: true, profileName: true,
      accessToken: true, refreshToken: true, profileId: true,
    },
  })
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

// separado de describeError porque o corpo da resposta só pode ser lido uma vez,
// e quem faz retry precisa inspecionar o erro antes de formatá-lo
function formatMetaError(status: number, corpo: string, fallback: string) {
  if (!corpo) return `${fallback} (HTTP ${status})`

  // A Meta manda a explicação legível em error_user_msg, no fim do JSON — que é
  // justamente onde o corte caía. Promove esses campos antes de truncar.
  try {
    const e = (JSON.parse(corpo) as { error?: Record<string, string> }).error
    if (e) {
      const humano = [e['error_user_title'], e['error_user_msg']].filter(Boolean).join(' — ')
      const tecnico = [e['message'], e['code'] && `code ${e['code']}`, e['error_subcode'] && `subcode ${e['error_subcode']}`]
        .filter(Boolean).join(', ')
      const texto = [humano, tecnico].filter(Boolean).join(' | ')
      if (texto) return `${fallback} (HTTP ${status}): ${texto.slice(0, 600)}`
    }
  } catch { /* não é JSON da Meta: cai no corpo cru */ }

  return `${fallback} (HTTP ${status}): ${corpo.slice(0, 600)}`
}

async function describeError(res: Response, fallback: string) {
  let corpo = ''
  try {
    corpo = await res.text()
  } catch { /* corpo ilegível */ }
  return formatMetaError(res.status, corpo, fallback)
}

function subcodigoMeta(corpo: string) {
  try {
    return (JSON.parse(corpo) as { error?: { error_subcode?: number } }).error?.error_subcode
  } catch { return undefined }
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

/**
 * O buscador de mídia do Instagram falha de forma intermitente: recusa com
 * 9004 / subcode 2207052 ("não foi possível obter a mídia deste URI") uma URL
 * que responde 200 e image/jpeg. Medido duas vezes no mesmo carrossel, em
 * imagens diferentes, com o smoke test conferindo cada URL segundos antes —
 * 200 em 645ms, e ainda assim recusada. Não é a URL; é a busca dele.
 *
 * Só este subcódigo é repetido. Erro de formato, de permissão ou de parâmetro
 * continua estourando na primeira tentativa: repetir defeito real só esconde.
 */
const SUBCODIGO_BUSCA_TRANSITORIA = 2207052

/**
 * Repetir a MESMA URL nunca funcionou — quatro tentativas em 18s, todas
 * recusadas — o que indica que a Meta guarda o resultado negativo por URL.
 * O Cloudinary ignora parâmetro desconhecido e devolve o mesmo arquivo
 * (verificado: `?cb=x` responde 200 e os mesmos 7207 bytes), então variar a
 * query dá à Meta uma URL nova para o mesmo conteúdo.
 */
function variarUrl(params: Record<string, string>, tentativa: number) {
  const marca = `cb=${Date.now()}-${tentativa}`
  const variados = { ...params }
  for (const chave of ['image_url', 'video_url']) {
    const url = variados[chave]
    if (url) variados[chave] = url + (url.includes('?') ? '&' : '?') + marca
  }
  return variados
}

// Cria um container de mídia e devolve o id. Stories não aceitam legenda.
async function createInstagramContainer(
  account: PublishAccount,
  params: Record<string, string>,
  tentativas = 12,
) {
  let ultimoErro = 'Instagram recusou o container de mídia'
  let feitas = 0

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    feitas = tentativa
    const body = new URLSearchParams({
      access_token: account.accessToken,
      ...(tentativa === 1 ? params : variarUrl(params, tentativa)),
    })
    const res = await fetch(`${GRAPH}/${account.profileId}/media`, { method: 'POST', body })
    if (res.ok) {
      const { id } = await res.json() as { id: string }
      if (tentativa > 1) console.log(`[instagram] container criado na tentativa ${tentativa}`)
      return id
    }

    const corpo = await res.text().catch(() => '')
    ultimoErro = formatMetaError(res.status, corpo, 'Instagram recusou o container de mídia')

    const transitorio = subcodigoMeta(corpo) === SUBCODIGO_BUSCA_TRANSITORIA
    if (!transitorio || tentativa === tentativas) break

    // Espera curta e fixa: o log mostrou falha com 3s, 6s e 9s e sucesso
    // imediato logo depois — esperar mais não ajuda, insistir ajuda. Com o
    // envio rodando em segundo plano, 12 tentativas custam 18s e ninguém espera.
    const espera = 1500
    console.warn(`[instagram] busca de mídia falhou (tentativa ${tentativa}/${tentativas}), repetindo em ${espera}ms`)
    await sleep(espera)
  }

  // o número real de tentativas vai na mensagem: distingue "insistimos quatro
  // vezes e não passou" de "falhou de cara por erro que não se repete"
  throw new Error(feitas > 1 ? `${ultimoErro} — após ${feitas} tentativas` : ultimoErro)
}

// O container pode responder FINISHED e o media_publish ainda dizer que a mídia
// não está pronta — a prontidão não é imediata dos dois lados. Esperar mais um
// pouco resolve; desistir aqui perderia um post que ia funcionar.
const SUBCODIGO_MIDIA_NAO_PRONTA = 2207027

async function publishInstagramContainer(account: PublishAccount, creationId: string, tentativas = 4) {
  let ultimoErro = 'Instagram recusou a publicação'
  let feitas = 0
  let res: Response

  for (let tentativa = 1; ; tentativa++) {
    feitas = tentativa
    res = await fetch(`${GRAPH}/${account.profileId}/media_publish`, {
      method: 'POST',
      body: new URLSearchParams({ access_token: account.accessToken, creation_id: creationId }),
    })
    if (res.ok) break

    const corpo = await res.text().catch(() => '')
    ultimoErro = formatMetaError(res.status, corpo, 'Instagram recusou a publicação')

    const vaiFicarPronta = subcodigoMeta(corpo) === SUBCODIGO_MIDIA_NAO_PRONTA
    if (!vaiFicarPronta || tentativa === tentativas) {
      throw new Error(feitas > 1 ? `${ultimoErro} — após ${feitas} tentativas` : ultimoErro)
    }

    const espera = tentativa * 3000
    console.warn(`[instagram] mídia ainda não pronta (tentativa ${tentativa}/${tentativas}), repetindo em ${espera}ms`)
    await sleep(espera)
  }

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
    m.type === 'VIDEO' ? { video_url: m.url } : { image_url: jpgUrl(m.url) }

  // imagem de usuário é sempre a primeira vez: gerar a derivada antes de
  // entregar a URL ao Instagram, que não espera pela geração
  for (const m of media) {
    if (m.type !== 'VIDEO') await aquecerDerivada(jpgUrl(m.url))
  }

  // Carrossel: um container por item, depois um container CAROUSEL com os filhos
  if (post.format === 'CAROUSEL_INSTAGRAM' && media.length > 1) {
    const children: string[] = []
    for (const [indice, item] of media.entries()) {
      // sem isto, o erro diz só a URL e não dá para saber se falha sempre na
      // mesma posição do carrossel ou na mesma imagem
      // Cada filho precisou de mais tentativas que o anterior (4, 5, mais de 6),
      // como se as buscas consumissem uma cota. A pausa dá folga entre elas.
      if (indice > 0) await sleep(2000)
      console.log(`[instagram] carrossel: criando filho ${indice + 1}/${media.length} — ${item.url.split('/').pop()}`)
      const childId = await createInstagramContainer(account, {
        ...urlParam(item),
        is_carousel_item: 'true',
      })
      await waitForInstagramContainer(childId, account.accessToken)
      console.log(`[instagram] carrossel: filho ${indice + 1}/${media.length} pronto (${childId})`)
      children.push(childId)
    }
    const carouselId = await createInstagramContainer(account, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption,
    })
    // o container pai também precisa ficar pronto: esperar só os filhos deixava
    // a publicação cair em 9007/2207027 ("a mídia não está pronta")
    await waitForInstagramContainer(carouselId, account.accessToken)
    return publishInstagramContainer(account, carouselId)
  }

  const first = media[0]!

  // Stories não aceitam legenda nem hashtags no corpo da requisição
  if (post.format === 'STORIES_INSTAGRAM') {
    const storyId = await createInstagramContainer(account, {
      media_type: 'STORIES',
      ...urlParam(first),
    })
    await waitForInstagramContainer(storyId, account.accessToken)
    return publishInstagramContainer(account, storyId)
  }

  const creationId = await createInstagramContainer(account, {
    caption,
    ...(first.type === 'VIDEO' ? { media_type: 'REELS' } : {}),
    ...urlParam(first),
  })
  // publicar antes de FINISHED falha — vale para imagem também, não só vídeo
  await waitForInstagramContainer(creationId, account.accessToken)

  return publishInstagramContainer(account, creationId)
}

/**
 * Um container só pode ser publicado depois de chegar a FINISHED. Vídeo era o
 * caso óbvio, mas imagem também passa por processamento: o Stories recusou com
 * "A mídia não está pronta para ser publicada" (9007/2207027) porque só
 * esperávamos quando era vídeo. No feed vinha funcionando por sorte — o
 * container ficava pronto antes de a gente pedir a publicação.
 *
 * Consulta antes de dormir, para que imagem já pronta não pague espera nenhuma.
 * 60 tentativas (~3min) porque vídeo é processado de forma assíncrona e demora;
 * imagem sai na primeira volta e não paga nada por esse teto ser alto.
 */
async function waitForInstagramContainer(creationId: string, accessToken: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const res = await fetch(`${GRAPH}/${creationId}?fields=status_code,status&access_token=${accessToken}`)
    if (res.ok) {
      const { status_code, status } = await res.json() as { status_code?: string; status?: string }
      if (status_code === 'FINISHED') return
      if (status_code === 'ERROR') throw new Error(`Instagram falhou ao processar a mídia: ${status ?? 'sem detalhe'}`)
    }
    await sleep(attempt === 0 ? 1000 : 3000)
  }
  throw new Error('Instagram não terminou de processar a mídia a tempo')
}

// ─── TIKTOK ──────────────────────────────────────────────────────────────────

const MAX_VIDEO_BYTES = 300 * 1024 * 1024

// "JPEG is the only image format supported" — Instagram Content Publishing. PNG é
// justamente o que mais sai de print e de export do Canva, e a recusa vem como
// "Only photo or video can be accepted as media type", que não diz nada sobre
// formato. Mesmo caminho do .mov: o Cloudinary converte na entrega.
function jpgUrl(url: string) {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url
  // já é JPEG: converter geraria uma derivada nova sem necessidade nenhuma
  if (/\.jpe?g$/i.test(url)) return url
  return url
    .replace('/image/upload/', '/image/upload/f_jpg/')
    .replace(/\.(png|webp|heic|heif|gif|avif|tiff?|bmp)$/i, '.jpg')
}

/**
 * O Cloudinary só gera a imagem derivada (conversão, redimensionamento) quando
 * alguém pede pela primeira vez, e quem pede primeiro espera a geração. Se esse
 * primeiro for o buscador do Instagram, ele desiste e recusa com "Não foi
 * possível obter a mídia deste URI" — erro que não diz nada sobre cache.
 * Então pedimos antes, e ele recebe a imagem já pronta.
 */
async function aquecerDerivada(url: string) {
  if (!url.includes('res.cloudinary.com')) return
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    try {
      const res = await fetch(url)
      if (res.ok) { await res.arrayBuffer(); return }
      // 423 = ainda processando; qualquer outro erro é real e o Instagram reporta melhor
      if (res.status !== 423) return
    } catch { /* rede instável: tenta de novo */ }
    await sleep(2000)
  }
}

// iPhone grava .mov/HEVC, que o TikTok não aceita. O Cloudinary transcodifica sob
// demanda pela própria URL, então nada precisa ser convertido à mão.
function mp4Url(url: string) {
  if (!url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return url
  return url
    .replace('/video/upload/', '/video/upload/f_mp4,vc_h264,ac_aac/')
    .replace(/\.(mov|avi|mkv|webm|m4v|hevc)$/i, '.mp4')
}

// A primeira requisição dispara a transcodificação e volta 423 enquanto processa
async function fetchTranscoded(url: string) {
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const res = await fetch(url)
    if (res.ok) return res
    if (res.status !== 423) throw new Error(`Falha ao baixar o vídeo (HTTP ${res.status})`)
    await sleep(5000)
  }
  throw new Error('O vídeo ainda está sendo convertido. Tente publicar de novo em instantes.')
}

// Regras do TikTok: chunk entre 5 MB e 64 MB, o último podendo chegar a 128 MB
// para absorver a sobra; total_chunk_count é o piso da divisão.
function planTiktokChunks(size: number) {
  const MIN = 5 * 1024 * 1024
  const MAX = 64 * 1024 * 1024
  if (size <= MIN) return { chunkSize: size, chunkCount: 1 }
  const chunkSize = Math.min(size, MAX)
  return { chunkSize, chunkCount: Math.max(1, Math.floor(size / chunkSize)) }
}

// PULL_FROM_URL exigiria verificar a propriedade do domínio do vídeo no portal
// do TikTok — impossível com o Cloudinary. FILE_UPLOAD envia os bytes e não pede
// verificação nenhuma.
async function publishTiktok(account: PublishAccount, post: PublishPost) {
  const video = sortedMedia(post).find(m => m.type === 'VIDEO')
  if (!video) throw new Error('TikTok exige um vídeo anexado ao post')

  // o token do TikTok vale 24h: sem renovar, a conta publicava no dia da
  // conexão e falhava no seguinte com "access_token_invalid"
  const conta = await prisma.socialAccount.findUnique({
    where: { id: account.id },
    select: { id: true, accessToken: true, refreshToken: true, expiresAt: true },
  })
  if (conta) {
    const { token, erro } = await tokenTiktokValido(conta)
    if (erro) throw new Error(erro)
    account = { ...account, accessToken: token }
  }

  const download = await fetchTranscoded(mp4Url(video.url))
  const mimeType = download.headers.get('content-type') ?? 'video/mp4'
  const bytes = Buffer.from(await download.arrayBuffer())

  // o vídeo inteiro fica em memória; acima disso o processo do Railway derruba
  if (bytes.length > MAX_VIDEO_BYTES) {
    throw new Error(`Vídeo de ${(bytes.length / 1048576).toFixed(0)} MB excede o limite de ${MAX_VIDEO_BYTES / 1048576} MB`)
  }

  const { chunkSize, chunkCount } = planTiktokChunks(bytes.length)

  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
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
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: bytes.length,
        chunk_size: chunkSize,
        total_chunk_count: chunkCount,
      },
    }),
  })
  if (!initRes.ok) throw new Error(await describeError(initRes, 'TikTok recusou a publicação'))

  const init = await initRes.json() as {
    data?: { publish_id?: string; upload_url?: string }
    error?: { code?: string; message?: string }
  }
  if (init.error?.code && init.error.code !== 'ok') {
    throw new Error(`TikTok: ${init.error.message ?? init.error.code}`)
  }
  const uploadUrl = init.data?.upload_url
  if (!uploadUrl) throw new Error('TikTok não retornou a URL de upload')

  for (let i = 0; i < chunkCount; i++) {
    const inicio = i * chunkSize
    // o último chunk absorve os bytes restantes, como o TikTok exige
    const fim = i === chunkCount - 1 ? bytes.length : inicio + chunkSize
    const pedaco = bytes.subarray(inicio, fim)

    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(pedaco.length),
        'Content-Range': `bytes ${inicio}-${fim - 1}/${bytes.length}`,
      },
      body: new Uint8Array(pedaco),
    })
    if (!put.ok) {
      throw new Error(await describeError(put, `TikTok recusou o envio do vídeo (parte ${i + 1}/${chunkCount})`))
    }
  }

  return { externalId: init.data?.publish_id }
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
