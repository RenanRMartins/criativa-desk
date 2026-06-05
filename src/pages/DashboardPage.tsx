import { useEffect, useState } from 'react'
import { PostCreator } from '@/components/posts/PostCreator'
import { pageVariants, cardVariants as card, containerVariants as container } from '@/lib/motionVariants'
import { motion } from 'motion/react'
import { CalendarDays, Clock, AlertCircle, CheckCircle2, Send, TrendingUp, Plus, ArrowRight, Flame, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useProjects } from '@/hooks/useProjects'
import { usePosts } from '@/hooks/usePosts'
import { MOCK_TRENDS } from '@/lib/mockData'
import StatusBadge from '@/components/ui/StatusBadge'
import { GlowCard } from '@/components/ui/spotlight-card'
import { GradientText } from '@/components/ui/gradient-text'
import { formatDate, getInitials, truncate } from '@/lib/utils'
import type { Post, Project } from '@/types'

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const in7Days = new Date(today.getTime() + 7 * 86400000)

const METRIC_CONFIG = [
  { label: 'Posts hoje', icon: CalendarDays, color: '#C4697A', bg: 'rgba(196,105,122,0.15)' },
  { label: 'Esta semana', icon: CalendarDays, color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
  { label: 'Atrasados', icon: AlertCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  { label: 'Ag. aprovação', icon: Clock, color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
  { label: 'Agendados', icon: Send, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
]

function MetricCard({ label, value, icon: Icon, color, bg, sub }: {
  label: string; value: number | string; icon: React.ElementType; color: string; bg: string; sub?: string
}) {
  return (
    <GlowCard
      glowColor="wine"
      customSize
      className="p-5 cursor-default group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>{label}</p>
          <p className="text-3xl font-bold font-heading" style={{ color: 'var(--color-black)' }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'var(--color-gray-text)' }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: bg }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </GlowCard>
  )
}

function ProjectSummaryCard({ project, posts }: { project: Project; posts: Post[] }) {
  const navigate = useNavigate()
  const pPosts = posts.filter(p => p.projectId === project.id)
  const pending = pPosts.filter(p => p.status === 'PENDING_APPROVAL').length
  const approved = pPosts.filter(p => p.status === 'APPROVED').length
  const scheduled = pPosts.filter(p => p.status === 'SCHEDULED').length
  const recording = pPosts.filter(p => p.status === 'WAITING_RECORDING').length
  const total = pending + recording + approved + scheduled

  return (
    <motion.div
      variants={card}
      className="rounded-2xl p-5 cursor-pointer group relative overflow-hidden"
      style={{ background: 'white', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-gray-border)' }}
      whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(107,45,62,0.12)' } as never}
      transition={{ duration: 0.15 }}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${project.primaryColor}, transparent)` }} />

      <div className="flex items-center gap-3 mb-4">
        {project.profilePhoto ? (
          <img src={project.profilePhoto} alt={project.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: project.primaryColor }}>
            {getInitials(project.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-black)' }}>{project.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--color-gray-text)' }}>{project.niche}</p>
        </div>
        <ArrowRight size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-wine)' }} />
      </div>

      <div className="space-y-1.5">
        {pending > 0 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-gray-text)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            {pending} aguardando aprovação
          </div>
        )}
        {recording > 0 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-gray-text)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
            {recording} aguardando gravação
          </div>
        )}
        {approved > 0 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-gray-text)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            {approved} aprovado{approved > 1 ? 's' : ''}
          </div>
        )}
        {scheduled > 0 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-gray-text)' }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.primaryColor }} />
            {scheduled} agendado{scheduled > 1 ? 's' : ''}
          </div>
        )}
        {total === 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 size={11} /> Tudo em dia!
          </div>
        )}
      </div>
    </motion.div>
  )
}

function OpportunityCard({ trend }: { trend: typeof MOCK_TRENDS[0] }) {
  const navigate = useNavigate()
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden h-full" style={{ background: 'var(--color-wine)' }}>
      {/* Glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(196,105,122,1) 0%, transparent 70%)' }} />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={14} className="text-yellow-400" />
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>Oportunidade do Dia</span>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
            {trend.trendScore}/100
          </span>
        </div>

        <h3 className="font-heading font-bold text-white text-base leading-snug mb-2">
          {trend.title}
        </h3>
        <p className="text-white/60 text-xs leading-relaxed mb-4">
          {truncate(trend.description, 100)}
        </p>
        {trend.reelsIdea && (
          <p className="text-xs mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
            💡 {truncate(trend.reelsIdea, 70)}
          </p>
        )}
        <button
          onClick={() => navigate('/trenddesk')}
          className="flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-gold)' }}
        >
          Ver todas as tendências <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { projects, activeProject, setActiveProject } = useProjects()
  const { posts, fetchPosts } = usePosts(activeProject?.id)
  const navigate = useNavigate()
  const [creatorOpen, setCreatorOpen] = useState(false)

  useEffect(() => { fetchPosts() }, [fetchPosts])

  useEffect(() => {
    if (projects.length > 0 && !activeProject) setActiveProject(projects[0])
  }, [projects, activeProject, setActiveProject])

  const todayPosts = posts.filter(p => p.publishDate?.startsWith(todayStr))
  const weekPosts = posts.filter(p => { if (!p.publishDate) return false; const d = new Date(p.publishDate); return d >= today && d <= in7Days })
  const delayed = posts.filter(p => { if (!p.publishDate) return false; return new Date(p.publishDate) < today && !['PUBLISHED', 'CANCELLED'].includes(p.status) })
  const pendingApproval = posts.filter(p => p.status === 'PENDING_APPROVAL')
  const scheduled = posts.filter(p => p.status === 'SCHEDULED')

  const displayPosts = posts.slice(0, 5)
  const displayProjects = projects

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: 'var(--color-black)' }}>
            {greeting},{' '}
            <GradientText as="span" className="bg-transparent">
              {user?.name?.split(' ')[0] ?? 'usuário'}
            </GradientText>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-gray-text)' }}>
            {formatDate(new Date())} · {displayProjects.length} projetos ativos
          </p>
        </div>
        <button
          onClick={() => setCreatorOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)',
            boxShadow: '0 4px 16px rgba(107,45,62,0.35)',
          }}
        >
          <Plus size={16} /> Novo conteúdo
        </button>
      </div>

      {/* Metrics */}
      <motion.div variants={container} initial="initial" animate="animate" className="grid grid-cols-5 gap-4">
        {[
          { value: todayPosts.length, sub: 'publicações hoje', ...METRIC_CONFIG[0] },
          { value: weekPosts.length, sub: 'próximos 7 dias', ...METRIC_CONFIG[1] },
          { value: delayed.length, sub: 'precisam de atenção', ...METRIC_CONFIG[2] },
          { value: pendingApproval.length, sub: 'para revisar', ...METRIC_CONFIG[3] },
          { value: scheduled.length, sub: 'prontos para publicar', ...METRIC_CONFIG[4] },
        ].map((m) => (
          <motion.div key={m.label} variants={card}>
            <MetricCard {...m} />
          </motion.div>
        ))}
      </motion.div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Projects + posts — 2 cols */}
        <div className="col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-xl" style={{ color: 'var(--color-black)' }}>Projetos</h2>
            <button onClick={() => navigate('/projects')} className="text-sm cursor-pointer flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: 'var(--color-wine)' }}>
              Ver todos <ArrowRight size={14} />
            </button>
          </div>

          <motion.div variants={container} initial="initial" animate="animate" className="grid grid-cols-2 gap-4">
            {displayProjects.slice(0, 4).map(p => (
              <ProjectSummaryCard key={p.id} project={p} posts={posts} />
            ))}
          </motion.div>

          {/* Recent posts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-xl" style={{ color: 'var(--color-black)' }}>Posts recentes</h2>
              <button onClick={() => navigate('/calendar')} className="text-sm cursor-pointer flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: 'var(--color-wine)' }}>
                Calendário <ArrowRight size={14} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-gray-border)' }}>
              {displayPosts.length === 0 ? (
                <div className="p-10 text-center">
                  <Zap size={28} className="mx-auto mb-2" style={{ color: 'var(--color-gray-border)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Nenhum post ainda</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--color-gray-border)' }}>
                  {displayPosts.map((post, i) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors group"
                      onClick={() => navigate('/calendar')}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-wine-subtle)' }}>
                        <CalendarDays size={14} style={{ color: 'var(--color-wine)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-black)' }}>{post.title}</p>
                        <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
                          {post.publishDate ? formatDate(post.publishDate) : 'Sem data'} · {post.networks.join(', ')}
                        </p>
                      </div>
                      <StatusBadge status={post.status} size="sm" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-5">
          <OpportunityCard trend={MOCK_TRENDS[0]} />

          {/* Pending approvals */}
          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-gray-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-black)' }}>Aprovações pendentes</h3>
              <button onClick={() => navigate('/approvals')} className="text-xs cursor-pointer hover:opacity-70 transition-opacity" style={{ color: 'var(--color-wine)' }}>
                Ver todas
              </button>
            </div>
            {pendingApproval.length === 0 ? (
              <div className="flex items-center gap-2 text-xs py-1" style={{ color: 'var(--color-gray-text)' }}>
                <CheckCircle2 size={13} className="text-emerald-500" /> Nenhuma pendência!
              </div>
            ) : (
              <div className="space-y-2">
                {pendingApproval.slice(0, 4).map(p => (
                  <div key={p.id} onClick={() => navigate('/approvals')}
                    className="flex items-center gap-2.5 text-xs cursor-pointer hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-wine-light)' }} />
                    <span className="truncate flex-1" style={{ color: 'var(--color-black)' }}>{p.title}</span>
                    <ArrowRight size={11} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-wine)' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0A0608 0%, #1A0D12 100%)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} style={{ color: 'var(--color-gold)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Esta semana</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Posts publicados', value: posts.filter(p => p.status === 'PUBLISHED').length, color: '#10B981' },
                { label: 'Em aprovação', value: pendingApproval.length, color: '#60A5FA' },
                { label: 'Agendados', value: scheduled.length, color: 'var(--color-wine-light)' },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</span>
                  <span className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PostCreator
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
      />
    </motion.div>
  )
}
