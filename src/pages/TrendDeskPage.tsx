import { useState } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion } from 'motion/react'
import { TrendingUp, CalendarPlus, ChevronRight, Flame, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { MOCK_TRENDS } from '@/lib/mockData'
import { truncate } from '@/lib/utils'
import type { TrendItem } from '@/types'
import { GlowCard } from '@/components/ui/spotlight-card'
import { SparklesCore } from '@/components/ui/sparkles'

const container = { animate: { transition: { staggerChildren: 0.06 } } }
const item = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

function TrendScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#EF4444' : score >= 60 ? '#F97316' : '#FBBF24'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: [0, 0, 0.2, 1], delay: 0.2 }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  )
}

function TrendCard({ trend }: { trend: TrendItem }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div variants={item} className="h-full">
      <GlowCard className="p-5 h-full flex flex-col cursor-default" glowColor="wine">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {trend.trendScore >= 80 && <Flame size={13} color="#F87171" className="flex-shrink-0" />}
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {trend.niche} · {trend.source}
              </span>
            </div>
            <h3 className="font-heading font-semibold text-white text-sm leading-snug">{trend.title}</h3>
          </div>
        </div>

        <TrendScoreBar score={trend.trendScore} />

        <p className="text-xs mt-3 leading-relaxed flex-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {truncate(trend.description, 100)}
        </p>

        {trend.whyItMatters && (
          <p className="text-xs mt-1 italic" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {truncate(trend.whyItMatters, 80)}
          </p>
        )}

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3 border-t pt-4 overflow-hidden"
            style={{ borderTopColor: 'rgba(255,255,255,0.1)' }}
          >
            {trend.reelsIdea && (
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>🎬 Ideia Reels</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{trend.reelsIdea}</p>
              </div>
            )}
            {trend.carouselIdea && (
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>📋 Carrossel</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{trend.carouselIdea}</p>
              </div>
            )}
            {trend.storiesIdea && (
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>📱 Stories</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{trend.storiesIdea}</p>
              </div>
            )}
            {trend.suggestedCaption && (
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>📝 Legenda sugerida</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{truncate(trend.suggestedCaption, 120)}</p>
              </div>
            )}
          </motion.div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-3 border-t" style={{ borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs cursor-pointer transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {expanded ? 'Menos' : 'Ver ideias'}
            <ChevronRight size={12} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-cream-warm)', color: 'var(--color-wine)' }}
          >
            <CalendarPlus size={11} /> Calendário
          </button>
        </div>
      </GlowCard>
    </motion.div>
  )
}

export default function TrendDeskPage() {
  const { activeProject } = useProjectStore()
  const trends = MOCK_TRENDS.filter(t => !activeProject || t.projectId === activeProject.id)
  const top = trends[0]

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="-m-8 min-h-[calc(100vh-64px)] p-8 space-y-6 relative overflow-hidden"
      style={{ background: 'var(--color-wine)' }}
    >
      {/* Subtle sparkles background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <SparklesCore
          background="transparent"
          particleColor="#FAF7F2"
          particleDensity={30}
          speed={0.4}
          minSize={0.5}
          maxSize={1.4}
          className="w-full h-full"
        />
      </div>

      {/* Ambient top glow */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-64 rounded-full blur-3xl pointer-events-none z-0"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <TrendingUp size={18} color="white" />
              </div>
              <h1 className="font-heading font-bold text-white text-2xl">TrendDesk</h1>
            </div>
            <p className="text-sm ml-12" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Tendências de hoje para <span style={{ color: 'var(--color-gold)' }}>{activeProject?.name ?? 'todos os projetos'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Sparkles size={11} /> Atualizado agora
          </div>
        </div>

        {/* Oportunidade do Dia */}
        {top && (
          <GlowCard className="p-6" glowColor="gold">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} color="#FBBF24" />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Oportunidade do Dia
              </span>
              <span
                className="ml-auto text-lg font-bold tabular-nums font-heading"
                style={{ color: 'var(--color-gold)' }}
              >
                {top.trendScore}<span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>/100</span>
              </span>
            </div>

            <h2 className="font-heading font-bold text-white text-xl mb-2 leading-snug">{top.title}</h2>
            <p className="text-sm mb-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{top.description}</p>

            {top.reelsIdea && (
              <p className="text-sm italic mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                💡 {top.reelsIdea}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-cream-warm)', color: 'var(--color-wine)' }}
              >
                <CalendarPlus size={14} /> Criar conteúdo a partir desta tendência
              </button>
              <div className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                {top.niche} · {top.source}
              </div>
            </div>
          </GlowCard>
        )}

        {/* All trends grid */}
        <div>
          <h2 className="font-heading font-semibold text-white text-base mb-4" style={{ opacity: 0.9 }}>
            Todas as tendências
          </h2>
          <motion.div
            variants={container}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 gap-4"
          >
            {trends.map(t => <TrendCard key={t.id} trend={t} />)}
          </motion.div>
        </div>

        {trends.length === 0 && (
          <div className="text-center py-20">
            <TrendingUp size={44} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p style={{ color: 'rgba(255,255,255,0.35)' }}>Nenhuma tendência disponível</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
