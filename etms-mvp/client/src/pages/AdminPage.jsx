import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  getAllUsers, createUser, deleteUser, transferOwnership,
  getTickets, getCategories,
} from '../api/ticketApi'
import StatusBadge   from '../components/common/StatusBadge'
import TypeBadge     from '../components/common/TypeBadge'
import PriorityBadge from '../components/common/PriorityBadge'
import { ROLES } from '../constants/ROLES'

const ROLE_OPTIONS    = ['employee', 'manager', 'admin']
const STATUS_OPTIONS  = ['', 'pending_approval','approved','assigned','in_progress','reported','resolved','closed','rejected']
const TYPE_OPTIONS    = [{ value:'', label:'All Types' },{ value:'complaint', label:'🔴 Complaint' },{ value:'request', label:'🔵 Request' },{ value:'data', label:'🟡 Data' }]
const PRIORITY_OPTIONS= [{ value:'', label:'All Priorities' },{ value:'low', label:'Low' },{ value:'medium', label:'Medium' },{ value:'high', label:'High' },{ value:'critical', label:'Critical' }]

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')

  // ── Users state ──
  const [users,       setUsers]       = useState([])
  const [usersLoading,setUsersLoading]= useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [categories,  setCategories]  = useState([])
  const [toast,       setToast]       = useState('')

  // Add user form
  const [newEmpId,   setNewEmpId]   = useState('')
  const [newName,    setNewName]    = useState('')
  const [newEmail,   setNewEmail]   = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [newRole,    setNewRole]    = useState('employee')
  const [newCatId,   setNewCatId]   = useState('')
  const [newDept,    setNewDept]    = useState('')
  const [addError,   setAddError]   = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Delete modal
  const [deleteTarget,    setDeleteTarget]    = useState(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [transferTo,      setTransferTo]      = useState('')
  const [deleteLoading,   setDeleteLoading]   = useState(false)
  const [deleteError,     setDeleteError]     = useState('')

  // ── Tickets state ──
  const [tickets,     setTickets]     = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [tPage,       setTPage]       = useState(1)
  const [tTotalPages, setTTotalPages] = useState(1)
  const [tFilterType,     setTFilterType]     = useState('')
  const [tFilterStatus,   setTFilterStatus]   = useState('')
  const [tFilterPriority, setTFilterPriority] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Load users + categories
  useEffect(() => {
    loadUsers()
    getCategories().then(({ data }) => {
      const flat = data.types.flatMap(t => t.categories)
      setCategories(flat)
    }).catch(() => {})
  }, [])

  async function loadUsers() {
    setUsersLoading(true)
    try {
      const { data } = await getAllUsers()
      setUsers(data.users)
    } catch { /* silent */ }
    finally { setUsersLoading(false) }
  }

  async function handleAddUser(e) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      await createUser({ emp_id: newEmpId, name: newName, email: newEmail, password: newPw, role: newRole, category_id: newCatId || null, department: newDept || null })
      showToast('User created successfully.')
      setShowAddForm(false)
      setNewEmpId(''); setNewName(''); setNewEmail(''); setNewPw(''); setNewRole('employee'); setNewCatId(''); setNewDept('')
      loadUsers()
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create user.')
    } finally { setAddLoading(false) }
  }

  async function handleTransferAndDelete() {
    if (!transferTo) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await transferOwnership(deleteTarget.id, Number(transferTo))
      await deleteUser(deleteTarget.id)
      showToast('Ownership transferred and user deleted.')
      setDeleteTarget(null); setTransferTo(''); setDeleteConfirmName('')
      loadUsers()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Operation failed.')
    } finally { setDeleteLoading(false) }
  }

  async function handleDirectDelete() {
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteUser(deleteTarget.id)
      showToast('User deleted permanently.')
      setDeleteTarget(null); setDeleteConfirmName('')
      loadUsers()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Delete failed.')
    } finally { setDeleteLoading(false) }
  }

  // Load tickets
  useEffect(() => {
    if (tab === 'tickets') loadTickets()
  }, [tab, tPage, tFilterType, tFilterStatus, tFilterPriority])

  async function loadTickets() {
    setTicketsLoading(true)
    try {
      const params = { page: tPage, limit: 15 }
      if (tFilterType)     params.type     = tFilterType
      if (tFilterStatus)   params.status   = tFilterStatus
      if (tFilterPriority) params.priority = tFilterPriority
      const { data } = await getTickets(params)
      setTickets(data.tickets)
      setTTotalPages(data.totalPages)
    } catch { /* silent */ }
    finally { setTicketsLoading(false) }
  }

  function tFilterChange(setter) { return e => { setter(e.target.value); setTPage(1) } }

  const selectClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
  const inputClass  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'

  const hasRefs = deleteTarget && Number(deleteTarget.references_count) > 0
  const canDelete = deleteConfirmName === deleteTarget?.name && !hasRefs

  return (
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#1B3A6B] text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50">{toast}</div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[['users','👥 Users'],['tickets','📋 All Tickets']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === key ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{users.length} users</p>
            <button onClick={() => setShowAddForm(v => !v)}
              className="bg-[#1B3A6B] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#15305a]">
              {showAddForm ? 'Cancel' : '+ Add User'}
            </button>
          </div>

          {/* Add user form */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5 grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Emp ID *</label><input required value={newEmpId} onChange={e=>setNewEmpId(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Name *</label><input required value={newName} onChange={e=>setNewName(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Email *</label><input required type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Password *</label><input required type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} className={inputClass} /></div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                <select value={newRole} onChange={e=>setNewRole(e.target.value)} className={inputClass}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {(newRole === 'employee' || newRole === 'manager') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                  <select required value={newCatId} onChange={e=>setNewCatId(e.target.value)} className={inputClass}>
                    <option value="">Select…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Department</label><input value={newDept} onChange={e=>setNewDept(e.target.value)} className={inputClass} /></div>
              {addError && <p className="col-span-2 text-xs text-red-600">{addError}</p>}
              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={addLoading}
                  className="bg-[#1B3A6B] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-[#15305a]">
                  {addLoading ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          )}

          {/* Users table */}
          {usersLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Emp ID','Name','Email','Role','Department','Status',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.emp_id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role}</td>
                      <td className="px-4 py-3 text-gray-500">{u.department || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setDeleteTarget(u); setDeleteConfirmName(''); setTransferTo(''); setDeleteError('') }}
                          className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TICKETS TAB ── */}
      {tab === 'tickets' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <select value={tFilterType}     onChange={tFilterChange(setTFilterType)}     className={selectClass}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={tFilterStatus}   onChange={tFilterChange(setTFilterStatus)}   className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </select>
            <select value={tFilterPriority} onChange={tFilterChange(setTFilterPriority)} className={selectClass}>
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {ticketsLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Ticket No','Type','Category','Title','Priority','Status','Raised By','Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tickets.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.ticket_no}</td>
                      <td className="px-4 py-3"><TypeBadge typeKey={t.type_key} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.category_name}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{t.title}</td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.raised_by_name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(t.created_at), 'dd MMM yy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => setTPage(p => Math.max(1, p-1))} disabled={tPage===1}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="text-sm text-gray-500">Page {tPage} of {tTotalPages}</span>
              <button onClick={() => setTPage(p => Math.min(tTotalPages, p+1))} disabled={tPage===tTotalPages}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Permanent Delete User</h2>
            <p className="text-sm text-gray-500 mb-4">{deleteTarget.name} ({deleteTarget.emp_id})</p>

            {hasRefs && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-4">
                ⚠️ This user has {deleteTarget.references_count} ownership references. Transfer ownership first.
                <div className="mt-2">
                  <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                    <option value="">Select user to transfer to…</option>
                    {users.filter(u => u.id !== deleteTarget.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.emp_id})</option>
                    ))}
                  </select>
                  <button
                    disabled={!transferTo || deleteLoading}
                    onClick={handleTransferAndDelete}
                    className="mt-2 w-full bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-orange-700"
                  >
                    {deleteLoading ? 'Processing…' : 'Transfer & Delete'}
                  </button>
                </div>
              </div>
            )}

            {!hasRefs && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Type the user's name to confirm deletion:</p>
                <input
                  value={deleteConfirmName}
                  onChange={e => setDeleteConfirmName(e.target.value)}
                  placeholder={deleteTarget.name}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            )}

            {deleteError && <p className="text-xs text-red-600 mb-3">{deleteError}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); setTransferTo('') }}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              {!hasRefs && (
                <button
                  disabled={!canDelete || deleteLoading}
                  onClick={handleDirectDelete}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-red-700"
                >
                  {deleteLoading ? 'Deleting…' : 'Delete Permanently'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
