import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from '@/types'

interface ProjectState {
  activeProject: Project | null
  projects: Project[]
  setActiveProject: (project: Project | null) => void
  setProjects: (projects: Project[]) => void
  updateProject: (id: string, updates: Partial<Project>) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProject: null,
      projects: [],
      setActiveProject: (project) => set({ activeProject: project }),
      setProjects: (projects) => set({ projects }),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          activeProject:
            state.activeProject?.id === id
              ? { ...state.activeProject, ...updates }
              : state.activeProject,
        })),
    }),
    { name: 'criativa-desk-project' }
  )
)
