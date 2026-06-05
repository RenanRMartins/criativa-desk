import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bell, CheckCheck, Clock, Video, CheckCircle2, Sparkles, X, TrendingUp } from 'lucide-react'
import { formatDateRelative } from '@/lib/utils'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  approval:  { icon: CheckCircle2, color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  video:     { icon: Video,        color: '#F97316', bg: 'rgba(249,115,22,0.12)'  },
  scheduled: { icon: Clock,        color: '#6B2D3E', bg: 'rgba(107,45,62,0.12)'   },
  trend:     { icon: TrendingUp,   color: '#C9A96E', bg: 'rgba(201,169,110,0.12)' },
  system:    { icon: Sparkles,     color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
}

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.system
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, fetch, markAllRead, markRead, dismiss } = useNotifications()

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl cursor-pointer transition-colors hover:bg-gray-100"
        title="Notificações"
      >
        <Bell size={18} style={{ color: open ? 'var(--color-wine)' : 'var(--color-gray-text)' }} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: 'var(--color-wine)', fontSize: 9 }}
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
            style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(232,226,218,0.5)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderBottomColor: 'var(--color-gray-border)' }}>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-sm">Notificações</h3>
                {unread > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}>
                    {unread} nova{unread > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-wine)' }}>
                  <CheckCheck size={12} /> Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <Bell size={28} style={{ color: 'var(--color-gray-border)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--color-gray-border)' }}>
                  <AnimatePresence initial={false}>
                    {notifications.map((n: AppNotification) => {
                      const cfg = getConfig(n.type)
                      const Icon = cfg.icon
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 group relative"
                          style={{ background: n.read ? 'transparent' : 'rgba(107,45,62,0.02)' }}
                          onClick={() => markRead(n.id)}
                        >
                          {!n.read && (
                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                              style={{ background: 'var(--color-wine-light)' }} />
                          )}
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: cfg.bg }}>
                            <Icon size={14} style={{ color: cfg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug"
                              style={{ color: n.read ? 'var(--color-gray-text)' : 'var(--color-black)' }}>
                              {n.title}
                            </p>
                            <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
                              {n.message}
                            </p>
                            <span className="text-xs mt-1 block" style={{ color: 'var(--color-gray-text)', fontSize: 9 }}>
                              {formatDateRelative(n.createdAt)}
                            </span>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                            className="p-1 rounded-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 flex-shrink-0"
                          >
                            <X size={11} style={{ color: 'var(--color-gray-text)' }} />
                          </button>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t text-center"
                style={{ borderTopColor: 'var(--color-gray-border)' }}>
                <button onClick={() => { setOpen(false); fetch() }}
                  className="text-xs cursor-pointer hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-wine)' }}>
                  Atualizar notificações
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
