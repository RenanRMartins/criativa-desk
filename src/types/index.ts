export type UserRole = 'OWNER' | 'ADMIN' | 'SOCIAL_MEDIA' | 'DESIGNER' | 'CLIENT' | 'VIEWER'
export type ProjectRole = 'OWNER' | 'ADMIN' | 'SOCIAL_MEDIA' | 'DESIGNER' | 'CLIENT' | 'APPROVER' | 'VIEWER'
export type Plan = 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'AGENCY'

export type SocialNetwork =
  | 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE'
  | 'GOOGLE_BUSINESS' | 'KWAI' | 'LINKEDIN' | 'PINTEREST' | 'THREADS'

export type PostFormat =
  | 'FEED_INSTAGRAM' | 'REELS_INSTAGRAM' | 'STORIES_INSTAGRAM' | 'CAROUSEL_INSTAGRAM'
  | 'TIKTOK_VIDEO' | 'YOUTUBE_SHORTS' | 'KWAI_VIDEO' | 'GOOGLE_POST'

export type PostStatus =
  | 'IDEA' | 'BRIEFING_READY' | 'WAITING_RECORDING' | 'VIDEO_RECEIVED'
  | 'IN_EDITING' | 'PENDING_APPROVAL' | 'CHANGES_REQUESTED' | 'APPROVED'
  | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'CANCELLED'

export type VideoTaskStatus = 'PENDING' | 'SENT' | 'CANT_RECORD' | 'OVERDUE'
export type AccountStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED'
export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT'
export type AssetCategory = 'LOGO' | 'PHOTO' | 'VIDEO' | 'TEMPLATE' | 'CAPTION' | 'CTA' | 'REFERENCE'

export type CopyType =
  | 'CAPTION' | 'SCRIPT' | 'CAROUSEL_IDEA' | 'STORIES_CTA' | 'GOOGLE_POST'
  | 'HOOK' | 'TITLE' | 'CONTENT_CALENDAR' | 'HUMANIZE' | 'REVIEW' | 'ADAPT_TONE'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  plan: Plan
  onboardingCompleted: boolean
  createdAt: string
}

export interface Project {
  id: string
  name: string
  slug: string
  description?: string
  niche?: string
  segment?: string
  logo?: string
  profilePhoto?: string
  coverPhoto?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontHeading: string
  fontBody: string
  toneOfVoice?: string
  copyPersonality?: string
  forbiddenWords: string[]
  forbiddenTopics: string[]
  defaultCTAs: string[]
  defaultHashtags: string[]
  contentPillars: string[]
  targetAudience?: string
  brandKeywords: string[]
  competitors: string[]
  niches: string[]
  searchKeywords: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  members?: ProjectMember[]
  socialAccounts?: SocialAccount[]
  _count?: {
    posts?: number
    professionals?: number
  }
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  user?: User
  createdAt: string
}

export interface Professional {
  id: string
  projectId: string
  name: string
  email?: string
  phone?: string
  accessToken: string
  avatarUrl?: string
  bio?: string
  createdAt: string
  videoTasks?: VideoTask[]
}

export interface VideoTask {
  id: string
  professionalId: string
  postId?: string
  title: string
  description?: string
  recordingGuide?: string
  suggestedDuration?: number
  toneOfVoice?: string
  observations?: string
  deadline: string
  status: VideoTaskStatus
  videoUrl?: string
  videoPublicId?: string
  professionalNote?: string
  cantRecordReason?: string
  professional?: Professional
  post?: Post
  createdAt: string
  updatedAt: string
}

export interface Post {
  id: string
  projectId: string
  authorId: string
  title: string
  theme?: string
  format: PostFormat
  networks: SocialNetwork[]
  status: PostStatus
  caption?: string
  firstComment?: string
  hashtags: string[]
  location?: string
  link?: string
  cta?: string
  recordingDate?: string
  publishDate?: string
  scheduledAt?: string
  publishedAt?: string
  responsibleId?: string
  observations?: string
  publishResults?: Record<string, { success: boolean; postId?: string; url?: string; error?: string }>
  project?: Project
  author?: User
  media?: PostMedia[]
  approval?: PostApproval
  videoTasks?: VideoTask[]
  copySessionId?: string
  createdAt: string
  updatedAt: string
}

export interface PostMedia {
  id: string
  postId: string
  url: string
  publicId?: string
  type: MediaType
  order: number
  aspectRatio?: string
  duration?: number
  thumbnailUrl?: string
}

export interface PostApproval {
  id: string
  postId: string
  projectId: string
  requestedBy: string
  status: ApprovalStatus
  publicToken: string
  clientName?: string
  expiresAt: string
  post?: Post
  comments?: ApprovalComment[]
  createdAt: string
  updatedAt: string
}

export interface ApprovalComment {
  id: string
  approvalId: string
  authorName: string
  authorType: 'client' | 'social_media'
  text: string
  createdAt: string
}

export interface SocialAccount {
  id: string
  projectId: string
  provider: SocialNetwork
  profileId: string
  profileName: string
  profileAvatar?: string
  status: AccountStatus
  lastSyncAt?: string
}

export interface CopySession {
  id: string
  projectId: string
  userId: string
  postId?: string
  type: CopyType
  input: string
  output: string
  model: string
  tokens?: number
  saved: boolean
  createdAt: string
}

export interface TrendItem {
  id: string
  projectId: string
  title: string
  description: string
  niche: string
  trendScore: number
  source?: string
  reelsIdea?: string
  carouselIdea?: string
  storiesIdea?: string
  suggestedCaption?: string
  recommendedFormat?: PostFormat
  whyItMatters?: string
  addedToCalendar: boolean
  calendarPostId?: string
  validUntil: string
  createdAt: string
}

export interface SearchTerm {
  id: string
  projectId: string
  term: string
  niche: string
  monthlySearches?: number
  difficulty?: number
  isFeatured: boolean
  reelsIdea?: string
  carouselIdea?: string
  captionSuggestion?: string
  googlePostIdea?: string
  source?: string
  createdAt: string
  updatedAt: string
}

export interface MediaAsset {
  id: string
  projectId: string
  url: string
  publicId?: string
  thumbnailUrl?: string
  type: MediaType
  category: AssetCategory
  name: string
  folder: string
  size: number
  tags: string[]
  isTemplate: boolean
  createdAt: string
}

export interface Metric {
  id: string
  socialAccountId: string
  date: string
  followers: number
  reach: number
  impressions: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  videoViews: number
  engagementRate: number
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  data?: Record<string, unknown>
  createdAt: string
}

export interface AuthUser extends User {
  token: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
