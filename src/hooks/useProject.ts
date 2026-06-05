import { useCallback, useEffect, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { api } from '@/lib/api'
import type { Project } from '@/types'

export function useProject() {
  const { activeProject, projects, setActiveProject, setProjects, updateProject } =
    useProjectStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Project[]>('/projects')
      setProjects(data)
      if (!activeProject && data.length > 0) {
        setActiveProject(data[0])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar projetos')
    } finally {
      setLoading(false)
    }
  }, [activeProject, setActiveProject, setProjects])

  const createProject = useCallback(
    async (data: Partial<Project>) => {
      const project = await api.post<Project>('/projects', data)
      setProjects([...projects, project])
      return project
    },
    [projects, setProjects]
  )

  const patchProject = useCallback(
    async (id: string, data: Partial<Project>) => {
      const updated = await api.patch<Project>(`/projects/${id}`, data)
      updateProject(id, updated)
      return updated
    },
    [updateProject]
  )

  return {
    activeProject,
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    patchProject,
    setActiveProject,
  }
}
