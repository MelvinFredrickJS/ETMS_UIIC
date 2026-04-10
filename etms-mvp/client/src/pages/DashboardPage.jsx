import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../constants/ROLES'
import { getTickets, getPendingApprovals } from '../api/ticketApi'
import TicketCard from '../components/tickets/TicketCard'

function KpiCard({ label, value, color = 'text-[#1B3A6B]' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets,  setTickets]  = useState([])
  const [counts,   setCounts]   = useState({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        if (user.role === ROLES.MANAGER) {
          const { data } = await getPendingApprovals()
          setTickets(data.tickets.slice(0, 5))
          setCounts({ pending: data.total })
        } else {
          const { data } = await getTickets({ limit: 100 })
          const all = data.tickets
          const c = {}
          all.forEach(t => { c[t.status] = (c[t.status] || 0) + 1 })
          setCounts({ ...c, total: all.length })
          setTickets(all.slice(0, 5))
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [user.role])

  const kpis = () => {
    if (user.role === ROLES.EMPLOYEE) return [
      { label: 'Pending Approval', value: counts.pending_approval || 0 },
      { label: 'Assigned',         value: counts.assigned         || 0 },
      { label: 'In Progress',      value: counts.in_progress      || 0 },
      { label: 'Resolved',         value: counts.resolved         || 0 },
      { label: 'Closed',           value: counts.closed           || 0 },
      { label: 'Reported',         value: counts.reported         || 0, color: 'text-rose-600' },
    ]
    if (user.role === ROLES.MANAGER) return [
      { label: 'Pending Approvals', value: counts.pending || 0, color: 'text-orange-600' },
    ]
    // ADMIN
    return [
      { label: 'Total',            value: counts.total            || 0 },
      { label: 'Pending Approval', value: counts.pending_approval || 0, color: 'text-orange-600' },
      { label: 'Assigned',         value: counts.assigned         || 0 },
      { label: 'In Progress',      value: counts.in_progress      || 0 },
      { label: 'Reported',         value: counts.reported         || 0, color: 'text-rose-600' },
    ]
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name}</p>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {kpis().map(k => (
              <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} />
            ))}
          </div>

          {/* Recent tickets */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Recent Tickets</h2>
          </div>

          {tickets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tickets yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
            </div>
          )}

          {/* CTAs */}
          <div className="mt-8 flex gap-3 flex-wrap">
            {user.role === ROLES.EMPLOYEE && (
              <button onClick={() => navigate('/tickets/new')}
                className="bg-[#1B3A6B] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#15305a] transition-colors">
                ➕ Raise New Ticket
              </button>
            )}
            {user.role === ROLES.MANAGER && (
              <button onClick={() => navigate('/approvals')}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                ✅ Review Pending Approvals
              </button>
            )}
            {user.role === ROLES.ADMIN && (
              <button onClick={() => navigate('/admin')}
                className="bg-gray-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                ⚙️ Manage Users
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
