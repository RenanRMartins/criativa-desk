import { useState } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion, AnimatePresence } from 'motion/react'
import { Palette, ExternalLink, ChevronRight, Check, Sparkles, Upload, Layout } from 'lucide-react'
import { FORMAT_LABELS } from '@/lib/constants'
import type { PostFormat } from '@/types'

const FORMAT_STEPS: { label: string; format: PostFormat; aspect: string; w: number; h: number; desc: string }[] = [
  { label: 'Feed Instagram 1:1', format: 'FEED_INSTAGRAM', aspect: '1:1', w: 48, h: 48, desc: 'Post quadrado' },
  { label: 'Reels / TikTok 9:16', format: 'REELS_INSTAGRAM', aspect: '9:16', w: 32, h: 56, desc: 'Vertical, vídeo curto' },
  { label: 'Stories Instagram 9:16', format: 'STORIES_INSTAGRAM', aspect: '9:16', w: 32, h: 56, desc: 'Tela cheia, 24h' },
  { label: 'Carrossel Instagram', format: 'CAROUSEL_INSTAGRAM', aspect: '1:1', w: 48, h: 48, desc: 'Múltiplos slides' },
  { label: 'Post Google Business', format: 'GOOGLE_POST', aspect: '4:3', w: 56, h: 42, desc: 'SEO local' },
]

const STEPS = [
  { label: 'Tipo de arte', icon: Layout },
  { label: 'Template', icon: Palette },
  { label: 'Conteúdo', icon: Sparkles },
  { label: 'Editar no Canva', icon: ExternalLink },
  { label: 'Finalizar', icon: Check },
]

const MOCK_TEMPLATES = [
  { id: 1, name: 'Minimalista Claro', colors: ['#FAF7F2', '#6B2D3E', '#C9A96E'] },
  { id: 2, name: 'Dark Premium', colors: ['#0F0F0F', '#C4697A', '#FAF7F2'] },
  { id: 3, name: 'Vibrante', colors: ['#F97316', '#FFFFFF', '#1A1A1A'] },
]

export default function DesignDeskPage() {
  const [step, setStep] = useState(0)
  const [selectedFormat, setSelectedFormat] = useState<PostFormat | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [caption, setCaption] = useState('')

  const canProceed = step === 0
    ? selectedFormat !== null
    : step === 1
      ? selectedTemplate !== null
      : true

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-2xl">DesignDesk</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
          Fluxo completo: IA → Arte → Canva → Aprovação
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-start gap-0">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-start flex-1">
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{
                    background: done ? '#10B981' : active ? 'var(--color-wine)' : 'var(--color-gray-border)',
                    scale: active ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-default"
                  style={{ boxShadow: active ? '0 0 0 4px rgba(107,45,62,0.15)' : 'none' }}
                >
                  {done
                    ? <Check size={16} color="white" />
                    : <Icon size={15} color={active ? 'white' : 'var(--color-gray-text)'} />
                  }
                </motion.div>
                <span
                  className="text-xs mt-2 text-center w-20 leading-tight"
                  style={{ color: active ? 'var(--color-wine)' : done ? '#10B981' : 'var(--color-gray-text)', fontWeight: active ? 600 : 400 }}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-1 mt-4">
                  <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-gray-border)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: i < step ? '100%' : '0%' }}
                      transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
                      style={{ background: '#10B981' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
          className="rounded-2xl p-6"
          style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
        >
          {step === 0 && (
            <div>
              <h2 className="font-heading font-semibold text-lg mb-1">Escolha o tipo de arte</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-gray-text)' }}>
                Selecione o formato que melhor se adapta ao seu conteúdo
              </p>
              <div className="grid grid-cols-5 gap-3">
                {FORMAT_STEPS.map(f => (
                  <button
                    key={f.format}
                    onClick={() => setSelectedFormat(f.format)}
                    className="p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col items-center gap-3"
                    style={{
                      borderColor: selectedFormat === f.format ? 'var(--color-wine)' : 'var(--color-gray-border)',
                      background: selectedFormat === f.format ? 'var(--color-wine-subtle)' : 'white',
                    }}
                  >
                    {/* Aspect ratio preview */}
                    <div className="relative">
                      <div
                        className="rounded-md flex items-center justify-center"
                        style={{
                          width: f.w, height: f.h,
                          background: selectedFormat === f.format
                            ? 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)'
                            : 'var(--color-gray-light)',
                        }}
                      >
                        {selectedFormat === f.format && <Check size={14} color="white" />}
                      </div>
                      <span
                        className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded"
                        style={{
                          background: selectedFormat === f.format ? 'var(--color-wine)' : 'var(--color-gray-border)',
                          color: selectedFormat === f.format ? 'white' : 'var(--color-gray-text)',
                        }}
                      >
                        {f.aspect}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold leading-tight" style={{ color: selectedFormat === f.format ? 'var(--color-wine)' : 'var(--color-black)' }}>
                        {f.label}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-gray-text)' }}>{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-heading font-semibold text-lg mb-1">Selecione um template</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-gray-text)' }}>
                Templates adaptados ao formato{selectedFormat ? ` ${FORMAT_LABELS[selectedFormat]}` : ''}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {MOCK_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className="rounded-xl border-2 overflow-hidden cursor-pointer transition-all text-left"
                    style={{
                      borderColor: selectedTemplate === t.id ? 'var(--color-wine)' : 'var(--color-gray-border)',
                      boxShadow: selectedTemplate === t.id ? 'var(--shadow-wine)' : 'none',
                    }}
                  >
                    {/* Template preview */}
                    <div className="h-36 relative flex items-center justify-center"
                      style={{ background: t.colors[0] }}>
                      <div className="absolute inset-0 flex items-end p-4">
                        <div className="w-full space-y-1.5">
                          <div className="h-2 rounded-full" style={{ background: t.colors[1], width: '70%', opacity: 0.7 }} />
                          <div className="h-1.5 rounded-full" style={{ background: t.colors[1], width: '45%', opacity: 0.5 }} />
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ background: t.colors[1] + '33', border: `2px solid ${t.colors[1]}66` }}>
                        <Palette size={22} style={{ color: t.colors[1] }} />
                      </div>
                      {/* Color palette swatches */}
                      <div className="absolute top-3 right-3 flex gap-1">
                        {t.colors.map((c, ci) => (
                          <div key={ci} className="w-4 h-4 rounded-full border border-white/30" style={{ background: c }} />
                        ))}
                      </div>
                      {selectedTemplate === t.id && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--color-wine)' }}>
                          <Check size={12} color="white" />
                        </div>
                      )}
                    </div>
                    <div className="p-3" style={{ background: 'white' }}>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>3 variações</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-semibold text-lg mb-1">Conteúdo da arte</h2>
                <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
                  Cole o texto gerado pela CopyDesk ou escreva manualmente
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Texto principal</label>
                <textarea
                  rows={5}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Ex: Rotina matinal que mudou minha vida..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none transition-colors"
                  style={{ borderColor: 'var(--color-gray-border)' }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-gray-text)' }}>{caption.length}/150</p>
              </div>
              <div className="p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-50"
                style={{ border: '2px dashed var(--color-gray-border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-gray-light)' }}>
                  <Upload size={16} style={{ color: 'var(--color-gray-text)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium">Adicionar imagem de referência</p>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>PNG, JPG ou WEBP · até 5MB</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: '#7C3AED18', border: '2px solid #7C3AED33' }}>
                <ExternalLink size={28} color="#7C3AED" />
              </div>
              <h2 className="font-heading font-semibold text-xl mb-2">Abrir no Canva</h2>
              <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--color-gray-text)' }}>
                O template será aberto no Canva com as dimensões e cores do seu projeto. Após finalizar, volte aqui e faça upload da arte.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: '#7C3AED', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
                >
                  <ExternalLink size={16} /> Abrir no Canva
                </button>
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium cursor-pointer border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--color-gray-border)' }}
                  onClick={() => setStep(4)}
                >
                  <Upload size={16} /> Já tenho a arte
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-10">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#ECFDF5', border: '2px solid #10B981' }}
              >
                <Check size={30} color="#10B981" />
              </motion.div>
              <h2 className="font-heading font-semibold text-xl mb-2">Arte finalizada!</h2>
              <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--color-gray-text)' }}>
                Sua arte está pronta para aprovação ou para ser adicionada ao calendário editorial.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)', boxShadow: '0 4px 16px rgba(107,45,62,0.3)' }}
                >
                  Enviar para aprovação
                </button>
                <button
                  className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--color-gray-border)' }}
                >
                  Adicionar ao calendário
                </button>
              </div>
              <button
                onClick={() => { setStep(0); setSelectedFormat(null); setSelectedTemplate(null); setCaption('') }}
                className="mt-4 text-xs cursor-pointer transition-colors"
                style={{ color: 'var(--color-gray-text)' }}
              >
                Criar nova arte
              </button>
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex justify-between mt-6 pt-5 border-t" style={{ borderTopColor: 'var(--color-gray-border)' }}>
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="px-4 py-2 rounded-xl text-sm cursor-pointer disabled:opacity-30 border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-gray-border)' }}
              >
                ← Voltar
              </button>
              {step < STEPS.length - 1 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)' }}
                >
                  Próximo <ChevronRight size={14} />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
