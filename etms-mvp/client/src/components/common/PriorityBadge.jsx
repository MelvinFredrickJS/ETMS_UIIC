import { PRIORITY_COLORS, PRIORITY_ICONS } from '../../constants/PRIORITY'

export default function PriorityBadge({ priority }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-500'}`}>
      {PRIORITY_ICONS[priority]} {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}
