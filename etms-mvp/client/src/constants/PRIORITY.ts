import type { Priority } from '../types'

export const PRIORITY_COLORS: Record<Priority, string> = {
  low:      'bg-green-100 text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export const PRIORITY_ICONS: Record<Priority, string> = {
  low:      '🟢',
  medium:   '🟡',
  high:     '🟠',
  critical: '🔴',
}
