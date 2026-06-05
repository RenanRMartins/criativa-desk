import { useState, useEffect } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, XCircle, MessageSquare, Link2, Clock, ChevronDown } from 'lucide-react'
import { usePosts } from '@/hooks/usePosts'
import StatusBadge from '@/components/ui/StatusBadge'
import { ApprovalComments } from '@/components/approvals/ApprovalComments'
import { formatDate, truncate } from '@/lib/utils'
import type { ApprovalComment } from '@/types'

const container = { animate: { transition: { staggerChildren: 0.05 } } }
const card = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }
const TABS = ['Pendentes', 'Aprovados', 'Com ajustes', 'Todos']

export default function ApprovalsPage() {
  const { posts, fetchPosts, updatePost } = usePosts()
  const [activeTab, setActiveTab] = useState('Pendentes')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, ApprovalComment[]>>({})

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const approvalPosts = posts.filter(p =>
    ['PENDING_APPROVAL', 'APPROVED', 'CHANGES_REQUESTED'].includes(p.status)
  )
  const filtered = approvalPosts.filter(p => {
    if (activeTab === 'Pendentes') return p.status === 'PENDING_APPROVAL'
    if (activeTab === 'Aprovados') return p.status === 'APPROVED'
    if (activeTab === 'Com ajustes') return p.status === 'CHANGES_REQUESTED'
    return true
  })

  function copyLink(postId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/aprovar/mock-token-${postId}`)
    setCopiedId(postId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function addComment(postId: string, text: string, authorName: string, authorType: 'client' | 'social_media') {
    const newComment: ApprovalComment = {
      id: Math.random().toString(36).slice(2),
      approvalId: postId,
      authorName,
      authorType,
      text,
      createdAt: new Date().toISOString(),
    }
    setCommentsMap(prev => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), newComment],
    }))
  }

  const tabCount = (tab: string) => {
    if (tab === 'Pendentes') return approvalPosts.filter(p => p.status === 'PENDING_APPROVAL').length
    if (tab === 'Aprovados') return approvalPosts.filter(p => p.status === 'APPROVED').length
    if (tab === 'Com ajustes') return approvalPosts.filter(p => p.status === 'CHANGES_REQUESTED').length
    return 0
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-2xl">Aprovações</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
          Gerencie aprovações de conteúdo com seus clientes
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b" style={{ borderBottomColor: 'var(--color-gray-border)' }}>
        {TABS.map(tab => {
          const count = tabCount(tab)
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer transition-colors border-b-2 -mb-px"
              style={{
                borderBottomColor: activeTab === tab ? 'var(--color-wine)' : 'transparent',
                color: activeTab === tab ? 'var(--color-wine)' : 'var(--color-gray-text)',
              }}
            >
              {tab}
              {tab !== 'Todos' && count > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: activeTab === tab ? 'var(--color-wine)' : 'var(--color-gray-border)',
                    color: activeTab === tab ? 'white' : 'var(--color-gray-text)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Cards */}
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ background: 'white', border: '1px solid var(--color-gray-border)' }}>
            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400" />
            <p className="font-medium">Nenhum post nesta categoria</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-gray-text)' }}>
              Tudo aprovado por aqui!
            </p>
          </div>
        ) : (
          filtered.map(post => {
            const comments = commentsMap[post.id] ?? []
            const isExpanded = expandedId === post.id

            return (
              <motion.div
                key={post.id}
                variants={card}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'white', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-gray-border)' }}
              >
                {/* Card main row */}
                <div className="flex items-start gap-4 p-5">
                  {/* Media placeholder */}
                  <div
                    className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, var(--color-wine-subtle), var(--color-gray-light))' }}
                  >
                    <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--color-wine-light)', opacity: 0.4 }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-heading font-semibold text-sm leading-snug" style={{ color: 'var(--color-black)' }}>
                        {post.title}
                      </h3>
                      <StatusBadge status={post.status} size="sm" />
                    </div>

                    {post.caption && (
                      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--color-gray-text)' }}>
                        {truncate(post.caption, 110)}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs mb-4" style={{ color: 'var(--color-gray-text)' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {post.publishDate ? formatDate(post.publishDate) : 'Sem data'}
                      </span>
                      <span>{post.networks.join(', ')}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {post.status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            onClick={() => updatePost(post.id, { status: 'APPROVED' })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all hover:opacity-90"
                            style={{ background: '#10B981', color: 'white' }}
                          >
                            <CheckCircle2 size={12} /> Aprovar
                          </button>
                          <button
                            onClick={() => updatePost(post.id, { status: 'CHANGES_REQUESTED' })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all hover:opacity-90"
                            style={{ background: '#EF4444', color: 'white' }}
                          >
                            <XCircle size={12} /> Solicitar ajuste
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs cursor-pointer border transition-colors hover:bg-gray-50"
                        style={{
                          borderColor: isExpanded ? 'var(--color-wine-light)' : 'var(--color-gray-border)',
                          color: isExpanded ? 'var(--color-wine)' : 'var(--color-gray-text)',
                        }}
                      >
                        <MessageSquare size={12} />
                        Comentários {comments.length > 0 && `(${comments.length})`}
                        <ChevronDown size={11} className={isExpanded ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                      </button>

                      <button
                        onClick={() => copyLink(post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs cursor-pointer border ml-auto transition-all"
                        style={{
                          borderColor: copiedId === post.id ? '#10B981' : 'var(--color-gray-border)',
                          color: copiedId === post.id ? '#10B981' : 'var(--color-gray-text)',
                          background: copiedId === post.id ? 'rgba(16,185,129,0.05)' : 'transparent',
                        }}
                      >
                        <Link2 size={12} />
                        {copiedId === post.id ? 'Copiado!' : 'Link para cliente'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable comments section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-2 border-t" style={{ borderTopColor: 'var(--color-gray-border)' }}>
                        <ApprovalComments
                          comments={comments}
                          onAdd={(text, authorName, authorType) => addComment(post.id, text, authorName, authorType)}
                          currentUserName="Social Media"
                          currentUserType="social_media"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </motion.div>
    </motion.div>
  )
}
