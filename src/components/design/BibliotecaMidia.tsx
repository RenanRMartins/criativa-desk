import { useState } from 'react'
import { Upload, Trash2, Copy, Check, Loader2, FolderOpen, ImageOff } from 'lucide-react'
import { useMediaAssets } from '@/hooks/useMediaAssets'
import { useProjectStore } from '@/store/projectStore'

function tamanhoLegivel(bytes: number) {
  if (!bytes) return ''
  const mb = bytes / 1048576
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`
}

/**
 * Biblioteca de mídia do projeto: sobe uma vez, reusa sempre.
 *
 * Usada pelo DesignDesk e pela Biblioteca — uma implementação só, para as duas
 * telas não voltarem a divergir como o worker e a rota de publicação fizeram.
 */
export default function BibliotecaMidia({ compacto = false }: { compacto?: boolean }) {
  const { activeProject } = useProjectStore()
  const [pasta, setPasta] = useState('todos')
  const { assets, pastas, carregando, erro, enviar, remover, ehDemo } = useMediaAssets(activeProject?.id, pasta)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  async function aoEscolherArquivos(lista: FileList) {
    setEnviando(true)
    setFalha(null)
    try {
      // um a um: o erro diz qual arquivo falhou, e um grande não derruba os outros
      for (const arquivo of Array.from(lista)) {
        await enviar(arquivo, { folder: pasta !== 'todos' ? pasta : 'geral' })
      }
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Falha ao enviar')
    } finally {
      setEnviando(false)
    }
  }

  async function copiarLink(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(id)
      setTimeout(() => setCopiado(null), 2000)
    } catch {
      setFalha('O navegador bloqueou a cópia. Toque e segure na imagem para copiar.')
    }
  }

  if (!activeProject) {
    return <p className="text-sm" style={{ color: 'var(--color-gray-text)' }}>Selecione um projeto para ver a biblioteca.</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setPasta('todos')}
            className="px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors"
            style={{
              borderColor: pasta === 'todos' ? 'var(--color-wine)' : 'var(--color-gray-border)',
              background: pasta === 'todos' ? 'var(--color-wine-subtle)' : 'transparent',
              color: pasta === 'todos' ? 'var(--color-wine)' : 'inherit',
            }}>
            Todos
          </button>
          {pastas.map(p => (
            <button key={p} onClick={() => setPasta(p)}
              className="px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors flex items-center gap-1"
              style={{
                borderColor: pasta === p ? 'var(--color-wine)' : 'var(--color-gray-border)',
                background: pasta === p ? 'var(--color-wine-subtle)' : 'transparent',
                color: pasta === p ? 'var(--color-wine)' : 'inherit',
              }}>
              <FolderOpen size={11} /> {p}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white cursor-pointer flex-shrink-0"
          style={{ background: 'var(--color-wine)', opacity: enviando || ehDemo ? 0.5 : 1 }}>
          {enviando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {enviando ? 'Enviando…' : 'Enviar arquivos'}
          <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={enviando || ehDemo}
            onChange={e => { if (e.target.files?.length) aoEscolherArquivos(e.target.files); e.target.value = '' }} />
        </label>
      </div>

      {ehDemo && (
        <p className="mb-3 text-xs" style={{ color: 'var(--color-gray-text)' }}>
          Sem conexão com o servidor — a biblioteca aparece vazia e o envio está desativado.
        </p>
      )}
      {(falha ?? erro) && (
        <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{falha ?? erro}</div>
      )}

      {carregando ? (
        <div className="flex items-center gap-2 text-sm py-8" style={{ color: 'var(--color-gray-text)' }}>
          <Loader2 size={15} className="animate-spin" /> Carregando…
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center" style={{ color: 'var(--color-gray-text)' }}>
          <ImageOff size={26} />
          <p className="text-sm">Nenhum arquivo guardado ainda.</p>
          <p className="text-xs">O que você enviar aqui fica salvo no projeto e pode ser reusado em qualquer post.</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${compacto ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'}`}>
          {assets.map(a => (
            <div key={a.id} className="group rounded-xl overflow-hidden border"
              style={{ borderColor: 'var(--color-gray-border)' }}>
              <div className="aspect-square relative" style={{ background: 'var(--color-gray-light)' }}>
                {a.type === 'VIDEO'
                  ? <video src={a.url} className="w-full h-full object-cover" muted preload="metadata" />
                  : <img src={a.url} alt={a.name} loading="lazy" className="w-full h-full object-cover" />}

                {/* em tablet não há hover: os botões ficam sempre visíveis lá */}
                <div className="absolute inset-x-0 bottom-0 p-1.5 flex gap-1 justify-end
                                [@media(pointer:fine)]:opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
                  <button onClick={() => copiarLink(a.url, a.id)} title="Copiar link"
                    className="p-1.5 rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.9)' }}>
                    {copiado === a.id ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                  </button>
                  <button onClick={() => { if (confirm(`Remover "${a.name}"?`)) remover(a.id) }} title="Remover"
                    className="p-1.5 rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.9)' }}>
                    <Trash2 size={12} color="#EF4444" />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate" title={a.name}>{a.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>
                  {a.folder} · {tamanhoLegivel(a.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
