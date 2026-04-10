import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { getPendingApprovals, approveTicket, rejectTicket } from '../api/ticketApi'
import TypeBadge     from '../components/common/TypeBadge'
import PriorityBadge from '../components/common/PriorityBadge'

export default function PendingApprovalsPage() {
  const [tickets,      setTickets]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState('')
  const [rejectTarget, setRejectTarget] = useState(null) // ticket object
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

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleApprove(ticketId) {
    try {
      await approveTicket(ticketId)
      showToast('✅ Ticket approved and assigned.')
      load()
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Approval failed.'))
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
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Rejection failed.'))
    } finally {
      setSubmitting(false)
    }
  }

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
        <p className="text-sm text-gray-400 mt-0.5">Tickets awaiting your review</p>
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
        <div className="space-y-4">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              {/* Escalation banner */}
              {ticket.report_reason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 mb-3">
                  ⚠️ Escalated — {ticket.report_reason}
                </div>
              )}

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
