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
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setApiError('')
    try {
      const user = await signIn(values.email, values.password)
      navigate(user.onboardingCompleted ? '/dashboard' : '/onboarding')
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Credenciais inválidas')
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0A0608' }}
    >
      {/* WebGL-like gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(107,45,62,0.5) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 80% 30%, rgba(139,58,78,0.4) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse 40% 40% at 60% 80%, rgba(201,169,110,0.3) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Sparkles */}
      <SparklesCore
        background="transparent"
        minSize={0.4}
        maxSize={1.2}
        particleDensity={80}
        className="absolute inset-0 pointer-events-none"
        particleColor="rgba(196,105,122,0.8)"
        speed={1.2}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-heading font-bold text-5xl mb-2 text-white">
            Social<GradientText className="text-white">Desk</GradientText>
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Do briefing ao post publicado.
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-3xl p-8 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          {/* Inner glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(196,105,122,0.6), transparent)' }}
          />

          <h2 className="font-heading font-semibold text-2xl mb-1 text-white">Bem-vindo de volta</h2>
          <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Acesse sua conta para continuar
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${errors.email ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  color: 'white',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(196,105,122,0.6)')}
                onBlur={e => (e.target.style.borderColor = errors.email ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)')}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: `1px solid ${errors.password ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: 'white',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(196,105,122,0.6)')}
                  onBlur={e => (e.target.style.borderColor = errors.password ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-opacity hover:opacity-70"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {apiError && (
              <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
                {apiError}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)',
                color: 'white',
                boxShadow: '0 4px 24px rgba(107,45,62,0.4)',
              }}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Não tem conta?{' '}
            <Link to="/register" className="font-medium transition-colors hover:text-white" style={{ color: 'var(--color-wine-light)' }}>
              Criar conta
            </Link>
          </p>
        </motion.div>

        {/* Demo hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-6"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Demo: admin@criativadesk.com / admin123
        </motion.p>
      </div>
    </motion.div>
  )
}
