import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { MOCK_VIDEO_TASKS, MOCK_PROFESSIONALS } from '@/lib/mockData'
import type { VideoTask, Professional } from '@/types'

function isDemo(token: string | null): boolean {
  return !token || token.startsWith('demo-token')
}

export function useVideoTasks(projectId?: string) {
  const { token } = useAuthStore()
  const [tasks, setTasks] = useState<VideoTask[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])

  const fetchTasks = useCallback(async () => {
    if (isDemo(token)) {
      const filtered = projectId
        ? MOCK_VIDEO_TASKS.filter(t =>
            MOCK_PROFESSIONALS.filter(p => p.projectId === projectId).map(p => p.id).includes(t.professionalId)
          )
        : MOCK_VIDEO_TASKS
      setTasks(filtered)
      return
    }
    try {
      const query = projectId ? `?projectId=${projectId}` : ''
      const data = await api.get<VideoTask[]>(`/video-tasks${query}`)
      setTasks(data.length > 0 ? data : MOCK_VIDEO_TASKS)
    } catch {
      setTasks(MOCK_VIDEO_TASKS)
    }
  }, [token, projectId])

  const fetchProfessionals = useCallback(async () => {
    if (isDemo(token)) {
      const filtered = projectId
        ? MOCK_PROFESSIONALS.filter(p => p.projectId === projectId)
        : MOCK_PROFESSIONALS
      setProfessionals(filtered)
      return
    }
    try {
      const query = projectId ? `?projectId=${projectId}` : ''
      const data = await api.get<Professional[]>(`/professionals${query}`)
      setProfessionals(data.length > 0 ? data : MOCK_PROFESSIONALS)
    } catch {
      setProfessionals(MOCK_PROFESSIONALS)
    }
  }, [token, projectId])

  const createTask = useCallback(async (body: Partial<VideoTask> & { professionalId: string; title: string; deadline: string }) => {
    if (isDemo(token)) {
      const mock: VideoTask = {
        id: `task-${Date.now()}`,
        professionalId: body.professionalId,
        title: body.title,
        deadline: body.deadline,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setTasks(prev => [...prev, mock])
      return mock
    }
    const data = await api.post<VideoTask>('/video-tasks', body)
    setTasks(prev => [...prev, data])
    return data
  }, [token])

  const createProfessional = useCallback(async (body: { projectId: string; name: string; email?: string; phone?: string; bio?: string }) => {
    if (isDemo(token)) {
      const mock: Professional = {
        id: `prof-${Date.now()}`,
        projectId: body.projectId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        bio: body.bio,
        accessToken: `token-${Date.now()}`,
        createdAt: new Date().toISOString(),
        videoTasks: [],
      }
      setProfessionals(prev => [...prev, mock])
      return mock
    }
    const data = await api.post<Professional>('/professionals', body)
    setProfessionals(prev => [...prev, data])
    return data
  }, [token])

  return { tasks, professionals, fetchTasks, fetchProfessionals, createTask, createProfessional, setTasks }
}
