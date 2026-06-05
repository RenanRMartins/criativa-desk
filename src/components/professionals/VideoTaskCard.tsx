import { motion } from 'motion/react'
import { Clock, Film, FileText, AlertCircle, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { formatDate, formatDateRelative } from '@/lib/utils'
import type { VideoTask } from '@/types'

interface VideoTaskCardProps {
  task: VideoTask
  onStatusChange?: (taskId: string, status: VideoTask['status']) => void
}

const STATUS_MAP = {
  PENDING:     { label: 'Pendente',   icon: Clock,         color: '#FBBF24', bg: 'rgba(251,191,36,0.12)'  },
  SENT:        { label: 'Enviado',    icon: CheckCircle2,  color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  CANT_RECORD: { label: 'Não gravou', icon: XCircle,       color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  OVERDUE:     { label: 'Atrasado',   icon: AlertCircle,   color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
}

export function VideoTaskCard({ task, onStatusChange }: VideoTaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const s = STATUS_MAP[task.status]
  const StatusIcon = s.icon
  const isPastDeadline = new Date(task.deadline) < new Date() && task.status === 'PENDING'
  const effectiveStatus = isPastDeadline ? STATUS_MAP.OVERDUE : s

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid var(--color-gray-border)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Status accent line */}
      <div className="h-0.5 w-full" style={{ background: effectiveStatus.color }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-sm leading-snug mb-1" style={{ color: 'var(--color-black)' }}>
              {task.title}
            </h3>
            {task.toneOfVoice && (
              <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
                Tom: {task.toneOfVoice}
              </p>
            )}
          </div>

          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
            style={{ background: effectiveStatus.bg, color: effectiveStatus.color }}
          >
            <StatusIcon size={10} />
            {effectiveStatus.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: isPastDeadline ? '#EF4444' : 'var(--color-gray-text)' }}>
            <Clock size={11} />
            {isPastDeadline ? 'Atrasado · ' : 'Prazo: '}
            {formatDate(task.deadline)}
          </div>
          {task.suggestedDuration && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-gray-text)' }}>
              <Film size={11} />
              ~{task.suggestedDuration}s
            </div>
          )}
        </div>

        {/* Description (short) */}
        {task.description && !expanded && (
          <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: 'var(--color-gray-text)' }}>
            {task.description}
          </p>
        )}

        {/* Expanded details */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 mb-3"
          >
            {task.description && (
              <div>
                <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Descrição</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-black)' }}>{task.description}</p>
              </div>
            )}
            {task.recordingGuide && (
              <div className="p-3 rounded-xl" style={{ background: 'var(--color-gray-light)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText size={11} style={{ color: 'var(--color-wine)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--color-wine)' }}>Orientações</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-gray-text)' }}>{task.recordingGuide}</p>
              </div>
            )}
            {task.observations && (
              <div>
                <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Observações</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-black)' }}>{task.observations}</p>
              </div>
            )}
            {task.professionalNote && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#10B981' }}>Nota do profissional</p>
                <p className="text-xs italic" style={{ color: 'var(--color-gray-text)' }}>"{task.professionalNote}"</p>
              </div>
            )}
            {task.cantRecordReason && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#EF4444' }}>Motivo (não gravou)</p>
                <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>{task.cantRecordReason}</p>
              </div>
            )}
            {task.videoUrl && (
              <a
                href={task.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}
              >
                <Film size={12} /> Ver vídeo enviado
              </a>
            )}
          </motion.div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-gray-text)' }}
          >
            {expanded ? 'Menos detalhes' : 'Ver detalhes'}
            <ChevronDown size={12} className={expanded ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
          </button>

          {task.status === 'SENT' && (
            <span className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
              Enviado {task.updatedAt ? formatDateRelative(task.updatedAt) : ''}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
