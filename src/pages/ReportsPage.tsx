import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { pageVariants, cardVariants } from '@/lib/motionVariants'
import { Users, Eye, FileText, Send, AlertTriangle, Loader2, Info } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { NETWORK_LABELS, NETWORK_COLORS } from '@/lib/constants'
import { useProjectStore } from '@/store/projectStore'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import type { SocialNetwork } from '@/types'

type Conta = {
  accountId: string
  provider: string
  profileName: string
  ok: boolean
  motivo?: string
  seguidores?: number
  publicacoes?: number
  visualizacoes?: number
  curtidas?: number
  limitacao?: string
  crescimento?: {
    seguidores: number | null
    visualizacoes: number | null
    desde: string | null
    daRede: boolean
  }
  analytics?: {
    minutosAssistidos: number
    duracaoMediaSegundos: number
    retencaoMediaPct: number
    inscritosGanhos: number
    inscritosPerdidos: number
    fontes: { fonte: string; views: number }[]
    porDia: { data: string; views: number; minutos: number }[]
  }
}

/**
 * Erros de API costumam trazer o link exato da solução — o do YouTube Analytics
 * manda direto para a tela de ativação no Google Cloud. Como texto puro, obriga
 * a copiar à mão; como link, resolve em um toque.
 */
function ComLinks({ texto }: { texto: string }) {
  const partes = texto.split(/(https?:\/\/[^\s)]+)/g)
  return (
    <>
      {partes.map((parte, i) =>
        /^https?:\/\//.test(parte)
          ? <a key={i} href={parte} target="_blank" rel="noopener noreferrer"
              className="underline break-all" style={{ color: 'inherit' }}>{parte}</a>
          : <span key={i}>{parte}</span>
      )}
    </>
  )
}

/** +12 / −3 / — . O sinal importa: "12" sozinho não diz se subiu ou caiu. */
function variacao(n: number | null | undefined) {
  if (n === null || n === undefined) return null
  return `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)}`
}

function corDaVariacao(n: number | null | undefined) {
  if (n === null || n === undefined) return 'var(--color-gray-text)'
  return n > 0 ? '#059669' : n < 0 ? '#EF4444' : 'var(--color-gray-text)'
}

function duracao(segundos: number) {
  const m = Math.floor(segundos / 60)
  const s = Math.round(segundos % 60)
  return `${m}m${String(s).padStart(2, '0')}s`
}

type Relatorio = {
  contas: Conta[]
  serie: { data: string; provider: string; seguidores: number; visualizacoes: number; curtidas: number }[]
  publicados: { id: string; title: string; networks: string[]; publishedAt: string; format: string }[]
  totais: {
    seguidores: number; publicacoes: number; visualizacoes: number
    publicadosPeloSistema: number; redesComDados: number; redesConectadas: number
    crescimentoSeguidores: number; redesComCrescimento: number
  }
}

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
]

function numero(n?: number) {
  if (n === undefined) return '—'
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n)
}

function CartaoMetrica({ icone: Icone, rotulo, valor, nota, corNota }: {
  icone: React.ElementType; rotulo: string; valor: string; nota?: string; corNota?: string
}) {
  return (
    <motion.div variants={cardVariants} className="rounded-2xl p-5"
      style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-gray-text)' }}>
        <Icone size={15} />
        <span className="text-xs">{rotulo}</span>
      </div>
      <p className="font-heading font-bold text-2xl">{valor}</p>
      {nota && <p className="text-xs mt-1" style={{ color: corNota ?? 'var(--color-gray-text)' }}>{nota}</p>}
    </motion.div>
  )
}

export default function ReportsPage() {
  const { activeProject } = useProjectStore()
  const { token } = useAuthStore()
  const [dias, setDias] = useState(30)
  const [dados, setDados] = useState<Relatorio | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const ehDemo = !token || token.startsWith('demo-token')

  const carregar = useCallback(async () => {
    if (ehDemo || !activeProject?.id) { setCarregando(false); return }
    setCarregando(true)
    try {
      const r = await api.get<Relatorio>(`/reports?projectId=${activeProject.id}&dias=${dias}`)
      setDados(r)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar os relatórios')
    } finally {
      setCarregando(false)
    }
  }, [ehDemo, activeProject?.id, dias])

  useEffect(() => { void carregar() }, [carregar])

  // O YouTube é a única rede que devolve o passado. Quando ele responde, o
  // gráfico usa esse histórico real; as outras só permitem o que guardamos.
  const analyticsYT = dados?.contas.find(c => c.analytics)?.analytics
  const graficoYT = (analyticsYT?.porDia ?? []).map(d => ({
    data: d.data.slice(8) + '/' + d.data.slice(5, 7),
    views: d.views,
    minutos: d.minutos,
  }))

  const grafico = Object.values(
    (dados?.serie ?? []).reduce((acc, p) => {
      acc[p.data] ??= { data: p.data.slice(8) + '/' + p.data.slice(5, 7), seguidores: 0, visualizacoes: 0 }
      acc[p.data]!.seguidores += p.seguidores
      acc[p.data]!.visualizacoes += p.visualizacoes
      return acc
    }, {} as Record<string, { data: string; seguidores: number; visualizacoes: number }>)
  )

  const semDados = dados?.contas.filter(c => !c.ok) ?? []
  const comLimitacao = dados?.contas.filter(c => c.ok && c.limitacao) ?? []

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl">Relatórios</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
            {activeProject?.name ?? 'Nenhum projeto'} · dados das redes conectadas
          </p>
        </div>
        <div className="flex gap-1.5">
          {PERIODOS.map(p => (
            <button key={p.dias} onClick={() => setDias(p.dias)}
              className="px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors"
              style={{
                borderColor: dias === p.dias ? 'var(--color-wine)' : 'var(--color-gray-border)',
                background: dias === p.dias ? 'var(--color-wine-subtle)' : 'transparent',
                color: dias === p.dias ? 'var(--color-wine)' : 'inherit',
              }}>
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      {ehDemo && (
        <div className="p-4 rounded-2xl flex items-start gap-2.5" style={{ background: '#FEF3C7', color: '#92400E' }}>
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">Sem conexão com o servidor — não há métricas para mostrar.</p>
        </div>
      )}

      {erro && (
        <div className="p-4 rounded-2xl text-sm" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{erro}</div>
      )}

      {carregando ? (
        <div className="flex items-center gap-2 text-sm py-10" style={{ color: 'var(--color-gray-text)' }}>
          <Loader2 size={16} className="animate-spin" /> Consultando as redes…
        </div>
      ) : dados ? (
        <>
          {dados.totais.redesConectadas === 0 && (
            <div className="p-4 rounded-2xl text-sm" style={{ background: 'var(--color-gray-light)', color: 'var(--color-gray-text)' }}>
              Nenhuma rede conectada neste projeto. Conecte em Configurações → Redes sociais.
            </div>
          )}

          <motion.div initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CartaoMetrica icone={Users} rotulo="Seguidores" valor={numero(dados.totais.seguidores)}
              nota={dados.totais.redesComCrescimento > 0
                ? `${variacao(dados.totais.crescimentoSeguidores)} em ${dias} dias · ${dados.totais.redesComDados} de ${dados.totais.redesConectadas} rede(s)`
                : `somando ${dados.totais.redesComDados} de ${dados.totais.redesConectadas} rede(s)`}
              corNota={dados.totais.redesComCrescimento > 0 ? corDaVariacao(dados.totais.crescimentoSeguidores) : undefined} />
            <CartaoMetrica icone={Eye} rotulo="Visualizações" valor={numero(dados.totais.visualizacoes)}
              nota="YouTube — total do canal" />
            <CartaoMetrica icone={FileText} rotulo="Publicações nas redes" valor={numero(dados.totais.publicacoes)} />
            <CartaoMetrica icone={Send} rotulo={`Publicados pelo sistema (${dias}d)`}
              valor={String(dados.totais.publicadosPeloSistema)} />
          </motion.div>

          {/* Só mostramos gráfico quando há mais de um dia guardado: uma linha
              reta de um ponto só sugeriria estabilidade que ninguém mediu. */}
          {grafico.length > 1 ? (
            <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="font-heading font-semibold text-base mb-4">Evolução</h2>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={grafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-border)" />
                  <XAxis dataKey="data" fontSize={11} stroke="var(--color-gray-text)" />
                  <YAxis fontSize={11} stroke="var(--color-gray-text)" />
                  <Tooltip />
                  <Area type="monotone" dataKey="seguidores" stroke="var(--color-wine)" fill="var(--color-wine-subtle)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : dados.totais.redesComDados > 0 && graficoYT.length === 0 && (
            <div className="rounded-2xl p-5 flex items-start gap-2.5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-gray-text)' }} />
              <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
                O gráfico de evolução aparece a partir do segundo dia. Instagram, Facebook e TikTok só
                respondem o número de agora — o histórico é guardado por nós a cada consulta. O YouTube
                é exceção: a Analytics API devolve o passado.
              </p>
            </div>
          )}

          {analyticsYT && (
            <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="font-heading font-semibold text-base mb-1">YouTube — desempenho</h2>
              <p className="text-xs mb-4" style={{ color: 'var(--color-gray-text)' }}>
                Últimos {dias} dias, direto da rede — dados históricos, não o retrato de hoje.
                O YouTube leva cerca de <strong>dois dias</strong> para fechar os números, então o fim do
                gráfico costuma parar antes de ontem. Não é queda de audiência.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-5">
                <div className="p-3 rounded-xl" style={{ background: 'var(--color-gray-light)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>Retenção média</p>
                  <p className="font-heading font-bold text-xl">{analyticsYT.retencaoMediaPct.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--color-gray-light)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>Duração média assistida</p>
                  <p className="font-heading font-bold text-xl">{duracao(analyticsYT.duracaoMediaSegundos)}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--color-gray-light)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>Tempo assistido</p>
                  <p className="font-heading font-bold text-xl">{numero(analyticsYT.minutosAssistidos)} min</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--color-gray-light)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>Saldo de inscritos</p>
                  <p className="font-heading font-bold text-xl">
                    {analyticsYT.inscritosGanhos - analyticsYT.inscritosPerdidos >= 0 ? '+' : ''}
                    {analyticsYT.inscritosGanhos - analyticsYT.inscritosPerdidos}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
                    +{analyticsYT.inscritosGanhos} / −{analyticsYT.inscritosPerdidos}
                  </p>
                </div>
              </div>

              {graficoYT.length > 1 && (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={graficoYT}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-border)" />
                    <XAxis dataKey="data" fontSize={11} stroke="var(--color-gray-text)" />
                    <YAxis fontSize={11} stroke="var(--color-gray-text)" />
                    <Tooltip />
                    <Area type="monotone" dataKey="views" name="Visualizações"
                      stroke="#FF0000" fill="#FF000022" />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {analyticsYT.fontes.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">De onde vêm as visualizações</h3>
                  <div className="space-y-1.5">
                    {analyticsYT.fontes.map(f => {
                      const maior = analyticsYT.fontes[0]?.views || 1
                      return (
                        <div key={f.fonte} className="flex items-center gap-2 text-xs">
                          <span className="w-40 truncate flex-shrink-0">{f.fonte}</span>
                          <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-gray-light)' }}>
                            <span className="block h-full rounded-full origin-left"
                              style={{ background: '#FF0000', width: `${(f.views / maior) * 100}%` }} />
                          </span>
                          <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--color-gray-text)' }}>
                            {numero(f.views)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
            <h2 className="font-heading font-semibold text-base mb-4">Por rede</h2>
            <div className="space-y-2">
              {dados.contas.map(c => (
                <div key={c.accountId} className="p-3 rounded-xl" style={{ background: 'var(--color-gray-light)' }}>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: NETWORK_COLORS[c.provider as SocialNetwork] ?? '#999' }} />
                    <span className="text-sm font-medium">
                      {NETWORK_LABELS[c.provider as SocialNetwork] ?? c.provider}
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--color-gray-text)' }}>{c.profileName}</span>
                    {c.ok && (
                      <span className="text-xs ml-auto flex items-center gap-2 flex-wrap justify-end">
                        <span>
                          {numero(c.seguidores)} seguidores
                          {c.publicacoes !== undefined && ` · ${numero(c.publicacoes)} publicações`}
                          {c.visualizacoes !== undefined && ` · ${numero(c.visualizacoes)} views`}
                        </span>
                        {c.crescimento?.seguidores !== null && c.crescimento?.seguidores !== undefined && (
                          <span className="px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'var(--color-gray-light)', color: corDaVariacao(c.crescimento.seguidores) }}
                            title={c.crescimento.daRede
                              ? `Dado da própria rede, últimos ${dias} dias`
                              : `Comparado ao nosso primeiro registro (${c.crescimento.desde})`}>
                            {variacao(c.crescimento.seguidores)} seguidores
                            {c.crescimento.visualizacoes ? ` · ${variacao(c.crescimento.visualizacoes)} views` : ''}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {c.ok && c.crescimento?.seguidores === null && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-gray-text)' }}>
                      Sem base de comparação ainda — esta rede só responde o número de agora, e o
                      primeiro registro é de hoje. A variação aparece a partir de amanhã.
                    </p>
                  )}
                  {!c.ok && <p className="text-xs mt-1.5" style={{ color: '#B91C1C' }}><ComLinks texto={c.motivo ?? ''} /></p>}
                  {c.limitacao && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-gray-text)' }}>
                      <ComLinks texto={c.limitacao} />
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {(semDados.length > 0 || comLimitacao.length > 0) && (
            <div className="p-4 rounded-2xl flex items-start gap-2.5" style={{ background: '#FEF3C7', color: '#92400E' }}>
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Este relatório está <strong>incompleto</strong>: {semDados.length > 0 && `${semDados.length} rede(s) não responderam`}
                {semDados.length > 0 && comLimitacao.length > 0 && ' e '}
                {comLimitacao.length > 0 && `${comLimitacao.length} têm métricas limitadas`}.
                Os motivos estão em cada rede acima. Não complete o que falta por estimativa ao apresentar a um cliente.
              </p>
            </div>
          )}

          {dados.publicados.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="font-heading font-semibold text-base mb-1">Publicados pelo sistema</h2>
              <p className="text-xs mb-4" style={{ color: 'var(--color-gray-text)' }}>
                Estes saíram daqui. O desempenho de cada um depende das permissões de métrica por post.
              </p>
              <div className="space-y-1.5">
                {dados.publicados.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm py-1.5">
                    <span className="flex-1 truncate">{p.title}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-gray-text)' }}>
                      {p.networks.map(n => NETWORK_LABELS[n as SocialNetwork] ?? n).join(', ')}
                      {' · '}
                      {new Date(p.publishedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </motion.div>
  )
}
