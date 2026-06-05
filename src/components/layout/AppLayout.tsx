import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { MusicPlayer } from '@/components/ui/music-player'
import { useProjects } from '@/hooks/useProjects'

export default function AppLayout() {
  const { fetchProjects } = useProjects()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
      <MusicPlayer />
    </div>
  )
}
