import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../constants/ROLES'
import {
  getTicketById, getAllowedStatuses, updateStatus,
  approveTicket, rejectTicket, reapproveTicket,
  getEmployeesByCategory,
} from '../api/ticketApi'
import StatusBadge   from '../components/common/StatusBadge'
import PriorityBadge from '../components/common/PriorityBadge'
import TypeBadge     from '../components/common/TypeBadge'
import type { Ticket, TicketLog, Attachment, TicketStatus, User } from '../types'

type Employee = Pick<User, 'id' | 'name' | 'emp_id' | 'email'>

export default function TicketDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [ticket,          setTicket]          = useState<Ticket | null>(null)
  const [attachments,     setAttachments]     = useState<Attachment[]>([])
  const [logs,            setLogs]            = useState<TicketLog[]>([])
  const [allowedStatuses, setAllowedStatuses] = useState<TicketStatus[]>([])
  const [loading,         setLoading]         = useState(true)
  const [notFound,        setNotFound]        = useState(false)
  const [logsOpen,        setLogsOpen]        = useState(false)
  const [toast,           setToast]           = useState('')
  const [actionError,     setActionError]     = useState('')

  // Modals
  const [rejectModal,  setRejectModal]  = useState(false)
  const [reportModal,  setReportModal]  = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [reportReason, setReportReason] = useState('')

  // Re-approve
  const [categoryEmployees, setCategoryEmployees] = useState<Employee[]>([])
  const [selectedEmployee,  setSelectedEmployee]  = useState('')

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const [ticketRes, statusRes] = await Promise.all([
        getTicketById(id),
        getAllowedStatuses(id),
      ])
      setTicket(ticketRes.data.ticket)
      setAttachments(ticketRes.data.attachments ?? [])
      setLogs(ticketRes.data.logs ?? [])
      setAllowedStatuses(statusRes.data.allowedStatuses ?? [])
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined
      if (status === 404) setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  // Load employees for re-approve
  useEffect(() => {
    if (ticket?.status === 'pending_approval' && ticket?.report_reason && user?.role === ROLES.MANAGER) {
      getEmployeesByCategory(ticket.category_id)
        .then(({ data }) => setCategoryEmployees(data.employees))
        .catch(() => {})
    }
  }, [ticket])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function doAction(fn: () => Promise<unknown>, successMsg: string) {
    setActionError('')
    try {
      await fn()
      showToast(successMsg)
      await load()
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setActionError(msg ?? 'Action failed.')
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound || !ticket || !user) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-4xl mb-3">🔍</p>
      <p>Ticket not found.</p>
    </div>
  )

  const isCreator  = Number(ticket.raised_by)   === Number(user.id)
  const isAssignee = Number(ticket.assigned_to) === Number(user.id)
  const isReapproval = ticket.status === 'pending_approval' && !!ticket.report_reason

  return (
    <div className="max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <button onClick={() => navigate('/tickets')}
        className="text-sm text-[#1B3A6B] hover:underline mb-4 flex items-center gap-1">
        ← Back to Tickets
      </button>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── LEFT ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-mono text-gray-400 mb-1">{ticket.ticket_no}</p>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">{ticket.title}</h1>
            <div className="flex flex-wrap gap-2">
              <TypeBadge typeKey={ticket.type_key} />
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {([
                ['Category',    ticket.category_name],
                ['Type',        ticket.type_name],
                ['Raised By',   `${ticket.raised_by_name} (${ticket.raised_by_emp_id})`],
                ['Date Raised', format(new Date(ticket.created_at), 'dd MMM yyyy, HH:mm')],
                ['Assigned To', ticket.assigned_to_name ?? 'Unassigned'],
                ticket.asset_name ? ['Asset', `${ticket.asset_name} — ${ticket.asset_serial_number}`] : null,
              ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Attachment */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Attachment</p>
            {attachments.length > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">{attachments[0].original_name} ({attachments[0].file_size} bytes)</span>
                <a
                  href={`${import.meta.env.VITE_API_URL?.replace('/api','') ?? 'http://localhost:5000'}/api/tickets/${id}/file`}
                  target="_blank" rel="noreferrer"
                  className="text-sm text-[#1B3A6B] font-semibold hover:underline"
                >
                  ⬇ Download
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No file attached.</p>
            )}
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setLogsOpen(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <span>📋 Activity Log ({logs.length} events)</span>
              <span>{logsOpen ? '▲' : '▼'}</span>
            </button>
            {logsOpen && (
              <div className="px-6 pb-4 space-y-3 border-t border-gray-100">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 text-xs text-gray-500">
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-[#1B3A6B] flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-700">{log.action}</span>
                      {log.actor_name && <span> by {log.actor_name}</span>}
                      {log.note && <span className="text-gray-400"> — {log.note}</span>}
                      <p className="text-gray-400 mt-0.5">{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT — Action sidebar ── */}
        <div className="w-full md:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Actions</p>

            {actionError && <p className="text-xs text-red-600">{actionError}</p>}

            {/* ADMIN — read only */}
            {user.role === ROLES.ADMIN && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 text-center">
                You have view-only access to this ticket.
              </div>
            )}

            {/* MANAGER — pending_approval (re-approval after escalation) */}
            {user.role === ROLES.MANAGER && isReapproval && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                  ⚠️ Escalated by employee: {ticket.report_reason}
                </div>
                <p className="text-xs font-medium text-gray-600">Re-Approve &amp; Assign</p>
                <select
                  value={selectedEmployee}
                  onChange={e => setSelectedEmployee(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                >
                  <option value="">Select employee…</option>
                  {categoryEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.emp_id})</option>
                  ))}
                </select>
                <button
                  disabled={!selectedEmployee}
                  onClick={() => doAction(() => reapproveTicket(id!, selectedEmployee), 'Ticket re-approved and assigned.')}
                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-green-700"
                >
                  Assign to this Employee
                </button>
                <button onClick={() => setRejectModal(true)}
                  className="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">
                  ❌ Reject
                </button>
              </>
            )}

            {/* MANAGER — pending_approval (first approval) */}
            {user.role === ROLES.MANAGER && ticket.status === 'pending_approval' && !isReapproval && (
              <>
                <div className="text-xs text-gray-500 space-y-1 mb-2">
                  <p><span className="font-medium">Category:</span> {ticket.category_name}</p>
                  <p><span className="font-medium">Raised by:</span> {ticket.raised_by_name}</p>
                  <p className="line-clamp-3">{ticket.description}</p>
                </div>
                <button
                  onClick={() => doAction(() => approveTicket(id!), 'Ticket approved and assigned.')}
                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  ✅ Approve
                </button>
                <button onClick={() => setRejectModal(true)}
                  className="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">
                  ❌ Reject
                </button>
              </>
            )}

            {/* EMPLOYEE / MANAGER — assigned */}
            {['employee','manager'].includes(user.role) && ticket.status === 'assigned' && isAssignee && (
              <button
                onClick={() => doAction(() => updateStatus(id!, 'in_progress'), 'Ticket marked in progress.')}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                ▶ Mark In Progress
              </button>
            )}

            {/* EMPLOYEE / MANAGER — in_progress */}
            {['employee','manager'].includes(user.role) && ticket.status === 'in_progress' && isAssignee && (
              <>
                <button
                  onClick={() => doAction(() => updateStatus(id!, 'resolved'), 'Ticket marked resolved.')}
                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  ✅ Mark Resolved
                </button>
                <button onClick={() => setReportModal(true)}
                  className="w-full bg-rose-50 text-rose-600 border border-rose-200 py-2 rounded-lg text-sm font-semibold hover:bg-rose-100">
                  🚩 Report Issue
                </button>
              </>
            )}

            {/* EMPLOYEE / MANAGER — resolved (creator only) */}
            {['employee','manager'].includes(user.role) && ticket.status === 'resolved' && isCreator && (
              <>
                <button
                  onClick={() => doAction(() => updateStatus(id!, 'closed'), 'Ticket closed.')}
                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  ✅ Close Ticket
                </button>
                <button onClick={() => setReportModal(true)}
                  className="w-full bg-rose-50 text-rose-600 border border-rose-200 py-2 rounded-lg text-sm font-semibold hover:bg-rose-100">
                  🚩 Report Back to Manager
                </button>
              </>
            )}

            {/* Terminal / no action */}
            {['closed','rejected'].includes(ticket.status) && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-400 text-center capitalize">
                Ticket is {ticket.status}.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Reject Ticket {ticket.ticket_no}</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection *</label>
            <textarea
              rows={4} minLength={10} required
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectModal(false); setRejectReason('') }}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={rejectReason.trim().length < 10}
                onClick={() =>
                  doAction(() => rejectTicket(id!, rejectReason), 'Ticket rejected.')
                    .then(() => { setRejectModal(false); setRejectReason(''); navigate('/approvals') })
                }
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-red-700"
              >
                Reject Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Report Issue</h2>
            <p className="text-xs text-gray-400 mb-4">
              {ticket.status === 'resolved'
                ? 'Reason is required (min 10 chars).'
                : 'Reason is optional.'}
            </p>
            <textarea
              rows={4}
              value={reportReason} onChange={e => setReportReason(e.target.value)}
              placeholder="Describe the issue…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setReportModal(false); setReportReason('') }}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={ticket.status === 'resolved' && reportReason.trim().length < 10}
                onClick={() =>
                  doAction(
                    () => updateStatus(id!, 'reported', reportReason),
                    'Ticket reported. Manager has been notified.'
                  ).then(() => { setReportModal(false); setReportReason('') })
                }
                className="flex-1 bg-rose-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-rose-700"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
