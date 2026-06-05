import { useState } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion } from 'motion/react'
import { Video, Download, Link2, FolderInput, Play } from 'lucide-react'
import { MOCK_VIDEO_TASKS, MOCK_PROFESSIONALS } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'

const container = { animate: { transition: { staggerChildren: 0.05 } } }
const card = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

export default function VideosReceivedPage() {
  const [filter, setFilter] = useState('TODOS')
  const tasks = MOCK_VIDEO_TASKS.filter(t => t.videoUrl || filter === 'TODOS')

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Vídeos Recebidos</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
          Vídeos enviados pelos profissionais para edição
        </p>
      </div>

      {MOCK_VIDEO_TASKS.length === 0 ? (
        <div className="text-center py-24">
          <Video size={48} className="mx-auto mb-4" style={{ color: 'var(--color-gray-border)' }} />
          <p className="font-medium mb-1">Nenhum vídeo recebido ainda</p>
          <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
            Os vídeos enviados pelos profissionais aparecerão aqui
          </p>
        </div>
      ) : (
        <motion.div variants={container} initial="initial" animate="animate" className="grid grid-cols-2 gap-5">
          {MOCK_VIDEO_TASKS.map(task => {
            const prof = MOCK_PROFESSIONALS.find(p => p.id === task.professionalId)
            return (
              <motion.div
                key={task.id}
                variants={card}
                className="rounded-card overflow-hidden"
                style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
              >
                {/* Video thumbnail */}
                <div
                  className="h-40 relative flex items-center justify-center cursor-pointer group"
                  style={{ background: 'var(--color-black-soft)' }}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <Play size={20} color="white" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <span className="text-white text-sm font-medium">Reproduzir</span>
                  </div>
                  <span className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    {task.suggestedDuration ?? 0}s
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1">{task.title}</h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--color-gray-text)' }}>
                    {prof?.name ?? 'Profissional'} · Prazo: {formatDate(task.deadline)}
                  </p>
                  {task.professionalNote && (
                    <p className="text-xs mb-3 p-2 rounded-lg italic" style={{ background: 'var(--color-gray-light)', color: 'var(--color-gray-text)' }}>
                      "{task.professionalNote}"
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer" style={{ background: 'var(--color-wine)', color: 'white' }}>
                      <Link2 size={11} /> Vincular ao post
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer border" style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-gray-text)' }}>
                      <Download size={11} /> Baixar
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer border" style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-gray-text)' }}>
                      <FolderInput size={11} /> Biblioteca
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
