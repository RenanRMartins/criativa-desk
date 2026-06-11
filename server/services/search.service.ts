// Sugestões reais de busca via Google Autocomplete (endpoint público, sem chave)
const SUGGEST_URL = 'https://suggestqueries.google.com/complete/search'
const CACHE_TTL_MS = 30 * 60_000
const MAX_CACHE_KEYS = 200

const cache = new Map<string, { data: string[]; at: number }>()

async function fetchSuggestions(query: string): Promise<string[]> {
  const params = new URLSearchParams({ client: 'firefox', hl: 'pt-BR', oe: 'utf-8', q: query })
  const res = await fetch(`${SUGGEST_URL}?${params}`, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error(`Autocomplete HTTP ${res.status}`)
  const data = await res.json() as [string, string[]]
  return Array.isArray(data?.[1]) ? data[1] : []
}

// Combina o termo com prefixos de intenção de conteúdo ("como", "para")
export async function getSearchSuggestions(seed: string): Promise<string[]> {
  const key = seed.toLowerCase().trim()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  try {
    const [plain, how] = await Promise.all([
      fetchSuggestions(seed),
      fetchSuggestions(`como ${seed}`),
    ])
    const seen = new Set<string>()
    const merged = [...plain, ...how].filter(s => {
      const k = s.toLowerCase().trim()
      if (!k || k === key || seen.has(k)) return false
      seen.add(k)
      return true
    }).slice(0, 14)

    if (cache.size >= MAX_CACHE_KEYS) cache.clear()
    cache.set(key, { data: merged, at: Date.now() })
    return merged
  } catch (err) {
    console.error('[search.service] Falha no autocomplete:', err instanceof Error ? err.message : err)
    return hit?.data ?? []
  }
}
