import { STATUS_LABELS, STATUS_BG_CLASSES } from '@/lib/constants'
import type { PostStatus } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  status: PostStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        STATUS_BG_CLASSES[status],
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
