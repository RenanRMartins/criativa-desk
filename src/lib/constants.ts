import type { PostStatus, PostFormat, SocialNetwork, CopyType } from '@/types'

export const STATUS_LABELS: Record<PostStatus, string> = {
  IDEA: 'Ideia',
  BRIEFING_READY: 'Briefing pronto',
  WAITING_RECORDING: 'Aguardando gravação',
  VIDEO_RECEIVED: 'Vídeo recebido',
  IN_EDITING: 'Em edição',
  PENDING_APPROVAL: 'Aguardando aprovação',
  CHANGES_REQUESTED: 'Com ajustes',
  APPROVED: 'Aprovado',
  SCHEDULED: 'Agendado',
  PUBLISHED: 'Publicado',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
}

export const STATUS_COLORS: Record<PostStatus, string> = {
  IDEA: '#94A3B8',
  BRIEFING_READY: '#60A5FA',
  WAITING_RECORDING: '#FBBF24',
  VIDEO_RECEIVED: '#F97316',
  IN_EDITING: '#A78BFA',
  PENDING_APPROVAL: '#3B82F6',
  CHANGES_REQUESTED: '#EF4444',
  APPROVED: '#10B981',
  SCHEDULED: '#6B2D3E',
  PUBLISHED: '#059669',
  FAILED: '#DC2626',
  CANCELLED: '#6B7280',
}

export const STATUS_BG_CLASSES: Record<PostStatus, string> = {
  IDEA: 'bg-slate-400/20 text-slate-600',
  BRIEFING_READY: 'bg-blue-100 text-blue-700',
  WAITING_RECORDING: 'bg-yellow-100 text-yellow-700',
  VIDEO_RECEIVED: 'bg-orange-100 text-orange-700',
  IN_EDITING: 'bg-violet-100 text-violet-700',
  PENDING_APPROVAL: 'bg-blue-100 text-blue-800',
  CHANGES_REQUESTED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  SCHEDULED: 'bg-wine/10 text-wine',
  PUBLISHED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export const FORMAT_LABELS: Record<PostFormat, string> = {
  FEED_INSTAGRAM: 'Feed Instagram',
  REELS_INSTAGRAM: 'Reels Instagram',
  STORIES_INSTAGRAM: 'Stories Instagram',
  CAROUSEL_INSTAGRAM: 'Carrossel Instagram',
  TIKTOK_VIDEO: 'Vídeo TikTok',
  YOUTUBE_SHORTS: 'YouTube Shorts',
  KWAI_VIDEO: 'Vídeo Kwai',
  GOOGLE_POST: 'Post Google',
}

export const NETWORK_LABELS: Record<SocialNetwork, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  GOOGLE_BUSINESS: 'Google Business',
  KWAI: 'Kwai',
  LINKEDIN: 'LinkedIn',
  PINTEREST: 'Pinterest',
  THREADS: 'Threads',
}

export const NETWORK_COLORS: Record<SocialNetwork, string> = {
  INSTAGRAM: '#E1306C',
  FACEBOOK: '#1877F2',
  TIKTOK: '#010101',
  YOUTUBE: '#FF0000',
  GOOGLE_BUSINESS: '#4285F4',
  KWAI: '#FF6602',
  LINKEDIN: '#0A66C2',
  PINTEREST: '#BD081C',
  THREADS: '#000000',
}

export const COPY_TYPE_LABELS: Record<CopyType, string> = {
  CAPTION: 'Legenda',
  SCRIPT: 'Roteiro',
  CAROUSEL_IDEA: 'Ideia de Carrossel',
  STORIES_CTA: 'Stories + CTA',
  GOOGLE_POST: 'Post Google',
  HOOK: 'Hook',
  TITLE: 'Título',
  CONTENT_CALENDAR: 'Calendário de Conteúdo',
  HUMANIZE: 'Humanizar Texto',
  REVIEW: 'Revisar',
  ADAPT_TONE: 'Adaptar Tom',
}

export const POST_STATUSES: PostStatus[] = [
  'IDEA', 'BRIEFING_READY', 'WAITING_RECORDING', 'VIDEO_RECEIVED',
  'IN_EDITING', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED',
  'SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED',
]

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE',
  'GOOGLE_BUSINESS', 'KWAI', 'LINKEDIN', 'PINTEREST', 'THREADS',
]

export const POST_FORMATS: PostFormat[] = [
  'FEED_INSTAGRAM', 'REELS_INSTAGRAM', 'STORIES_INSTAGRAM', 'CAROUSEL_INSTAGRAM',
  'TIKTOK_VIDEO', 'YOUTUBE_SHORTS', 'KWAI_VIDEO', 'GOOGLE_POST',
]
