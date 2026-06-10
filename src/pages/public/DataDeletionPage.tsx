import { motion } from 'motion/react'
import { pageVariants } from '@/lib/motionVariants'
import { Link } from 'react-router-dom'
import { Unlink, Mail, Clock } from 'lucide-react'

const STEPS = [
  {
    icon: Unlink,
    title: 'Desconectar uma rede social',
    body: 'Acesse Configurações → Redes sociais e clique em "Desconectar" na conta desejada. O token de acesso daquela conta é removido imediatamente dos nossos servidores.',
  },
  {
    icon: Mail,
    title: 'Excluir todos os seus dados',
    body: 'Envie um e-mail para renan1612@hotmail.com com o assunto "Exclusão de dados", usando o mesmo e-mail cadastrado na plataforma. Excluiremos sua conta, posts, mídias e todos os tokens de redes sociais.',
  },
  {
    icon: Clock,
    title: 'Prazo',
    body: 'A exclusão completa é concluída em até 7 dias úteis após a solicitação. Você receberá uma confirmação por e-mail quando finalizar.',
  },
]

export default function DataDeletionPage() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      <div className="h-16 border-b flex items-center px-6" style={{ background: 'white', borderBottomColor: 'var(--color-gray-border)' }}>
        <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-wine)' }}>CrIAtiva Desk</h1>
        <span className="ml-3 text-sm" style={{ color: 'var(--color-gray-text)' }}>Exclusão de Dados</span>
      </div>

      <div className="max-w-2xl mx-auto p-6 pb-16 space-y-6">
        <div>
          <h2 className="font-heading font-bold text-2xl mb-1">Como excluir seus dados</h2>
          <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
            Você controla seus dados no CrIAtiva Desk. Há duas formas de removê-los:
          </p>
        </div>

        {STEPS.map(step => {
          const Icon = step.icon
          return (
            <div key={step.title} className="rounded-2xl p-6 flex gap-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-wine-subtle)' }}>
                <Icon size={18} style={{ color: 'var(--color-wine)' }} />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base mb-1">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-gray-text)' }}>{step.body}</p>
              </div>
            </div>
          )
        })}

        <p className="text-sm text-center" style={{ color: 'var(--color-gray-text)' }}>
          Veja também: <Link to="/privacidade" className="underline" style={{ color: 'var(--color-wine)' }}>Política de Privacidade</Link>
        </p>
      </div>
    </motion.div>
  )
}
