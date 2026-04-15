import type { TypeKey } from '../../types'
import { TICKET_TYPE_COLORS } from '../../constants/TICKET_TYPES'

interface Props {
  typeKey: TypeKey
}

export default function TypeBadge({ typeKey }: Props) {
  const t = TICKET_TYPE_COLORS[typeKey] ?? TICKET_TYPE_COLORS.complaint
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.badge}`}>
      {t.icon} {t.label}
    </span>
  )
}
