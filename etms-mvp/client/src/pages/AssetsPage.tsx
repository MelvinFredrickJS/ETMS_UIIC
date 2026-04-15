import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../constants/ROLES'
import {
  getMyAssets, getAllAssets, getAssetHistory,
  updateAssetStatus, transferAsset, getEmployeesByCategory,
  type AssignmentHistory,
} from '../api/ticketApi'
import type { Asset, User } from '../types'

const STATUS_BADGE: Record<string, string> = {
  active:       'bg-green-100 text-green-700',
  under_repair: 'bg-yellow-100 text-yellow-700',
  retired:      'bg-gray-100 text-gray-500',
}

const VALID_STATUSES = ['active', 'under_repair', 'retired']

// ── Assignment History Drawer ─────────────────────────────────────────────────
function HistoryDrawer({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [history, setHistory] = useState<AssignmentHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAssetHistory(asset.id)
      .then(({ data }) => setHistory(data.history))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [asset.id])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
      <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-800">{asset.name}</p>
            <p className="text-xs text-gray-400 font-mono">{asset.serial_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Assignment History</p>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transfer history yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map(h => (
                <div key={h.id} className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">
                      {h.from_name ? `${h.from_name} → ` : '— → '}{h.to_name ?? '—'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${h.returned_at ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {h.returned_at ? 'Returned' : 'Current'}
                    </span>
                  </div>
                  <p className="text-gray-400">
                    Assigned: {format(new Date(h.assigned_at), 'dd MMM yyyy, HH:mm')}
                    {h.returned_at && ` · Returned: ${format(new Date(h.returned_at), 'dd MMM yyyy, HH:mm')}`}
                  </p>
                  {h.by_name && <p className="text-gray-400">By: {h.by_name}</p>}
                  {h.note && <p className="text-gray-500 italic">"{h.note}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Transfer Modal ────────────────────────────────────────────────────────────
function TransferModal({
  asset, onClose, onDone,
}: { asset: Asset; onClose: () => void; onDone: () => void }) {
  const [employees, setEmployees] = useState<Pick<User, 'id' | 'name' | 'emp_id' | 'email'>[]>([])
  const [toUser,    setToUser]    = useState('')
  const [note,      setNote]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    getEmployeesByCategory(asset.category_id)
      .then(({ data }) => setEmployees(data.employees.filter(e => e.id !== (asset as Asset & { assigned_to: number }).assigned_to)))
      .catch(() => {})
  }, [asset.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!toUser) return
    setLoading(true); setError('')
    try {
      await transferAsset(asset.id, { to_user_id: Number(toUser), note: note || undefined })
      onDone()
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      setError(msg ?? 'Transfer failed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Transfer Asset</h2>
        <p className="text-xs text-gray-400 mb-4">{asset.name} — {asset.serial_number}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to *</label>
            <select required value={toUser} onChange={e => setToUser(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
              <option value="">Select employee…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.emp_id})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!toUser || loading}
              className="flex-1 bg-[#1B3A6B] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#15305a]">
              {loading ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const isManager = user?.role === ROLES.MANAGER

  const [assets,      setAssets]      = useState<Asset[]>([])
  const [loading,     setLoading]     = useState(true)
  const [toast,       setToast]       = useState('')
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null)
  const [transferAssetTarget, setTransferAssetTarget] = useState<Asset | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function reportIssue(asset: Asset) {
    navigate('/tickets/new', {
      state: {
        prefill: {
          typeKey:     'complaint',
          categoryKey: 'hardware_issue',
          asset,
        },
      },
    })
  }

  async function load() {
    setLoading(true)
    try {
      const { data } = isManager ? await getAllAssets() : await getMyAssets()
      setAssets(data.assets)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleStatusChange(asset: Asset, status: string) {
    try {
      await updateAssetStatus(asset.id, status)
      showToast('Status updated.')
      load()
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      showToast('❌ ' + (msg ?? 'Failed to update status.'))
    }
  }

  // ── Employee view — read-only cards ──────────────────────────────────────────
  if (!isManager) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Assets</h1>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🖥️</p>
            <p className="text-sm">No assets assigned to you.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{a.name}</p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{a.serial_number}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">{a.category_name}</p>
                {a.status === 'active' && (
                  <button
                    onClick={() => reportIssue(a)}
                    className="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    🚨 Report Issue
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Manager view — full table with actions ────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#1B3A6B] text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50">{toast}</div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Assets</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Serial No', 'Name', 'Category', 'Assigned To', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assets.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No assets in your categories.</td></tr>
              ) : assets.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.serial_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.category_name}</td>
                  <td className="px-4 py-3 text-gray-700">{(a as Asset & { assigned_user_name?: string }).assigned_user_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={e => handleStatusChange(a, e.target.value)}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {VALID_STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => setTransferAssetTarget(a)}
                        className="text-xs text-[#1B3A6B] hover:underline font-medium">
                        Transfer
                      </button>
                      <button onClick={() => setHistoryAsset(a)}
                        className="text-xs text-gray-500 hover:underline font-medium">
                        History
                      </button>
                      {a.status === 'active' && (
                        <button onClick={() => reportIssue(a)}
                          className="text-xs text-red-500 hover:underline font-medium">
                          Report Issue
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyAsset && (
        <HistoryDrawer asset={historyAsset} onClose={() => setHistoryAsset(null)} />
      )}
      {transferAssetTarget && (
        <TransferModal
          asset={transferAssetTarget}
          onClose={() => setTransferAssetTarget(null)}
          onDone={() => { setTransferAssetTarget(null); showToast('Asset transferred.'); load() }}
        />
      )}
    </div>
  )
}
