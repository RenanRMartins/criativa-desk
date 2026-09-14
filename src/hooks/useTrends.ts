import { useState, useCallback, useEffect } from 'react'
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
  const [generating, setGenerating] = useState(false)

  const fetchTrends = useCallback(async () => {
    if (isDemo(token)) {
      // sem fallback para a lista completa: mostrar tendências de outro projeto
      // faz o projeto errado parecer ter conteúdo que não é dele
      setTrends(projectId ? MOCK_TRENDS.filter(t => t.projectId === projectId) : MOCK_TRENDS)
      return
    }
    setLoading(true)
    try {
      const query = projectId ? `?projectId=${projectId}` : ''
      const data = await api.get<{ items: TrendItem[]; generating: boolean }>(`/trenddesk${query}`)
      setTrends(data.items)
      setGenerating(data.generating)
    } catch {
      setTrends([])
      setGenerating(false)
    } finally {
      setLoading(false)
    }
  }, [token, projectId])

  // a geração roda em background no servidor; busca de novo até as tendências chegarem
  useEffect(() => {
    if (!generating) return
    const timer = setTimeout(fetchTrends, 5000)
    return () => clearTimeout(timer)
  }, [generating, fetchTrends])

  return { trends, loading, generating, fetchTrends }
}
