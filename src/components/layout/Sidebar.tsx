import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, CalendarDays, Video, CheckCircle2,
  Clock, Sparkles, TrendingUp, Search, Palette, Library,
  BarChart3, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { motion, AnimatePresence } from 'motion/react'

const NAV_SECTIONS = [
  {
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/projects', icon: FolderOpen, label: 'Projetos' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendário' },
      { to: '/videos', icon: Video, label: 'Vídeos' },
      { to: '/approvals', icon: CheckCircle2, label: 'Aprovações' },
      { to: '/scheduling', icon: Clock, label: 'Agendamentos' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { to: '/copydesk', icon: Sparkles, label: 'CopyDesk', badge: 'IA' },
      { to: '/trenddesk', icon: TrendingUp, label: 'TrendDesk' },
      { to: '/searchdesk', icon: Search, label: 'SearchDesk' },
      { to: '/designdesk', icon: Palette, label: 'DesignDesk' },
    ],
  },
  {
    items: [
      { to: '/library', icon: Library, label: 'Biblioteca' },
      { to: '/reports', icon: BarChart3, label: 'Relatórios' },
      { to: '/settings', icon: Settings, label: 'Configurações' },
    ],
  },
]

type NavItem = { to: string; icon: React.ElementType; label: string; badge?: string }

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-full flex-shrink-0 overflow-hidden relative"
      style={{
        background: 'linear-gradient(180deg, #0A0608 0%, #120810 50%, #0E0609 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Subtle glow at top */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse at top, rgba(107,45,62,0.4) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/5 relative flex-shrink-0">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 flex-1 min-w-0"
            >
              <img src="/logo.png" alt="CrIAtiva Desk"
                className="w-8 h-8 rounded-xl flex-shrink-0 object-cover" />
              <div className="min-w-0">
                <span className="font-heading font-bold text-white text-base leading-none">CrIAtiva Desk</span>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>Social Media OS</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <img src="/logo.png" alt="CrIAtiva Desk" className="w-8 h-8 rounded-xl object-cover" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={toggleSidebar}
          className="ml-auto p-1.5 rounded-lg cursor-pointer transition-all hover:bg-white/10 flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 relative">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {si > 0 && (
              <div className="my-2.5">
                <div className="h-px mx-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
                {!sidebarCollapsed && section.label && (
                  <AnimatePresence>
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-xs uppercase tracking-widest px-3 pt-3 pb-1 font-medium"
                      style={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                      {section.label}
                    </motion.p>
                  </AnimatePresence>
                )}
              </div>
            )}
            {section.items.map(item => <NavItem key={item.to} item={item} collapsed={sidebarCollapsed} />)}
          </div>
        ))}
      </nav>

      {/* Bottom version tag */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-white/5">
          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.12)' }}>v1.0 · beta</p>
        </div>
      )}
    </motion.aside>
  )
}

function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { icon: Icon, to, label, badge } = item

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer group relative overflow-hidden',
          isActive
            ? 'text-white'
            : 'text-white/40 hover:text-white/80 hover:bg-white/5'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active background */}
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute inset-0 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(107,45,62,0.6) 0%, rgba(139,58,78,0.4) 100%)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          {/* Active left border */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full" style={{ background: 'var(--color-wine-light)' }} />
          )}

          <Icon size={17} className="flex-shrink-0 relative z-10" />

          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="truncate flex-1 whitespace-nowrap overflow-hidden relative z-10 text-sm"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>

          {badge && !collapsed && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 relative z-10"
              style={{ background: 'var(--color-wine-light)', color: 'white', fontSize: 9 }}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
