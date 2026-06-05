import { useState } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion } from 'motion/react'
import { Search, Star, Zap, FileText, Video, CalendarPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MOCK_SEARCH_TERMS } from '@/lib/mockData'
import { useProjectStore } from '@/store/projectStore'
import type { SearchTerm } from '@/types'

const container = { animate: { transition: { staggerChildren: 0.05 } } }
const card = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

function DifficultyBadge({ score }: { score: number }) {
  const color = score < 30 ? '#10B981' : score < 60 ? '#F97316' : '#EF4444'
  const label = score < 30 ? 'Fácil' : score < 60 ? 'Médio' : 'Difícil'
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: color + '20', color }}>
      {label}
    </span>
  )
}

function SearchTermCard({ term }: { term: SearchTerm }) {
  const navigate = useNavigate()
  return (
    <motion.div
      variants={card}
      className="rounded-card p-5"
      style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
    >
      {term.isFeatured && (
        <div className="flex items-center gap-1.5 mb-2">
          <Star size={12} style={{ color: 'var(--color-gold)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-gold)' }}>Frase do Momento</span>
        </div>
      )}
      <p className="font-semibold text-sm mb-2 leading-snug" style={{ color: 'var(--color-black)' }}>
        "{term.term}"
      </p>
      <div className="flex items-center gap-3 mb-4">
        {term.monthlySearches && (
          <span className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
            {(term.monthlySearches / 1000).toFixed(1)}k buscas/mês
          </span>
        )}
        {term.difficulty !== undefined && <DifficultyBadge score={term.difficulty} />}
      </div>
      <div className="flex flex-wrap gap-2">
        {term.reelsIdea && (
          <button
            onClick={() => navigate('/copydesk')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}
          >
            <Video size={11} /> Criar Reels
          </button>
        )}
        {term.carouselIdea && (
          <button
            onClick={() => navigate('/copydesk')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}
          >
            <FileText size={11} /> Criar Carrossel
          </button>
        )}
        {term.captionSuggestion && (
          <button
            onClick={() => navigate('/copydesk')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}
          >
            <Zap size={11} /> Criar Legenda
          </button>
        )}
        <button
          onClick={() => navigate('/calendar')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors"
          style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-gray-text)' }}
        >
          <CalendarPlus size={11} /> + Agenda
        </button>
      </div>
    </motion.div>
  )
}

export default function SearchDeskPage() {
  const { activeProject } = useProjectStore()
  const [query, setQuery] = useState('')

  const terms = MOCK_SEARCH_TERMS.filter(t =>
    (!activeProject || t.projectId === activeProject.id) &&
    (!query || t.term.toLowerCase().includes(query.toLowerCase()))
  )

  const featured = terms.find(t => t.isFeatured)
  const rest = terms.filter(t => !t.isFeatured)

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">SearchDesk</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
          Frases e palavras-chave que seu público está buscando
        </p>
      </div>

      {/* Frase do Momento */}
      {featured && (
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: 'var(--color-wine)', boxShadow: 'var(--shadow-wine)' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Star size={18} color="white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/60 mb-0.5">Frase do Momento</p>
            <p className="font-heading font-semibold text-white text-lg">"{featured.term}"</p>
            {featured.monthlySearches && (
              <p className="text-white/60 text-xs mt-0.5">{(featured.monthlySearches / 1000).toFixed(1)}k buscas/mês</p>
            )}
          </div>
          <button
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer flex-shrink-0"
            style={{ background: 'var(--color-cream-warm)', color: 'var(--color-wine)' }}
          >
            Criar conteúdo
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-gray-text)' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por palavra-chave ou nicho..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
          style={{ borderColor: 'var(--color-gray-border)', background: 'white' }}
        />
      </div>

      {/* Terms grid */}
      <motion.div variants={container} initial="initial" animate="animate" className="grid grid-cols-2 gap-4">
        {rest.map(t => <SearchTermCard key={t.id} term={t} />)}
      </motion.div>

      {terms.length === 0 && (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto mb-3" style={{ color: 'var(--color-gray-border)' }} />
          <p style={{ color: 'var(--color-gray-text)' }}>Nenhum termo encontrado</p>
        </div>
      )}
    </motion.div>
  )
}
