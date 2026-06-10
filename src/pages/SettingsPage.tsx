import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { pageVariants } from '@/lib/motionVariants'
import { User, Bell, Shield, CreditCard, Users, Link2, Check, Plus, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { getInitials } from '@/lib/utils'
import { api } from '@/lib/api'

interface ConnectedAccount {
  id: string
  provider: string
  profileName: string
  profileAvatar?: string
  status: string
}

const TABS = [
  { id: 'profile',   label: 'Perfil',         icon: User       },
  { id: 'team',      label: 'Equipe',          icon: Users      },
  { id: 'networks',  label: 'Redes sociais',   icon: Link2      },
  { id: 'notifs',    label: 'Notificações',    icon: Bell       },
  { id: 'security',  label: 'Segurança',       icon: Shield     },
  { id: 'billing',   label: 'Plano',           icon: CreditCard },
]

const NETWORK_LIST = [
  { id: 'instagram',        label: 'Instagram',        color: '#E1306C', tag: 'IG' },
  { id: 'tiktok',           label: 'TikTok',           color: '#010101', tag: 'TK' },
  { id: 'youtube',          label: 'YouTube',          color: '#FF0000', tag: 'YT' },
  { id: 'facebook',         label: 'Facebook',         color: '#1877F2', tag: 'FB' },
  { id: 'google_business',  label: 'Google Business',  color: '#4285F4', tag: 'GB' },
  { id: 'linkedin',         label: 'LinkedIn',         color: '#0A66C2', tag: 'LI' },
]

const NOTIF_PREFS = [
  { id: 'approval',  label: 'Post aprovado pelo cliente'          },
  { id: 'video',     label: 'Vídeo recebido de profissional'      },
  { id: 'scheduled', label: 'Post publicado/agendado'             },
  { id: 'trend',     label: 'Nova tendência detectada'            },
  { id: 'changes',   label: 'Ajuste solicitado pelo cliente'      },
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { activeProject } = useProjectStore()
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('oauth_success') || params.get('oauth_error')) return 'networks'
    return 'profile'
  })
  const [name, setName] = useState(user?.name ?? '')
  const [saved, setSaved] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_PREFS.map(n => [n.id, true]))
  )
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [connectingNetwork, setConnectingNetwork] = useState<string | null>(null)
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('oauth_success')
    const error = params.get('oauth_error')
    if (success) {
      setOauthMessage({ type: 'success', text: `${success.replace('_', ' ')} conectado com sucesso!` })
      window.history.replaceState({}, '', '/settings')
    } else if (error) {
      setOauthMessage({ type: 'error', text: 'Erro ao conectar. Tente novamente.' })
      window.history.replaceState({}, '', '/settings')
    }
    setTimeout(() => setOauthMessage(null), 4000)
  }, [])

  useEffect(() => {
    if (activeProject) {
      api.get<ConnectedAccount[]>(`/social/accounts?projectId=${activeProject.id}`)
        .then(setConnectedAccounts)
        .catch(() => setConnectedAccounts([]))
    }
  }, [activeProject])

  const OAUTH_NETWORKS: Record<string, string> = {
    youtube: 'google',
    google_business: 'google',
    linkedin: 'linkedin',
    facebook: 'meta',
    instagram: 'meta',
    tiktok: 'tiktok',
  }

  async function connectNetwork(networkId: string) {
    if (!activeProject) return
    const provider = OAUTH_NETWORKS[networkId]
    if (!provider) return
    setConnectingNetwork(networkId)
    try {
      let endpoint = ''
      if (provider === 'google' || provider === 'meta') {
        endpoint = `/social/${provider}/auth-url?network=${networkId.toUpperCase()}&projectId=${activeProject.id}`
      } else {
        endpoint = `/social/${provider}/auth-url?projectId=${activeProject.id}`
      }
      const { url } = await api.get<{ url: string }>(endpoint)
      window.location.href = url
    } catch {
      setConnectingNetwork(null)
    }
  }

  async function disconnectNetwork(accountId: string) {
    await api.delete(`/social/accounts/${accountId}`)
    setConnectedAccounts(prev => prev.filter(a => a.id !== accountId))
  }

  function saveProfile() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleNotif(id: string) {
    setNotifPrefs(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Configurações</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
          Gerencie sua conta e preferências
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar de abas */}
        <div className="w-44 flex-shrink-0 space-y-0.5">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors text-left"
                style={{
                  background: activeTab === tab.id ? 'var(--color-wine-subtle)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--color-wine)' : 'var(--color-gray-text)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                }}
              >
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 space-y-4">

          {/* PERFIL */}
          {activeTab === 'profile' && (
            <div className="rounded-2xl p-6 space-y-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-4 pb-5 border-b" style={{ borderBottomColor: 'var(--color-gray-border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                  style={{ background: 'var(--color-wine)' }}>
                  {user ? getInitials(user.name) : 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>{user?.email}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}>
                    {user?.plan ?? 'FREE'}
                  </span>
                </div>
                <button className="px-4 py-2 rounded-xl text-sm cursor-pointer border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--color-gray-border)' }}>
                  Alterar foto
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nome completo</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: 'var(--color-gray-border)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">E-mail</label>
                  <input type="email" defaultValue={user?.email}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: 'var(--color-gray-border)' }} />
                </div>
              </div>

              <button onClick={saveProfile}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                style={{ background: saved ? '#10B981' : 'var(--color-wine)' }}>
                {saved ? <><Check size={14} /> Salvo!</> : 'Salvar alterações'}
              </button>
            </div>
          )}

          {/* EQUIPE */}
          {activeTab === 'team' && (
            <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-heading font-semibold text-base">Membros da equipe</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
                    Projeto: {activeProject?.name ?? 'Nenhum projeto selecionado'}
                  </p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white cursor-pointer"
                  style={{ background: 'var(--color-wine)' }}>
                  <Plus size={14} /> Convidar membro
                </button>
              </div>

              {/* Placeholder da equipe */}
              <div className="space-y-3">
                {[
                  { name: 'Admin CrIAtiva Desk', email: 'admin@criativadesk.com', role: 'Proprietário' },
                  { name: 'Social Media Demo', email: 'social@criativadesk.com', role: 'Social Media' },
                ].map(member => (
                  <div key={member.email} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--color-gray-light)' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: 'var(--color-wine)' }}>
                      {getInitials(member.name)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>{member.email}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REDES SOCIAIS */}
          {activeTab === 'networks' && (
            <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <div className="mb-5">
                <h2 className="font-heading font-semibold text-base">Contas conectadas</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
                  Conecte suas redes sociais para agendar publicações automaticamente.
                </p>
              </div>

              {oauthMessage && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
                  style={{
                    background: oauthMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: oauthMessage.type === 'success' ? '#10B981' : '#EF4444',
                  }}>
                  {oauthMessage.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {oauthMessage.text}
                </div>
              )}

              <div className="space-y-3">
                {NETWORK_LIST.map(net => {
                  const accounts = connectedAccounts.filter(a => a.provider === net.id.toUpperCase())
                  const isSupported = net.id in OAUTH_NETWORKS
                  const isConnecting = connectingNetwork === net.id

                  return (
                    <div key={net.id} className="p-4 rounded-xl border space-y-3"
                      style={{ borderColor: accounts.length ? 'rgba(16,185,129,0.3)' : 'var(--color-gray-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: net.color }}>
                          {net.tag}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{net.label}</p>
                          <p className="text-xs truncate" style={{ color: accounts.length ? '#10B981' : 'var(--color-gray-text)' }}>
                            {accounts.length === 0
                              ? 'Não conectado'
                              : accounts.length === 1 ? '✓ 1 conta conectada' : `✓ ${accounts.length} contas conectadas`}
                          </p>
                        </div>
                        <button
                          onClick={() => isSupported ? connectNetwork(net.id) : undefined}
                          disabled={!isSupported || isConnecting}
                          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border transition-colors hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ borderColor: 'var(--color-gray-border)' }}
                          title={!isSupported ? 'Em breve' : undefined}>
                          {isConnecting
                            ? <Loader2 size={13} className="animate-spin" />
                            : accounts.length > 0 ? <Plus size={13} /> : null}
                          {!isSupported ? 'Em breve' : accounts.length > 0 ? 'Adicionar conta' : 'Conectar'}
                        </button>
                      </div>

                      {accounts.length > 0 && (
                        <div className="space-y-2 ml-[52px]">
                          {accounts.map(account => (
                            <div key={account.id} className="flex items-center gap-2.5 p-2.5 rounded-lg"
                              style={{ background: 'var(--color-gray-light)' }}>
                              {account.profileAvatar ? (
                                <img src={account.profileAvatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                  style={{ background: net.color }}>
                                  {net.tag}
                                </div>
                              )}
                              <p className="text-xs font-medium flex-1 truncate">{account.profileName}</p>
                              <button
                                onClick={() => disconnectNetwork(account.id)}
                                className="px-2.5 py-1 rounded-lg text-xs cursor-pointer border transition-colors hover:bg-red-50 flex-shrink-0"
                                style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                                Desconectar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* NOTIFICAÇÕES */}
          {activeTab === 'notifs' && (
            <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="font-heading font-semibold text-base mb-5">Preferências de notificação</h2>
              <div className="space-y-4">
                {NOTIF_PREFS.map(pref => (
                  <div key={pref.id} className="flex items-center justify-between">
                    <p className="text-sm">{pref.label}</p>
                    <button
                      onClick={() => toggleNotif(pref.id)}
                      className="relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0"
                      style={{ background: notifPrefs[pref.id] ? 'var(--color-wine)' : 'var(--color-gray-border)' }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                        style={{ left: notifPrefs[pref.id] ? '22px' : '2px' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEGURANÇA */}
          {activeTab === 'security' && (
            <div className="rounded-2xl p-6 space-y-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="font-heading font-semibold text-base">Alterar senha</h2>
              <div>
                <label className="block text-sm font-medium mb-1.5">Senha atual</label>
                <input type="password" className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'var(--color-gray-border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nova senha</label>
                <input type="password" className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'var(--color-gray-border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirmar nova senha</label>
                <input type="password" className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'var(--color-gray-border)' }} />
              </div>
              <button className="px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
                style={{ background: 'var(--color-wine)' }}>
                Alterar senha
              </button>
            </div>
          )}

          {/* PLANO */}
          {activeTab === 'billing' && (
            <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="font-heading font-semibold text-base mb-5">Seu plano atual</h2>

              <div className="p-5 rounded-2xl mb-5"
                style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)' }}>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Plano atual</p>
                <p className="font-heading font-bold text-white text-2xl">{user?.plan ?? 'FREE'}</p>
                <p className="text-white/70 text-sm mt-1">Todos os recursos desbloqueados</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Projetos', value: 'Ilimitados' },
                  { label: 'Posts por mês', value: 'Ilimitados' },
                  { label: 'Usuários', value: '10 membros' },
                  { label: 'IA (CopyDesk)', value: 'Incluído' },
                  { label: 'Armazenamento', value: '50 GB' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2.5 border-b"
                    style={{ borderBottomColor: 'var(--color-gray-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--color-gray-text)' }}>{item.label}</span>
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Check size={13} color="#10B981" /> {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
