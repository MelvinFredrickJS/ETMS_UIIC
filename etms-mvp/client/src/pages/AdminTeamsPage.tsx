import { useEffect, useMemo, useState } from 'react'
import { createTeam, deleteTeam, getAllUsers, getEmployeesByCategory, getTeams, type TeamSummary } from '../api/ticketApi'
import type { User } from '../types'

interface TeamView {
  id: number
  name: string
  category_key: string
  manager_name: string | null
  isDataTeam?: boolean
}

interface TeamCardMeta {
  label: string
  icon: string
  accent: string
  soft: string
}

const PROTECTED_TEAM_KEYS = new Set([
  'email_team',
  'vc_team',
  'infra_team',
  'network_team',
  'security_team',
  'sap_team',
  'gc_master_team',
  'reports_team',
])

const TEAM_CARD_META: Record<string, TeamCardMeta> = {
  email_team: { label: 'Email Team', icon: '📧', accent: 'text-sky-700', soft: 'bg-sky-50 border-sky-200' },
  vc_team: { label: 'VC Team', icon: '🎥', accent: 'text-violet-700', soft: 'bg-violet-50 border-violet-200' },
  infra_team: { label: 'Infra Team', icon: '🖥️', accent: 'text-emerald-700', soft: 'bg-emerald-50 border-emerald-200' },
  network_team: { label: 'Network Team', icon: '🌐', accent: 'text-blue-700', soft: 'bg-blue-50 border-blue-200' },
  security_team: { label: 'Security Team', icon: '🛡️', accent: 'text-rose-700', soft: 'bg-rose-50 border-rose-200' },
  sap_team: { label: 'SAP Team', icon: '📊', accent: 'text-amber-700', soft: 'bg-amber-50 border-amber-200' },
  gc_master_team: { label: 'GC Master Team', icon: '🏛️', accent: 'text-indigo-700', soft: 'bg-indigo-50 border-indigo-200' },
  reports_team: { label: 'Reports Team', icon: '📈', accent: 'text-teal-700', soft: 'bg-teal-50 border-teal-200' },
  data_team: { label: 'Data Team', icon: '🗂️', accent: 'text-orange-700', soft: 'bg-orange-50 border-orange-200' },
  custom_team: { label: 'Custom Team', icon: '🧩', accent: 'text-slate-700', soft: 'bg-slate-50 border-slate-200' },
}

const TEAM_ORDER = [
  'email_team',
  'vc_team',
  'infra_team',
  'network_team',
  'security_team',
  'sap_team',
  'gc_master_team',
  'reports_team',
  'data_team',
] as const

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamView[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const [selectedOperationalTeamId, setSelectedOperationalTeamId] = useState<number | null>(null)
  const [teamMembersById, setTeamMembersById] = useState<Record<number, Pick<User, 'id' | 'name' | 'emp_id' | 'email'>[]>>({})
  const [membersLoadingId, setMembersLoadingId] = useState<number | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false)
  const [createTeamName, setCreateTeamName] = useState('')
  const [createTeamKey, setCreateTeamKey] = useState('')
  const [createTeamManagerId, setCreateTeamManagerId] = useState('')
  const [selectedDeleteTeamId, setSelectedDeleteTeamId] = useState('')
  const [busyAction, setBusyAction] = useState<'create' | 'delete' | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [teamsRes, usersRes] = await Promise.all([getTeams(), getAllUsers()])
      const apiTeams = (teamsRes.data.teams ?? []).map((t: TeamSummary): TeamView => ({
        id: t.id,
        name: t.name,
        category_key: t.category_key,
        manager_name: t.manager_name,
      }))

      // Data Team is role-based and has a dedicated portal; include it as a separate team card.
      const dataTeam: TeamView = {
        id: -1,
        name: 'Data Team',
        category_key: 'data_team',
        manager_name: null,
        isDataTeam: true,
      }

      setTeams([...apiTeams, dataTeam])
      setUsers(usersRes.data.users ?? [])
    } catch {
      setTeams([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const dataTeamMembers = useMemo(
    () => users
      .filter(u => u.role === 'data_team')
      .map(u => ({ id: u.id, name: u.name, emp_id: u.emp_id, email: u.email })),
    [users]
  )

  const operationalTeams = useMemo(
    () => teams.filter(team => !team.isDataTeam).sort((a, b) => {
      const aIndex = TEAM_ORDER.indexOf(a.category_key as typeof TEAM_ORDER[number])
      const bIndex = TEAM_ORDER.indexOf(b.category_key as typeof TEAM_ORDER[number])
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    }),
    [teams]
  )

  const customTeams = useMemo(
    () => teams
      .filter(team => !team.isDataTeam && !TEAM_ORDER.includes(team.category_key as typeof TEAM_ORDER[number]))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  )

  const deletableTeams = useMemo(
    () => teams.filter(team => !team.isDataTeam),
    [teams]
  )

  const dataTeam = useMemo(
    () => teams.find(team => team.isDataTeam) ?? null,
    [teams]
  )

  const managerOptions = useMemo(
    () => users
      .filter(user => user.role === 'manager' && user.is_active)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  )

  const teamMemberCounts = useMemo(() => {
    const counts = new Map<number, number>()

    for (const user of users) {
      if (user.role === 'data_team') {
        continue
      }
      if (user.category_id == null) {
        continue
      }
      counts.set(user.category_id, (counts.get(user.category_id) ?? 0) + 1)
    }

    return counts
  }, [users])

  const summaryCards = useMemo(() => [
    { label: 'Total Teams', value: teams.length.toString(), tone: 'bg-[#1B3A6B]/10 text-[#1B3A6B]' },
    { label: 'Operational Teams', value: operationalTeams.length.toString(), tone: 'bg-blue-50 text-blue-700' },
    { label: 'Data Team Members', value: dataTeamMembers.length.toString(), tone: 'bg-amber-50 text-amber-700' },
  ], [teams.length, operationalTeams.length, dataTeamMembers.length])

  const orderedTeams = useMemo(() => {
    const byKey = new Map(teams.map(team => [team.category_key, team] as const))
    return TEAM_ORDER.map(key => byKey.get(key)).filter(Boolean) as TeamView[]
  }, [teams])

  const selectedOperationalTeam = useMemo(
    () => orderedTeams.find(team => team.id === selectedOperationalTeamId) ?? null,
    [orderedTeams, selectedOperationalTeamId]
  )

  function refreshAndAnnounce(message: string) {
    setActionMessage(message)
    window.setTimeout(() => setActionMessage(''), 2500)
    loadData()
  }

  async function ensureMembersLoaded(team: TeamView) {
    if (team.isDataTeam) {
      setTeamMembersById(prev => ({ ...prev, [team.id]: dataTeamMembers }))
      return
    }

    if (teamMembersById[team.id]) return

    setMembersLoadingId(team.id)
    try {
      const { data } = await getEmployeesByCategory(team.id)
      setTeamMembersById(prev => ({ ...prev, [team.id]: data.employees }))
    } catch {
      setTeamMembersById(prev => ({ ...prev, [team.id]: [] }))
    } finally {
      setMembersLoadingId(null)
    }
  }

  async function selectOperationalTeam(team: TeamView) {
    if (selectedOperationalTeamId === team.id) {
      setSelectedOperationalTeamId(null)
      return
    }

    setSelectedOperationalTeamId(team.id)
    await ensureMembersLoaded(team)
  }

  async function toggleMembers(team: TeamView) {
    if (expandedTeamId === team.id) {
      setExpandedTeamId(null)
      return
    }

    setExpandedTeamId(team.id)
    await ensureMembersLoaded(team)
  }

  function handleCreateTeam() {
    setCreateTeamName('')
    setCreateTeamKey('')
    setCreateTeamManagerId('')
    setCreateTeamOpen(true)
  }

  function handleDeleteTeam() {
    setSelectedDeleteTeamId(deletableTeams[0]?.id ? String(deletableTeams[0].id) : '')
    setDeleteTeamOpen(true)
  }

  async function submitCreateTeam() {
    const name = createTeamName.trim()
    const key = createTeamKey.trim()
    const managerUserId = Number(createTeamManagerId)
    if (!name) {
      setActionMessage('Team name is required.')
      return
    }
    if (!Number.isFinite(managerUserId) || managerUserId <= 0) {
      setActionMessage('Please select a manager for the team.')
      return
    }

    setBusyAction('create')
    try {
      await createTeam({ name, category_key: key || undefined, manager_user_id: managerUserId })
      setCreateTeamOpen(false)
      refreshAndAnnounce(`Created team "${name}".`)
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      setActionMessage(msg ?? 'Failed to create team.')
    } finally {
      setBusyAction(null)
    }
  }

  async function submitDeleteTeam() {
    const targetTeam = deletableTeams.find(team => String(team.id) === selectedDeleteTeamId)
    if (!targetTeam) {
      setActionMessage('Select a custom team to delete.')
      return
    }

    if (PROTECTED_TEAM_KEYS.has(targetTeam.category_key)) {
      setActionMessage('Built-in teams are protected and cannot be deleted.')
      return
    }

    setBusyAction('delete')
    try {
      await deleteTeam(targetTeam.id)
      if (expandedTeamId === targetTeam.id) {
        setExpandedTeamId(null)
      }
      setDeleteTeamOpen(false)
      refreshAndAnnounce(`Deleted team "${targetTeam.name}".`)
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      setActionMessage(msg ?? 'Failed to delete team.')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teams</h1>
          <p className="text-sm text-gray-500 mt-1">Organized view of operational and specialist teams.</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              <button
              type="button"
              onClick={handleCreateTeam}
              className="rounded-lg bg-[#1B3A6B] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#15305a]"
            >
              + Create Team
            </button>
              <button
              type="button"
              onClick={handleDeleteTeam}
              className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
            >
              Delete Team
            </button>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] text-sm font-semibold self-start sm:self-auto">
            {teams.length} teams
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {actionMessage}
        </div>
      )}

      {createTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gradient-to-r from-[#1B3A6B] to-[#244b84] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">
                    ✚
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">Create Team</h3>
                    <p className="mt-1 text-sm text-white/80">Add a custom team that appears in the Teams panel.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setCreateTeamOpen(false)} className="text-white/70 hover:text-white">✕</button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Team Name</label>
                <input
                  value={createTeamName}
                  onChange={e => setCreateTeamName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1B3A6B]"
                  placeholder="e.g. Claims Team"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Team Key</label>
                <input
                  value={createTeamKey}
                  onChange={e => setCreateTeamKey(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1B3A6B]"
                  placeholder="e.g. claims_team"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Manager *</label>
                <select
                  value={createTeamManagerId}
                  onChange={e => setCreateTeamManagerId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1B3A6B]"
                >
                  <option value="">Select manager...</option>
                  {managerOptions.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.emp_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setCreateTeamOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCreateTeam}
                disabled={busyAction === 'create'}
                className="rounded-lg bg-[#1B3A6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15305a] disabled:opacity-60"
              >
                {busyAction === 'create' ? 'Creating…' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">
                    −
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">Delete Custom Team</h3>
                    <p className="mt-1 text-sm text-white/80">Only teams created here can be deleted.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setDeleteTeamOpen(false)} className="text-white/70 hover:text-white">✕</button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Team</label>
                <select
                  value={selectedDeleteTeamId}
                  onChange={e => setSelectedDeleteTeamId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1B3A6B]"
                >
                  <option value="">Select a team…</option>
                  {deletableTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}{PROTECTED_TEAM_KEYS.has(team.category_key) ? ' (protected)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">Built-in teams are listed for visibility but are protected and cannot be deleted.</p>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteTeamOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDeleteTeam}
                disabled={busyAction === 'delete' || !selectedDeleteTeamId}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {busyAction === 'delete' ? 'Deleting…' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map(card => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
            <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-lg font-bold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-sm text-gray-500">No teams found.</div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Operational Teams</h2>
                <p className="text-xs text-gray-400 mt-0.5">Core teams that handle day-to-day operations.</p>
              </div>
              <span className="text-xs text-gray-400">Click a card to open members popup</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {orderedTeams.map(team => {
                const isSelected = selectedOperationalTeamId === team.id
                const memberCount = teamMemberCounts.get(team.id) ?? 0
                const meta = TEAM_CARD_META[team.category_key] ?? TEAM_CARD_META.email_team

                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => selectOperationalTeam(team)}
                    className={`text-left rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${isSelected ? meta.soft : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta.soft} ${meta.accent} text-lg flex-shrink-0`}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-base font-bold ${meta.accent}`}>{meta.label}</p>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {team.category_key}{team.manager_name ? ` · Manager: ${team.manager_name}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.soft} ${meta.accent}`}>
                        {memberCount} member{memberCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>{isSelected ? 'Hide members' : 'Show members'}</span>
                      <span>{isSelected ? '▲' : '▼'}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {customTeams.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Custom Teams</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Teams created from the admin actions panel.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {customTeams.map(team => {
                  const isExpanded = expandedTeamId === team.id
                  const members = teamMembersById[team.id] ?? []
                  const isMembersLoading = membersLoadingId === team.id
                  const memberCount = teamMemberCounts.get(team.id) ?? 0
                  const meta = TEAM_CARD_META.custom_team

                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggleMembers(team)}
                      className={`text-left rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${isExpanded ? meta.soft : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta.soft} ${meta.accent} text-lg flex-shrink-0`}>
                            {meta.icon}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-base font-bold ${meta.accent}`}>{team.name}</p>
                            <p className="text-xs text-gray-500 mt-1 truncate">{team.category_key}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.soft} ${meta.accent}`}>
                          {memberCount} member{memberCount === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <span>{isExpanded ? 'Hide members' : 'Show members'}</span>
                        <span>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                          {isMembersLoading ? (
                            <p className="text-sm text-gray-500 py-2">Loading members...</p>
                          ) : members.length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">No members assigned.</p>
                          ) : (
                            <ul className="space-y-2">
                              {members.map(member => (
                                <li key={member.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                  <span className="font-medium">{member.name}</span>
                                  <span className="text-gray-500"> ({member.emp_id})</span>
                                  <div className="text-xs text-gray-400">{member.email}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {dataTeam && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Data Team</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Separate role-based portal for data requests.</p>
                </div>
                <span className="text-xs text-gray-400">Click to expand</span>
              </div>

              {(() => {
                const isExpanded = expandedTeamId === dataTeam.id
                const members = teamMembersById[dataTeam.id] ?? []
                const isMembersLoading = membersLoadingId === dataTeam.id
                const meta = TEAM_CARD_META.data_team

                return (
                  <button
                    type="button"
                    onClick={() => toggleMembers(dataTeam)}
                    className={`w-full text-left rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${isExpanded ? meta.soft : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta.soft} ${meta.accent} text-lg flex-shrink-0`}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-base font-bold ${meta.accent}`}>{meta.label}</p>
                          <p className="text-xs text-gray-500 mt-1 truncate">Dedicated data portal users</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.soft} ${meta.accent}`}>
                        {dataTeamMembers.length} member{dataTeamMembers.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>{isExpanded ? 'Hide members' : 'Show members'}</span>
                      <span>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                        {isMembersLoading ? (
                          <p className="text-sm text-gray-500 py-2">Loading members...</p>
                        ) : members.length === 0 ? (
                          <p className="text-sm text-gray-500 py-2">No members assigned.</p>
                        ) : (
                          <ul className="space-y-2">
                            {members.map(member => (
                              <li key={member.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                <span className="font-medium">{member.name}</span>
                                <span className="text-gray-500"> ({member.emp_id})</span>
                                <div className="text-xs text-gray-400">{member.email}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </button>
                )
              })()}
            </section>
          )}
        </div>
      )}

      {selectedOperationalTeam && (() => {
        const members = teamMembersById[selectedOperationalTeam.id] ?? []
        const isMembersLoading = membersLoadingId === selectedOperationalTeam.id
        const meta = TEAM_CARD_META[selectedOperationalTeam.category_key] ?? TEAM_CARD_META.email_team

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedOperationalTeam.name} members`}
            onClick={() => setSelectedOperationalTeamId(null)}
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className={`flex items-center justify-between gap-4 border-b px-6 py-4 ${meta.soft}`}>
                <div className="min-w-0">
                  <p className={`text-base font-bold ${meta.accent}`}>{selectedOperationalTeam.name} Members</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedOperationalTeam.category_key}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOperationalTeamId(null)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[65vh] overflow-auto px-6 py-5">
                {isMembersLoading ? (
                  <p className="text-sm text-gray-500 py-2">Loading members...</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No members assigned.</p>
                ) : (
                  <ul className="grid gap-2 md:grid-cols-2">
                    {members.map(member => (
                      <li key={member.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-gray-500"> ({member.emp_id})</span>
                        <div className="text-xs text-gray-400">{member.email}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
