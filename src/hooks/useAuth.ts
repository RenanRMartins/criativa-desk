import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { api } from '@/lib/api'
import type { AuthUser } from '@/types'

const DEMO_USERS: Record<string, AuthUser> = {
  'admin@criativadesk.com': {
    id: 'demo-admin',
    name: 'Admin CrIAtiva Desk',
    email: 'admin@criativadesk.com',
    role: 'OWNER',
    plan: 'AGENCY',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    token: 'demo-token-admin',
  },
  'social@criativadesk.com': {
    id: 'demo-social',
    name: 'Social Media Demo',
    email: 'social@criativadesk.com',
    role: 'SOCIAL_MEDIA',
    plan: 'PROFESSIONAL',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    token: 'demo-token-social',
  },
}

const DEMO_PASSWORDS: Record<string, string> = {
  'admin@criativadesk.com': 'admin123',
  'social@criativadesk.com': 'demo123',
}

export function useAuth() {
  const { user, token, isAuthenticated, login, logout: storeLogout } = useAuthStore()
  const { setActiveProject, setProjects } = useProjectStore()
  const navigate = useNavigate()

  const signIn = useCallback(
    async (email: string, password: string) => {
      // Demo mode — sem backend necessário
      if (DEMO_USERS[email] && DEMO_PASSWORDS[email] === password) {
        const demoUser = DEMO_USERS[email]
        login(demoUser)
        return demoUser
      }
      // Backend real
      const data = await api.post<{ user: AuthUser; token: string }>('/auth/login', {
        email,
        password,
      })
      login({ ...data.user, token: data.token })
      return data.user
    },
    [login]
  )

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api.post<{ user: AuthUser; token: string }>('/auth/register', {
        name,
        email,
        password,
      })
      login({ ...data.user, token: data.token })
      return data.user
    },
    [login]
  )

  const logout = useCallback(() => {
    storeLogout()
    setActiveProject(null)
    setProjects([])
    navigate('/login')
  }, [storeLogout, setActiveProject, setProjects, navigate])

  return { user, token, isAuthenticated, signIn, signUp, logout }
}
