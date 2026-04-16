import { useEffect, useMemo, useState } from 'react'
import { getAllUsers, getEmployeesByCategory, getTeams, type TeamSummary } from '../api/ticketApi'
import type { User } from '../types'

interface TeamView {
  id: number
  name: string
  category_key: string
  manager_name: string | null
  isDataTeam?: boolean
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamView[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const [teamMembersById, setTeamMembersById] = useState<Record<number, Pick<User, 'id' | 'name' | 'emp_id' | 'email'>[]>>({})
  const [membersLoadingId, setMembersLoadingId] = useState<number | null>(null)

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

  async function toggleMembers(team: TeamView) {
    if (expandedTeamId === team.id) {
      setExpandedTeamId(null)
      return
    }

    setExpandedTeamId(team.id)

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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teams</h1>
          <p className="text-sm text-gray-500 mt-1">Admin view for all teams and their members.</p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] text-sm font-semibold">
          {teams.length} teams
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-sm text-gray-500">No teams found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {teams.map(team => {
            const isExpanded = expandedTeamId === team.id
            const members = teamMembersById[team.id] ?? []
            const isMembersLoading = membersLoadingId === team.id

            return (
              <div key={team.id}>
                <button
                  type="button"
                  onClick={() => toggleMembers(team)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{team.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {team.category_key}
                      {team.manager_name ? ` · Manager: ${team.manager_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{isExpanded ? '▲ Hide' : '▼ Show members'}</span>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                    {isMembersLoading ? (
                      <p className="text-sm text-gray-500 py-2">Loading members...</p>
                    ) : members.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">No members assigned.</p>
                    ) : (
                      <ul className="pt-2 space-y-1.5">
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
  )
}
