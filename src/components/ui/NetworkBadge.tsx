import { NETWORK_LABELS, NETWORK_COLORS } from '@/lib/constants'
import type { SocialNetwork } from '@/types'

interface Props {
  network: SocialNetwork
  size?: 'sm' | 'md'
}

export default function NetworkBadge({ network, size = 'md' }: Props) {
  const color = NETWORK_COLORS[network]
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ background: color + '20', color }}
    >
      {NETWORK_LABELS[network]}
    </span>
  )
}
