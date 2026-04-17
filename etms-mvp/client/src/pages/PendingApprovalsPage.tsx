import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { getPendingApprovals, getEmployeesByCategory, reapproveTicket, rejectTicket } from '../api/ticketApi'
import TypeBadge     from '../components/common/TypeBadge'
import PriorityBadge from '../components/common/PriorityBadge'
import type { Ticket } from '../types'

export default function PendingApprovalsPage() {
  const [tickets,      setTickets]      = useState<Ticket[]>([])
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState('')
  const [rejectTarget, setRejectTarget] = useState<Ticket | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [assigneeByTicket, setAssigneeByTicket] = useState<Record<number, string>>({})
  const [employeesByTicket, setEmployeesByTicket] = useState<Record<number, { id: number; name: string; emp_id: string; email: string }[]>>({})

  async function load() {
    setLoading(true)
    try {
      const { data } = await getPendingApprovals()
      const pendingTickets = data.tickets
      setTickets(pendingTickets)

      const employeeEntries = await Promise.all(
        pendingTickets.map(async (ticket) => {
          try {
            const employeeRes = await getEmployeesByCategory(ticket.category_id)
            return [ticket.id, employeeRes.data.employees] as const
          } catch {
            return [ticket.id, []] as const
          }
        })
      )

      setEmployeesByTicket(Object.fromEntries(employeeEntries))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleReapprove(ticketId: number) {
    const assigneeId = Number(assigneeByTicket[ticketId])
    if (!Number.isFinite(assigneeId) || assigneeId <= 0) {
      showToast('❌ Please select an employee for re-assignment.')
      return
    }

    try {
      await reapproveTicket(ticketId, assigneeId)
      showToast('✅ Ticket re-approved and assigned.')
      load()
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      showToast('❌ ' + (msg ?? 'Re-approval failed.'))
    }
  }

  async function handleReject() {
    if (!rejectTarget || rejectReason.trim().length < 10) return
    setSubmitting(true)
    try {
      await rejectTicket(rejectTarget.id, rejectReason)
      showToast('Ticket rejected.')
      setRejectTarget(null)
      setRejectReason('')
      load()
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      showToast('❌ ' + (msg ?? 'Rejection failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  const reApprovals = tickets.filter(t => !!t.report_reason)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-[#1B3A6B] text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Re-approvals</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Only employee-reported tickets are shown here.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm">No re-approvals pending.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reApprovals.map(ticket => (
            <div
              key={ticket.id}
              className="bg-orange-50 rounded-xl border-2 border-orange-300 shadow-sm p-5 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 rounded-l-xl" />

              <div className="flex items-center gap-2 mb-3 pl-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white tracking-wide">
                  🔁 RE-APPROVAL
                </span>
                <span className="text-xs text-orange-600 font-medium">
                  Escalated by employee
                </span>
              </div>

              <div className="bg-white border border-orange-200 rounded-lg px-4 py-3 mb-4 ml-2">
                <p className="text-xs font-semibold text-orange-700 mb-1">⚠️ Escalation Reason</p>
                <p className="text-sm text-gray-700 italic">"{ticket.report_reason}"</p>
              </div>

              <div className="pl-2">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <TypeBadge typeKey={ticket.type_key} />
                  <PriorityBadge priority={ticket.priority} />
                </div>

                <p className="text-xs font-mono text-gray-400 mb-1">{ticket.ticket_no}</p>
                <p className="font-semibold text-gray-800 text-sm mb-1">{ticket.title}</p>

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                  <span>{ticket.category_name}</span>
                  <span>·</span>
                  <span>Raised by {ticket.raised_by_name}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(ticket.created_at))} ago</span>
                </div>

                <div className="mb-4 rounded-lg border border-orange-200 bg-white px-3 py-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-orange-700">
                    Select Employee For Re-Assignment
                  </label>
                  <select
                    value={assigneeByTicket[ticket.id] ?? ''}
                    onChange={e => setAssigneeByTicket(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                    className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value="">Choose employee...</option>
                    {(employeesByTicket[ticket.id] ?? []).map(employee => (
                      <option key={employee.id} value={String(employee.id)}>
                        {employee.name} ({employee.emp_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleReapprove(ticket.id)}
                    disabled={!assigneeByTicket[ticket.id]}
                    className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                  >
                    🔁 Re-Approve & Assign
                  </button>
                  <button
                    onClick={() => { setRejectTarget(ticket); setRejectReason('') }}
                    className="flex-1 bg-white text-red-600 border border-red-300 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Reject Ticket {rejectTarget.ticket_no}
            </h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for rejection *
            </label>
            <textarea
              rows={4} minLength={10}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Minimum 10 characters…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason('') }}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={rejectReason.trim().length < 10 || submitting}
                onClick={handleReject}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-red-700"
              >
                {submitting ? 'Rejecting…' : 'Reject Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
