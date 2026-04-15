import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../constants/ROLES'
import { getTickets } from '../api/ticketApi'
import TicketCard from '../components/tickets/TicketCard'
import type { Ticket } from '../types'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved',         label: 'Approved' },
  { value: 'assigned',         label: 'Assigned' },
  { value: 'in_progress',      label: 'In Progress' },
  { value: 'reported',         label: 'Reported' },
  { value: 'resolved',         label: 'Resolved' },
  { value: 'closed',           label: 'Closed' },
  { value: 'rejected',         label: 'Rejected' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'complaint', label: '🔴 Complaint' },
  { value: 'request',   label: '🔵 Request' },
  { value: 'data',      label: '🟡 Data' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const LIMIT = 15

export default function TicketsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tickets,    setTickets]    = useState<Ticket[]>([])
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)

  const [filterType,     setFilterType]     = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const pageTitle = user?.role === ROLES.ADMIN ? 'All Tickets'
    : user?.role === ROLES.MANAGER ? 'Managed Tickets'
    : 'My Tickets'

  useEffect(() => {
    fetchTickets()
  }, [page, filterType, filterStatus, filterPriority])

  async function fetchTickets() {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT }
      if (filterType)     params['type']     = filterType
      if (filterStatus)   params['status']   = filterStatus
      if (filterPriority) params['priority'] = filterPriority

      const { data } = await getTickets(params)
      setTickets(data.tickets)
      setTotalPages(data.totalPages)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  const selectClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
        {(user?.role === ROLES.EMPLOYEE || user?.role === ROLES.MANAGER) && (
          <button onClick={() => navigate('/tickets/new')}
            className="bg-[#1B3A6B] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#15305a] transition-colors">
            ➕ Raise Ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filterType}     onChange={handleFilterChange(setFilterType)}     className={selectClass}>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterStatus}   onChange={handleFilterChange(setFilterStatus)}   className={selectClass}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterPriority} onChange={handleFilterChange(setFilterPriority)} className={selectClass}>
          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">No tickets found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
