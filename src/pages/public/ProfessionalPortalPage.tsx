import { useState } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Upload, MessageSquare, X, Clock, FileVideo, Check } from 'lucide-react'
import { MOCK_PROFESSIONALS, MOCK_VIDEO_TASKS } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'
import type { VideoTask } from '@/types'

function VideoTaskCard({ task, onSubmit, onCantRecord }: {
  task: VideoTask
  onSubmit: (taskId: string) => void
  onCantRecord: (taskId: string) => void
}) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  const isPastDeadline = new Date(task.deadline) < new Date()

  function handleFileChange() {
    setUploading(true)
    setTimeout(() => {
      setUploading(false)
      setDone(true)
      onSubmit(task.id)
    }, 1500)
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-white/50 mb-0.5">Tema do vídeo</p>
          <h3 className="font-heading font-semibold text-white text-base">{task.title}</h3>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${isPastDeadline ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
          {isPastDeadline ? 'Atrasado' : 'Pendente'}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs text-white/60">
        <span className="flex items-center gap-1"><Clock size={12} /> Prazo: {formatDate(task.deadline)}</span>
        {task.suggestedDuration && <span className="flex items-center gap-1"><FileVideo size={12} /> ~{task.suggestedDuration}s</span>}
      </div>

      {task.description && (
        <p className="text-white/70 text-sm mb-3 leading-relaxed">{task.description}</p>
      )}
      {task.recordingGuide && (
        <div className="p-3 rounded-xl mb-3 text-sm text-white/80 leading-relaxed" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-medium text-white/50 mb-1">Orientações de gravação</p>
          {task.recordingGuide}
        </div>
      )}
      {task.toneOfVoice && (
        <p className="text-xs text-white/50 mb-3">Tom de voz: <span className="text-white/70">{task.toneOfVoice}</span></p>
      )}

      {done ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <Check size={16} /> Vídeo enviado com sucesso!
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all" style={{ background: 'var(--color-cream-warm)', color: 'var(--color-wine)' }}>
            <Upload size={14} />
            {uploading ? 'Enviando...' : 'Enviar vídeo'}
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>

          <button
            onClick={() => setShowNote(!showNote)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm cursor-pointer transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
          >
            <MessageSquare size={14} /> Observação
          </button>

          <button
            onClick={() => onCantRecord(task.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm cursor-pointer transition-colors"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}
          >
            <X size={14} /> Não consigo gravar
          </button>
        </div>
      )}

      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Deixe uma observação para a equipe..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProfessionalPortalPage() {
  const { token } = useParams()
  const professional = MOCK_PROFESSIONALS.find(p => p.accessToken === token) ?? MOCK_PROFESSIONALS[0]
  const tasks = MOCK_VIDEO_TASKS.filter(t => t.professionalId === professional?.id)

  function handleSubmit() {}
  function handleCantRecord() {}

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-wine)' }}>
        <p className="text-white">Link inválido ou expirado.</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen p-6"
      style={{ background: 'var(--color-wine)' }}
    >
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-wine mx-auto mb-3" style={{ background: 'var(--color-cream-warm)' }}>
            {professional.name[0]}
          </div>
          <h1 className="font-heading font-bold text-white text-2xl">Olá, {professional.name.split(' ')[0]}!</h1>
          <p className="text-white/60 text-sm mt-1">
            {tasks.length === 0
              ? 'Nenhum vídeo pendente no momento.'
              : `Você tem ${tasks.length} ${tasks.length === 1 ? 'vídeo' : 'vídeos'} para gravar esta semana.`}
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Check size={48} className="mx-auto mb-3 text-emerald-400" />
            <p className="text-white font-medium">Tudo em dia!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <VideoTaskCard key={task.id} task={task} onSubmit={handleSubmit} onCantRecord={handleCantRecord} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
