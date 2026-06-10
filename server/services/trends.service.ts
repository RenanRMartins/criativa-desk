// Tendências reais via RSS público do Google Trends (sem chave de API)
const FEED_URL = 'https://trends.google.com/trending/rss'
const CACHE_TTL_MS = 30 * 60_000

export interface GoogleTrend {
  id: string
  projectId: string
  title: string
  description: string
  niche: string
  trendScore: number
  source: string
  whyItMatters: string
  addedToCalendar: boolean
  validUntil: string
  createdAt: string
}

let cache: { data: GoogleTrend[]; at: number } | null = null

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "5.000+" / "5000+" → 5000
function parseTraffic(s: string) {
  return parseInt(s.replace(/\D/g, ''), 10) || 0
}

// volume de busca → score 55-100 em escala log (1k→70, 10k→80, 100k→90, 1M→100)
function trafficToScore(traffic: number) {
  if (traffic <= 0) return 55
  return Math.min(100, Math.max(55, Math.round(40 + 10 * Math.log10(traffic))))
}

function parseFeed(xml: string): GoogleTrend[] {
  const now = new Date()
  const validUntil = new Date(now.getTime() + 24 * 60 * 60_000).toISOString()
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

  return items.map((item, i) => {
    const title = decodeEntities(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '')
    const traffic = item.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/)?.[1] ?? ''
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]
    const newsTitles = [...item.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)]
      .map(m => decodeEntities(m[1]))
    const newsSources = [...item.matchAll(/<ht:news_item_source>([\s\S]*?)<\/ht:news_item_source>/g)]
      .map(m => decodeEntities(m[1]))

    return {
      id: `gtrend-${i}-${title.toLowerCase().replace(/\W+/g, '-')}`,
      projectId: '',
      title: capitalize(title),
      description: newsTitles[0] ?? `"${title}" está entre os assuntos mais buscados do Google hoje.`,
      niche: 'Em alta no Brasil',
      trendScore: trafficToScore(parseTraffic(traffic)),
      source: newsSources[0] ? `Google Trends · ${newsSources[0]}` : 'Google Trends',
      whyItMatters: traffic
        ? `${traffic} buscas nas últimas 24h no Google. Conteúdo sobre o tema tende a alcançar mais gente agora.`
        : 'Assunto em alta no Google agora.',
      addedToCalendar: false,
      validUntil,
      createdAt: pubDate ? new Date(pubDate).toISOString() : now.toISOString(),
    }
  }).filter(t => t.title)
}

export async function getGoogleTrends(geo = 'BR'): Promise<GoogleTrend[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data
  try {
    const res = await fetch(`${FEED_URL}?geo=${geo}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Google Trends RSS: HTTP ${res.status}`)
    const data = parseFeed(await res.text()).sort((a, b) => b.trendScore - a.trendScore)
    cache = { data, at: Date.now() }
    return data
  } catch (err) {
    console.error('[trends.service] Falha ao buscar Google Trends:', err instanceof Error ? err.message : err)
    return cache?.data ?? []
  }
}
