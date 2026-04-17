import type { TicketStatus } from '../../types'
import { STATUS_LABELS, STATUS_COLORS } from '../../constants/TICKET_STATUS'

interface Props {
  status: TicketStatus
  isReapproval?: boolean
}

export default function StatusBadge({ status, isReapproval = false }: Props) {
  const isReapprovalPending = isReapproval && status === 'pending_approval'

  if (isReapprovalPending) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-200 text-orange-900 border border-orange-400">
        🔁 Re-Approval Pending
      </span>
    )
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
