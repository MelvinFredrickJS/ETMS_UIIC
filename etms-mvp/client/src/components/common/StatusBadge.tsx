import type { TicketStatus } from '../../types'
import { STATUS_LABELS, STATUS_COLORS } from '../../constants/TICKET_STATUS'

interface Props {
  status: TicketStatus
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
