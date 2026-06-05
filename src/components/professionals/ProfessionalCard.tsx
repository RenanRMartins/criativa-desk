import { motion } from 'motion/react'
import { Mail, Phone, ExternalLink, Video, Clock, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { getInitials } from '@/lib/utils'
import type { Professional } from '@/types'

interface ProfessionalCardProps {
  professional: Professional
  onCreateTask?: (professionalId: string) => void
}

const STATUS_CONFIG = {
  PENDING:     { label: 'Pendente',      color: '#FBBF24', bg: 'rgba(251,191,36,0.12)'  },
  SENT:        { label: 'Enviado',       color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  CANT_RECORD: { label: 'Não gravou',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  OVERDUE:     { label: 'Atrasado',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
}

export function ProfessionalCard({ professional, onCreateTask }: ProfessionalCardProps) {
  const [linkCopied, setLinkCopied] = useState(false)
  const tasks = professional.videoTasks ?? []

  const pending  = tasks.filter(t => t.status === 'PENDING').length
  const sent     = tasks.filter(t => t.status === 'SENT').length
  const overdue  = tasks.filter(t => t.status === 'OVERDUE').length
  const cantRec  = tasks.filter(t => t.status === 'CANT_RECORD').length

  function copyPortalLink() {
    const url = `${window.location.origin}/gravar/${professional.accessToken}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden group"
      style={{ background: 'white', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-gray-border)' }}
      whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(107,45,62,0.12)' } as never}
      transition={{ duration: 0.15 }}
    >
      {/* Header with gradient */}
      <div
        className="h-16 relative"
        style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)' }}
      >
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.3), transparent)' }} />
      </div>

      <div className="px-4 pb-4 -mt-8">
        {/* Avatar */}
        <div className="flex items-end justify-between mb-3">
          {professional.avatarUrl ? (
            <img
              src={professional.avatarUrl}
              alt={professional.name}
              className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white border-4 border-white shadow-md"
              style={{ background: 'var(--color-wine)' }}
            >
              {getInitials(professional.name)}
            </div>
          )}
          <div className="flex gap-1.5 pb-0.5">
            {professional.email && (
              <a href={`mailto:${professional.email}`}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-wine-subtle"
                style={{ color: 'var(--color-gray-text)' }}
                onClick={e => e.stopPropagation()}
              >
                <Mail size={14} />
              </a>
            )}
            {professional.phone && (
              <a href={`tel:${professional.phone}`}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-wine-subtle"
                style={{ color: 'var(--color-gray-text)' }}
              >
                <Phone size={14} />
              </a>
            )}
            <a
              href={`/gravar/${professional.accessToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-wine-subtle"
              style={{ color: 'var(--color-gray-text)' }}
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <h3 className="font-heading font-semibold text-base mb-0.5" style={{ color: 'var(--color-black)' }}>
          {professional.name}
        </h3>
        {professional.bio && (
          <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-gray-text)' }}>
            {professional.bio}
          </p>
        )}

        {/* Task stats */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[
              { label: 'Pendentes',  count: pending,  color: '#FBBF24' },
              { label: 'Enviados',   count: sent,     color: '#10B981' },
              { label: 'Atrasados',  count: overdue,  color: '#EF4444' },
              { label: 'Não gravou', count: cantRec,  color: '#94A3B8' },
            ].map(stat => (
              <div
                key={stat.label}
                className="rounded-xl p-2 text-center"
                style={{ background: 'var(--color-gray-light)' }}
              >
                <p className="text-base font-bold" style={{ color: stat.color }}>{stat.count}</p>
                <p className="text-xs" style={{ color: 'var(--color-gray-text)', fontSize: 9 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {tasks.length === 0 && (
          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--color-gray-text)' }}>
            <CheckCircle2 size={12} className="text-emerald-400" />
            Sem tarefas pendentes
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={copyPortalLink}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border"
            style={{
              borderColor: linkCopied ? '#10B981' : 'var(--color-gray-border)',
              color: linkCopied ? '#10B981' : 'var(--color-gray-text)',
              background: linkCopied ? 'rgba(16,185,129,0.06)' : 'white',
            }}
          >
            {linkCopied ? <Check size={12} /> : <Copy size={12} />}
            {linkCopied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button
            onClick={() => onCreateTask?.(professional.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all text-white"
            style={{
              background: 'linear-gradient(135deg, var(--color-wine), var(--color-wine-medium))',
              boxShadow: '0 2px 8px rgba(107,45,62,0.3)',
            }}
          >
            <Video size={12} /> Nova tarefa
          </button>
        </div>
      </div>
    </motion.div>
  )
}
