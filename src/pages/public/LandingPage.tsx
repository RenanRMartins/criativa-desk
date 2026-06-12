import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, CalendarDays, CheckCircle2, Sparkles, Send, TrendingUp, BarChart3 } from 'lucide-react'
import { pageVariants } from '@/lib/motionVariants'
import { SparklesCore } from '@/components/ui/sparkles'
import { GradientText } from '@/components/ui/gradient-text'

const FEATURES = [
  { icon: CalendarDays, title: 'Calendário editorial', desc: 'Planeje o mês inteiro de conteúdo com arrastar e soltar.' },
  { icon: CheckCircle2, title: 'Aprovação do cliente', desc: 'Link público para o cliente aprovar ou pedir ajustes, sem criar conta.' },
  { icon: Sparkles, title: 'CopyDesk com IA', desc: 'Legendas, roteiros e hashtags gerados com inteligência artificial.' },
  { icon: Send, title: 'Publicação automática', desc: 'Agendou, publicou — nas contas certas de cada cliente.' },
  { icon: TrendingUp, title: 'TrendDesk', desc: 'Tendências do Google em tempo real, filtradas pelo nicho do projeto.' },
  { icon: BarChart3, title: 'Relatórios', desc: 'Resultados por rede e por cliente, prontos para apresentar.' },
]

export default function LandingPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#0A0608' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,45,62,0.5) 0%, transparent 60%)' }} />
      </div>
      <SparklesCore background="transparent" minSize={0.4} maxSize={1.2} particleDensity={50} className="absolute inset-0 pointer-events-none" particleColor="rgba(201,169,110,0.7)" speed={1} />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Header */}
        <header className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CrIAtiva Desk" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-heading font-bold text-white text-lg">CrIAtiva Desk</span>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
            style={{ color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Entrar
          </Link>
        </header>

        {/* Hero */}
        <section className="text-center pt-16 pb-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <img src="/logo.png" alt="" className="w-24 h-24 rounded-3xl object-cover mx-auto mb-8"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }} />
            <h1 className="font-heading font-bold text-white text-5xl leading-tight mb-4">
              Do briefing ao post publicado,<br />
              <GradientText className="text-white">tudo em um só lugar</GradientText>
            </h1>
            <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
              A plataforma completa para social medias e agências gerenciarem
              conteúdo, aprovações e publicações de todos os seus clientes.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-cream-warm)', color: 'var(--color-wine)' }}
              >
                Criar conta grátis <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-white transition-colors hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}
              >
                Já tenho conta
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                  className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'rgba(201,169,110,0.12)' }}>
                    <Icon size={17} style={{ color: 'var(--color-gold, #C9A96E)' }} />
                  </div>
                  <p className="font-heading font-semibold text-white text-sm mb-1">{f.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} CrIAtiva Desk
          </p>
          <div className="flex items-center gap-5">
            <Link to="/termos" className="text-xs transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Termos de Serviço
            </Link>
            <Link to="/privacidade" className="text-xs transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Política de Privacidade
            </Link>
            <Link to="/exclusao-de-dados" className="text-xs transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Exclusão de Dados
            </Link>
          </div>
        </footer>
      </div>
    </motion.div>
  )
}
