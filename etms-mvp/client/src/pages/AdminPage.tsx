import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  getAllUsers, createUser, deleteUser, transferOwnership,
  getTickets, getCategories,
  getAllAssets, getAssetHistory, updateAssetStatus, transferAsset,
  getEmployeesByCategory, lookupEmployee, toggleUserActive, updateUserName, getTeams,
  type AssignmentHistory, type EmployeeLookupResult,
} from '../api/ticketApi'
import StatusBadge       from '../components/common/StatusBadge'
import TypeBadge         from '../components/common/TypeBadge'
import PriorityBadge     from '../components/common/PriorityBadge'
import CategoryOrgGraph  from '../components/admin/CategoryOrgGraph'
import { ROLES } from '../constants/ROLES'
import type { User, Ticket, Category, TicketStatus, TicketTypeGroup, Asset } from '../types'

const ROLE_OPTIONS    = ['employee', 'manager', 'admin']
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  ...(['pending_approval','approved','assigned','in_progress','reported','resolved','closed','rejected'] as TicketStatus[])
    .map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })),
]
const TYPE_OPTIONS    = [{ value:'', label:'All Types' },{ value:'complaint', label:'🔴 Complaint' },{ value:'request', label:'🔵 Request' },{ value:'data', label:'🟡 Data' }]
const PRIORITY_OPTIONS= [{ value:'', label:'All Priorities' },{ value:'low', label:'Low' },{ value:'medium', label:'Medium' },{ value:'high', label:'High' },{ value:'critical', label:'Critical' }]

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'users' | 'assets' | 'tickets'>('users')

  // ── Users state ──
  const [users,        setUsers]        = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [categories,   setCategories]   = useState<Category[]>([])
  const [typeGroups,   setTypeGroups]   = useState<TicketTypeGroup[]>([])
  const [toast,        setToast]        = useState('')

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

  // Inline name edit
  const [editingUserId,   setEditingUserId]   = useState<number | null>(null)
  const [editingName,     setEditingName]     = useState('')
  const [editNameLoading, setEditNameLoading] = useState(false)

  // Delete modal
  const [deleteTarget,      setDeleteTarget]      = useState<User | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [transferTo,        setTransferTo]        = useState('')
  const [deleteLoading,     setDeleteLoading]     = useState(false)
  const [deleteError,       setDeleteError]       = useState('')

  // ── Tickets state ──
  const [tickets,        setTickets]        = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [tPage,          setTPage]          = useState(1)
  const [tTotalPages,    setTTotalPages]    = useState(1)
  const [tFilterType,     setTFilterType]     = useState('')
  const [tFilterStatus,   setTFilterStatus]   = useState('')
  const [tFilterPriority, setTFilterPriority] = useState('')

  // ── Assets state ──
  const [assets,          setAssets]          = useState<Asset[]>([])
  const [assetsLoading,   setAssetsLoading]   = useState(false)
  const [historyAsset,    setHistoryAsset]    = useState<Asset | null>(null)
  const [historyData,     setHistoryData]     = useState<AssignmentHistory[]>([])
  const [historyLoading,  setHistoryLoading]  = useState(false)
  const [transferTarget,  setTransferTarget]  = useState<Asset | null>(null)
  const [transferEmployees, setTransferEmployees] = useState<Pick<User,'id'|'name'|'emp_id'|'email'>[]>([])
  const [assetTransferTo,   setAssetTransferTo]   = useState('')
  const [transferNote,    setTransferNote]    = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError,   setTransferError]   = useState('')
  // Add asset form
  const [showAddAsset,    setShowAddAsset]    = useState(false)
  const [aName,           setAName]           = useState('')
  const [aSerial,         setASerial]         = useState('')
  const [aCatId,          setACatId]          = useState('')
  const [aAssignedTo,     setAAssignedTo]     = useState('')
  const [aCatEmployees,   setACatEmployees]   = useState<Pick<User,'id'|'name'|'emp_id'|'email'>[]>([])
  const [aStatus,         setAStatus]         = useState('active')
  const [aError,          setAError]          = useState('')
  const [aLoading,        setALoading]        = useState(false)
  // Employee lookup
  const [lookupQuery,   setLookupQuery]   = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult,  setLookupResult]  = useState<EmployeeLookupResult | null>(null)
  const [lookupError,   setLookupError]   = useState('')

  // Teams summary
  const [teams, setTeams] = useState<Array<{ id: number; name: string; category_key: string; manager_name: string | null }>>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const [teamMembersById, setTeamMembersById] = useState<Record<number, Pick<User, 'id' | 'name' | 'emp_id' | 'email'>[]>>({})
  const [teamMembersLoadingId, setTeamMembersLoadingId] = useState<number | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Load users + categories
  useEffect(() => {
    loadUsers()
    getCategories().then(({ data }) => {
      const flat = data.types.flatMap(t => t.categories)
      setCategories(flat)
      setTypeGroups(data.types)
    }).catch(() => {})
    loadTeams()
  }, [])

  async function loadTeams() {
    setTeamsLoading(true)
    try {
      const { data } = await getTeams()
      setTeams(data.teams)
    } catch {
      setTeams([])
    } finally {
      setTeamsLoading(false)
    }
  }

  async function toggleTeamMembers(teamId: number) {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null)
      return
    }

    setExpandedTeamId(teamId)
    if (teamMembersById[teamId]) return

    setTeamMembersLoadingId(teamId)
    try {
      const { data } = await getEmployeesByCategory(teamId)
      setTeamMembersById(prev => ({ ...prev, [teamId]: data.employees }))
    } catch {
      setTeamMembersById(prev => ({ ...prev, [teamId]: [] }))
    } finally {
      setTeamMembersLoadingId(null)
    }
  }

  async function loadUsers() {
    setUsersLoading(true)
    try {
      const { data } = await getAllUsers()
      setUsers(data.users)
    } catch { /* silent */ }
    finally { setUsersLoading(false) }
  }

  async function handleToggleActive(user: User) {
    try {
      const { data } = await toggleUserActive(user.id)
      showToast(data.message)
      loadUsers()
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      showToast('❌ ' + (msg ?? 'Failed.'))
    }
  }

  async function handleSaveName(userId: number) {
    if (!editingName.trim()) return
    setEditNameLoading(true)
    try {
      await updateUserName(userId, editingName)
      showToast('Name updated.')
      setEditingUserId(null)
      loadUsers()
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      showToast('❌ ' + (msg ?? 'Failed to update name.'))
    } finally { setEditNameLoading(false) }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      const { data: createData } = await createUser({
        emp_id: newEmpId, name: newName, email: newEmail,
        password: newPw, role: newRole as User['role'],
        category_id: newCatId ? Number(newCatId) : null,
        department: newDept || null,
      })
      const assetMsg = createData.auto_assigned_asset
        ? ` 🖥️ Auto-assigned: ${createData.auto_assigned_asset.name} (${createData.auto_assigned_asset.serial_number})`
        : ' No unassigned asset available.'
      showToast(`User created.${assetMsg}`)
      setShowAddForm(false)
      setNewEmpId(''); setNewName(''); setNewEmail(''); setNewPw('')
      setNewRole('employee'); setNewCatId(''); setNewDept('')
      loadUsers()
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setAddError(msg ?? 'Failed to create user.')
    } finally { setAddLoading(false) }
  }

  async function handleTransferAndDelete() {
    if (!transferTo || !deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await transferOwnership(deleteTarget.id, Number(transferTo))
      await deleteUser(deleteTarget.id)
      showToast('Ownership transferred and user deleted.')
      setDeleteTarget(null); setTransferTo(''); setDeleteConfirmName('')
      loadUsers()
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setDeleteError(msg ?? 'Operation failed.')
    } finally { setDeleteLoading(false) }
  }

  async function handleDirectDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteUser(deleteTarget.id)
      showToast('User deleted permanently.')
      setDeleteTarget(null); setDeleteConfirmName('')
      loadUsers()
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setDeleteError(msg ?? 'Delete failed.')
    } finally { setDeleteLoading(false) }
  }

  // Load assets
  useEffect(() => {
    if (tab === 'assets') loadAssets()
  }, [tab])

  async function loadAssets() {
    setAssetsLoading(true)
    try {
      const { data } = await getAllAssets()
      setAssets(data.assets)
    } catch { /* silent */ }
    finally { setAssetsLoading(false) }
  }

  async function openHistory(asset: Asset) {
    setHistoryAsset(asset)
    setHistoryLoading(true)
    setHistoryData([])
    try {
      const { data } = await getAssetHistory(asset.id)
      setHistoryData(data.history)
    } catch { /* silent */ }
    finally { setHistoryLoading(false) }
  }

  async function handleAssetStatusChange(asset: Asset, status: string) {
    try {
      await updateAssetStatus(asset.id, status)
      showToast('Asset status updated.')
      loadAssets()
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      showToast('❌ ' + (msg ?? 'Failed.'))
    }
  }

  async function openTransfer(asset: Asset) {
    setTransferTarget(asset)
    setAssetTransferTo(''); setTransferNote(''); setTransferError('')
    try {
      const { data } = await getEmployeesByCategory(asset.category_id)
      setTransferEmployees(data.employees.filter(e => e.id !== (asset as Asset & { assigned_to: number }).assigned_to))
    } catch { setTransferEmployees([]) }
  }

  async function handleTransferAsset() {
    if (!transferTarget || !assetTransferTo) return
    setTransferLoading(true); setTransferError('')
    try {
      await transferAsset(transferTarget.id, { to_user_id: Number(assetTransferTo), note: transferNote || undefined })
      showToast('Asset transferred.')
      setTransferTarget(null)
      loadAssets()
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      setTransferError(msg ?? 'Transfer failed.')
    } finally { setTransferLoading(false) }
  }

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault(); setAError(''); setALoading(true)
    try {
      await (await import('../api/ticketApi')).createAsset({
        name: aName, serial_number: aSerial,
        category_id: Number(aCatId), assigned_to: Number(aAssignedTo), status: aStatus,
      })
      showToast('Asset created.')
      setShowAddAsset(false)
      setAName(''); setASerial(''); setACatId(''); setAAssignedTo(''); setAStatus('active')
      loadAssets()
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      setAError(msg ?? 'Failed to create asset.')
    } finally { setALoading(false) }
  }

  // Load employees when category changes in add-asset form
  useEffect(() => {
    if (!aCatId) { setACatEmployees([]); setAAssignedTo(''); return }
    getEmployeesByCategory(Number(aCatId))
      .then(({ data }) => { setACatEmployees(data.employees); setAAssignedTo('') })
      .catch(() => {})
  }, [aCatId])

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!lookupQuery.trim()) return
    setLookupLoading(true); setLookupError(''); setLookupResult(null)
    try {
      const { data } = await lookupEmployee(lookupQuery.trim())
      setLookupResult(data)
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      setLookupError(msg ?? 'Not found.')
    } finally { setLookupLoading(false) }
  }  // Load tickets
  useEffect(() => {
    if (tab === 'tickets') loadTickets()
  }, [tab, tPage, tFilterType, tFilterStatus, tFilterPriority])

  async function loadTickets() {
    setTicketsLoading(true)
    try {
      const params: Record<string, string | number> = { page: tPage, limit: 15 }
      if (tFilterType)     params['type']     = tFilterType
      if (tFilterStatus)   params['status']   = tFilterStatus
      if (tFilterPriority) params['priority'] = tFilterPriority
      const { data } = await getTickets(params)
      setTickets(data.tickets)
      setTTotalPages(data.totalPages)
    } catch { /* silent */ }
    finally { setTicketsLoading(false) }
  }

  function tFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => { setter(e.target.value); setTPage(1) }
  }

  const selectClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
  const inputClass  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'

  const hasRefs = deleteTarget && Number(deleteTarget.references_count ?? 0) > 0
  const canDelete = deleteConfirmName === deleteTarget?.name && !hasRefs

  return (
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#1B3A6B] text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50">{toast}</div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['users','👥 Users'],['assets','🖥️ Assets'],['tickets','📋 All Tickets']] as const).map(([key, label]) => (
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
              {(newRole === ROLES.EMPLOYEE || newRole === ROLES.MANAGER) && (
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

          {/* Employee Lookup */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <p className="text-sm font-bold text-gray-800 mb-1">🔍 Find Employee</p>
            <p className="text-xs text-gray-400 mb-3">Search by Employee ID or Asset Serial Number</p>
            <form onSubmit={handleLookup} className="flex gap-2 mb-4">
              <input
                value={lookupQuery}
                onChange={e => { setLookupQuery(e.target.value); setLookupResult(null); setLookupError('') }}
                placeholder="e.g. EMP001 or SN-DELL-001"
                className={`flex-1 ${inputClass}`}
              />
              <button type="submit" disabled={!lookupQuery.trim() || lookupLoading}
                className="bg-[#1B3A6B] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#15305a] flex items-center gap-2">
                {lookupLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Search
              </button>
              {lookupResult && (
                <button type="button" onClick={() => { setLookupResult(null); setLookupQuery('') }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
                  ✕
                </button>
              )}
            </form>

            {lookupError && (
              <p className="text-sm text-red-500 flex items-center gap-1">⚠️ {lookupError}</p>
            )}

            {lookupResult && (() => {
              const { user: lu, assets: la, ticket_stats } = lookupResult
              const statusBadge: Record<string, string> = {
                active: 'bg-green-100 text-green-700',
                under_repair: 'bg-yellow-100 text-yellow-700',
                retired: 'bg-gray-100 text-gray-500',
              }
              return (
                <div className="space-y-4">
                  {/* User card */}
                  <div className="flex flex-wrap gap-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {lu.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-gray-800 text-base">{lu.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${lu.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {lu.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1B3A6B]/10 text-[#1B3A6B] capitalize">
                          {lu.role}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-gray-500 mt-2">
                        <span><span className="font-medium text-gray-700">Emp ID:</span> {lu.emp_id}</span>
                        <span><span className="font-medium text-gray-700">Email:</span> {lu.email}</span>
                        <span><span className="font-medium text-gray-700">Department:</span> {lu.department ?? '—'}</span>
                        <span><span className="font-medium text-gray-700">Category:</span> {lu.category_name ?? '—'}</span>
                        <span><span className="font-medium text-gray-700">Open Tickets:</span> {ticket_stats.open}</span>
                        <span><span className="font-medium text-gray-700">Total Tickets:</span> {ticket_stats.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assets */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      System Configuration — {la.length} asset{la.length !== 1 ? 's' : ''}
                    </p>
                    {la.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No assets assigned.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {la.map(a => (
                          <div key={a.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <span className="text-xl mt-0.5">
                              {a.name.toLowerCase().includes('monitor') ? '🖥️' : '💻'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                  {a.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-gray-400 mt-0.5">{a.serial_number}</p>
                              <p className="text-xs text-gray-400">{a.category_name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Teams section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-gray-800">🏷️ Teams</p>
                <p className="text-xs text-gray-400">Click a team to reveal members</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] text-xs font-semibold">
                {teams.length} team{teams.length !== 1 ? 's' : ''}
              </span>
            </div>

            {teamsLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" /></div>
            ) : teams.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No teams found.</p>
            ) : (
              <div className="space-y-2">
                {teams.map(team => {
                  const isOpen = expandedTeamId === team.id
                  const members = teamMembersById[team.id] ?? []
                  const isMembersLoading = teamMembersLoadingId === team.id

                  return (
                    <div key={team.id} className="border border-gray-100 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleTeamMembers(team.id)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-800">{team.name}</p>
                          <p className="text-xs text-gray-500">
                            Key: {team.category_key} {team.manager_name ? `· Manager: ${team.manager_name}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">{isOpen ? '▲ Hide' : '▼ Show members'}</span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
                          {isMembersLoading ? (
                            <div className="py-3 text-xs text-gray-500">Loading members…</div>
                          ) : members.length === 0 ? (
                            <div className="py-3 text-xs text-gray-500">No members assigned.</div>
                          ) : (
                            <ul className="py-2 space-y-1">
                              {members.map(member => (
                                <li key={member.id} className="text-sm text-gray-700">
                                  <span className="font-medium">{member.name}</span>
                                  <span className="text-gray-500"> ({member.emp_id}) · {member.email}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

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
                      {/* Inline editable name */}
                      <td className="px-4 py-3">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveName(u.id)
                                if (e.key === 'Escape') setEditingUserId(null)
                              }}
                              className="border border-[#1B3A6B] rounded px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                            />
                            <button
                              onClick={() => handleSaveName(u.id)}
                              disabled={editNameLoading}
                              className="text-xs text-green-600 hover:text-green-800 font-semibold"
                            >
                              {editNameLoading ? '…' : '✓'}
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span className="font-medium text-gray-800">{u.name}</span>
                            <button
                              onClick={() => { setEditingUserId(u.id); setEditingName(u.name) }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#1B3A6B] transition-opacity ml-1"
                              title="Edit name"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role}</td>
                      <td className="px-4 py-3 text-gray-500">{u.department ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            u.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                          title={u.is_active ? 'Click to deactivate' : 'Click to reactivate'}
                        >
                          {u.is_active ? '✅ Active' : '🚫 Inactive'}
                        </button>
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

          {/* Category Org Graph */}
          {!usersLoading && (
            <CategoryOrgGraph users={users} typeGroups={typeGroups} />
          )}
        </div>
      )}

      {/* ── ASSETS TAB ── */}
      {tab === 'assets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{assets.length} assets</p>
            <button onClick={() => setShowAddAsset(v => !v)}
              className="bg-[#1B3A6B] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#15305a]">
              {showAddAsset ? 'Cancel' : '+ Add Asset'}
            </button>
          </div>

          {/* Add asset form */}
          {showAddAsset && (
            <form onSubmit={handleAddAsset} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5 grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input required value={aName} onChange={e => setAName(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Serial Number *</label>
                <input required value={aSerial} onChange={e => setASerial(e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                <select required value={aCatId} onChange={e => setACatId(e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Assign To *</label>
                <select required value={aAssignedTo} onChange={e => setAAssignedTo(e.target.value)} className={inputClass} disabled={!aCatId}>
                  <option value="">Select employee…</option>
                  {aCatEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.emp_id})</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={aStatus} onChange={e => setAStatus(e.target.value)} className={inputClass}>
                  <option value="active">Active</option>
                  <option value="under_repair">Under Repair</option>
                  <option value="retired">Retired</option>
                </select></div>
              {aError && <p className="col-span-2 text-xs text-red-600">{aError}</p>}
              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={aLoading}
                  className="bg-[#1B3A6B] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-[#15305a]">
                  {aLoading ? 'Creating…' : 'Create Asset'}
                </button>
              </div>
            </form>
          )}

          {/* Assets table */}
          {assetsLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Serial No','Name','Category','Assigned To','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assets.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No assets found.</td></tr>
                  ) : assets.map(a => {
                    const assetExt = a as Asset & { assigned_user_name?: string }
                    const statusBadge: Record<string,string> = {
                      active: 'bg-green-100 text-green-700',
                      under_repair: 'bg-yellow-100 text-yellow-700',
                      retired: 'bg-gray-100 text-gray-500',
                    }
                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.serial_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.category_name}</td>
                        <td className="px-4 py-3 text-gray-700">{assetExt.assigned_user_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={a.status}
                            onChange={e => handleAssetStatusChange(a, e.target.value)}
                            className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] ${statusBadge[a.status] ?? 'bg-gray-100 text-gray-500'}`}
                          >
                            <option value="active">Active</option>
                            <option value="under_repair">Under Repair</option>
                            <option value="retired">Retired</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-3">
                            <button onClick={() => openTransfer(a)}
                              className="text-xs text-[#1B3A6B] hover:underline font-medium">Transfer</button>
                            <button onClick={() => openHistory(a)}
                              className="text-xs text-gray-500 hover:underline font-medium">History</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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

      {/* Asset History Drawer */}
      {historyAsset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-800">{historyAsset.name}</p>
                <p className="text-xs text-gray-400 font-mono">{historyAsset.serial_number}</p>
              </div>
              <button onClick={() => setHistoryAsset(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Assignment History</p>
              {historyLoading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" /></div>
              ) : historyData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No transfer history yet.</p>
              ) : (
                <div className="space-y-3">
                  {historyData.map(h => (
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
      )}

      {/* Asset Transfer Modal */}
      {transferTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Transfer Asset</h2>
            <p className="text-xs text-gray-400 mb-4">{transferTarget.name} — {transferTarget.serial_number}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to *</label>
                <select value={assetTransferTo} onChange={e => setAssetTransferTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  <option value="">Select employee…</option>
                  {transferEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.emp_id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input value={transferNote} onChange={e => setTransferNote(e.target.value)} maxLength={500}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              {transferError && <p className="text-xs text-red-600">{transferError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setTransferTarget(null)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button disabled={!assetTransferTo || transferLoading} onClick={handleTransferAsset}
                  className="flex-1 bg-[#1B3A6B] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#15305a]">
                  {transferLoading ? 'Transferring…' : 'Transfer'}
                </button>
              </div>
            </div>
          </div>
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
