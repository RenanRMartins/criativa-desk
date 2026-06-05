import { Instagram, Youtube, Globe, MessageSquare } from 'lucide-react'
import { NETWORK_LABELS } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import type { SocialNetwork, PostFormat } from '@/types'

interface NetworkPreviewProps {
  network: SocialNetwork
  format: PostFormat
  caption?: string
  hashtags?: string[]
  mediaSrc?: string
  mediaType?: 'image' | 'video'
  projectName?: string
  projectColor?: string
  projectAvatar?: string
}

const FORMAT_ASPECT: Partial<Record<PostFormat, string>> = {
  REELS_INSTAGRAM:   'aspect-[9/16] max-h-80',
  STORIES_INSTAGRAM: 'aspect-[9/16] max-h-80',
  TIKTOK_VIDEO:      'aspect-[9/16] max-h-80',
  YOUTUBE_SHORTS:    'aspect-[9/16] max-h-80',
  FEED_INSTAGRAM:    'aspect-square',
  CAROUSEL_INSTAGRAM:'aspect-square',
  KWAI_VIDEO:        'aspect-[9/16] max-h-80',
  GOOGLE_POST:       'aspect-[4/3]',
}

function NetworkIcon({ network, size = 14 }: { network: SocialNetwork; size?: number }) {
  switch (network) {
    case 'INSTAGRAM': case 'REELS_INSTAGRAM' as never: return <Instagram size={size} />
    case 'YOUTUBE': return <Youtube size={size} />
    case 'TIKTOK': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z"/>
      </svg>
    )
    default: return <Globe size={size} />
  }
}

const NETWORK_COLORS: Partial<Record<SocialNetwork, string>> = {
  INSTAGRAM: '#E1306C',
  TIKTOK:    '#010101',
  YOUTUBE:   '#FF0000',
  FACEBOOK:  '#1877F2',
  LINKEDIN:  '#0A66C2',
  GOOGLE_BUSINESS: '#4285F4',
}

export function NetworkPreview({
  network,
  format,
  caption,
  hashtags = [],
  mediaSrc,
  mediaType = 'image',
  projectName = 'Projeto',
  projectColor = '#6B2D3E',
  projectAvatar,
}: NetworkPreviewProps) {
  const aspectClass = FORMAT_ASPECT[format] ?? 'aspect-square'
  const isVertical = aspectClass.includes('9/16')
  const networkColor = NETWORK_COLORS[network] ?? '#666'
  const isGooglePost = network === 'GOOGLE_BUSINESS'
  const isTikTok = network === 'TIKTOK'

  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{
        background: 'white',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        border: '1px solid var(--color-gray-border)',
        maxWidth: isVertical ? 220 : '100%',
      }}
    >
      {/* Network bar */}
      <div
        className="flex items-center gap-1.5 px-3 py-2"
        style={{ background: networkColor + '10' }}
      >
        <NetworkIcon network={network} size={12} />
        <span className="text-xs font-medium" style={{ color: networkColor, fontSize: 10 }}>
          {NETWORK_LABELS[network]}
        </span>
      </div>

      {/* Google Post layout */}
      {isGooglePost ? (
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            {projectAvatar ? (
              <img src={projectAvatar} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: projectColor }}>
                {getInitials(projectName)}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold leading-none">{projectName}</p>
              <p className="text-xs text-gray-400">Google Business</p>
            </div>
          </div>
          {mediaSrc && (
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
              <img src={mediaSrc} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {caption && (
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">{caption}</p>
          )}
          <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
            {['Curtir', 'Compartilhar'].map(a => (
              <button key={a} className="text-xs text-blue-500 font-medium cursor-pointer">{a}</button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Standard post header */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            {projectAvatar ? (
              <img src={projectAvatar} className="w-7 h-7 rounded-full" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: projectColor }}
              >
                {getInitials(projectName)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-none">{projectName}</p>
              {isTikTok && <p className="text-xs text-gray-400 mt-0.5">Agora</p>}
            </div>
            <span className="text-xs text-gray-400">•••</span>
          </div>

          {/* Media */}
          <div className={`${aspectClass} w-full bg-gray-100 relative overflow-hidden`}>
            {mediaSrc ? (
              mediaType === 'video' ? (
                <video src={mediaSrc} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={mediaSrc} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-gray-light)' }}>
                <div style={{ color: 'var(--color-gray-border)' }}>
                  <NetworkIcon network={network} size={28} />
                </div>
              </div>
            )}

            {/* TikTok overlay elements */}
            {isTikTok && (
              <div className="absolute right-2 bottom-10 flex flex-col items-center gap-3">
                {['❤️', '💬', '↗️'].map((icon, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-base">{icon}</span>
                    <span className="text-white text-xs font-semibold" style={{ fontSize: 9 }}>
                      {['2.3K', '148', '89'][i]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caption area */}
          {!isTikTok && (
            <div className="px-3 py-2 space-y-1">
              {caption && (
                <p className="text-xs text-gray-800 leading-relaxed line-clamp-2">
                  <span className="font-semibold">{projectName.split(' ')[0].toLowerCase().replace(/\s+/g, '')}</span>
                  {' '}{caption.slice(0, 80)}{caption.length > 80 ? '...' : ''}
                </p>
              )}
              {hashtags.length > 0 && (
                <p className="text-xs" style={{ color: networkColor }}>
                  {hashtags.slice(0, 3).join(' ')}
                </p>
              )}
              <p className="text-xs text-gray-400">Ver mais</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
