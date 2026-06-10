import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { MOCK_TRENDS } from '@/lib/mockData'
import type { TrendItem } from '@/types'

function isDemo(token: string | null): boolean {
  return !token || token.startsWith('demo-token')
}

export function useTrends(projectId?: string) {
  const { token } = useAuthStore()
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTrends = useCallback(async () => {
    if (isDemo(token)) {
      const filtered = projectId
        ? MOCK_TRENDS.filter(t => t.projectId === projectId)
        : MOCK_TRENDS
      setTrends(filtered.length > 0 ? filtered : MOCK_TRENDS)
      return
    }
    setLoading(true)
    try {
      const query = projectId ? `?projectId=${projectId}` : ''
      const data = await api.get<TrendItem[]>(`/trenddesk${query}`)
      setTrends(data)
    } catch {
      setTrends([])
    } finally {
      setLoading(false)
    }
  }, [token, projectId])

  return { trends, loading, fetchTrends }
}
