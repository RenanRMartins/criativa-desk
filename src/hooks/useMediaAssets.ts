import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export type MediaAsset = {
  id: string
  projectId: string
  url: string
  publicId?: string
  thumbnailUrl?: string
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  category: string
  name: string
  folder: string
  size: number
  tags: string[]
  isTemplate: boolean
  createdAt: string
}

/**
 * Biblioteca de mídia do projeto — o que a pessoa sobe uma vez e reusa depois.
 *
 * Antes, Biblioteca e a galeria do DesignDesk mostravam arquivos fixos no
 * código: nada do que se subia ficava guardado.
 */
export function useMediaAssets(projectId?: string, folder?: string) {
  const { token } = useAuthStore()
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [pastas, setPastas] = useState<string[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const ehDemo = !token || token.startsWith('demo-token')

  const recarregar = useCallback(async () => {
    if (ehDemo || !projectId) { setAssets([]); setPastas([]); return }
    setCarregando(true)
    try {
      const params = new URLSearchParams({ projectId, ...(folder && folder !== 'todos' ? { folder } : {}) })
      const r = await api.get<{ assets: MediaAsset[]; pastas: string[] }>(`/media?${params}`)
      setAssets(r.assets)
      setPastas(r.pastas)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar a biblioteca')
    } finally {
      setCarregando(false)
    }
  }, [ehDemo, projectId, folder])

  useEffect(() => { void recarregar() }, [recarregar])

  /** Sobe o arquivo ao Cloudinary e guarda o registro — os dois passos juntos. */
  const enviar = useCallback(async (arquivo: File, opcoes?: { folder?: string; category?: string }) => {
    if (!projectId) throw new Error('Selecione um projeto antes de enviar arquivos.')
    const form = new FormData()
    form.append('file', arquivo)
    const subido = await api.upload<{ url: string; publicId?: string; bytes?: number; resourceType?: string }>('/upload', form)

    const asset = await api.post<MediaAsset>('/media', {
      projectId,
      url: subido.url,
      publicId: subido.publicId,
      type: subido.resourceType === 'video' ? 'VIDEO' : 'IMAGE',
      category: opcoes?.category ?? (subido.resourceType === 'video' ? 'VIDEO' : 'PHOTO'),
      name: arquivo.name,
      folder: opcoes?.folder && opcoes.folder !== 'todos' ? opcoes.folder : 'geral',
      size: subido.bytes ?? arquivo.size,
    })
    setAssets(prev => [asset, ...prev])
    if (!pastas.includes(asset.folder)) setPastas(prev => [...prev, asset.folder].sort())
    return asset
  }, [projectId, pastas])

  const remover = useCallback(async (id: string) => {
    await api.delete(`/media/${id}`)
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  return { assets, pastas, carregando, erro, recarregar, enviar, remover, ehDemo }
}
