import { useState } from 'react'
import { motion } from 'motion/react'
import { pageVariants, cardVariants } from '@/lib/motionVariants'
import { BarChart3, TrendingUp, Users, Eye, Download, ArrowUpRight } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'

const reachData = [
  { date: '01/06', reach: 1200, impressions: 3400, followers: 4200 },
  { date: '08/06', reach: 1800, impressions: 4100, followers: 4350 },
  { date: '15/06', reach: 2400, impressions: 5800, followers: 4500 },
  { date: '22/06', reach: 2100, impressions: 5200, followers: 4620 },
  { date: '29/06', reach: 3100, impressions: 7200, followers: 4800 },
]

const engagementData = [
  { type: 'Likes', value: 432 },
  { type: 'Comentários', value: 87 },
  { type: 'Salvamentos', value: 210 },
  { type: 'Compartilhamentos', value: 56 },
]

const networkData = [
  { name: 'Instagram', followers: 8200, engagement: '4.8%', label: 'IG', color: '#E1306C', posts: 18 },
  { name: 'YouTube', followers: 3100, engagement: '3.1%', label: 'YT', color: '#FF0000', posts: 6 },
  { name: 'TikTok', followers: 2200, engagement: '6.2%', label: 'TK', color: '#010101', posts: 4 },
]

const topPosts = [
  { title: 'Rotina matinal de autocuidado', reach: '3.2k', engagement: '8.4%', network: 'Instagram', color: '#E1306C' },
  { title: 'Os 5 erros na dieta que ninguém conta', reach: '2.7k', engagement: '7.1%', network: 'Instagram', color: '#E1306C' },
  { title: 'Como montar uma semana produtiva', reach: '1.9k', engagement: '5.8%', network: 'YouTube', color: '#FF0000' },
]

const PERIODS = ['Semana', 'Mês', 'Trimestre', 'Ano'] as const
type Period = typeof PERIODS[number]

function MetricCard({
  label, value, icon: Icon, change, color,
}: {
  label: string; value: string; icon: React.ElementType; change: string; color: string
}) {
  const positive = change.startsWith('+')
  return (
    <motion.div
      variants={cardVariants}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: color }} />

      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>

      <p className="font-heading font-bold text-2xl mb-1">{value}</p>

      <div className="flex items-center gap-1">
        <ArrowUpRight size={12} style={{ color: positive ? '#10B981' : '#EF4444', transform: positive ? 'none' : 'scaleY(-1)' }} />
        <p className="text-xs font-medium" style={{ color: positive ? '#10B981' : '#EF4444' }}>{change}</p>
      </div>
    </motion.div>
  )
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('Mês')

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Relatórios</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>Junho 2025 · Todos os projetos</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-gray-border)' }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 text-xs cursor-pointer transition-colors"
                style={{
                  background: period === p ? 'var(--color-wine)' : 'white',
                  color: period === p ? 'white' : 'var(--color-gray-text)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--color-gray-border)' }}
          >
            <Download size={14} style={{ color: 'var(--color-gray-text)' }} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <motion.div
        variants={{ animate: { transition: { staggerChildren: 0.07 } } }}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-4"
      >
        <MetricCard label="Alcance total" value="9.6k" icon={Eye} change="+14% vs. mês anterior" color="#6B2D3E" />
        <MetricCard label="Seguidores" value="13.5k" icon={Users} change="+8% vs. mês anterior" color="#3B82F6" />
        <MetricCard label="Engajamento" value="4.2%" icon={TrendingUp} change="+0.3pp vs. mês anterior" color="#10B981" />
        <MetricCard label="Posts publicados" value="28" icon={BarChart3} change="+4 vs. mês anterior" color="#F59E0B" />
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="col-span-2 rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-semibold text-base">Alcance e Impressões</h2>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-gray-text)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded inline-block" style={{ background: 'var(--color-wine)' }} />
                Alcance
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded inline-block" style={{ background: 'var(--color-wine-light)', borderTop: '1px dashed' }} />
                Impressões
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={reachData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B2D3E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6B2D3E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE2" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E8E2DA', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                cursor={{ stroke: '#6B2D3E', strokeWidth: 1, strokeDasharray: '4 2' }}
              />
              <Area type="monotone" dataKey="reach" stroke="#6B2D3E" fill="url(#gradReach)" strokeWidth={2} name="Alcance" dot={false} />
              <Area type="monotone" dataKey="impressions" stroke="#C4697A" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" name="Impressões" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="font-heading font-semibold text-base mb-5">Engajamento por tipo</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={engagementData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE2" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: '#5C5C5C' }} width={96} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E8E2DA' }}
                cursor={{ fill: 'rgba(107,45,62,0.04)' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Total">
                {engagementData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#6B2D3E' : i === 1 ? '#8B3A4E' : i === 2 ? '#C4697A' : '#E8A4AD'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-5">
        {/* By network */}
        <div className="col-span-2 rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="font-heading font-semibold text-base mb-4">Desempenho por rede</h2>
          <div className="space-y-3">
            {networkData.map(n => (
              <div key={n.name} className="flex items-center gap-4 p-3 rounded-xl"
                style={{ background: 'var(--color-gray-light)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: n.color + '18' }}>
                  <span className="text-xs font-bold" style={{ color: n.color }}>{n.label}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>{n.posts} posts publicados</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{n.followers.toLocaleString('pt-BR')}</p>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>seguidores</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: '#10B981' }}>{n.engagement}</p>
                  <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>engajamento</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top posts */}
        <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="font-heading font-semibold text-base mb-4">Top posts</h2>
          <div className="space-y-3">
            {topPosts.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ background: p.color }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs" style={{ color: 'var(--color-gray-text)' }}>{p.reach} alcance</span>
                    <span className="text-xs font-medium" style={{ color: '#10B981' }}>{p.engagement}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
