import { google } from 'googleapis'
import { prisma } from '../lib/prisma'
import { tokenTiktokValido } from './tiktok-token.service'

const GRAPH = 'https://graph.facebook.com/v21.0'

/**
 * Coleta de métricas das redes conectadas.
 *
 * Regra que vale para todas: quando a rede NÃO pode responder, devolvemos o
 * motivo — nunca zero. Zero e "não temos permissão" parecem iguais na tela e
 * são coisas opostas; foi exatamente esse tipo de confusão que fez a página de
 * Relatórios exibir números inventados como se fossem da cliente.
 */
export type MetricasConta = {
  accountId: string
  provider: string
  profileName: string
  ok: boolean
  motivo?: string
  seguidores?: number
  publicacoes?: number
  visualizacoes?: number
  curtidas?: number
  comentarios?: number
  /** O que esta rede ainda não entrega e por quê. */
  limitacao?: string
}

async function graph(path: string, token: string) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${GRAPH}/${path}${sep}access_token=${encodeURIComponent(token)}`)
  const texto = await res.text()
  let json: Record<string, unknown> | null = null
  try { json = JSON.parse(texto) } catch { /* corpo não-JSON */ }
  return { ok: res.ok, status: res.status, texto, json }
}

function motivoMeta(texto: string, padrao: string) {
  try {
    const e = (JSON.parse(texto) as { error?: Record<string, string> }).error
    if (e) return [e['error_user_msg'], e['message']].filter(Boolean).join(' — ').slice(0, 250)
  } catch { /* não é JSON da Meta */ }
  return padrao
}

async function instagram(conta: { id: string; profileId: string; accessToken: string; profileName: string }): Promise<MetricasConta> {
  const base = { accountId: conta.id, provider: 'INSTAGRAM', profileName: conta.profileName }

  const perfil = await graph(`${conta.profileId}?fields=followers_count,media_count`, conta.accessToken)
  if (!perfil.ok) {
    return { ...base, ok: false, motivo: motivoMeta(perfil.texto, `Instagram recusou a consulta (HTTP ${perfil.status})`) }
  }

  const p = perfil.json as { followers_count?: number; media_count?: number }

  // alcance e impressões exigem instagram_manage_insights, permissão avançada
  // que ainda não temos aprovada — tentamos e, se negar, dizemos o porquê
  const insights = await graph(`${conta.profileId}/insights?metric=reach&period=day`, conta.accessToken)
  const limitacao = insights.ok ? undefined
    : 'Alcance e impressões exigem a permissão instagram_manage_insights, ainda não aprovada pela Meta.'

  return {
    ...base,
    ok: true,
    seguidores: p.followers_count ?? 0,
    publicacoes: p.media_count ?? 0,
    ...(limitacao ? { limitacao } : {}),
  }
}

async function facebook(conta: { id: string; profileId: string; accessToken: string; profileName: string }): Promise<MetricasConta> {
  const base = { accountId: conta.id, provider: 'FACEBOOK', profileName: conta.profileName }
  const r = await graph(`${conta.profileId}?fields=fan_count,followers_count`, conta.accessToken)
  if (!r.ok) return { ...base, ok: false, motivo: motivoMeta(r.texto, `Facebook recusou a consulta (HTTP ${r.status})`) }

  const p = r.json as { fan_count?: number; followers_count?: number }
  const seguidores = p.followers_count ?? p.fan_count
  // "0" e "o campo não veio" aparecem iguais na tela e são coisas diferentes:
  // sem o número, dizemos isso em vez de exibir zero como se fosse medição
  if (seguidores === undefined) {
    return { ...base, ok: false, motivo: 'A Página não devolveu a contagem de seguidores — verifique se o token tem pages_read_engagement.' }
  }
  return { ...base, ok: true, seguidores }
}

async function youtube(conta: { id: string; accessToken: string; refreshToken: string | null; profileName: string }): Promise<MetricasConta> {
  const base = { accountId: conta.id, provider: 'YOUTUBE', profileName: conta.profileName }
  try {
    const client = new google.auth.OAuth2(process.env['GAUTH_ID'], process.env['GAUTH_SEC'])
    client.setCredentials({ access_token: conta.accessToken, refresh_token: conta.refreshToken ?? undefined })
    // o token novo do refresh é persistido, senão a coleta seguinte falha igual
    client.on('tokens', t => {
      if (!t.access_token) return
      prisma.socialAccount.update({
        where: { id: conta.id },
        data: { accessToken: t.access_token, ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}) },
      }).catch(() => {})
    })

    const yt = google.youtube({ version: 'v3', auth: client })
    const canal = await yt.channels.list({ part: ['statistics'], mine: true })
    const s = canal.data.items?.[0]?.statistics
    if (!s) return { ...base, ok: false, motivo: 'O YouTube não devolveu estatísticas para este canal.' }

    return {
      ...base,
      ok: true,
      seguidores: Number(s.subscriberCount ?? 0),
      publicacoes: Number(s.videoCount ?? 0),
      visualizacoes: Number(s.viewCount ?? 0),
      limitacao: 'Retenção e origem do tráfego exigem a YouTube Analytics API, ainda não integrada.',
    }
  } catch (err) {
    return { ...base, ok: false, motivo: err instanceof Error ? err.message.slice(0, 250) : 'Falha ao consultar o YouTube' }
  }
}

async function tiktok(conta: {
  id: string; accessToken: string; refreshToken: string | null; expiresAt: Date | null; profileName: string
}): Promise<MetricasConta> {
  const base = { accountId: conta.id, provider: 'TIKTOK', profileName: conta.profileName }
  try {
    const { token, erro: erroToken } = await tokenTiktokValido(conta)
    if (erroToken) return { ...base, ok: false, motivo: erroToken }

    const res = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count',
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const texto = await res.text()
    if (!res.ok) {
      // Relatar o que o TikTok disse, sem embutir explicação. A versão anterior
      // afirmava "falta o escopo user.info.stats" e o erro real era token
      // expirado — a mensagem mandava procurar no lugar errado.
      return { ...base, ok: false, motivo: `O TikTok recusou a consulta (HTTP ${res.status}): ${texto.slice(0, 250)}` }
    }
    const d = (JSON.parse(texto) as { data?: { user?: Record<string, number> } }).data?.user ?? {}
    return {
      ...base, ok: true,
      seguidores: d['follower_count'] ?? 0,
      curtidas: d['likes_count'] ?? 0,
      publicacoes: d['video_count'] ?? 0,
    }
  } catch (err) {
    return { ...base, ok: false, motivo: err instanceof Error ? err.message.slice(0, 250) : 'Falha ao consultar o TikTok' }
  }
}

/** Coleta tudo em paralelo; uma rede fora do ar não derruba as outras. */
export async function coletarInsights(projectId: string): Promise<MetricasConta[]> {
  const contas = await prisma.socialAccount.findMany({
    where: { projectId, status: 'CONNECTED' },
    select: { id: true, provider: true, profileId: true, profileName: true, accessToken: true, refreshToken: true, expiresAt: true },
  })

  return Promise.all(contas.map(c => {
    switch (c.provider) {
      case 'INSTAGRAM': return instagram(c)
      case 'FACEBOOK': return facebook(c)
      case 'YOUTUBE': return youtube(c)
      case 'TIKTOK': return tiktok(c)
      default: return Promise.resolve<MetricasConta>({
        accountId: c.id, provider: c.provider, profileName: c.profileName,
        ok: false, motivo: `Métricas ainda não implementadas para ${c.provider}.`,
      })
    }
  }))
}

/**
 * Guarda um retrato do dia por conta. Sem histórico não há "cresceu quanto":
 * as APIs devolvem só o número de agora.
 */
export async function guardarSnapshot(metricas: MetricasConta[]) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  for (const m of metricas) {
    if (!m.ok) continue
    const jaTem = await prisma.metric.findFirst({ where: { socialAccountId: m.accountId, date: hoje } })
    const dados = {
      followers: m.seguidores ?? 0,
      videoViews: m.visualizacoes ?? 0,
      likes: m.curtidas ?? 0,
      comments: m.comentarios ?? 0,
    }
    if (jaTem) await prisma.metric.update({ where: { id: jaTem.id }, data: dados })
    else await prisma.metric.create({ data: { socialAccountId: m.accountId, date: hoje, ...dados } })
  }
}

/** Série histórica para o gráfico — vem do que foi guardado, não da API. */
export async function historico(projectId: string, dias = 30) {
  const desde = new Date(Date.now() - dias * 86400000)
  const contas = await prisma.socialAccount.findMany({ where: { projectId }, select: { id: true, provider: true } })
  const porId = new Map(contas.map(c => [c.id, c.provider]))

  const metricas = await prisma.metric.findMany({
    where: { socialAccountId: { in: contas.map(c => c.id) }, date: { gte: desde } },
    orderBy: { date: 'asc' },
  })

  return metricas.map(m => ({
    data: m.date.toISOString().slice(0, 10),
    provider: porId.get(m.socialAccountId) ?? '',
    seguidores: m.followers,
    visualizacoes: m.videoViews,
    curtidas: m.likes,
  }))
}
