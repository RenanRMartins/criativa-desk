import { useState, useEffect } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { MOCK_PROJECTS } from '@/lib/mockData'
import { getInitials } from '@/lib/utils'
import { ProfessionalCard } from '@/components/professionals/ProfessionalCard'
import { VideoTaskCard } from '@/components/professionals/VideoTaskCard'
import { useVideoTasks } from '@/hooks/useVideoTasks'
import type { Project } from '@/types'

const TABS = ['Visão Geral', 'Identidade Visual', 'Tom de Voz', 'Redes Sociais', 'Equipe', 'Templates']

function ChipInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  function add() {
    const v = input.trim()
    if (v && !values.includes(v)) { onChange([...values, v]); setInput('') }
  }
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2 p-2 rounded-lg border min-h-10" style={{ borderColor: 'var(--color-gray-border)', background: 'white' }}>
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}>
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))} className="cursor-pointer"><X size={10} /></button>
          </span>
        ))}
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Digitar e Enter"
          className="flex-1 min-w-20 text-xs outline-none"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, updateProject } = useProjectStore()
  const { professionals, tasks, fetchProfessionals, fetchTasks, createProfessional, createTask } = useVideoTasks(id)
  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState('Visão Geral')
  const [saved, setSaved] = useState(false)
  const [newProfName, setNewProfName] = useState('')
  const [newProfEmail, setNewProfEmail] = useState('')
  const [showAddProf, setShowAddProf] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskProfId, setNewTaskProfId] = useState('')
  const [newTaskDeadline, setNewTaskDeadline] = useState('')

  async function handleAddProfessional() {
    if (!newProfName.trim() || !id) return
    await createProfessional({ projectId: id, name: newProfName, email: newProfEmail || undefined })
    setNewProfName(''); setNewProfEmail(''); setShowAddProf(false)
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim() || !newTaskProfId || !newTaskDeadline) return
    await createTask({ professionalId: newTaskProfId, title: newTaskTitle, deadline: newTaskDeadline })
    setNewTaskTitle(''); setNewTaskProfId(''); setNewTaskDeadline(''); setShowAddTask(false)
  }

  useEffect(() => {
    const all = projects.length > 0 ? projects : MOCK_PROJECTS
    const found = all.find(p => p.id === id)
    if (found) setProject({ ...found })
    else navigate('/projects')
  }, [id, projects, navigate])

  useEffect(() => {
    if (activeTab === 'Equipe') {
      fetchProfessionals()
      fetchTasks()
    }
  }, [activeTab, fetchProfessionals, fetchTasks])

  if (!project) return null

  function update(field: keyof Project, value: unknown) {
    setProject(prev => prev ? { ...prev, [field]: value } : null)
  }

  function save() {
    if (!project) return
    updateProject(project.id, project)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Header / Cover */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
        <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${project.primaryColor}, ${project.primaryColor}cc)` }}>
          <button onClick={() => navigate('/projects')} className="absolute top-3 left-3 p-1.5 rounded-lg cursor-pointer transition-colors" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <ArrowLeft size={16} color="white" />
          </button>
        </div>
        <div className="px-6 pb-4 flex items-end gap-4 -mt-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white border-4 border-white" style={{ background: project.primaryColor }}>
            {getInitials(project.name)}
          </div>
          <div className="pb-1 flex-1">
            <h1 className="font-heading font-bold text-xl">{project.name}</h1>
            <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>{project.niche}</p>
          </div>
          <button onClick={save} className="mb-1 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: saved ? '#10B981' : 'var(--color-wine)' }}>
            <Save size={14} /> {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderBottomColor: 'var(--color-gray-border)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors border-b-2 -mb-px"
            style={{ borderBottomColor: activeTab === tab ? 'var(--color-wine)' : 'transparent', color: activeTab === tab ? 'var(--color-wine)' : 'var(--color-gray-text)' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-card p-6" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
        {activeTab === 'Visão Geral' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome do projeto</label>
              <input type="text" value={project.name} onChange={e => update('name', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Descrição</label>
              <textarea value={project.description ?? ''} onChange={e => update('description', e.target.value)} rows={3} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none" style={{ borderColor: 'var(--color-gray-border)' }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nicho</label>
                <input type="text" value={project.niche ?? ''} onChange={e => update('niche', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Segmento</label>
                <input type="text" value={project.segment ?? ''} onChange={e => update('segment', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Público-alvo</label>
              <textarea value={project.targetAudience ?? ''} onChange={e => update('targetAudience', e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none" style={{ borderColor: 'var(--color-gray-border)' }} />
            </div>
          </div>
        )}

        {activeTab === 'Identidade Visual' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1.5">
                    {field === 'primaryColor' ? 'Cor primária' : field === 'secondaryColor' ? 'Cor secundária' : 'Cor de acento'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={project[field]} onChange={e => update(field, e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5" style={{ borderColor: 'var(--color-gray-border)' }} />
                    <input type="text" value={project[field]} onChange={e => update(field, e.target.value)} className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none font-mono" style={{ borderColor: 'var(--color-gray-border)' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div>
              <p className="text-sm font-medium mb-2">Preview</p>
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: project.primaryColor }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: project.accentColor }}>
                  {getInitials(project.name)}
                </div>
                <div>
                  <p className="font-heading font-semibold text-white">{project.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{project.niche}</p>
                </div>
                <button className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer" style={{ background: project.accentColor, color: project.primaryColor }}>
                  CTA exemplo
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Tom de Voz' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Tom de voz</label>
              <input type="text" value={project.toneOfVoice ?? ''} onChange={e => update('toneOfVoice', e.target.value)} placeholder="Ex: Acolhedor, profissional e integrativo" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Personalidade do copy</label>
              <input type="text" value={project.copyPersonality ?? ''} onChange={e => update('copyPersonality', e.target.value)} placeholder="Ex: Educativo e empático" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
            </div>
            <ChipInput label="Palavras proibidas" values={project.forbiddenWords} onChange={v => update('forbiddenWords', v)} />
            <ChipInput label="Tópicos proibidos" values={project.forbiddenTopics} onChange={v => update('forbiddenTopics', v)} />
            <ChipInput label="CTAs padrão" values={project.defaultCTAs} onChange={v => update('defaultCTAs', v)} />
            <ChipInput label="Hashtags padrão" values={project.defaultHashtags} onChange={v => update('defaultHashtags', v)} />
            <ChipInput label="Pilares de conteúdo" values={project.contentPillars} onChange={v => update('contentPillars', v)} />
            <ChipInput label="Nichos para TrendDesk" values={project.niches} onChange={v => update('niches', v)} />
          </div>
        )}

        {activeTab === 'Redes Sociais' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
              Conecte suas redes sociais para agendar e publicar automaticamente.
            </p>
            <div className="rounded-xl p-4 border-2 border-dashed text-center cursor-pointer hover:border-wine/50 transition-colors" style={{ borderColor: 'var(--color-gray-border)' }}>
              <Plus size={20} className="mx-auto mb-2" style={{ color: 'var(--color-gray-text)' }} />
              <p className="text-sm font-medium">Conectar rede social</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-gray-text)' }}>Instagram, TikTok, YouTube e mais</p>
            </div>
          </div>
        )}

        {activeTab === 'Equipe' && (
          <div className="space-y-6">
            {/* Professionals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-base">Profissionais (gravadores)</h3>
                <button onClick={() => setShowAddProf(!showAddProf)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border"
                  style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-wine)' }}>
                  <Plus size={12} /> Adicionar profissional
                </button>
              </div>

              {showAddProf && (
                <div className="rounded-xl p-4 mb-3 space-y-3" style={{ background: 'var(--color-gray-light)', border: '1px solid var(--color-gray-border)' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newProfName} onChange={e => setNewProfName(e.target.value)}
                      placeholder="Nome *" className="px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ borderColor: 'var(--color-gray-border)', background: 'white' }} />
                    <input value={newProfEmail} onChange={e => setNewProfEmail(e.target.value)}
                      placeholder="E-mail (opcional)" type="email" className="px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ borderColor: 'var(--color-gray-border)', background: 'white' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddProfessional} disabled={!newProfName.trim()}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer disabled:opacity-40"
                      style={{ background: 'var(--color-wine)' }}>Salvar</button>
                    <button onClick={() => setShowAddProf(false)}
                      className="px-4 py-1.5 rounded-lg text-xs cursor-pointer border"
                      style={{ borderColor: 'var(--color-gray-border)' }}>Cancelar</button>
                  </div>
                </div>
              )}

              {professionals.filter(p => p.projectId === project.id).length === 0 ? (
                <div className="rounded-xl p-6 text-center border-2 border-dashed" style={{ borderColor: 'var(--color-gray-border)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Nenhum profissional cadastrado</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-gray-text)' }}>Adicione gravadores de vídeo ao projeto</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {professionals.filter(p => p.projectId === project.id).map(prof => (
                    <ProfessionalCard
                      key={prof.id}
                      professional={{ ...prof, videoTasks: tasks.filter(t => t.professionalId === prof.id) }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Video Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-base">Tarefas de gravação</h3>
                <button onClick={() => setShowAddTask(!showAddTask)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border"
                  style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-wine)' }}>
                  <Plus size={12} /> Nova tarefa
                </button>
              </div>

              {showAddTask && (
                <div className="rounded-xl p-4 mb-3 space-y-3" style={{ background: 'var(--color-gray-light)', border: '1px solid var(--color-gray-border)' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="Título da tarefa *" className="px-3 py-2 rounded-lg border text-sm outline-none col-span-2"
                      style={{ borderColor: 'var(--color-gray-border)', background: 'white' }} />
                    <select value={newTaskProfId} onChange={e => setNewTaskProfId(e.target.value)}
                      className="px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer"
                      style={{ borderColor: 'var(--color-gray-border)', background: 'white' }}>
                      <option value="">Profissional *</option>
                      {professionals.filter(p => p.projectId === project.id).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)}
                      type="date" className="px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer"
                      style={{ borderColor: 'var(--color-gray-border)', background: 'white' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddTask} disabled={!newTaskTitle.trim() || !newTaskProfId || !newTaskDeadline}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer disabled:opacity-40"
                      style={{ background: 'var(--color-wine)' }}>Salvar</button>
                    <button onClick={() => setShowAddTask(false)}
                      className="px-4 py-1.5 rounded-lg text-xs cursor-pointer border"
                      style={{ borderColor: 'var(--color-gray-border)' }}>Cancelar</button>
                  </div>
                </div>
              )}

              {tasks.filter(t =>
                professionals.filter(p => p.projectId === project.id).map(p => p.id).includes(t.professionalId)
              ).length === 0 ? (
                <div className="rounded-xl p-6 text-center border-2 border-dashed" style={{ borderColor: 'var(--color-gray-border)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Nenhuma tarefa criada</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {tasks.filter(t =>
                    professionals.filter(p => p.projectId === project.id).map(p => p.id).includes(t.professionalId)
                  ).map(task => (
                    <VideoTaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>

            {/* Team members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-base">Equipe interna</h3>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border"
                  style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-wine)' }}>
                  <Plus size={12} /> Convidar membro
                </button>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>
                Gerencie quem tem acesso a este projeto.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'Templates' && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Adicione templates do Canva para este projeto.</p>
            <button onClick={() => navigate('/designdesk')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border" style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-wine)' }}>
              <Plus size={14} /> Gerenciar templates no DesignDesk
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
