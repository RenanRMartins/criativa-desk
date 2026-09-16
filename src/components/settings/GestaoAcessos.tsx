import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, ShieldCheck, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { getInitials } from '@/lib/utils'

type Permissao = { chave: string; rotulo: string; grupo: string }
type Catalogo = { permissoes: Permissao[]; padraoPorPapel: Record<string, string[]> }

type Membro = { projectId: string; role: string; extras: string[]; negadas: string[]; project: { name: string } }
type Usuario = {
  id: string; name: string; email: string; role: string; avatar?: string
  projects: Membro[]
}

const PAPEIS_SISTEMA = [
  { valor: 'OWNER', rotulo: 'Dono', nota: 'Acesso total, em tudo' },
  { valor: 'ADMIN', rotulo: 'Administrador', nota: 'Acesso total, em tudo' },
  { valor: 'SOCIAL_MEDIA', rotulo: 'Social Media', nota: 'Acesso definido por projeto' },
  { valor: 'DESIGNER', rotulo: 'Designer', nota: 'Acesso definido por projeto' },
  { valor: 'CLIENT', rotulo: 'Cliente', nota: 'Acesso definido por projeto' },
  { valor: 'VIEWER', rotulo: 'Visualizador', nota: 'Acesso definido por projeto' },
]

const PAPEIS_PROJETO = ['SOCIAL_MEDIA', 'DESIGNER', 'APPROVER', 'CLIENT', 'VIEWER']
const ROTULO_PAPEL: Record<string, string> = {
  OWNER: 'Dono', ADMIN: 'Administrador', SOCIAL_MEDIA: 'Social Media',
  DESIGNER: 'Designer', APPROVER: 'Aprovador', CLIENT: 'Cliente', VIEWER: 'Visualizador',
  SEM_ACESSO: 'Sem acesso',
}

function ehAdmin(papel?: string) {
  return papel === 'OWNER' || papel === 'ADMIN'
}

export default function GestaoAcessos() {
  const { user } = useAuthStore()
  const { projects } = useProjectStore()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novo, setNovo] = useState({ name: '', email: '', password: '', role: 'SOCIAL_MEDIA' })

  const recarregar = useCallback(async () => {
    try {
      const [u, c] = await Promise.all([
        api.get<Usuario[]>('/acessos/usuarios'),
        api.get<Catalogo>('/acessos/catalogo'),
      ])
      setUsuarios(u)
      setCatalogo(c)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void recarregar() }, [recarregar])

  async function criarConta() {
    setSalvando(true)
    try {
      await api.post('/acessos/usuarios', novo)
      setNovo({ name: '', email: '', password: '', role: 'SOCIAL_MEDIA' })
      setCriando(false)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar conta')
    } finally {
      setSalvando(false)
    }
  }

  async function apagarConta(u: Usuario) {
    if (!confirm(`Apagar a conta de ${u.name}? Esta ação não pode ser desfeita.`)) return
    try {
      await api.delete(`/acessos/usuarios/${u.id}`)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao apagar')
    }
  }

  async function mudarPapelSistema(u: Usuario, role: string) {
    try {
      await api.patch(`/acessos/usuarios/${u.id}`, { role })
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao alterar')
    }
  }

  async function salvarAcessoProjeto(u: Usuario, projectId: string, role: string, extras: string[], negadas: string[]) {
    try {
      if (role === 'SEM_ACESSO') {
        await api.delete(`/acessos/projeto/${projectId}/membro/${u.id}`)
      } else {
        await api.put(`/acessos/projeto/${projectId}/membro/${u.id}`, { role, extras, negadas })
      }
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar acesso')
    }
  }

  if (!ehAdmin(user?.role)) {
    return (
      <div className="rounded-2xl p-6 text-sm" style={{ background: 'white', boxShadow: 'var(--shadow-card)', color: 'var(--color-gray-text)' }}>
        Só quem é dono ou administrador pode gerenciar acessos.
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h2 className="font-heading font-semibold text-base">Contas e acessos</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
            O papel define o acesso padrão; o ajuste fino soma ou tira permissões por pessoa, em cada projeto.
          </p>
        </div>
        <button onClick={() => setCriando(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white cursor-pointer flex-shrink-0"
          style={{ background: 'var(--color-wine)' }}>
          <Plus size={14} /> Nova conta
        </button>
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-xl text-xs" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{erro}</div>
      )}

      {criando && (
        <div className="mb-5 p-4 rounded-xl space-y-3" style={{ background: 'var(--color-gray-light)' }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Nome completo" value={novo.name} onChange={e => setNovo(n => ({ ...n, name: e.target.value }))}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
            <input placeholder="E-mail" type="email" value={novo.email} onChange={e => setNovo(n => ({ ...n, email: e.target.value }))}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
            <input placeholder="Senha (mínimo 6 caracteres)" type="password" value={novo.password} onChange={e => setNovo(n => ({ ...n, password: e.target.value }))}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
            <select value={novo.role} onChange={e => setNovo(n => ({ ...n, role: e.target.value }))}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor: 'var(--color-gray-border)' }}>
              {PAPEIS_SISTEMA.map(p => <option key={p.valor} value={p.valor}>{p.rotulo} — {p.nota}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={criarConta} disabled={!novo.name || !novo.email || novo.password.length < 6 || salvando}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white cursor-pointer disabled:opacity-40"
              style={{ background: 'var(--color-wine)' }}>
              {salvando ? 'Criando…' : 'Criar conta'}
            </button>
            <button onClick={() => setCriando(false)} className="px-4 py-2 rounded-xl text-sm border cursor-pointer"
              style={{ borderColor: 'var(--color-gray-border)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center gap-2 text-sm py-6" style={{ color: 'var(--color-gray-text)' }}>
          <Loader2 size={15} className="animate-spin" /> Carregando contas…
        </div>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => {
            const expandido = aberto === u.id
            const admin = ehAdmin(u.role)
            return (
              <div key={u.id} className="rounded-xl border" style={{ borderColor: 'var(--color-gray-border)' }}>
                <div className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'var(--color-wine)' }}>{getInitials(u.name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}{u.id === user?.id && ' (você)'}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-gray-text)' }}>{u.email}</p>
                  </div>

                  <select value={u.role} onChange={e => mudarPapelSistema(u, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border text-xs outline-none cursor-pointer flex-shrink-0"
                    style={{ borderColor: 'var(--color-gray-border)' }}>
                    {PAPEIS_SISTEMA.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                  </select>

                  {/* admin do sistema vê tudo; abrir o ajuste por projeto seria mentira */}
                  {!admin && (
                    <button onClick={() => setAberto(expandido ? null : u.id)}
                      className="px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer flex items-center gap-1 flex-shrink-0"
                      style={{ borderColor: 'var(--color-gray-border)' }}>
                      {expandido ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Acessos
                    </button>
                  )}

                  <button onClick={() => apagarConta(u)} disabled={u.id === user?.id}
                    className="p-1.5 rounded-lg border cursor-pointer flex-shrink-0 disabled:opacity-30"
                    style={{ borderColor: '#EF4444', color: '#EF4444' }} title="Apagar conta">
                    <Trash2 size={13} />
                  </button>
                </div>

                {admin && (
                  <div className="px-3 pb-3 -mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-wine)' }}>
                    <ShieldCheck size={12} /> Acesso total a todos os projetos
                  </div>
                )}

                {expandido && !admin && catalogo && (
                  <div className="border-t p-3 space-y-3" style={{ borderColor: 'var(--color-gray-border)' }}>
                    {projects.length === 0 && (
                      <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>Nenhum projeto cadastrado.</p>
                    )}
                    {projects.map(proj => {
                      const membro = u.projects.find(m => m.projectId === proj.id)
                      const papel = membro?.role ?? 'SEM_ACESSO'
                      const base = catalogo.padraoPorPapel[papel] ?? []
                      const extras = membro?.extras ?? []
                      const negadas = membro?.negadas ?? []
                      return (
                        <div key={proj.id} className="rounded-lg p-3" style={{ background: 'var(--color-gray-light)' }}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-sm font-medium truncate">{proj.name}</span>
                            <select value={papel}
                              onChange={e => salvarAcessoProjeto(u, proj.id, e.target.value, [], [])}
                              className="px-2.5 py-1.5 rounded-lg border text-xs outline-none cursor-pointer flex-shrink-0"
                              style={{ borderColor: 'var(--color-gray-border)', background: 'white' }}>
                              <option value="SEM_ACESSO">Sem acesso</option>
                              {PAPEIS_PROJETO.map(p => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
                            </select>
                          </div>

                          {papel !== 'SEM_ACESSO' && (
                            <div className="grid gap-1 sm:grid-cols-2">
                              {catalogo.permissoes.map(perm => {
                                const noPadrao = base.includes(perm.chave)
                                const ligado = negadas.includes(perm.chave) ? false
                                  : extras.includes(perm.chave) ? true : noPadrao
                                const ajustado = ligado !== noPadrao
                                return (
                                  <label key={perm.chave}
                                    className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                                    <input type="checkbox" checked={ligado} className="cursor-pointer"
                                      onChange={() => {
                                        // guardamos só a diferença em relação ao padrão do papel:
                                        // assim trocar o papel depois não carrega ajuste velho junto
                                        const novoLigado = !ligado
                                        const ex = extras.filter(c => c !== perm.chave)
                                        const ne = negadas.filter(c => c !== perm.chave)
                                        if (novoLigado && !noPadrao) ex.push(perm.chave)
                                        if (!novoLigado && noPadrao) ne.push(perm.chave)
                                        salvarAcessoProjeto(u, proj.id, papel, ex, ne)
                                      }} />
                                    <span style={{ color: ajustado ? 'var(--color-wine)' : 'inherit' }}>
                                      {perm.rotulo}{ajustado && ' •'}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
                      O ponto marca o que foi ajustado em relação ao padrão do papel.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
