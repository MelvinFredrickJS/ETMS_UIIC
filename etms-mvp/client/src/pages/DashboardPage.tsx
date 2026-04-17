import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../constants/ROLES'
import { getTickets, getPendingApprovals } from '../api/ticketApi'
import TicketCard from '../components/tickets/TicketCard'
import type { Ticket } from '../types'

interface KpiCardProps {
  label: string
  value: number
  color?: string
}

function KpiCard({ label, value, color = 'text-[#1B3A6B]' }: KpiCardProps) {
  return (
    <div className="surface-card interactive-card p-5">
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

interface KpiDef {
  label: string
  value: number
  color?: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [counts,   setCounts]   = useState<Record<string, number>>({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        if (user.role === ROLES.MANAGER) {
          const [{ data: pendingData }, { data: managedData }] = await Promise.all([
            getPendingApprovals(),
            getTickets({ limit: 5 }),
          ])
          setCounts({ pending: pendingData.total })
          setTickets(managedData.tickets.filter(t => !t.report_reason).slice(0, 5))
        } else {
          const { data } = await getTickets({ limit: 100 })
          const all = data.tickets
          const c: Record<string, number> = {}
          all.forEach(t => { c[t.status] = (c[t.status] ?? 0) + 1 })
          setCounts({ ...c, total: all.length })
          setTickets(all.slice(0, 5))
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [user?.role])

  const kpis = (): KpiDef[] => {
    if (!user) return []
    if (user.role === ROLES.EMPLOYEE) return [
      { label: 'Pending Approval', value: counts['pending_approval'] ?? 0 },
      { label: 'Assigned',         value: counts['assigned']         ?? 0 },
      { label: 'In Progress',      value: counts['in_progress']      ?? 0 },
      { label: 'Resolved',         value: counts['resolved']         ?? 0 },
      { label: 'Closed',           value: counts['closed']           ?? 0 },
      { label: 'Reported',         value: counts['reported']         ?? 0, color: 'text-rose-600' },
    ]
    if (user.role === ROLES.MANAGER) return [
      { label: 'Re-approvals', value: counts['pending'] ?? 0, color: 'text-orange-600' },
    ]
    // ADMIN
    return [
      { label: 'Total',            value: counts['total']            ?? 0 },
      { label: 'Pending Approval', value: counts['pending_approval'] ?? 0, color: 'text-orange-600' },
      { label: 'Assigned',         value: counts['assigned']         ?? 0 },
      { label: 'In Progress',      value: counts['in_progress']      ?? 0 },
      { label: 'Reported',         value: counts['reported']         ?? 0, color: 'text-rose-600' },
    ]
  }

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="kpi-grid mb-8">
            {kpis().map(k => (
              <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} />
            ))}
          </div>

          {/* Recent tickets */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Recent Tickets</h2>
          </div>

          {tickets.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <p className="text-sm text-slate-400">No tickets yet.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
            </div>
          )}

          {/* CTAs */}
          <div className="mt-8 flex gap-3 flex-wrap">
            {user?.role === ROLES.EMPLOYEE && (
              <button onClick={() => navigate('/tickets/new')} className="btn-primary">
                ➕ Raise New Ticket
              </button>
            )}
            {user?.role === ROLES.MANAGER && (
              <>
                <button onClick={() => navigate('/approvals')} className="btn-primary" style={{ background: 'linear-gradient(135deg, #15803d, #166534)' }}>
                  ✅ Review Re-approvals
                </button>
                <button onClick={() => navigate('/reports')} className="btn-secondary">
                  📊 View Reports
                </button>
              </>
            )}
            {user?.role === ROLES.ADMIN && (
              <button onClick={() => navigate('/admin')} className="btn-primary">
                ⚙️ Manage Users
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
