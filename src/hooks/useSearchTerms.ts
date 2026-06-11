import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { MOCK_SEARCH_TERMS } from '@/lib/mockData'
import type { SearchTerm } from '@/types'

function isDemo(token: string | null): boolean {
  return !token || token.startsWith('demo-token')
}

export function useSearchTerms(projectId?: string, query = '') {
  const { token } = useAuthStore()
  const [terms, setTerms] = useState<SearchTerm[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isDemo(token)) {
      setTerms(MOCK_SEARCH_TERMS.filter(t =>
        (!projectId || t.projectId === projectId) &&
        (!query || t.term.toLowerCase().includes(query.toLowerCase()))
      ))
      return
    }

    // debounce para não chamar a API a cada tecla
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (projectId) params.set('projectId', projectId)
        if (query.trim()) params.set('q', query.trim())
        const data = await api.get<SearchTerm[]>(`/searchdesk?${params}`)
        setTerms(data)
      } catch {
        setTerms([])
      } finally {
        setLoading(false)
      }
    }, query ? 450 : 0)

    return () => clearTimeout(timer)
  }, [token, projectId, query])

  return { terms, loading }
}
