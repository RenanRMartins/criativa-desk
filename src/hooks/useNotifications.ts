import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  data?: Record<string, unknown>
  createdAt: string
}

function isDemo(token: string | null): boolean {
  return !token || token.startsWith('demo-token')
}

const MOCK: AppNotification[] = [
  { id: 'n1', type: 'approval', read: false, title: 'Post aprovado!', message: '"O que é Ozonioterapia?" foi aprovado pelo cliente.', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'n2', type: 'video', read: false, title: 'Vídeo recebido', message: 'Dra. Ana Paula enviou o vídeo sobre estresse.', createdAt: new Date(Date.now() - 28 * 60000).toISOString() },
  { id: 'n3', type: 'trend', read: false, title: 'Tendência em alta', message: '"Alimentação anti-inflamatória" está em alta esta semana.', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'n4', type: 'scheduled', read: true, title: 'Post agendado', message: '"5 alimentos que aceleram o metabolismo" será publicado amanhã.', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'n5', type: 'approval', read: true, title: 'Ajustes solicitados', message: 'O cliente pediu alterações na legenda do carrossel.', createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
]

export function useNotifications() {
  const { token } = useAuthStore()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const fetch = useCallback(async () => {
    if (isDemo(token)) { setNotifications(MOCK); return }
    try {
      const data = await api.get<AppNotification[]>('/notifications')
      setNotifications(data)
    } catch {
      setNotifications([])
    }
  }, [token])

  const markAllRead = useCallback(async () => {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
    if (!isDemo(token)) {
      try { await api.patch('/notifications/read-all', {}) } catch { /* silent */ }
    }
  }, [token])

  const markRead = useCallback(async (id: string) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
    if (!isDemo(token)) {
      try { await api.patch(`/notifications/${id}/read`, {}) } catch { /* silent */ }
    }
  }, [token])

  const dismiss = useCallback(async (id: string) => {
    setNotifications(ns => ns.filter(n => n.id !== id))
    if (!isDemo(token)) {
      try { await api.delete(`/notifications/${id}`) } catch { /* silent */ }
    }
  }, [token])

  return { notifications, fetch, markAllRead, markRead, dismiss }
}
