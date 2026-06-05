import { useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'motion/react'
import { Upload, X, Film, Loader2, CheckCircle2 } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'
import { api } from '@/lib/api'

export interface UploadedFile {
  id: string
  file: File
  preview: string
  type: 'image' | 'video'
  url?: string
  publicId?: string
  uploading?: boolean
}

interface UploadResult {
  url: string
  publicId: string
  resourceType: string
}

interface Props {
  files: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  maxFiles?: number
  accept?: 'images' | 'videos' | 'both'
}

export function MediaUploader({ files, onChange, maxFiles = 10, accept = 'both' }: Props) {
  const filesRef = useRef<UploadedFile[]>(files)
  useEffect(() => { filesRef.current = files }, [files])

  const acceptMap = {
    images: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    videos: { 'video/*': ['.mp4', '.mov', '.avi', '.webm'] },
    both:   { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'video/*': ['.mp4', '.mov', '.webm'] },
  }

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadedFile[] = accepted.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
      uploading: true,
    }))
    const merged = [...files, ...newFiles].slice(0, maxFiles)
    onChange(merged)

    newFiles.forEach(f => {
      const formData = new FormData()
      formData.append('file', f.file)
      api.upload<UploadResult>('/upload', formData)
        .then(result => {
          onChange(filesRef.current.map(p =>
            p.id === f.id ? { ...p, url: result.url, publicId: result.publicId, uploading: false } : p
          ))
        })
        .catch(() => {
          onChange(filesRef.current.map(p => p.id === f.id ? { ...p, uploading: false } : p))
        })
    })
  }, [files, onChange, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap[accept],
    maxFiles: maxFiles - files.length,
    disabled: files.length >= maxFiles,
  })

  function remove(id: string) {
    const f = files.find(f => f.id === id)
    if (f) URL.revokeObjectURL(f.preview)
    onChange(files.filter(f => f.id !== id))
  }

  return (
    <div className="space-y-3">
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className="rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200"
          style={{
            borderColor: isDragActive ? 'var(--color-wine-light)' : 'var(--color-gray-border)',
            background: isDragActive ? 'var(--color-wine-subtle)' : 'var(--color-gray-light)',
          }}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: isDragActive ? 'var(--color-wine-subtle)' : 'white' }}>
              <Upload size={18} style={{ color: isDragActive ? 'var(--color-wine)' : 'var(--color-gray-text)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: isDragActive ? 'var(--color-wine)' : 'var(--color-black)' }}>
              {isDragActive ? 'Solte aqui!' : 'Arraste ou clique para enviar'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
              {accept === 'images' ? 'JPG, PNG, WEBP' : accept === 'videos' ? 'MP4, MOV, WEBM' : 'Imagens e vídeos'}
              {' · '}Max {maxFiles} arquivo{maxFiles > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-2">
            {files.map(f => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative rounded-xl overflow-hidden group aspect-square"
                style={{ background: 'var(--color-black-soft)' }}
              >
                {f.type === 'image' ? (
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <Film size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                    <span className="text-xs text-center px-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {f.file.name.slice(0, 12)}
                    </span>
                  </div>
                )}

                {/* Upload status */}
                {f.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <Loader2 size={20} color="white" className="animate-spin" />
                  </div>
                )}
                {!f.uploading && f.url && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                  </div>
                )}

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-1.5"
                  style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <button
                    onClick={e => { e.stopPropagation(); remove(f.id) }}
                    className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: 'rgba(239,68,68,0.9)' }}
                  >
                    <X size={12} color="white" />
                  </button>
                </div>

                <div className="absolute bottom-1 left-1">
                  <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)', fontSize: 9 }}>
                    {f.uploading ? 'Enviando...' : formatFileSize(f.file.size)}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
