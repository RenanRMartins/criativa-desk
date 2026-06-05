import { useState, useMemo } from 'react'
import { pageVariants } from '@/lib/motionVariants'
import { motion, AnimatePresence } from 'motion/react'
import {
  Upload, Search, Grid3X3, List, Image, Film, FileText, File,
  Download, Trash2, MoreHorizontal, X, CheckSquare, Square,
  FolderOpen, Plus,
} from 'lucide-react'

type FileType = 'image' | 'video' | 'pdf' | 'doc'
type Folder = 'geral' | 'logos' | 'fotos' | 'vídeos' | 'templates' | 'referências'

interface MediaFile {
  id: string
  name: string
  type: FileType
  size: string
  folder: Folder
  createdAt: string
  color: string
  width?: number
  height?: number
  duration?: string
}

const MOCK_FILES: MediaFile[] = [
  { id: 'f1', name: 'banner-habitus-junho.jpg', type: 'image', size: '2.4 MB', folder: 'fotos', createdAt: '2025-06-01', color: '#6B2D3E', width: 1080, height: 1080 },
  { id: 'f2', name: 'logo-habitus-branco.png', type: 'image', size: '340 KB', folder: 'logos', createdAt: '2025-05-15', color: '#FAF7F2', width: 800, height: 400 },
  { id: 'f3', name: 'reels-ozonioterapia.mp4', type: 'video', size: '45 MB', folder: 'vídeos', createdAt: '2025-06-03', color: '#1A1A1A', duration: '0:32' },
  { id: 'f4', name: 'briefing-junho-2025.pdf', type: 'pdf', size: '1.2 MB', folder: 'geral', createdAt: '2025-06-01', color: '#EF4444' },
  { id: 'f5', name: 'foto-dra-odilia.jpg', type: 'image', size: '3.1 MB', folder: 'fotos', createdAt: '2025-05-28', color: '#2D6B5A', width: 1080, height: 1350 },
  { id: 'f6', name: 'template-stories-habitus.png', type: 'image', size: '890 KB', folder: 'templates', createdAt: '2025-05-20', color: '#8B3A4E', width: 1080, height: 1920 },
  { id: 'f7', name: 'ref-feed-concorrente.jpg', type: 'image', size: '1.8 MB', folder: 'referências', createdAt: '2025-05-10', color: '#C9A96E', width: 1080, height: 1080 },
  { id: 'f8', name: 'stories-rotina-matinal.mp4', type: 'video', size: '28 MB', folder: 'vídeos', createdAt: '2025-06-02', color: '#374151', duration: '0:15' },
  { id: 'f9', name: 'logo-habitus-colorido.png', type: 'image', size: '420 KB', folder: 'logos', createdAt: '2025-04-01', color: '#6B2D3E', width: 1200, height: 600 },
  { id: 'f10', name: 'contrato-cliente.pdf', type: 'pdf', size: '780 KB', folder: 'geral', createdAt: '2025-03-15', color: '#3B82F6' },
  { id: 'f11', name: 'pauta-semana-1.docx', type: 'doc', size: '45 KB', folder: 'geral', createdAt: '2025-06-03', color: '#8B5CF6' },
  { id: 'f12', name: 'carrossel-bem-estar.png', type: 'image', size: '2.2 MB', folder: 'templates', createdAt: '2025-05-25', color: '#059669', width: 1080, height: 1080 },
]

const FOLDERS: { id: Folder | 'todos'; label: string; count: number }[] = [
  { id: 'todos', label: 'Todos', count: MOCK_FILES.length },
  { id: 'geral', label: 'Geral', count: MOCK_FILES.filter(f => f.folder === 'geral').length },
  { id: 'logos', label: 'Logos', count: MOCK_FILES.filter(f => f.folder === 'logos').length },
  { id: 'fotos', label: 'Fotos', count: MOCK_FILES.filter(f => f.folder === 'fotos').length },
  { id: 'vídeos', label: 'Vídeos', count: MOCK_FILES.filter(f => f.folder === 'vídeos').length },
  { id: 'templates', label: 'Templates', count: MOCK_FILES.filter(f => f.folder === 'templates').length },
  { id: 'referências', label: 'Referências', count: MOCK_FILES.filter(f => f.folder === 'referências').length },
]

function fileIcon(type: FileType, size = 20) {
  if (type === 'image') return <Image size={size} />
  if (type === 'video') return <Film size={size} />
  if (type === 'pdf') return <FileText size={size} />
  return <File size={size} />
}

function fileAccent(type: FileType): string {
  if (type === 'image') return '#6B2D3E'
  if (type === 'video') return '#1A1A1A'
  if (type === 'pdf') return '#EF4444'
  return '#8B5CF6'
}

function FileThumbnail({ file, size = 'md' }: { file: MediaFile; size?: 'sm' | 'md' }) {
  const h = size === 'md' ? 'h-36' : 'h-16 w-16 flex-shrink-0'
  return (
    <div
      className={`${h} rounded-xl relative overflow-hidden flex items-center justify-center`}
      style={{ background: file.color + '22' }}
    >
      {file.type === 'image' && (
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, ${file.color}55 0%, ${file.color}22 100%)`,
        }} />
      )}
      <div style={{ color: fileAccent(file.type), opacity: 0.7 }}>
        {fileIcon(file.type, size === 'md' ? 28 : 18)}
      </div>
      {file.type === 'video' && file.duration && (
        <span className="absolute bottom-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>
          {file.duration}
        </span>
      )}
      {file.type === 'image' && file.width && (
        <span className="absolute bottom-1.5 left-1.5 text-[10px]"
          style={{ color: fileAccent(file.type), opacity: 0.8 }}>
          {file.width}×{file.height}
        </span>
      )}
    </div>
  )
}

function FileCardGrid({ file, selected, onSelect }: { file: MediaFile; selected: boolean; onSelect: () => void }) {
  const [hover, setHover] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl overflow-hidden cursor-pointer group relative"
      style={{ background: 'white', boxShadow: selected ? `0 0 0 2px var(--color-wine)` : 'var(--shadow-card)' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
    >
      <FileThumbnail file={file} />

      {/* Overlay on hover/selected */}
      <AnimatePresence>
        {(hover || selected) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 left-2"
          >
            {selected
              ? <CheckSquare size={18} style={{ color: 'var(--color-wine)' }} />
              : <Square size={18} color="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions on hover */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 right-2 flex gap-1"
          >
            <button
              className="p-1.5 rounded-lg cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.9)' }}
              onClick={e => e.stopPropagation()}
            >
              <Download size={12} style={{ color: 'var(--color-gray-text)' }} />
            </button>
            <button
              className="p-1.5 rounded-lg cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.9)' }}
              onClick={e => e.stopPropagation()}
            >
              <MoreHorizontal size={12} style={{ color: 'var(--color-gray-text)' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3">
        <p className="text-xs font-medium truncate mb-0.5" title={file.name}>{file.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--color-gray-text)' }}>{file.size}</span>
          <span className="text-[10px]" style={{ color: 'var(--color-gray-text)' }}>{file.createdAt}</span>
        </div>
      </div>
    </motion.div>
  )
}

function FileRowList({ file, selected, onSelect }: { file: MediaFile; selected: boolean; onSelect: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-4 px-4 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-gray-50"
      style={{ background: selected ? 'var(--color-wine-subtle)' : 'transparent' }}
      onClick={onSelect}
    >
      <div onClick={e => e.stopPropagation()}>
        {selected
          ? <CheckSquare size={16} style={{ color: 'var(--color-wine)' }} />
          : <Square size={16} style={{ color: 'var(--color-gray-border)' }} />
        }
      </div>
      <FileThumbnail file={file} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
          {file.folder} · {file.type.toUpperCase()}
          {file.width ? ` · ${file.width}×${file.height}` : ''}
          {file.duration ? ` · ${file.duration}` : ''}
        </p>
      </div>
      <span className="text-xs w-16 text-right" style={{ color: 'var(--color-gray-text)' }}>{file.size}</span>
      <span className="text-xs w-24 text-right" style={{ color: 'var(--color-gray-text)' }}>{file.createdAt}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
        <button className="p-1.5 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors" onClick={e => e.stopPropagation()}>
          <Download size={13} style={{ color: 'var(--color-gray-text)' }} />
        </button>
        <button className="p-1.5 rounded-lg cursor-pointer hover:bg-red-50 transition-colors" onClick={e => e.stopPropagation()}>
          <Trash2 size={13} color="#EF4444" />
        </button>
      </div>
    </motion.div>
  )
}

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeFolder, setActiveFolder] = useState<Folder | 'todos'>('todos')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragOver, setDragOver] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_FILES.filter(f => {
      const matchFolder = activeFolder === 'todos' || f.folder === activeFolder
      const matchQuery = !query || f.name.toLowerCase().includes(query.toLowerCase())
      return matchFolder && matchQuery
    })
  }, [activeFolder, query])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() { setSelected(new Set()) }

  const totalSize = filtered.reduce((acc, f) => {
    const n = parseFloat(f.size)
    const unit = f.size.includes('MB') ? 1 : 0.001
    return acc + n * unit
  }, 0)

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Biblioteca de Conteúdo</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
            {MOCK_FILES.length} arquivos · {totalSize.toFixed(0)} MB usados
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'var(--color-wine-subtle)', border: '1px solid var(--color-wine-light)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--color-wine)' }}>
                {selected.size} selecionado{selected.size > 1 ? 's' : ''}
              </span>
              <button className="p-0.5 cursor-pointer" onClick={clearSelection}>
                <X size={12} style={{ color: 'var(--color-wine)' }} />
              </button>
            </motion.div>
          )}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)', boxShadow: '0 4px 16px rgba(107,45,62,0.3)' }}
          >
            <Upload size={15} /> Upload
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar de pastas */}
        <div className="w-44 flex-shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-2"
            style={{ color: 'var(--color-gray-text)' }}>Pastas</p>
          <div className="space-y-0.5">
            {FOLDERS.map(folder => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className="w-full text-left px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-between"
                style={{
                  background: activeFolder === folder.id ? 'var(--color-wine-subtle)' : 'transparent',
                  color: activeFolder === folder.id ? 'var(--color-wine)' : 'var(--color-gray-text)',
                  fontWeight: activeFolder === folder.id ? 600 : 400,
                }}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={13} />
                  {folder.label}
                </span>
                <span className="text-xs">{folder.count}</span>
              </button>
            ))}
          </div>

          <button className="w-full flex items-center gap-2 px-3 py-2 mt-3 rounded-xl text-xs cursor-pointer transition-colors border border-dashed"
            style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-gray-text)' }}>
            <Plus size={12} /> Nova pasta
          </button>

          {/* Type filter legend */}
          <div className="mt-6 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-2"
              style={{ color: 'var(--color-gray-text)' }}>Tipos</p>
            {(['image', 'video', 'pdf', 'doc'] as FileType[]).map(t => (
              <div key={t} className="flex items-center gap-2 px-3 py-1.5 text-xs"
                style={{ color: 'var(--color-gray-text)' }}>
                <span style={{ color: fileAccent(t) }}>{fileIcon(t, 13)}</span>
                {t === 'image' ? 'Imagens' : t === 'video' ? 'Vídeos' : t === 'pdf' ? 'PDFs' : 'Documentos'}
                <span className="ml-auto">{MOCK_FILES.filter(f => f.type === t).length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-gray-text)' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar arquivos..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none"
                style={{ borderColor: 'var(--color-gray-border)', background: 'white' }}
              />
              {query && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setQuery('')}>
                  <X size={13} style={{ color: 'var(--color-gray-text)' }} />
                </button>
              )}
            </div>

            <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-gray-border)' }}>
              <button onClick={() => setViewMode('grid')} className="p-2 cursor-pointer transition-colors"
                style={{ background: viewMode === 'grid' ? 'var(--color-wine)' : 'white', color: viewMode === 'grid' ? 'white' : 'var(--color-gray-text)' }}>
                <Grid3X3 size={15} />
              </button>
              <button onClick={() => setViewMode('list')} className="p-2 cursor-pointer transition-colors"
                style={{ background: viewMode === 'list' ? 'var(--color-wine)' : 'white', color: viewMode === 'list' ? 'white' : 'var(--color-gray-text)' }}>
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Drop zone (shown when empty or small) */}
          {filtered.length === 0 ? (
            <div
              className="rounded-2xl border-2 border-dashed p-16 text-center transition-colors"
              style={{ borderColor: dragOver ? 'var(--color-wine)' : 'var(--color-gray-border)', background: dragOver ? 'var(--color-wine-subtle)' : 'white' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={() => setDragOver(false)}
            >
              <Upload size={36} className="mx-auto mb-3" style={{ color: dragOver ? 'var(--color-wine)' : 'var(--color-gray-border)' }} />
              <p className="font-medium text-sm mb-1">{query ? 'Nenhum arquivo encontrado' : 'Pasta vazia'}</p>
              <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
                {query ? `Sem resultados para "${query}"` : 'Arraste arquivos aqui ou clique em Upload'}
              </p>
            </div>
          ) : (
            <>
              {/* Drop zone no topo (compacta) */}
              <div
                className="rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all flex items-center gap-3 justify-center"
                style={{
                  borderColor: dragOver ? 'var(--color-wine)' : 'var(--color-gray-border)',
                  background: dragOver ? 'var(--color-wine-subtle)' : 'transparent',
                }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={() => setDragOver(false)}
              >
                <Upload size={16} style={{ color: dragOver ? 'var(--color-wine)' : 'var(--color-gray-text)' }} />
                <p className="text-xs" style={{ color: dragOver ? 'var(--color-wine)' : 'var(--color-gray-text)' }}>
                  Arraste arquivos aqui · JPG, PNG, MP4, PDF até 500 MB
                </p>
              </div>

              {/* Grid or list */}
              <AnimatePresence mode="popLayout">
                {viewMode === 'grid' ? (
                  <motion.div
                    key="grid"
                    className="grid grid-cols-4 gap-4"
                  >
                    {filtered.map(file => (
                      <FileCardGrid
                        key={file.id}
                        file={file}
                        selected={selected.has(file.id)}
                        onSelect={() => toggleSelect(file.id)}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="list" className="space-y-1 group">
                    {/* List header */}
                    <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--color-gray-text)' }}>
                      <div className="w-4" />
                      <div className="w-16" />
                      <div className="flex-1">Nome</div>
                      <div className="w-16 text-right">Tamanho</div>
                      <div className="w-24 text-right">Data</div>
                      <div className="w-14" />
                    </div>
                    {filtered.map(file => (
                      <FileRowList
                        key={file.id}
                        file={file}
                        selected={selected.has(file.id)}
                        onSelect={() => toggleSelect(file.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-xs text-center" style={{ color: 'var(--color-gray-text)' }}>
                {filtered.length} arquivo{filtered.length !== 1 ? 's' : ''} · {selected.size > 0 ? `${selected.size} selecionado${selected.size > 1 ? 's' : ''}` : 'Clique para selecionar'}
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
