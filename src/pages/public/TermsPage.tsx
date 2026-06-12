import { motion } from 'motion/react'
import { pageVariants } from '@/lib/motionVariants'
import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: '1. Aceitação dos termos',
    body: `Ao criar uma conta ou usar o CrIAtiva Desk, você concorda com estes Termos de Serviço e com a nossa Política de Privacidade. Se você não concorda com algum ponto, não utilize a plataforma.`,
  },
  {
    title: '2. O serviço',
    body: `O CrIAtiva Desk é uma plataforma de gestão de redes sociais que oferece planejamento de conteúdo, fluxo de aprovação com clientes, geração de textos com inteligência artificial, agendamento e publicação em redes sociais conectadas pelo usuário.`,
  },
  {
    title: '3. Sua conta',
    body: `Você é responsável por manter a confidencialidade das suas credenciais de acesso e por todas as atividades realizadas na sua conta. Informe-nos imediatamente sobre qualquer uso não autorizado.`,
  },
  {
    title: '4. Conteúdo do usuário',
    body: `Todo conteúdo criado, enviado ou publicado através da plataforma (textos, imagens, vídeos) é de sua responsabilidade e propriedade. Você garante ter os direitos necessários sobre o conteúdo que publica e que ele não viola leis nem direitos de terceiros.`,
  },
  {
    title: '5. Integrações de terceiros',
    body: `A plataforma conecta-se a serviços de terceiros (Meta, Google/YouTube, TikTok, LinkedIn, Spotify, Canva) mediante a sua autorização expressa via OAuth. O uso desses serviços está sujeito aos termos de cada plataforma. Você pode revogar qualquer conexão a qualquer momento em Configurações → Redes sociais ou no painel de segurança do respectivo serviço.`,
  },
  {
    title: '6. Limitação de responsabilidade',
    body: `O CrIAtiva Desk é fornecido "como está". Não nos responsabilizamos por indisponibilidades das redes sociais conectadas, alterações em suas APIs, ou por conteúdos publicados pelos usuários. Faremos sempre o possível para manter o serviço estável e seguro.`,
  },
  {
    title: '7. Cancelamento',
    body: `Você pode encerrar sua conta a qualquer momento solicitando a exclusão dos seus dados, conforme descrito na página de Exclusão de Dados. Reservamo-nos o direito de suspender contas que violem estes termos.`,
  },
  {
    title: '8. Contato',
    body: `Dúvidas sobre estes termos: renan1612@hotmail.com`,
  },
]

export default function TermsPage() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      <div className="h-16 border-b flex items-center gap-2.5 px-6" style={{ background: 'white', borderBottomColor: 'var(--color-gray-border)' }}>
        <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-cover" />
        <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-wine)' }}>CrIAtiva Desk</h1>
        <span className="ml-1 text-sm" style={{ color: 'var(--color-gray-text)' }}>Termos de Serviço</span>
      </div>

      <div className="max-w-2xl mx-auto p-6 pb-16 space-y-6">
        <div>
          <h2 className="font-heading font-bold text-2xl mb-1">Termos de Serviço</h2>
          <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Última atualização: 11 de junho de 2026</p>
        </div>

        {SECTIONS.map(section => (
          <div key={section.title} className="rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-heading font-semibold text-base mb-2" style={{ color: 'var(--color-wine)' }}>
              {section.title}
            </h3>
            <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: 'var(--color-gray-text)' }}>
              {section.body}
            </p>
          </div>
        ))}

        <p className="text-sm text-center" style={{ color: 'var(--color-gray-text)' }}>
          Veja também: <Link to="/privacidade" className="underline" style={{ color: 'var(--color-wine)' }}>Política de Privacidade</Link>
          {' · '}
          <Link to="/exclusao-de-dados" className="underline" style={{ color: 'var(--color-wine)' }}>Exclusão de Dados</Link>
        </p>
      </div>
    </motion.div>
  )
}
