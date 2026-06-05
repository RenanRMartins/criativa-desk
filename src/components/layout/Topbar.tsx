import { ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { NotificationBell } from './NotificationBell'
import { ThemePicker } from '@/components/ui/ThemePicker'
import type { Project } from '@/types'

export default function Topbar() {
  const { user, logout } = useAuthStore()
  const { activeProject, projects, setActiveProject } = useProjectStore()
  const navigate = useNavigate()
  const [projectOpen, setProjectOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const projectRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectOpen(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header
      className="flex items-center h-16 px-6 border-b gap-4 flex-shrink-0"
      style={{
        background: 'var(--color-cream)',
        borderBottomColor: 'var(--color-gray-border)',
      }}
    >
      {/* Project Switcher */}
      <div className="relative" ref={projectRef}>
        <button
          onClick={() => setProjectOpen(!projectOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:border-wine/40"
          style={{ borderColor: 'var(--color-gray-border)' }}
        >
          {activeProject?.profilePhoto ? (
            <img
              src={activeProject.profilePhoto}
              alt={activeProject.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: activeProject?.primaryColor ?? 'var(--color-wine)' }}
            >
              {activeProject ? getInitials(activeProject.name) : '?'}
            </div>
          )}
          <span className="text-sm font-medium" style={{ color: 'var(--color-black)' }}>
            {activeProject?.name ?? 'Selecionar projeto'}
          </span>
          <ChevronDown size={14} style={{ color: 'var(--color-gray-text)' }} />
        </button>

        {projectOpen && (
          <div
            className="absolute top-full left-0 mt-1 w-56 rounded-xl border shadow-modal z-50 overflow-hidden"
            style={{ background: 'white', borderColor: 'var(--color-gray-border)' }}
          >
            {projects.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-gray-text)' }}>
                Nenhum projeto
              </p>
            ) : (
              projects.map((p: Project) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p)
                    setProjectOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left cursor-pointer transition-colors hover:bg-gray-50',
                    activeProject?.id === p.id && 'bg-wine-subtle'
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: p.primaryColor }}
                  >
                    {getInitials(p.name)}
                  </div>
                  <span className="truncate">{p.name}</span>
                </button>
              ))
            )}
            <div className="border-t p-1" style={{ borderTopColor: 'var(--color-gray-border)' }}>
              <button
                onClick={() => { navigate('/projects'); setProjectOpen(false) }}
                className="w-full px-3 py-2 text-sm text-left rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                style={{ color: 'var(--color-wine)' }}
              >
                + Novo projeto
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Theme Picker */}
      <ThemePicker />

      {/* Notification Bell */}
      <NotificationBell />

      {/* User menu */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => setUserOpen(!userOpen)}
          className="flex items-center gap-2 pl-2 cursor-pointer"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--color-wine)' }}
            >
              {user ? getInitials(user.name) : 'U'}
            </div>
          )}
          <ChevronDown size={14} style={{ color: 'var(--color-gray-text)' }} />
        </button>

        {userOpen && (
          <div
            className="absolute top-full right-0 mt-1 w-48 rounded-xl border shadow-modal z-50 overflow-hidden"
            style={{ background: 'white', borderColor: 'var(--color-gray-border)' }}
          >
            <div className="px-3 py-2.5 border-b" style={{ borderBottomColor: 'var(--color-gray-border)' }}>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-gray-text)' }}>{user?.email}</p>
            </div>
            <button
              onClick={() => { navigate('/settings'); setUserOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left cursor-pointer hover:bg-gray-50"
            >
              <Settings size={14} /> Configurações
            </button>
            <button
              onClick={() => { navigate('/settings'); setUserOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left cursor-pointer hover:bg-gray-50"
            >
              <User size={14} /> Meu perfil
            </button>
            <div className="border-t" style={{ borderTopColor: 'var(--color-gray-border)' }}>
              <button
                onClick={() => { logout(); setUserOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left cursor-pointer hover:bg-red-50"
                style={{ color: '#DC2626' }}
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
