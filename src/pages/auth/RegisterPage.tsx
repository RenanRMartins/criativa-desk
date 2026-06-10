import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { pageVariants } from '@/lib/motionVariants'
import { SparklesCore } from '@/components/ui/sparkles'
import { GradientText } from '@/components/ui/gradient-text'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(v => v.password === v.confirmPassword, {
  message: 'Senhas não coincidem', path: ['confirmPassword'],
})
type FormValues = z.infer<typeof schema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setApiError('')
    try {
      await signUp(values.name, values.email, values.password)
      navigate('/onboarding')
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Erro ao criar conta')
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.07)',
    border: `1px solid ${hasError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'}`,
    color: 'white',
  })

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0A0608' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(ellipse 80% 60% at 80% 50%, rgba(107,45,62,0.5) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse 50% 70% at 20% 30%, rgba(201,169,110,0.3) 0%, transparent 60%)' }} />
      </div>
      <SparklesCore background="transparent" minSize={0.4} maxSize={1.2} particleDensity={60} className="absolute inset-0 pointer-events-none" particleColor="rgba(201,169,110,0.7)" speed={1} />

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="CrIAtiva Desk"
            className="w-20 h-20 rounded-3xl object-cover mx-auto mb-4"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} />
          <h1 className="font-heading font-bold text-5xl mb-2 text-white">
            CrIAtiva <GradientText className="text-white">Desk</GradientText>
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Crie sua conta gratuitamente</p>
        </div>

        <div
          className="rounded-3xl p-8 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent)' }} />

          <h2 className="font-heading font-semibold text-2xl mb-1 text-white">Criar conta</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Sem cartão de crédito necessário</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Nome completo" error={errors.name?.message}>
              <input type="text" autoComplete="name" {...register('name')} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle(!!errors.name)}
                onFocus={e => (e.target.style.borderColor = 'rgba(196,105,122,0.6)')}
                onBlur={e => (e.target.style.borderColor = errors.name ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)')} />
            </Field>
            <Field label="E-mail" error={errors.email?.message}>
              <input type="email" autoComplete="email" {...register('email')} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle(!!errors.email)}
                onFocus={e => (e.target.style.borderColor = 'rgba(196,105,122,0.6)')}
                onBlur={e => (e.target.style.borderColor = errors.email ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)')} />
            </Field>
            <Field label="Senha" error={errors.password?.message}>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} autoComplete="new-password" {...register('password')} className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none" style={inputStyle(!!errors.password)}
                  onFocus={e => (e.target.style.borderColor = 'rgba(196,105,122,0.6)')}
                  onBlur={e => (e.target.style.borderColor = errors.password ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)')} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field label="Confirmar senha" error={errors.confirmPassword?.message}>
              <input type="password" autoComplete="new-password" {...register('confirmPassword')} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle(!!errors.confirmPassword)}
                onFocus={e => (e.target.style.borderColor = 'rgba(196,105,122,0.6)')}
                onBlur={e => (e.target.style.borderColor = errors.confirmPassword ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)')} />
            </Field>

            {apiError && (
              <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
                {apiError}
              </div>
            )}

            <motion.button type="submit" disabled={isSubmitting} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)', color: 'white', boxShadow: '0 4px 24px rgba(107,45,62,0.4)' }}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {isSubmitting ? 'Criando...' : 'Criar conta'}
            </motion.button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Já tem conta?{' '}
            <Link to="/login" className="font-medium hover:text-white transition-colors" style={{ color: 'var(--color-wine-light)' }}>Fazer login</Link>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
