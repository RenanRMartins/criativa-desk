import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { pageVariants } from '@/lib/motionVariants'
import { User, Bell, Shield, CreditCard, Users, Link2, Check, Plus, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { NETWORK_LABELS, NETWORK_COLORS, NETWORK_ICONS } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { useSocialAccounts } from '@/hooks/useSocialAccounts'
import { getInitials } from '@/lib/utils'
import { api } from '@/lib/api'
import GestaoAcessos from '@/components/settings/GestaoAcessos'

const TABS = [
  { id: 'profile',   label: 'Perfil',         icon: User       },
  { id: 'team',      label: 'Equipe',          icon: Users      },
  { id: 'networks',  label: 'Redes sociais',   icon: Link2      },
  { id: 'notifs',    label: 'Notificações',    icon: Bell       },
  { id: 'security',  label: 'Segurança',       icon: Shield     },
  { id: 'billing',   label: 'Plano',           icon: CreditCard },
]

const NETWORK_LIST = (
  ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'GOOGLE_BUSINESS', 'LINKEDIN'] as const
).map(network => ({
  id: network.toLowerCase(),
  label: NETWORK_LABELS[network],
  color: NETWORK_COLORS[network],
  Icon: NETWORK_ICONS[network],
}))

// O motivo vem do callback OAuth; sem ele toda falha vira "tente novamente"
type EscolhaMeta = {
  network: string
  contas: { profileId: string; provider: string; nome: string; avatar?: string; paginaNome: string }[]
}

type TesteConta = {
  ok: boolean
  erro?: string
  escopos?: string[]
  faltando?: string[]
  expiraEm?: string
}

const OAUTH_ERRORS: Record<string, string> = {
  cancelled: 'Você cancelou a autorização, ou ela expirou. Tente conectar de novo.',
  sem_paginas: 'Autorização concluída, mas nenhuma Página foi encontrada. Se a Página pertence a um portfólio empresarial, a configuração do app na Meta precisa incluir a permissão business_management.',
  sem_ig: 'A Página foi encontrada, mas nenhuma conta do Instagram Business está vinculada a ela. Vincule o Instagram à Página nas configurações da Página e conecte de novo.',
  failed: 'Falha ao processar a autorização. O motivo detalhado está nos logs do servidor.',
}

const NOTIF_PREFS = [
  { id: 'approval',  label: 'Post aprovado pelo cliente'          },
  { id: 'video',     label: 'Vídeo recebido de profissional'      },
  { id: 'scheduled', label: 'Post publicado/agendado'             },
  { id: 'trend',     label: 'Nova tendência detectada'            },
  { id: 'changes',   label: 'Ajuste solicitado pelo cliente'      },
]

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
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
  const { accounts: connectedAccounts, setAccounts: setConnectedAccounts } = useSocialAccounts(activeProject?.id)
  const [connectingNetwork, setConnectingNetwork] = useState<string | null>(null)
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testando, setTestando] = useState<string | null>(null)
  const [testes, setTestes] = useState<Record<string, TesteConta | null>>({})
  const [escolha, setEscolha] = useState<(EscolhaMeta & { id: string; marcados: string[] }) | null>(null)
  const [salvandoEscolha, setSalvandoEscolha] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('oauth_success')
    const error = params.get('oauth_error')
    // quem gere várias contas recebe todas de uma vez; escolher evita encher
    // este projeto com as contas dos outros clientes
    const escolher = params.get('meta_escolher')
    if (escolher) {
      window.history.replaceState({}, '', '/settings')
      api.get<EscolhaMeta>(`/social/meta/escolher/${escolher}`)
        .then(r => setEscolha({ ...r, id: escolher, marcados: [] }))
        .catch(e => setOauthMessage({ type: 'error', text: e instanceof Error ? e.message : 'Escolha expirada.' }))
      return
    }
    if (success) {
      setOauthMessage({ type: 'success', text: `${success.replace('_', ' ')} conectado com sucesso!` })
      window.history.replaceState({}, '', '/settings')
    } else if (error) {
      setOauthMessage({ type: 'error', text: OAUTH_ERRORS[error] ?? `Erro ao conectar (${error}).` })
      window.history.replaceState({}, '', '/settings')
    }
    setTimeout(() => setOauthMessage(null), 9000)
  }, [])

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

  async function confirmarEscolha() {
    if (!escolha || escolha.marcados.length === 0) return
    setSalvandoEscolha(true)
    try {
      const r = await api.post<{ salvos: number }>(`/social/meta/escolher/${escolha.id}`, {
        profileIds: escolha.marcados,
      })
      setEscolha(null)
      setOauthMessage({ type: 'success', text: `${r.salvos} conta(s) conectada(s) a este projeto.` })
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      setOauthMessage({ type: 'error', text: e instanceof Error ? e.message : 'Falha ao salvar a escolha.' })
    } finally {
      setSalvandoEscolha(false)
    }
  }

  async function disconnectNetwork(accountId: string) {
    await api.delete(`/social/accounts/${accountId}`)
    setConnectedAccounts(prev => prev.filter(a => a.id !== accountId))
  }

  // "Conectado" não quer dizer "publica": o token pode estar sem os escopos.
  // Este teste interroga o token de verdade, sem publicar nada.
  async function testarConta(accountId: string) {
    setTestando(accountId)
    setTestes(prev => ({ ...prev, [accountId]: null }))
    try {
      const r = await api.post<TesteConta>(`/social/accounts/${accountId}/test`, {})
      setTestes(prev => ({ ...prev, [accountId]: r }))
    } catch (e) {
      setTestes(prev => ({
        ...prev,
        [accountId]: { ok: false, erro: e instanceof Error ? e.message : 'Falha ao testar' },
      }))
    } finally {
      setTestando(null)
    }
  }

  // o botão "Alterar foto" não tinha handler nenhum — clicar não fazia nada.
  // O upload já existia e o User já tinha o campo; só faltava ligar os dois.
  async function trocarFoto(arquivo: File) {
    setEnviandoFoto(true)
    try {
      const form = new FormData()
      form.append('file', arquivo)
      const { url } = await api.upload<{ url: string }>('/upload', form)
      const atualizado = await api.patch<{ avatar?: string }>('/auth/me', { avatar: url })
      updateUser({ avatar: atualizado.avatar ?? url })
      setOauthMessage({ type: 'success', text: 'Foto atualizada.' })
    } catch (e) {
      setOauthMessage({ type: 'error', text: e instanceof Error ? e.message : 'Falha ao enviar a foto' })
    } finally {
      setEnviandoFoto(false)
      setTimeout(() => setOauthMessage(null), 5000)
    }
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
      {escolha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'white' }}>
            <h2 className="font-heading font-semibold text-lg">Quais contas pertencem a este projeto?</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-gray-text)' }}>
              A autorização encontrou {escolha.contas.length} contas que você administra. Marque as
              de <strong style={{ color: 'var(--color-wine)' }}>{activeProject?.name ?? 'este projeto'}</strong> —
              as outras continuam disponíveis para conectar nos projetos delas.
            </p>

            <div className="space-y-2 mt-4">
              {escolha.contas.map(c => {
                const marcado = escolha.marcados.includes(c.profileId)
                return (
                  <button
                    key={c.profileId}
                    onClick={() => setEscolha(e => e && ({
                      ...e,
                      marcados: marcado ? e.marcados.filter(x => x !== c.profileId) : [...e.marcados, c.profileId],
                    }))}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-colors"
                    style={{
                      borderColor: marcado ? 'var(--color-wine)' : 'var(--color-gray-border)',
                      background: marcado ? 'var(--color-wine-subtle)' : 'transparent',
                    }}>
                    <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border"
                      style={{
                        borderColor: marcado ? 'var(--color-wine)' : 'var(--color-gray-border)',
                        background: marcado ? 'var(--color-wine)' : 'transparent',
                      }}>
                      {marcado && <Check size={13} color="white" />}
                    </span>
                    {c.avatar
                      ? <img src={c.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      : <span className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'var(--color-gray-light)' }} />}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{c.nome}</span>
                      <span className="block text-xs truncate" style={{ color: 'var(--color-gray-text)' }}>
                        {c.provider === 'INSTAGRAM' ? `Instagram · Página ${c.paginaNome}` : 'Página do Facebook'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={confirmarEscolha}
                disabled={escolha.marcados.length === 0 || salvandoEscolha}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer disabled:opacity-40"
                style={{ background: 'var(--color-wine)' }}>
                {salvandoEscolha ? 'Conectando…' : `Conectar ${escolha.marcados.length || ''}`.trim()}
              </button>
              <button
                onClick={() => setEscolha(null)}
                className="px-4 py-2.5 rounded-xl text-sm border cursor-pointer"
                style={{ borderColor: 'var(--color-gray-border)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {user?.avatar
                    ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    : (user ? getInitials(user.name) : 'U')}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>{user?.email}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}>
                    {user?.plan ?? 'FREE'}
                  </span>
                </div>
                <label className="px-4 py-2 rounded-xl text-sm cursor-pointer border transition-colors hover:bg-gray-50 flex-shrink-0"
                  style={{ borderColor: 'var(--color-gray-border)', opacity: enviandoFoto ? 0.5 : 1 }}>
                  {enviandoFoto ? 'Enviando…' : 'Alterar foto'}
                  <input type="file" accept="image/*" className="hidden" disabled={enviandoFoto}
                    onChange={e => { const f = e.target.files?.[0]; if (f) trocarFoto(f); e.target.value = '' }} />
                </label>
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
          {activeTab === 'team' && <GestaoAcessos />}

          {activeTab === 'networks' && (
            <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <div className="mb-5">
                <h2 className="font-heading font-semibold text-base">Contas conectadas</h2>
                {/* a conexão é gravada no projeto ativo, e não dizer qual já fez
                    conectar no projeto errado sem ninguém perceber */}
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
                  Conecte suas redes sociais para agendar publicações automaticamente. As contas ficam no projeto{' '}
                  <strong style={{ color: 'var(--color-wine)' }}>{activeProject?.name ?? '—'}</strong>; para outro projeto, troque no seletor acima.
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
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                          style={{ background: net.color }}>
                          <net.Icon size={19} />
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
                          {accounts.map(account => {
                            const teste = testes[account.id]
                            return (
                            <div key={account.id} className="p-2.5 rounded-lg"
                              style={{ background: 'var(--color-gray-light)' }}>
                              <div className="flex items-center gap-2.5">
                                {account.profileAvatar ? (
                                  <img src={account.profileAvatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                    style={{ background: net.color }}>
                                    <net.Icon size={13} />
                                  </div>
                                )}
                                <p className="text-xs font-medium flex-1 truncate">{account.profileName}</p>
                                <button
                                  onClick={() => testarConta(account.id)}
                                  disabled={testando === account.id}
                                  className="px-2.5 py-1 rounded-lg text-xs cursor-pointer border transition-colors hover:bg-wine-subtle flex-shrink-0 disabled:opacity-50"
                                  style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-gray-text)' }}>
                                  {testando === account.id ? 'Testando…' : 'Testar'}
                                </button>
                                <button
                                  onClick={() => disconnectNetwork(account.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs cursor-pointer border transition-colors hover:bg-red-50 flex-shrink-0"
                                  style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                                  Desconectar
                                </button>
                              </div>

                              {teste && (
                                <div className="mt-2 pt-2 text-xs border-t" style={{ borderColor: 'var(--color-gray-border)' }}>
                                  <p style={{ color: teste.ok ? '#059669' : '#EF4444' }}>
                                    {teste.ok ? '✓ Pronta para publicar' : `✗ ${teste.erro}`}
                                  </p>
                                  {/* o escopo é o que separa "conectado" de "publica de verdade" */}
                                  {teste.escopos?.length ? (
                                    <p className="mt-1 break-words" style={{ color: 'var(--color-gray-text)' }}>
                                      Permissões do token: {teste.escopos.join(', ')}
                                    </p>
                                  ) : null}
                                  {teste.expiraEm && (
                                    <p className="mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
                                      Expira: {teste.expiraEm === 'não expira' ? 'não expira' : new Date(teste.expiraEm).toLocaleString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            )
                          })}
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
