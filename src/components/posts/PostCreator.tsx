import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  X, Sparkles, CalendarDays, Hash, MapPin, Link2, AlignLeft,
  Instagram, Youtube, MessageSquare, ChevronDown, Check, Plus,
} from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { useSocialAccounts } from '@/hooks/useSocialAccounts'
import { MOCK_PROJECTS } from '@/lib/mockData'
import { FORMAT_LABELS, NETWORK_LABELS, STATUS_LABELS } from '@/lib/constants'
import { MediaUploader, type UploadedFile } from './MediaUploader'
import type { PostFormat, SocialNetwork, PostStatus } from '@/types'

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  theme: z.string().optional(),
  format: z.string(),
  networks: z.array(z.string()).min(1, 'Selecione ao menos uma rede'),
  status: z.string(),
  caption: z.string().optional(),
  firstComment: z.string().optional(),
  hashtags: z.string().optional(),
  cta: z.string().optional(),
  location: z.string().optional(),
  link: z.string().optional(),
  publishDate: z.string().optional(),
  recordingDate: z.string().optional(),
  observations: z.string().optional(),
  targetAccountIds: z.array(z.string()).default([]),
})
type FormValues = z.infer<typeof schema>

const FORMATS: { value: PostFormat; label: string; icon: React.ElementType; aspect: string }[] = [
  { value: 'FEED_INSTAGRAM', label: 'Feed', icon: Instagram, aspect: '1:1' },
  { value: 'REELS_INSTAGRAM', label: 'Reels', icon: Instagram, aspect: '9:16' },
  { value: 'STORIES_INSTAGRAM', label: 'Stories', icon: Instagram, aspect: '9:16' },
  { value: 'CAROUSEL_INSTAGRAM', label: 'Carrossel', icon: Instagram, aspect: '1:1' },
  { value: 'TIKTOK_VIDEO', label: 'TikTok', icon: MessageSquare, aspect: '9:16' },
  { value: 'YOUTUBE_SHORTS', label: 'Shorts', icon: Youtube, aspect: '9:16' },
  { value: 'GOOGLE_POST', label: 'Google', icon: Link2, aspect: '4:3' },
]

const NETWORKS: SocialNetwork[] = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'GOOGLE_BUSINESS', 'KWAI', 'LINKEDIN']
const STATUSES: PostStatus[] = ['IDEA', 'BRIEFING_READY', 'WAITING_RECORDING', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED']

const TABS = ['Conteúdo', 'Mídia', 'Publicação', 'Detalhes']

interface Props {
  open: boolean
  onClose: () => void
  onSave?: (data: FormValues, files: UploadedFile[]) => void
  defaultDate?: string
}

export function PostCreator({ open, onClose, onSave, defaultDate }: Props) {
  const { activeProject } = useProjectStore()
  const project = activeProject ?? MOCK_PROJECTS[0]
  const [activeTab, setActiveTab] = useState('Conteúdo')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [hashInput, setHashInput] = useState('')
  const [hashList, setHashList] = useState<string[]>(project?.defaultHashtags ?? [])

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      format: 'REELS_INSTAGRAM',
      networks: ['INSTAGRAM'],
      status: 'IDEA',
      publishDate: defaultDate ?? '',
      hashtags: (project?.defaultHashtags ?? []).join(' '),
      targetAccountIds: [],
    },
  })

  const selectedNetworks = watch('networks') as string[]
  const caption = watch('caption') ?? ''

  const { accounts } = useSocialAccounts(project?.id)
  const matchingAccounts = accounts.filter(a => selectedNetworks.includes(a.provider))

  // ao mudar as redes (ou carregar as contas), pré-seleciona todas as contas compatíveis
  const matchingKey = matchingAccounts.map(a => a.id).join(',')
  useEffect(() => {
    setValue('targetAccountIds', matchingKey ? matchingKey.split(',') : [])
  }, [matchingKey, setValue])

  function addHash() {
    const h = hashInput.trim().replace(/^#/, '')
    if (h && !hashList.includes(`#${h}`)) {
      setHashList(p => [...p, `#${h}`])
      setHashInput('')
    }
  }

  function onSubmit(data: FormValues) {
    onSave?.({ ...data, hashtags: hashList.join(' ') }, files)
    onClose()
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(10,6,8,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden"
            style={{
              background: 'white',
              boxShadow: '0 32px 100px rgba(0,0,0,0.3), 0 0 0 1px rgba(232,226,218,0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderBottomColor: 'var(--color-gray-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-wine-subtle)' }}>
                  <Plus size={16} style={{ color: 'var(--color-wine)' }} />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-lg leading-none">Novo post</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-gray-text)' }}>
                    {project?.name ?? 'Sem projeto'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl cursor-pointer transition-colors hover:bg-gray-100">
                <X size={18} style={{ color: 'var(--color-gray-text)' }} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 px-6 border-b flex-shrink-0" style={{ borderBottomColor: 'var(--color-gray-border)' }}>
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-3 text-sm font-medium cursor-pointer transition-colors border-b-2 -mb-px"
                  style={{
                    borderBottomColor: activeTab === tab ? 'var(--color-wine)' : 'transparent',
                    color: activeTab === tab ? 'var(--color-wine)' : 'var(--color-gray-text)',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-5 divide-x h-full" style={{ borderColor: 'var(--color-gray-border)' }}>
                  {/* Left — form */}
                  <div className="col-span-3 p-6 space-y-5">
                    {activeTab === 'Conteúdo' && (
                      <>
                        {/* Title */}
                        <div>
                          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>
                            Título *
                          </label>
                          <input
                            type="text" {...register('title')}
                            placeholder="Ex: Benefícios da vitamina D"
                            className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                            style={{ borderColor: errors.title ? '#EF4444' : 'var(--color-gray-border)' }}
                            onFocus={e => (e.target.style.borderColor = 'var(--color-wine-light)')}
                            onBlur={e => (e.target.style.borderColor = errors.title ? '#EF4444' : 'var(--color-gray-border)')}
                          />
                          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                        </div>

                        {/* Theme */}
                        <div>
                          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Tema</label>
                          <input type="text" {...register('theme')} placeholder="Ex: Saúde preventiva"
                            className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                            style={{ borderColor: 'var(--color-gray-border)' }}
                            onFocus={e => (e.target.style.borderColor = 'var(--color-wine-light)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--color-gray-border)')} />
                        </div>

                        {/* Caption */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Legenda</label>
                            <button type="button" className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-70 transition-opacity" style={{ color: 'var(--color-wine)' }}>
                              <Sparkles size={11} /> Gerar com IA
                            </button>
                          </div>
                          <textarea
                            {...register('caption')}
                            placeholder="Escreva a legenda do post..."
                            rows={5}
                            className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none transition-colors"
                            style={{ borderColor: 'var(--color-gray-border)' }}
                            onFocus={e => (e.target.style.borderColor = 'var(--color-wine-light)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--color-gray-border)')}
                          />
                          <p className="text-xs mt-1 text-right" style={{ color: caption.length > 2000 ? '#EF4444' : 'var(--color-gray-text)' }}>
                            {caption.length} / 2200
                          </p>
                        </div>

                        {/* Hashtags */}
                        <div>
                          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>
                            Hashtags
                          </label>
                          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border min-h-10" style={{ borderColor: 'var(--color-gray-border)' }}>
                            {hashList.map(h => (
                              <span key={h} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-default"
                                style={{ background: 'var(--color-wine-subtle)', color: 'var(--color-wine)' }}>
                                {h}
                                <button type="button" onClick={() => setHashList(p => p.filter(x => x !== h))}><X size={10} /></button>
                              </span>
                            ))}
                            <input
                              value={hashInput}
                              onChange={e => setHashInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addHash() } }}
                              placeholder="#hashtag"
                              className="flex-1 min-w-20 text-xs outline-none"
                              style={{ background: 'transparent', color: 'var(--color-black)' }}
                            />
                          </div>
                        </div>

                        {/* First comment + CTA */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>1º Comentário</label>
                            <input type="text" {...register('firstComment')} placeholder="Link ou texto..." className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>CTA</label>
                            <select {...register('cta')} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor: 'var(--color-gray-border)', background: 'white' }}>
                              <option value="">Selecionar</option>
                              {(project?.defaultCTAs ?? []).map(cta => <option key={cta} value={cta}>{cta}</option>)}
                              <option value="custom">Personalizado</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    {activeTab === 'Mídia' && (
                      <MediaUploader files={files} onChange={setFiles} maxFiles={10} />
                    )}

                    {activeTab === 'Publicação' && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Data de publicação</label>
                            <input type="datetime-local" {...register('publishDate')} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor: 'var(--color-gray-border)' }} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Data de gravação</label>
                            <input type="date" {...register('recordingDate')} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor: 'var(--color-gray-border)' }} />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Status</label>
                          <select {...register('status')} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer" style={{ borderColor: 'var(--color-gray-border)', background: 'white' }}>
                            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Localização</label>
                            <input type="text" {...register('location')} placeholder="Ex: São Paulo, SP" className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Link externo</label>
                            <input type="url" {...register('link')} placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: 'var(--color-gray-border)' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Detalhes' && (
                      <div>
                        <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Observações internas</label>
                        <textarea
                          {...register('observations')}
                          placeholder="Orientações para o profissional, notas internas..."
                          rows={6}
                          className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                          style={{ borderColor: 'var(--color-gray-border)' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right — format + network selector */}
                  <div className="col-span-2 p-5 space-y-5" style={{ background: 'var(--color-gray-light)' }}>
                    {/* Format */}
                    <div>
                      <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Formato</label>
                      <Controller
                        control={control}
                        name="format"
                        render={({ field }) => (
                          <div className="grid grid-cols-2 gap-2">
                            {FORMATS.map(f => (
                              <button
                                key={f.value}
                                type="button"
                                onClick={() => field.onChange(f.value)}
                                className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-left cursor-pointer transition-all"
                                style={{
                                  background: field.value === f.value ? 'var(--color-wine)' : 'white',
                                  color: field.value === f.value ? 'white' : 'var(--color-black)',
                                  border: `1px solid ${field.value === f.value ? 'var(--color-wine)' : 'var(--color-gray-border)'}`,
                                }}
                              >
                                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: field.value === f.value ? 'rgba(255,255,255,0.2)' : 'var(--color-gray-light)' }}>
                                  <f.icon size={11} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium leading-none">{f.label}</p>
                                  <p className="opacity-60 mt-0.5" style={{ fontSize: 9 }}>{f.aspect}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </div>

                    {/* Networks */}
                    <div>
                      <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Redes sociais</label>
                      <Controller
                        control={control}
                        name="networks"
                        render={({ field }) => (
                          <div className="space-y-1.5">
                            {NETWORKS.map(n => {
                              const active = (field.value as string[]).includes(n)
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => {
                                    const cur = field.value as string[]
                                    field.onChange(active ? cur.filter(x => x !== n) : [...cur, n])
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs cursor-pointer transition-all"
                                  style={{
                                    background: active ? 'white' : 'transparent',
                                    border: `1px solid ${active ? 'var(--color-gray-border)' : 'transparent'}`,
                                    color: active ? 'var(--color-black)' : 'var(--color-gray-text)',
                                    boxShadow: active ? 'var(--shadow-card)' : 'none',
                                  }}
                                >
                                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: active ? 'var(--color-wine)' : 'var(--color-gray-border)' }}>
                                    {active && <Check size={9} color="white" />}
                                  </div>
                                  {NETWORK_LABELS[n]}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      />
                      {errors.networks && <p className="text-red-500 text-xs mt-1">{errors.networks.message}</p>}
                    </div>

                    {/* Contas conectadas das redes selecionadas */}
                    {matchingAccounts.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>
                          Publicar nas contas
                        </label>
                        <Controller
                          control={control}
                          name="targetAccountIds"
                          render={({ field }) => (
                            <div className="space-y-1.5">
                              {matchingAccounts.map(account => {
                                const selected = (field.value as string[]).includes(account.id)
                                return (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => {
                                      const cur = field.value as string[]
                                      field.onChange(selected ? cur.filter(x => x !== account.id) : [...cur, account.id])
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs cursor-pointer transition-all"
                                    style={{
                                      background: selected ? 'white' : 'transparent',
                                      border: `1px solid ${selected ? 'var(--color-gray-border)' : 'transparent'}`,
                                      color: selected ? 'var(--color-black)' : 'var(--color-gray-text)',
                                      boxShadow: selected ? 'var(--shadow-card)' : 'none',
                                    }}
                                  >
                                    <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                                      style={{ background: selected ? 'var(--color-wine)' : 'var(--color-gray-border)' }}>
                                      {selected && <Check size={9} color="white" />}
                                    </div>
                                    {account.profileAvatar ? (
                                      <img src={account.profileAvatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: 'var(--color-wine)' }} />
                                    )}
                                    <span className="truncate">{account.profileName}</span>
                                    <span className="ml-auto flex-shrink-0" style={{ color: 'var(--color-gray-text)' }}>
                                      {NETWORK_LABELS[account.provider]}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        />
                      </div>
                    )}

                    {/* Preview */}
                    <div>
                      <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>Preview</label>
                      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
                        {/* Instagram-like preview */}
                        <div className="p-3 border-b flex items-center gap-2" style={{ borderBottomColor: 'var(--color-gray-border)' }}>
                          <div className="w-7 h-7 rounded-full" style={{ background: project?.primaryColor ?? 'var(--color-wine)' }} />
                          <div>
                            <p className="text-xs font-semibold leading-none" style={{ color: 'var(--color-black)' }}>{project?.name?.slice(0, 16) ?? 'Projeto'}</p>
                            <p className="text-xs" style={{ color: 'var(--color-gray-text)', fontSize: 9 }}>agora</p>
                          </div>
                        </div>
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          {files[0]?.type === 'image' ? (
                            <img src={files[0].preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-4">
                              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--color-gray-border)' }}>
                                <Instagram size={18} style={{ color: 'var(--color-gray-text)' }} />
                              </div>
                              <p className="text-xs" style={{ color: 'var(--color-gray-text)' }}>Sem mídia</p>
                            </div>
                          )}
                        </div>
                        {watch('caption') && (
                          <div className="p-3">
                            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--color-black)' }}>
                              <strong>{project?.name?.split(' ')[0] ?? 'perfil'}</strong>{' '}{watch('caption')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0" style={{ borderTopColor: 'var(--color-gray-border)' }}>
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border text-sm cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--color-gray-border)' }}>
                  Cancelar
                </button>
                <div className="flex gap-2">
                  <button type="submit" name="status" value="IDEA"
                    className="px-4 py-2 rounded-xl border text-sm cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-gray-text)' }}
                  >
                    Salvar rascunho
                  </button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    className="px-5 py-2 rounded-xl text-white text-sm font-medium cursor-pointer transition-all"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-wine) 0%, var(--color-wine-medium) 100%)',
                      boxShadow: '0 4px 16px rgba(107,45,62,0.3)',
                    }}
                  >
                    Criar post
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
