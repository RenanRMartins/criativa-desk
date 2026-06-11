import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import type { SocialNetwork } from '@/types'

export interface ConnectedAccount {
  id: string
  provider: SocialNetwork
  profileName: string
  profileAvatar?: string
  status: string
}

function isDemo(token: string | null): boolean {
  return !token || token.startsWith('demo-token')
}

export function useSocialAccounts(projectId?: string) {
  const { token } = useAuthStore()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])

  useEffect(() => {
    if (!projectId || isDemo(token)) {
      setAccounts([])
      return
    }
    api.get<ConnectedAccount[]>(`/social/accounts?projectId=${projectId}`)
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }, [projectId, token])

  return { accounts, setAccounts }
}
