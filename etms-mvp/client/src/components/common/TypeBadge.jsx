import { TICKET_TYPE_COLORS } from '../../constants/TICKET_TYPES'

export default function TypeBadge({ typeKey }) {
  const t = TICKET_TYPE_COLORS[typeKey] || TICKET_TYPE_COLORS.complaint
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.badge}`}>
      {t.icon} {t.label}
    </span>
  )
}
