import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { getPendingApprovals, approveTicket, rejectTicket } from '../api/ticketApi'
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

  async function load() {
    setLoading(true)
    try {
      const { data } = await getPendingApprovals()
      setTickets(data.tickets)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleApprove(ticketId: number) {
    try {
      await approveTicket(ticketId)
      showToast('✅ Ticket approved and assigned.')
      load()
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      showToast('❌ ' + (msg ?? 'Approval failed.'))
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

  // Split into first-time approvals and re-approvals
  const firstApprovals = tickets.filter(t => !t.report_reason)
  const reApprovals    = tickets.filter(t => !!t.report_reason)

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
        <h1 className="text-2xl font-bold text-gray-800">Pending Approvals</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Tickets awaiting your review
          {reApprovals.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
              {reApprovals.length} escalated
            </span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm">No pending approvals — you're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Re-Approvals (escalated) ── */}
          {reApprovals.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔁</span>
                <h2 className="text-sm font-bold text-orange-700 uppercase tracking-wide">
                  Re-Approvals — Escalated by Employee
                </h2>
                <span className="ml-auto text-xs text-orange-500">{reApprovals.length} ticket{reApprovals.length > 1 ? 's' : ''}</span>
              </div>

              <div className="space-y-4">
                {reApprovals.map(ticket => (
                  <div
                    key={ticket.id}
                    className="bg-orange-50 rounded-xl border-2 border-orange-300 shadow-sm p-5 relative overflow-hidden"
                  >
                    {/* Accent stripe */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 rounded-l-xl" />

                    {/* Re-approval badge */}
                    <div className="flex items-center gap-2 mb-3 pl-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white tracking-wide">
                        🔁 RE-APPROVAL
                      </span>
                      <span className="text-xs text-orange-600 font-medium">
                        Previously escalated by employee
                      </span>
                    </div>

                    {/* Escalation reason card */}
                    <div className="bg-white border border-orange-200 rounded-lg px-4 py-3 mb-4 ml-2">
                      <p className="text-xs font-semibold text-orange-700 mb-1">⚠️ Escalation Reason</p>
                      <p className="text-sm text-gray-700 italic">"{ticket.report_reason}"</p>
                    </div>

                    {/* Ticket info */}
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

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(ticket.id)}
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
            </section>
          )}

          {/* ── First-time Approvals ── */}
          {firstApprovals.length > 0 && (
            <section>
              {reApprovals.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">📋</span>
                  <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                    New Approvals
                  </h2>
                  <span className="ml-auto text-xs text-gray-400">{firstApprovals.length} ticket{firstApprovals.length > 1 ? 's' : ''}</span>
                </div>
              )}

              <div className="space-y-4">
                {firstApprovals.map(ticket => (
                  <div key={ticket.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    {/* Top row */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <TypeBadge typeKey={ticket.type_key} />
                      <PriorityBadge priority={ticket.priority} />
                    </div>

                    <p className="text-xs font-mono text-gray-400 mb-1">{ticket.ticket_no}</p>
                    <p className="font-semibold text-gray-800 text-sm mb-1">{ticket.title}</p>

                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                      <span>{ticket.category_name}</span>
                      <span>·</span>
                      <span>Raised by {ticket.raised_by_name}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(ticket.created_at))} ago</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(ticket.id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => { setRejectTarget(ticket); setRejectReason('') }}
                        className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
