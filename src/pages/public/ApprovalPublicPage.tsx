import { useState } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, MessageSquare, Send, Check, X } from 'lucide-react'
import { MOCK_POSTS } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'
import { NETWORK_LABELS, FORMAT_LABELS } from '@/lib/constants'

export default function ApprovalPublicPage() {
  const { token } = useParams()
  const post = MOCK_POSTS.find(p => p.status === 'PENDING_APPROVAL') ?? MOCK_POSTS[0]
  const [comment, setComment] = useState('')
  const [action, setAction] = useState<'approved' | 'changes' | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleAction(type: 'approved' | 'changes') {
    setAction(type)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-cream)' }}>
        <div className="text-center">
          {action === 'approved' ? (
            <>
              <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-500" />
              <h1 className="font-heading font-bold text-2xl mb-2">Conteúdo aprovado!</h1>
              <p style={{ color: 'var(--color-gray-text)' }}>A equipe foi notificada e o post será publicado na data prevista.</p>
            </>
          ) : (
            <>
              <MessageSquare size={56} className="mx-auto mb-4" style={{ color: 'var(--color-wine)' }} />
              <h1 className="font-heading font-bold text-2xl mb-2">Ajustes solicitados!</h1>
              <p style={{ color: 'var(--color-gray-text)' }}>A equipe receberá seus comentários e fará os ajustes necessários.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      {/* Header */}
      <div className="h-16 border-b flex items-center px-6" style={{ background: 'white', borderBottomColor: 'var(--color-gray-border)' }}>
        <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-wine)' }}>CrIAtiva Desk</h1>
        <span className="ml-3 text-sm" style={{ color: 'var(--color-gray-text)' }}>Aprovação de Conteúdo</span>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="font-heading font-bold text-xl mb-0.5">{post.title}</h2>
          <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
            {post.publishDate ? formatDate(post.publishDate) : 'Sem data'} · {post.networks.map(n => NETWORK_LABELS[n]).join(', ')} · {FORMAT_LABELS[post.format]}
          </p>
        </div>

        {/* Media placeholder */}
        <div className="rounded-2xl h-64 flex items-center justify-center" style={{ background: 'var(--color-gray-light)' }}>
          <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Prévia da mídia</p>
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="rounded-xl p-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-gray-text)' }}>Legenda</p>
            <p className="text-sm leading-relaxed whitespace-pre-line">{post.caption}</p>
            {post.hashtags.length > 0 && (
              <p className="text-sm mt-2" style={{ color: 'var(--color-wine)' }}>{post.hashtags.join(' ')}</p>
            )}
          </div>
        )}

        {/* Comment */}
        <div className="rounded-xl p-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm font-medium mb-2">Deixe um comentário (opcional)</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Ex: Por favor ajustar a cor, trocar a imagem..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'var(--color-gray-border)' }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => handleAction('approved')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium cursor-pointer"
            style={{ background: '#10B981' }}
          >
            <Check size={18} /> Aprovar conteúdo
          </button>
          <button
            onClick={() => handleAction('changes')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium cursor-pointer border-2"
            style={{ borderColor: 'var(--color-wine)', color: 'var(--color-wine)' }}
          >
            <MessageSquare size={18} /> Pedir ajustes
          </button>
        </div>
      </div>
    </motion.div>
  )
}
