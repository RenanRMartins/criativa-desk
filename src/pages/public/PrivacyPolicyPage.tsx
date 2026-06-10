import { motion } from 'motion/react'
import { pageVariants } from '@/lib/motionVariants'
import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: '1. Quem somos',
    body: `O CrIAtiva Desk é uma plataforma de gestão de redes sociais que ajuda social medias e agências a planejar, aprovar e publicar conteúdo. Esta política descreve como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).`,
  },
  {
    title: '2. Dados que coletamos',
    body: `• Dados de cadastro: nome, e-mail e senha (armazenada de forma criptografada).
• Dados de redes sociais conectadas: ao conectar uma conta (Facebook, Instagram, YouTube, TikTok, LinkedIn ou Google Business), recebemos o identificador público do perfil, o nome do perfil e a foto do perfil, além de um token de acesso usado exclusivamente para as ações que você autorizar.
• Conteúdo criado na plataforma: posts, legendas, mídias e agendamentos que você cadastra.`,
  },
  {
    title: '3. Como usamos seus dados',
    body: `Usamos seus dados exclusivamente para operar o serviço: autenticar seu acesso, exibir as contas conectadas, agendar e publicar conteúdo que você criou e autorizou, e enviar notificações dentro da plataforma. Não vendemos, alugamos nem compartilhamos seus dados pessoais com terceiros para fins de marketing.`,
  },
  {
    title: '4. Armazenamento e segurança',
    body: `Seus dados são armazenados em banco de dados com acesso restrito e tráfego criptografado (HTTPS). Os tokens de acesso das redes sociais são usados somente para executar as operações que você solicitar e podem ser revogados a qualquer momento desconectando a conta.`,
  },
  {
    title: '5. Seus direitos (LGPD)',
    body: `Você pode, a qualquer momento: confirmar a existência de tratamento dos seus dados, acessá-los, corrigi-los, solicitar a exclusão ou revogar consentimentos. Para exercer esses direitos, escreva para o contato abaixo.`,
  },
  {
    title: '6. Exclusão de dados',
    body: `Você pode desconectar qualquer rede social em Configurações → Redes sociais — isso remove imediatamente o token de acesso daquela conta. Para excluir todos os seus dados da plataforma, siga as instruções da nossa página de exclusão de dados.`,
  },
  {
    title: '7. Contato',
    body: `Dúvidas sobre esta política ou sobre seus dados: renan1612@hotmail.com`,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      <div className="h-16 border-b flex items-center px-6" style={{ background: 'white', borderBottomColor: 'var(--color-gray-border)' }}>
        <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-wine)' }}>CrIAtiva Desk</h1>
        <span className="ml-3 text-sm" style={{ color: 'var(--color-gray-text)' }}>Política de Privacidade</span>
      </div>

      <div className="max-w-2xl mx-auto p-6 pb-16 space-y-6">
        <div>
          <h2 className="font-heading font-bold text-2xl mb-1">Política de Privacidade</h2>
          <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Última atualização: 10 de junho de 2026</p>
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
          Veja também: <Link to="/exclusao-de-dados" className="underline" style={{ color: 'var(--color-wine)' }}>Exclusão de dados</Link>
        </p>
      </div>
    </motion.div>
  )
}
