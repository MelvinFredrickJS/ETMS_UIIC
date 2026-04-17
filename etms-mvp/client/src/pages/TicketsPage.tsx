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
  const [filterTicketId, setFilterTicketId] = useState('')

  const pageTitle = user?.role === ROLES.ADMIN ? 'All Tickets'
    : user?.role === ROLES.MANAGER ? 'Managed Tickets'
    : 'My Tickets'

  const statusOptions = user?.role === ROLES.MANAGER
    ? STATUS_OPTIONS.filter(option => option.value !== 'pending_approval')
    : STATUS_OPTIONS

  useEffect(() => {
    if (user?.role === ROLES.MANAGER && filterStatus === 'pending_approval') {
      setFilterStatus('')
      setPage(1)
    }
  }, [user?.role, filterStatus])

  useEffect(() => {
    fetchTickets()
  }, [page, filterType, filterStatus, filterPriority, filterTicketId])

  async function fetchTickets() {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT }
      if (filterType)     params['type']     = filterType
      if (filterStatus)   params['status']   = filterStatus
      if (filterPriority) params['priority'] = filterPriority
      if (filterTicketId.trim()) params['ticket_id'] = filterTicketId.trim()

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

  function handleTicketIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFilterTicketId(e.target.value)
    setPage(1)
  }

  const selectClass = 'input-field min-w-[170px]'

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">Track, filter, and act on tickets with role-based visibility.</p>
        </div>
        {user?.role === ROLES.EMPLOYEE && (
          <button onClick={() => navigate('/tickets/new')} className="btn-primary">
            ➕ Raise Ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          value={filterTicketId}
          onChange={handleTicketIdChange}
          className={selectClass}
          placeholder="Search by Ticket ID"
        />
        <select value={filterType}     onChange={handleFilterChange(setFilterType)}     className={selectClass}>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterStatus}   onChange={handleFilterChange(setFilterStatus)}   className={selectClass}>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
        <div className="surface-card text-center py-20 text-slate-400">
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
            className="btn-secondary disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
