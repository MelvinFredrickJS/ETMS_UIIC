import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { createDataPortalTicket, getCategories, getDataPortalTickets, downloadDataPortalTicketResponseFile } from '../api/ticketApi'
import type { Ticket, TicketTypeGroup } from '../types'

export default function DataPortalPage() {
  const { user, logout } = useAuth()
  const [groups, setGroups] = useState<TicketTypeGroup[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    category_id: '',
    title: '',
    description: '',
    priority: 'medium',
    sla_days: '3',
  })
  const [attachment, setAttachment] = useState<File | null>(null)

  const dataCategories = useMemo(
    () => groups.find(group => group.type_key === 'data')?.categories ?? [],
    [groups]
  )

  useEffect(() => {
    async function load() {
      try {
        const [categoriesRes, ticketsRes] = await Promise.all([
          getCategories(),
          getDataPortalTickets({ limit: 20 }),
        ])
        setGroups(categoriesRes.data.types)
        setTickets(ticketsRes.data.tickets)
        const defaultCategory = categoriesRes.data.types.find(group => group.type_key === 'data')?.categories?.[0]
        if (defaultCategory) {
          setForm(current => ({
            ...current,
            category_id: String(defaultCategory.id),
          }))
        }
      } catch {
        setError('Unable to load the data portal right now.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const selectedCategory = dataCategories.find(category => String(category.id) === form.category_id)
      if (!selectedCategory) {
        setError('Please select a data category.')
        return
      }

      const payload = new FormData()
      payload.append('title', form.title)
      payload.append('description', form.description)
      payload.append('ticket_type_id', String(selectedCategory.ticket_type_id ?? 3))
      payload.append('category_id', form.category_id)
      payload.append('priority', form.priority)
      payload.append('sla_days', form.sla_days)
      if (attachment) {
        payload.append('file', attachment)
      }

      await createDataPortalTicket(payload)
      const ticketsRes = await getDataPortalTickets({ limit: 20 })
      setTickets(ticketsRes.data.tickets)
      setForm(current => ({ ...current, title: '', description: '' }))
      setAttachment(null)
      setSuccess('Data ticket submitted successfully.')
    } catch (err) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      setError(msg ?? 'Unable to submit the ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownloadResponse(ticketId: number) {
    setError('')
    setDownloadingId(ticketId)
    try {
      const { blob, filename } = await downloadDataPortalTicketResponseFile(ticketId)
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (err) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      setError(msg ?? 'Requested data file is not available yet.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] px-4 py-10">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0f2d52] px-8 py-8 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200">ETMS</p>
          <h1 className="mt-2 text-3xl font-bold">Data Portal</h1>
          <p className="mt-2 text-sm text-slate-200">Dedicated workspace for data and audit requests.</p>
        </div>

        <div className="grid gap-6 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Welcome{user ? `, ${user.name}` : ''}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Raise only data requests from here. These tickets stay in this portal and are scoped to your own submissions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="surface-card-soft space-y-4 p-5">
              <div>
                <label htmlFor="data-category" className="field-label">Data category</label>
                <select
                  id="data-category"
                  required
                  value={form.category_id}
                  onChange={e => setForm(current => ({ ...current, category_id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select a category</option>
                  {dataCategories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="field-help">Data requests are auto-routed to Data Team.</p>
              </div>

              <div>
                <label htmlFor="data-title" className="field-label">Title</label>
                <input
                  id="data-title"
                  required
                  value={form.title}
                  onChange={e => setForm(current => ({ ...current, title: e.target.value }))}
                  className="input-field"
                  placeholder="Brief request summary"
                />
              </div>

              <div>
                <label htmlFor="data-description" className="field-label">Description</label>
                <textarea
                  id="data-description"
                  required
                  rows={5}
                  value={form.description}
                  onChange={e => setForm(current => ({ ...current, description: e.target.value }))}
                  className="input-field resize-none"
                  placeholder="Add enough detail for the selected team to act on this request."
                />
              </div>

              <div>
                <label htmlFor="data-attachment" className="field-label">Attachment (optional)</label>
                <input
                  id="data-attachment"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={e => setAttachment(e.target.files?.[0] ?? null)}
                  className="input-field"
                />
                <p className="field-help">Allowed: PDF, DOC, DOCX, TXT, PNG, JPG. Max size: 5MB.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="data-priority" className="field-label">Priority</label>
                  <select
                    id="data-priority"
                    value={form.priority}
                    onChange={e => setForm(current => ({ ...current, priority: e.target.value }))}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="data-sla" className="field-label">SLA days</label>
                  <input
                    id="data-sla"
                    type="number"
                    min={1}
                    max={30}
                    value={form.sla_days}
                    onChange={e => setForm(current => ({ ...current, sla_days: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {error && <p className="status-message-error" role="alert">{error}</p>}
              {success && <p className="status-message-success">{success}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit data ticket'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Access</p>
              <p className="mt-2 text-lg font-semibold">{user?.role ?? 'Unknown role'}</p>
              <button
                type="button"
                onClick={logout}
                className="mt-6 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Logout
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">Your recent data tickets</h3>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : tickets.length === 0 ? (
                  <p className="text-sm text-slate-500">No data tickets yet.</p>
                ) : (
                  tickets.slice(0, 6).map(ticket => (
                    <div key={ticket.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{ticket.ticket_no}</p>
                      <p className="text-xs text-slate-500">{ticket.category_name} · {ticket.status}</p>
                      <button
                        type="button"
                        onClick={() => handleDownloadResponse(ticket.id)}
                        disabled={downloadingId === ticket.id}
                        className="mt-2 text-xs font-semibold text-[#1B3A6B] hover:underline disabled:opacity-50"
                      >
                        {downloadingId === ticket.id ? 'Preparing download...' : 'Download requested data'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}