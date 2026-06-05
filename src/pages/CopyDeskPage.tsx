import { useState } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, Copy, Save, RotateCcw, ChevronRight, CheckCheck } from 'lucide-react'
import { useCopyDesk } from '@/hooks/useCopyDesk'
import { useProjectStore } from '@/store/projectStore'
import { COPY_TYPE_LABELS } from '@/lib/constants'
import { AnimatedAIChat } from '@/components/ui/animated-ai-chat'
import { SparklesCore } from '@/components/ui/sparkles'
import type { CopyType } from '@/types'

const COPY_TYPES: CopyType[] = [
  'CAPTION', 'SCRIPT', 'CAROUSEL_IDEA', 'HOOK', 'TITLE',
  'STORIES_CTA', 'GOOGLE_POST', 'CONTENT_CALENDAR', 'HUMANIZE', 'REVIEW', 'ADAPT_TONE',
]

const COPY_DESCRIPTIONS: Record<CopyType, string> = {
  CAPTION: 'Legendas para feed e reels',
  SCRIPT: 'Roteiro de vídeo completo',
  CAROUSEL_IDEA: 'Estrutura de carrossel',
  HOOK: 'Gancho de abertura',
  TITLE: 'Título chamativo',
  STORIES_CTA: 'Stories com CTA',
  GOOGLE_POST: 'Post Google Business',
  CONTENT_CALENDAR: 'Pauta de conteúdo',
  HUMANIZE: 'Humanizar texto existente',
  REVIEW: 'Revisar e melhorar',
  ADAPT_TONE: 'Adaptar tom de voz',
}

const PLACEHOLDERS: Partial<Record<CopyType, string>> = {
  CAPTION: 'Ex: Legenda sobre os benefícios da vitamina D para imunidade. Tom educativo, CTA para agendar consulta.',
  SCRIPT: 'Ex: Roteiro de 60s sobre queda de cabelo por estresse. Mostrar causa e tratamento.',
  CAROUSEL_IDEA: 'Ex: Carrossel sobre 5 sinais de inflamação no corpo e o que fazer.',
  HOOK: 'Ex: Hook para vídeo sobre por que você se cansa mesmo dormindo bem.',
  HUMANIZE: 'Cole aqui o texto gerado por IA que você quer humanizar...',
  REVIEW: 'Cole o texto que deseja revisar...',
}

const QUICK_PROMPTS: Partial<Record<CopyType, string[]>> = {
  CAPTION: ['Educativo com CTA', 'Emocional e motivador', 'Direto ao ponto'],
  SCRIPT: ['60 segundos tutorial', 'Storytelling pessoal', 'Lista de dicas'],
  HOOK: ['Pergunta provocativa', 'Dado surpreendente', 'Situação do dia a dia'],
}

export default function CopyDeskPage() {
  const { activeProject } = useProjectStore()
  const { output, loading, error, generate, setOutput } = useCopyDesk()
  const [selectedType, setSelectedType] = useState<CopyType>('CAPTION')
  const [context, setContext] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedSessions, setSavedSessions] = useState<{ type: CopyType; output: string }[]>([])

  async function handleGenerate() {
    if (!context.trim() || !activeProject) return
    await generate({ projectId: activeProject.id, type: selectedType, context })
  }

  function copyOutput() {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function saveOutput() {
    if (!output) return
    setSavedSessions(p => [{ type: selectedType, output }, ...p].slice(0, 10))
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex -m-8 min-h-[calc(100vh-64px)] relative overflow-hidden"
      style={{ background: '#080406' }}
    >
      {/* Deep background particles */}
      <SparklesCore
        background="transparent"
        minSize={0.3}
        maxSize={0.9}
        particleDensity={40}
        className="absolute inset-0 pointer-events-none"
        particleColor="rgba(196,105,122,0.6)"
        speed={0.8}
      />

      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(107,45,62,1) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(139,58,78,1) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(201,169,110,1) 0%, transparent 70%)' }} />
      </div>

      {/* ── Left panel — type selector ── */}
      <div
        className="w-52 flex-shrink-0 flex flex-col py-6 relative z-10"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo mark */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)' }}
            >
              <Sparkles size={14} color="white" />
            </div>
            <div>
              <p className="text-white text-sm font-heading font-bold leading-none">CopyDesk</p>
              <p className="text-white/30 text-xs mt-0.5">IA de copy</p>
            </div>
          </div>
        </div>

        <p className="text-xs font-medium uppercase tracking-widest px-4 mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Tipo
        </p>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {COPY_TYPES.map(type => {
            const active = selectedType === type
            return (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setOutput('') }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all"
                style={{
                  background: active ? 'rgba(107,45,62,0.4)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(196,105,122,0.3)' : 'transparent'}`,
                }}
              >
                <ChevronRight
                  size={11}
                  className="flex-shrink-0 transition-transform"
                  style={{ color: active ? 'var(--color-wine-light)' : 'transparent', transform: active ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-none" style={{ color: active ? 'white' : 'rgba(255,255,255,0.5)' }}>
                    {COPY_TYPE_LABELS[type]}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
                    {COPY_DESCRIPTIONS[type]}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Saved sessions mini list */}
        {savedSessions.length > 0 && (
          <div className="px-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Salvos</p>
            <div className="space-y-1">
              {savedSessions.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setOutput(s.output)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  {COPY_TYPE_LABELS[s.type]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Center — workspace ── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div>
            <h1 className="font-heading font-bold text-white text-xl leading-none">
              {COPY_TYPE_LABELS[selectedType]}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Projeto: {activeProject?.name ?? 'Nenhum selecionado'}
              {activeProject?.toneOfVoice && ` · ${activeProject.toneOfVoice.slice(0, 30)}`}
            </p>
          </div>

          {/* Quick prompt chips */}
          {QUICK_PROMPTS[selectedType] && (
            <div className="flex items-center gap-2">
              {QUICK_PROMPTS[selectedType]!.map(qp => (
                <button
                  key={qp}
                  onClick={() => setContext(qp)}
                  className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all hover:bg-white/15"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {qp}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
          {/* Animated input */}
          <AnimatedAIChat
            value={context}
            onChange={setContext}
            onSubmit={handleGenerate}
            loading={loading}
            placeholder={PLACEHOLDERS[selectedType] ?? `Descreva o que precisa para ${COPY_TYPE_LABELS[selectedType].toLowerCase()}...`}
            disabled={!activeProject}
          />

          {!activeProject && (
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Selecione um projeto no menu acima para usar a CopyDesk
            </p>
          )}

          {/* Output area */}
          <AnimatePresence mode="wait">
            {(output || loading) && (
              <motion.div
                key="output"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col rounded-2xl overflow-hidden relative"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  minHeight: 200,
                }}
              >
                {/* Output header */}
                <div
                  className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Resultado</span>
                  </div>
                  {output && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setOutput(''); setContext('') }}
                        className="p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                        title="Limpar"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        onClick={saveOutput}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-white/10 transition-colors"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        <Save size={12} /> Salvar
                      </button>
                      <button
                        onClick={copyOutput}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all"
                        style={{
                          background: copied ? 'rgba(16,185,129,0.2)' : 'var(--color-cream-warm)',
                          color: copied ? '#10B981' : 'var(--color-wine)',
                          border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
                        }}
                      >
                        {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Output text */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loading && !output && (
                    <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-wine-light animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s`, background: 'var(--color-wine-light)' }} />
                        ))}
                      </div>
                      <span className="text-sm">Gerando...</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {output}
                    {loading && <span className="animate-pulse ml-0.5" style={{ color: 'var(--color-wine-light)' }}>▋</span>}
                  </p>
                </div>
              </motion.div>
            )}

            {!output && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 rounded-2xl flex items-center justify-center"
                style={{ border: '2px dashed rgba(255,255,255,0.06)', minHeight: 200 }}
              >
                <div className="text-center">
                  <Sparkles size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Descreva o que precisa e clique em Gerar
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.12)' }}>
                    ⌘+Enter para gerar rapidamente
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
