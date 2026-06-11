import { useState, useCallback, useEffect } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion, AnimatePresence } from 'motion/react'
import { Calendar, dateFnsLocalizer, type Event as BigCalEvent } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, X, Move } from 'lucide-react'
import { PostCreator } from '@/components/posts/PostCreator'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { usePosts } from '@/hooks/usePosts'
import { useProjectStore } from '@/store/projectStore'
import { STATUS_COLORS, STATUS_LABELS, FORMAT_LABELS, NETWORK_LABELS } from '@/lib/constants'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import type { Post, PostStatus } from '@/types'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'pt-BR': ptBR },
})

interface CalEvent extends BigCalEvent { post: Post }

const DnDCalendar = withDragAndDrop<CalEvent>(Calendar as never)

function PostDrawer({ post, onClose }: { post: Post; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      className="fixed right-0 top-0 h-full w-96 z-50 overflow-y-auto"
      style={{ background: 'white', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)' }}
    >
      <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10"
        style={{ borderBottomColor: 'var(--color-gray-border)' }}>
        <h2 className="font-heading font-semibold text-base">Detalhes do post</h2>
        <button onClick={onClose} className="p-1.5 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
          <X size={16} style={{ color: 'var(--color-gray-text)' }} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={post.status} />
          <span className="text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'var(--color-gray-light)', color: 'var(--color-gray-text)' }}>
            {FORMAT_LABELS[post.format]}
          </span>
        </div>

        <div>
          <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Título</p>
          <p className="font-heading font-semibold text-base">{post.title}</p>
        </div>
        {post.theme && (
          <div>
            <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Tema</p>
            <p className="text-sm">{post.theme}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Redes</p>
          <div className="flex flex-wrap gap-1">
            {post.networks.map(n => (
              <span key={n} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}>
                {NETWORK_LABELS[n]}
              </span>
            ))}
          </div>
        </div>
        {post.publishDate && (
          <div>
            <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Data de publicação</p>
            <p className="text-sm font-medium">{formatDate(post.publishDate)}</p>
          </div>
        )}
        {post.caption && (
          <div>
            <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Legenda</p>
            <p className="text-sm leading-relaxed whitespace-pre-line p-3 rounded-xl"
              style={{ background: 'var(--color-gray-light)' }}>{post.caption}</p>
          </div>
        )}
        {post.hashtags.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Hashtags</p>
            <p className="text-sm" style={{ color: 'var(--color-wine)' }}>{post.hashtags.join(' ')}</p>
          </div>
        )}
        <div className="flex gap-2 pt-2 border-t" style={{ borderTopColor: 'var(--color-gray-border)' }}>
          <button className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)' }}>
            Editar post
          </button>
          <button className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--color-gray-border)' }}>
            Pedir aprovação
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function CalendarPage() {
  const { activeProject } = useProjectStore()
  const { posts, setPosts, fetchPosts, createPost } = usePosts(activeProject?.id)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'ALL'>('ALL')
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [clickedDate, setClickedDate] = useState<string | undefined>()
  const [draggedId, setDraggedId] = useState<string | null>(null)

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const filteredPosts = filterStatus === 'ALL' ? posts : posts.filter(p => p.status === filterStatus)

  const events: CalEvent[] = filteredPosts
    .filter(p => p.publishDate)
    .map(p => ({
      title: p.title,
      start: new Date(p.publishDate!),
      end: new Date(p.publishDate!),
      post: p,
    }))

  const eventStyleGetter = useCallback((event: CalEvent) => ({
    style: {
      background: STATUS_COLORS[event.post.status],
      borderRadius: '6px',
      border: 'none',
      color: '#fff',
      fontSize: '11px',
      padding: '2px 6px',
      cursor: 'grab',
    },
  }), [])

  const handleEventDrop = useCallback(({ event, start }: { event: CalEvent; start: Date | string }) => {
    setDraggedId(event.post.id)
    const newDate = typeof start === 'string' ? new Date(start) : start
    setPosts(prev => prev.map(p =>
      p.id === event.post.id
        ? { ...p, publishDate: newDate.toISOString(), scheduledAt: p.scheduledAt ? newDate.toISOString() : undefined }
        : p
    ))
    setTimeout(() => setDraggedId(null), 1500)
  }, [])

  function handleSlotSelect(slot: { start: Date }) {
    setClickedDate(slot.start.toISOString().slice(0, 16))
    setCreatorOpen(true)
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Calendário Editorial</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
              Visualize e gerencie todos os posts
            </p>
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}>
              <Move size={10} /> Arraste para reagendar
            </span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setCreatorOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)',
            boxShadow: '0 4px 16px rgba(107,45,62,0.3)',
          }}
        >
          <Plus size={16} /> Novo post
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as PostStatus | 'ALL')}
          className="px-3 py-2 rounded-xl border text-sm outline-none cursor-pointer"
          style={{ borderColor: 'var(--color-gray-border)', background: 'white' }}
        >
          <option value="ALL">Todos os status</option>
          {(Object.entries(STATUS_LABELS) as [PostStatus, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-gray-border)' }}>
          {(['month', 'week', 'day'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{ background: view === v ? 'var(--color-wine)' : 'white', color: view === v ? 'white' : 'var(--color-black)' }}>
              {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {(['IDEA', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED'] as PostStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s] }} />
              <span className="text-xs" style={{ color: 'var(--color-gray-text)' }}>{STATUS_LABELS[s]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drag feedback toast */}
      <AnimatePresence>
        {draggedId && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-white text-sm flex items-center gap-2"
            style={{ background: 'var(--color-wine)', boxShadow: 'var(--shadow-wine)' }}
          >
            <Move size={14} /> Post reagendado com sucesso
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar with DnD */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: 'var(--shadow-card)', minHeight: 560, border: '1px solid var(--color-gray-border)' }}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 560, padding: 16 }}
          view={view}
          onView={v => setView(v as 'month' | 'week' | 'day')}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={event => setSelectedPost((event as CalEvent).post)}
          onSelectSlot={handleSlotSelect}
          onEventDrop={handleEventDrop as never}
          selectable
          resizable={false}
          draggableAccessor={() => true}
          culture="pt-BR"
          messages={{
            today: 'Hoje', previous: 'Anterior', next: 'Próximo',
            month: 'Mês', week: 'Semana', day: 'Dia',
            noEventsInRange: 'Sem posts neste período.',
          }}
        />
      </div>

      {/* Post drawer */}
      <AnimatePresence>
        {selectedPost && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
              onClick={() => setSelectedPost(null)}
            />
            <PostDrawer post={selectedPost} onClose={() => setSelectedPost(null)} />
          </>
        )}
      </AnimatePresence>

      {/* Post Creator */}
      <PostCreator
        open={creatorOpen}
        onClose={() => { setCreatorOpen(false); setClickedDate(undefined) }}
        defaultDate={clickedDate}
        onSave={async (data) => {
          if (!activeProject) return
          try {
            await createPost({
              projectId: activeProject.id,
              title: data.title,
              format: data.format as Post['format'],
              networks: (data.networks ?? []) as Post['networks'],
              status: (data.status ?? 'IDEA') as Post['status'],
              caption: data.caption,
              hashtags: data.hashtags ? data.hashtags.split(/\s+/).filter(Boolean) : [],
              publishDate: data.publishDate || undefined,
              theme: data.theme,
              observations: data.observations,
              targetAccountIds: data.targetAccountIds ?? [],
            })
            await fetchPosts()
          } catch (e) {
            console.error('Erro ao criar post:', e)
          }
        }}
      />
    </motion.div>
  )
}
