import { useState, useEffect } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion, AnimatePresence } from 'motion/react'
import { Clock, Send, XCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { usePosts } from '@/hooks/usePosts'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { useProjectStore } from '@/store/projectStore'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { NETWORK_LABELS } from '@/lib/constants'
import { useSocialAccounts } from '@/hooks/useSocialAccounts'
import type { Post, SocialNetwork } from '@/types'

function isDemo(token: string | null) { return !token || token.startsWith('demo-token') }

export default function SchedulingPage() {
  const { token } = useAuthStore()
  const { activeProject } = useProjectStore()
  const { posts, fetchPosts, updatePost } = usePosts(activeProject?.id)
  const { accounts } = useSocialAccounts(activeProject?.id)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [selectTarget, setSelectTarget] = useState<Post | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const scheduled = posts.filter(p => ['SCHEDULED', 'APPROVED', 'FAILED'].includes(p.status))

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // Abre o seletor de contas quando há contas conectadas nas redes do post;
  // sem contas (ou em demo) publica direto via mock
  function requestPublish(post: Post) {
    if (isDemo(token)) { void publishNow(post.id, post.title, []); return }
    const matching = accounts.filter(a => post.networks.includes(a.provider))
    if (matching.length === 0) { void publishNow(post.id, post.title, []); return }
    // pré-seleção: contas escolhidas na criação do post; senão, todas
    const preset = post.targetAccountIds?.length
      ? matching.filter(a => post.targetAccountIds!.includes(a.id)).map(a => a.id)
      : []
    setSelectedIds(preset.length > 0 ? preset : matching.map(a => a.id))
    setSelectTarget(post)
  }

  function toggleAccount(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function publishNow(postId: string, title: string, accountIds: string[]) {
    setPublishing(postId)
    setSelectTarget(null)
    try {
      if (isDemo(token)) {
        await new Promise(r => setTimeout(r, 1000))
        await updatePost(postId, { status: 'PUBLISHED', publishedAt: new Date().toISOString() })
      } else {
        await api.post(`/scheduling/${postId}/publish`, { accountIds })
        await updatePost(postId, { status: 'PUBLISHED' })
      }
      setToast(`"${title}" publicado com sucesso!`)
      setTimeout(() => setToast(null), 3000)
    } finally {
      setPublishing(null)
    }
  }

  async function cancelSchedule(postId: string) {
    if (isDemo(token)) {
      await updatePost(postId, { status: 'APPROVED', scheduledAt: undefined })
    } else {
      await api.delete(`/scheduling/${postId}`)
      await updatePost(postId, { status: 'APPROVED', scheduledAt: undefined })
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Agendamentos</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
          Posts agendados publicam automaticamente na hora marcada
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm"
            style={{ background: '#10B981', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}
          >
            <CheckCircle2 size={15} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
        {scheduled.length === 0 ? (
          <div className="p-16 text-center">
            <Clock size={40} className="mx-auto mb-3" style={{ color: 'var(--color-gray-border)' }} />
            <p className="font-medium mb-1">Nenhum post agendado</p>
            <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
              Aprove posts no Calendário ou Aprovações para eles aparecerem aqui
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderBottomColor: 'var(--color-gray-border)', background: 'var(--color-gray-light)' }}>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--color-gray-text)' }}>Post</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--color-gray-text)' }}>Redes</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--color-gray-text)' }}>Data</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--color-gray-text)' }}>Status</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--color-gray-text)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {scheduled.map(post => (
                <tr key={post.id} className="border-b hover:bg-gray-50 transition-colors"
                  style={{ borderBottomColor: 'var(--color-gray-border)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{post.title}</p>
                    {post.theme && <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>{post.theme}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {post.networks.map((n: SocialNetwork) => (
                        <span key={n} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-gray-light)', color: 'var(--color-gray-text)' }}>
                          {NETWORK_LABELS[n]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-gray-text)' }}>
                    {post.scheduledAt ? formatDate(post.scheduledAt) : post.publishDate ? formatDate(post.publishDate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={post.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => requestPublish(post)}
                        disabled={publishing === post.id}
                        className="p-1.5 rounded-lg cursor-pointer hover:bg-green-50 transition-colors disabled:opacity-50"
                        title="Publicar agora"
                      >
                        {publishing === post.id
                          ? <Loader2 size={14} color="#10B981" className="animate-spin" />
                          : <Send size={14} style={{ color: '#10B981' }} />
                        }
                      </button>
                      <button
                        onClick={() => cancelSchedule(post.id)}
                        className="p-1.5 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                        title="Cancelar agendamento"
                      >
                        <XCircle size={14} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: escolher contas para publicar */}
      <AnimatePresence>
        {selectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setSelectTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-2xl p-6 space-y-4"
              style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
              onClick={e => e.stopPropagation()}
            >
              <div>
                <h2 className="font-heading font-semibold text-lg">Publicar em quais contas?</h2>
                <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-gray-text)' }}>
                  "{selectTarget.title}"
                </p>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {accounts
                  .filter(a => selectTarget.networks.includes(a.provider))
                  .map(account => {
                    const checked = selectedIds.includes(account.id)
                    return (
                      <label key={account.id}
                        className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                        style={{
                          borderColor: checked ? 'var(--color-wine)' : 'var(--color-gray-border)',
                          background: checked ? 'var(--color-wine-subtle)' : 'transparent',
                        }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAccount(account.id)}
                          className="w-4 h-4 cursor-pointer flex-shrink-0"
                          style={{ accentColor: 'var(--color-wine)' }}
                        />
                        {account.profileAvatar ? (
                          <img src={account.profileAvatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: 'var(--color-wine)' }}>
                            {account.profileName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{account.profileName}</p>
                          <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
                            {NETWORK_LABELS[account.provider]}
                          </p>
                        </div>
                      </label>
                    )
                  })}
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setSelectTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-sm cursor-pointer border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--color-gray-border)' }}>
                  Cancelar
                </button>
                <button
                  onClick={() => publishNow(selectTarget.id, selectTarget.title, selectedIds)}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--color-wine)' }}>
                  <Send size={14} />
                  Publicar {selectedIds.length > 0 && `(${selectedIds.length})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
