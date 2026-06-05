import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, MessageSquare } from 'lucide-react'
import { getInitials, formatDateRelative } from '@/lib/utils'
import type { ApprovalComment } from '@/types'

interface Props {
  comments: ApprovalComment[]
  onAdd?: (text: string, authorName: string, authorType: 'client' | 'social_media') => void
  readOnly?: boolean
  currentUserName?: string
  currentUserType?: 'client' | 'social_media'
}

export function ApprovalComments({
  comments,
  onAdd,
  readOnly = false,
  currentUserName = 'Social Media',
  currentUserType = 'social_media',
}: Props) {
  const [text, setText] = useState('')

  function handleSend() {
    if (!text.trim() || !onAdd) return
    onAdd(text.trim(), currentUserName, currentUserType)
    setText('')
  }

  return (
    <div className="space-y-3">
      {/* Comment thread */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-2">
          <MessageSquare size={22} style={{ color: 'var(--color-gray-border)' }} />
          <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
            Nenhum comentário ainda
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {comments.map(c => {
              const isMe = c.authorType === currentUserType
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 self-end"
                    style={{
                      background: c.authorType === 'social_media'
                        ? 'var(--color-wine)'
                        : 'var(--color-gold)',
                    }}
                  >
                    {getInitials(c.authorName)}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className="px-3 py-2 rounded-2xl text-sm leading-relaxed"
                      style={{
                        background: isMe ? 'var(--color-wine)' : 'var(--color-gray-light)',
                        color: isMe ? 'white' : 'var(--color-black)',
                        borderBottomRightRadius: isMe ? 4 : undefined,
                        borderBottomLeftRadius: !isMe ? 4 : undefined,
                      }}
                    >
                      {c.text}
                    </div>
                    <p className="text-xs px-1" style={{ color: 'var(--color-gray-text)' }}>
                      {c.authorName} · {formatDateRelative(c.createdAt)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Input */}
      {!readOnly && onAdd && (
        <div
          className="flex items-end gap-2 p-2 rounded-2xl"
          style={{ background: 'var(--color-gray-light)', border: '1px solid var(--color-gray-border)' }}
        >
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Adicionar comentário... (Enter para enviar)"
            rows={2}
            className="flex-1 text-sm outline-none resize-none"
            style={{ background: 'transparent', color: 'var(--color-black)' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 hover:opacity-80 flex-shrink-0"
            style={{ background: 'var(--color-wine)' }}
          >
            <Send size={13} color="white" />
          </button>
        </div>
      )}
    </div>
  )
}
