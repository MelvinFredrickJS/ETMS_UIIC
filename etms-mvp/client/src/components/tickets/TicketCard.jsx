import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { TICKET_TYPE_COLORS } from '../../constants/TICKET_TYPES'
import StatusBadge   from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import TypeBadge     from '../common/TypeBadge'

export default function TicketCard({ ticket }) {
  const { id, ticket_no, title, type_key, category_name, priority, status, raised_by_name, created_at } = ticket
  const navigate   = useNavigate()
  const typeConfig = TICKET_TYPE_COLORS[type_key] || TICKET_TYPE_COLORS.complaint

  return (
    <div
      onClick={() => navigate(`/tickets/${id}`)}
      className={`bg-white rounded-lg border-l-4 ${typeConfig.border} border border-gray-100 p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow`}
    >
      {/* Row 1: badges */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <TypeBadge typeKey={type_key} />
        <StatusBadge status={status} />
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
          {created_at
            ? `${formatDistanceToNow(new Date(created_at))} ago`
            : '—'}
        </span>
      </div>
    </div>
  )
}
