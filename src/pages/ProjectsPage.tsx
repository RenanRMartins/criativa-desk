import { useState, useEffect } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, MoreHorizontal, Users, FileText, Folder } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { getInitials, truncate } from '@/lib/utils'
import type { Project } from '@/types'

const container = { animate: { transition: { staggerChildren: 0.06 } } }
const card = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.2 } } }

function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate()
  const { setActiveProject } = useProjects()

  return (
    <motion.div
      variants={card}
      className="rounded-2xl overflow-hidden cursor-pointer group"
      style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}
      whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(107,45,62,0.18)' } as never}
      transition={{ duration: 0.18 }}
      onClick={() => { setActiveProject(project); navigate(`/projects/${project.id}`) }}
    >
      {/* Animated cover banner */}
      <div
        className="h-28 relative flex items-end p-4 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${project.primaryColor} 0%, ${project.primaryColor}bb 100%)` }}
      >
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)', filter: 'blur(2px)' }} />
        <div className="absolute -bottom-8 -left-6 w-28 h-28 rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="absolute top-4 right-16 w-12 h-12 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }} />

        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)' }}
          initial={{ x: '-150%' }}
          whileHover={{ x: '200%' }}
          transition={{ duration: 0.65, ease: [0, 0, 0.2, 1] }}
        />

        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />

        <div className="relative z-10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)' }}>
            {getInitials(project.name)}
          </div>
        </div>

        <button
          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal size={14} color="white" />
        </button>

        {project.isActive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full z-10"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-white/80">Ativo</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-heading font-semibold text-sm mb-0.5" style={{ color: 'var(--color-black)' }}>
          {project.name}
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--color-gray-text)' }}>
          {project.niche ?? 'Sem nicho definido'}
        </p>
        {project.description && (
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--color-gray-text)' }}>
            {truncate(project.description, 60)}
          </p>
        )}
        <div className="flex items-center gap-4 pt-3 border-t text-xs"
          style={{ borderTopColor: 'var(--color-gray-border)', color: 'var(--color-gray-text)' }}>
          <span className="flex items-center gap-1.5">
            <FileText size={11} style={{ color: 'var(--color-wine-light)' }} />
            {project._count?.posts ?? 0} posts
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={11} style={{ color: 'var(--color-wine-light)' }} />
            {project._count?.professionals ?? 0} profissionais
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [loading, setLoading] = useState(false)
  const { createProject } = useProjects()

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      await createProject({ name, niche })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'white', boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-wine-subtle)' }}>
            <Folder size={18} style={{ color: 'var(--color-wine)' }} />
          </div>
          <h2 className="font-heading font-semibold text-xl">Novo projeto</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nome do projeto</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Clínica Habitus"
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: 'var(--color-gray-border)' }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nicho <span style={{ color: 'var(--color-gray-text)' }}>(opcional)</span>
            </label>
            <input
              type="text" value={niche} onChange={e => setNiche(e.target.value)}
              placeholder="Ex: Saúde integrativa"
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: 'var(--color-gray-border)' }}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--color-gray-border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)' }}
          >
            {loading ? 'Criando...' : 'Criar projeto'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function ProjectsPage() {
  const { projects, fetchProjects } = useProjects()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Projetos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
            {projects.length} {projects.length === 1 ? 'projeto ativo' : 'projetos ativos'}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)',
            boxShadow: '0 4px 16px rgba(107,45,62,0.3)',
          }}
        >
          <Plus size={16} /> Novo projeto
        </motion.button>
      </div>

      <motion.div variants={container} initial="initial" animate="animate" className="grid grid-cols-3 gap-5">
        {projects.map(p => <ProjectCard key={p.id} project={p} />)}
      </motion.div>

      <AnimatePresence>
        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}
