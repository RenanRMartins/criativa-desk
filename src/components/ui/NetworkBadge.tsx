import { NETWORK_LABELS, NETWORK_COLORS, NETWORK_ICONS } from '@/lib/constants'
import type { SocialNetwork } from '@/types'

interface Props {
  network: SocialNetwork
  size?: 'sm' | 'md'
}

export default function NetworkBadge({ network, size = 'md' }: Props) {
  const color = NETWORK_COLORS[network]
  const Icon = NETWORK_ICONS[network]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ background: color + '20', color }}
    >
      <Icon size={size === 'sm' ? 10 : 11} />
      {NETWORK_LABELS[network]}
    </span>
  )
}
