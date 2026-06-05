import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Check, ChevronRight, Loader2, Building2, Target } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { slideVariants as slide } from '@/lib/motionVariants'
import { SparklesCore } from '@/components/ui/sparkles'
import { GradientText } from '@/components/ui/gradient-text'

const OBJECTIVES = [
  'Organizar calendário editorial',
  'Aprovar conteúdo com clientes',
  'Gerenciar gravações de vídeo',
  'Agendar posts automaticamente',
  'Usar IA para criação de conteúdo',
  'Acompanhar tendências',
]

const NICHES = [
  'Saúde e bem-estar', 'Beleza e estética', 'Alimentação e nutrição',
  'Moda e lifestyle', 'Educação', 'Tecnologia',
  'Jurídico', 'Imobiliário', 'Fitness', 'Pets',
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuthStore()
  const [step, setStep] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [niche, setNiche] = useState('')
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function toggleObjective(o: string) {
    setSelectedObjectives((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
    )
  }

  async function finish() {
    setLoading(true)
    try {
      if (projectName) await api.post('/projects', { name: projectName, niche })
      await api.patch('/auth/me', { onboardingCompleted: true })
      updateUser({ onboardingCompleted: true })
      navigate('/dashboard')
    } catch {
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      icon: Building2,
      title: 'Crie seu primeiro projeto',
      subtitle: 'Cada projeto representa um cliente ou marca',
      content: (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Nome do projeto
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Clínica Habitus"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Nicho (opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              {NICHES.map((n) => (
                <button
                  key={n}
                  onClick={() => setNiche(niche === n ? '' : n)}
                  className="px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all"
                  style={{
                    background: niche === n ? 'var(--color-cream-warm)' : 'rgba(255,255,255,0.07)',
                    color: niche === n ? 'var(--color-wine)' : 'rgba(255,255,255,0.6)',
                    border: '1px solid',
                    borderColor: niche === n ? 'transparent' : 'rgba(255,255,255,0.12)',
                    fontWeight: niche === n ? 600 : 400,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Target,
      title: 'O que você quer fazer?',
      subtitle: 'Selecione seus principais objetivos',
      content: (
        <div className="grid grid-cols-2 gap-2">
          {OBJECTIVES.map((o) => {
            const active = selectedObjectives.includes(o)
            return (
              <button
                key={o}
                onClick={() => toggleObjective(o)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left cursor-pointer transition-all"
                style={{
                  background: active ? 'rgba(250,247,242,0.12)' : 'rgba(255,255,255,0.05)',
                  color: active ? 'white' : 'rgba(255,255,255,0.6)',
                  border: '1px solid',
                  borderColor: active ? 'rgba(250,247,242,0.3)' : 'rgba(255,255,255,0.09)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: active ? 'var(--color-cream-warm)' : 'rgba(255,255,255,0.1)',
                    border: active ? 'none' : '1px solid rgba(255,255,255,0.18)',
                  }}
                >
                  {active && <Check size={11} color="var(--color-wine)" />}
                </div>
                {o}
              </button>
            )
          })}
        </div>
      ),
    },
  ]

  const current = steps[step]
  const Icon = current.icon

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: '#050204' }}
    >
      {/* Particles */}
      <div className="absolute inset-0 z-0">
        <SparklesCore
          background="transparent"
          particleColor="#FAF7F2"
          particleDensity={55}
          speed={0.5}
          minSize={0.5}
          maxSize={1.6}
          className="w-full h-full"
        />
      </div>

      {/* Ambient glows */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(107,45,62,0.5) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-48 rounded-full blur-3xl pointer-events-none z-0"
        style={{ background: 'rgba(107,45,62,0.18)' }}
      />

      {/* Content */}
      <div className="w-full max-w-lg relative z-10">
        {/* Logo + headline */}
        <div className="text-center mb-8">
          <GradientText className="font-heading font-bold text-3xl text-white">
            Bem-vindo ao CrIAtiva Desk
          </GradientText>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Vamos configurar sua conta em dois passos rápidos
          </p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === step ? 28 : 8 }}
              transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
              className="h-2 rounded-full"
              style={{ background: i <= step ? 'var(--color-cream-warm)' : 'rgba(255,255,255,0.18)' }}
            />
          ))}
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={slide} initial="initial" animate="animate" exit="exit">
              {/* Step header */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(107,45,62,0.45)', border: '1px solid rgba(250,247,242,0.18)' }}
                >
                  <Icon size={20} color="var(--color-cream-warm)" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-white text-lg leading-tight">{current.title}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{current.subtitle}</p>
                </div>
              </div>

              {current.content}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="text-sm cursor-pointer transition-colors"
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                ← Voltar
              </button>
            ) : (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                Pular por agora
              </button>
            )}

            {step < steps.length - 1 ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-cream-warm)', color: 'var(--color-wine)' }}
              >
                Próximo <ChevronRight size={15} />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={finish}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-cream-warm)', color: 'var(--color-wine)' }}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Entrar no CrIAtiva Desk
              </motion.button>
            )}
          </div>
        </div>

        {/* Step labels */}
        <div className="flex justify-between mt-4 px-1">
          {steps.map((_, i) => (
            <p key={i} className="text-xs" style={{ color: i === step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}>
              {i + 1} — {i === 0 ? 'Projeto' : 'Objetivos'}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
