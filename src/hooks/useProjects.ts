import { useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { api } from '@/lib/api'
import { MOCK_PROJECTS } from '@/lib/mockData'
import type { Project } from '@/types'

function isDemo(token: string | null): boolean {
  return !token || token.startsWith('demo-token')
}

export function useProjects() {
  const { token } = useAuthStore()
  const { projects, setProjects, activeProject, setActiveProject, updateProject } = useProjectStore()

  const fetchProjects = useCallback(async () => {
    if (isDemo(token)) {
      if (projects.length === 0) setProjects(MOCK_PROJECTS)
      return
    }
    try {
      const data = await api.get<Project[]>('/projects')
      setProjects(data.length > 0 ? data : MOCK_PROJECTS)
    } catch {
      if (projects.length === 0) setProjects(MOCK_PROJECTS)
    }
  }, [token, projects, setProjects])

  const createProject = useCallback(async (body: { name: string; niche?: string; description?: string }) => {
    if (isDemo(token)) {
      const mock: Project = {
        id: `proj-${Date.now()}`,
        name: body.name,
        niche: body.niche ?? '',
        slug: body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        primaryColor: '#6B2D3E', secondaryColor: '#FAF7F2', accentColor: '#C9A96E',
        fontHeading: 'Playfair Display', fontBody: 'Inter',
        forbiddenWords: [], forbiddenTopics: [], defaultCTAs: [], defaultHashtags: [],
        contentPillars: [], brandKeywords: [], competitors: [], niches: [], searchKeywords: [],
        isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        _count: { posts: 0, professionals: 0 },
      }
      setProjects([...projects, mock])
      return mock
    }
    const data = await api.post<Project>('/projects', body)
    setProjects([...projects, data])
    return data
  }, [token, projects, setProjects])

  return { projects, activeProject, setActiveProject, updateProject, fetchProjects, createProject }
}
