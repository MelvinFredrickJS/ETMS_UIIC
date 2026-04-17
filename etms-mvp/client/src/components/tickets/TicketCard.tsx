import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { TICKET_TYPE_COLORS } from '../../constants/TICKET_TYPES'
import StatusBadge   from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import TypeBadge     from '../common/TypeBadge'
import type { Ticket, TicketStatus } from '../../types'

// Background tint + border-color per status — each visually distinct
const STATUS_CARD_STYLES: Record<TicketStatus, { bg: string; border: string }> = {
  pending_approval: { bg: 'bg-amber-100',   border: 'border-amber-400'  },
  approved:         { bg: 'bg-cyan-100',    border: 'border-cyan-400'   },
  assigned:         { bg: 'bg-violet-100',  border: 'border-violet-400' },
  in_progress:      { bg: 'bg-blue-100',    border: 'border-blue-400'   },
  reported:         { bg: 'bg-pink-100',    border: 'border-pink-500'   },
  resolved:         { bg: 'bg-emerald-100', border: 'border-emerald-500'},
  closed:           { bg: 'bg-slate-100',   border: 'border-slate-400'  },
  rejected:         { bg: 'bg-red-100',     border: 'border-red-500'    },
}

interface Props {
  ticket: Ticket
}

export default function TicketCard({ ticket }: Props) {
  const { id, ticket_no, title, type_key, category_name, priority, status, raised_by_name, created_at } = ticket
  const navigate    = useNavigate()
  const typeConfig  = TICKET_TYPE_COLORS[type_key] ?? TICKET_TYPE_COLORS.complaint
  const isReapprovalPending = status === 'pending_approval' && !!ticket.report_reason
  const statusStyle = isReapprovalPending
    ? { bg: 'bg-orange-100', border: 'border-orange-500' }
    : (STATUS_CARD_STYLES[status] ?? { bg: 'bg-white', border: 'border-gray-100' })

  return (
    <div
      onClick={() => navigate(`/tickets/${id}`)}
      className={`${statusStyle.bg} rounded-lg border-l-4 ${typeConfig.border} border ${statusStyle.border} p-4 shadow-sm hover:shadow-md cursor-pointer transition-all`}
    >
      {/* Row 1: badges */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <TypeBadge typeKey={type_key} />
        <StatusBadge status={status} isReapproval={isReapprovalPending} />
        <div className="ml-auto">
          <PriorityBadge priority={priority} />
        </div>
      </div>

      {/* Ticket number */}
      <p className="text-xs text-gray-400 font-mono mb-1">{ticket_no}</p>

      {/* Title */}
      <p className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1">{title}</p>

      {/* Category */}
      <p className="text-xs text-gray-500 mb-3">{category_name}</p>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Raised by {raised_by_name}</span>
        <span className="text-xs text-gray-400">
          {created_at ? `${formatDistanceToNow(new Date(created_at))} ago` : '—'}
        </span>
      </div>
    </div>
  )
}
