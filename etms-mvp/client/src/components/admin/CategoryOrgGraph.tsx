import { useMemo, useState } from 'react'
import type { User } from '../../types'

interface TeamNode {
  id: number
  name: string
  category_key: string
  manager_user_id: number | null
  manager_name: string | null
}

interface Props {
  users: User[]
  teams: TeamNode[]
}

const COL_W = 220
const MGR_Y = 86
const EMP_Y_START = 210
const EMP_GAP = 82
const NODE_R = 28
const PADDING_X = 64

interface NodeData {
  id: number
  x: number
  y: number
  fullName: string
  empId: string
  role: 'manager' | 'employee'
  teamId: number
  teamName: string
  teamKey: string
  isActive: boolean
}

interface EdgeData {
  x1: number
  y1: number
  x2: number
  y2: number
  teamId: number
}

export default function CategoryOrgGraph({ users, teams }: Props) {
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null)
  const [activeTeam, setActiveTeam] = useState<number | null>(null)

  const visibleTeams = useMemo(() => {
    return teams
      .filter((team) => team.category_key !== 'data_team')
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [teams])

  const { nodes, edges, svgWidth, svgHeight } = useMemo(() => {
    const nodes: NodeData[] = []
    const edges: EdgeData[] = []

    let colIndex = 0

    for (const team of visibleTeams) {
      const cx = PADDING_X + colIndex * COL_W + COL_W / 2

      const managerByOwnerId = team.manager_user_id
        ? users.find((u) => u.id === team.manager_user_id && u.role === 'manager')
        : null

      const managerByCategory = users.find(
        (u) => u.role === 'manager' && Number(u.category_id) === Number(team.id)
      )

      const manager = managerByOwnerId ?? managerByCategory ?? null

      // Team mapping rule: employees are tied to the team row via users.category_id.
      const employees = users.filter(
        (u) => u.role === 'employee' && Number(u.category_id) === Number(team.id)
      )

      if (manager) {
        nodes.push({
          id: manager.id,
          x: cx,
          y: MGR_Y,
          fullName: manager.name,
          empId: manager.emp_id,
          role: 'manager',
          teamId: team.id,
          teamName: team.name,
          teamKey: team.category_key,
          isActive: manager.is_active,
        })
      }

      employees.forEach((employee, index) => {
        const y = EMP_Y_START + index * EMP_GAP

        nodes.push({
          id: employee.id,
          x: cx,
          y,
          fullName: employee.name,
          empId: employee.emp_id,
          role: 'employee',
          teamId: team.id,
          teamName: team.name,
          teamKey: team.category_key,
          isActive: employee.is_active,
        })

        if (manager) {
          edges.push({
            x1: cx,
            y1: MGR_Y + NODE_R,
            x2: cx,
            y2: y - NODE_R,
            teamId: team.id,
          })
        }
      })

      colIndex += 1
    }

    const maxEmployees = Math.max(
      0,
      ...visibleTeams.map((team) =>
        users.filter((u) => u.role === 'employee' && Number(u.category_id) === Number(team.id)).length
      )
    )

    const svgWidth = Math.max(720, PADDING_X * 2 + visibleTeams.length * COL_W)
    const svgHeight = EMP_Y_START + maxEmployees * EMP_GAP + 70

    return { nodes, edges, svgWidth, svgHeight }
  }, [visibleTeams, users])

  const headers = useMemo(
    () =>
      visibleTeams.map((team, index) => ({
        ...team,
        cx: PADDING_X + index * COL_W + COL_W / 2,
      })),
    [visibleTeams]
  )

  function nodeOpacity(node: NodeData) {
    if (activeTeam === null) return 1
    return node.teamId === activeTeam ? 1 : 0.2
  }

  function edgeOpacity(edge: EdgeData) {
    if (activeTeam === null) return 1
    return edge.teamId === activeTeam ? 1 : 0.1
  }

  if (visibleTeams.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-400">No teams found.</div>
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">Team Org Graph</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Managers and employees are mapped by teams, not ticket types.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-5">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-full bg-violet-500" /> Manager
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-full bg-teal-500" /> Employee
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-full bg-gray-300" /> Inactive
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block h-0.5 w-4 bg-teal-400" /> Reporting line
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50">
        <svg width={svgWidth} height={svgHeight} className="block" onClick={() => setActiveTeam(null)}>
          {headers.map((team) => {
            const isActive = activeTeam === team.id
            return (
              <g
                key={team.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTeam(isActive ? null : team.id)
                }}
                style={{ cursor: 'pointer' }}
              >
                {isActive && (
                  <rect
                    x={team.cx - COL_W / 2 + 6}
                    y={10}
                    width={COL_W - 12}
                    height={svgHeight - 20}
                    rx={10}
                    fill="#2563eb"
                    fillOpacity={0.06}
                    stroke="#2563eb"
                    strokeOpacity={0.2}
                    strokeWidth={1}
                  />
                )}

                <rect x={team.cx - 52} y={12} width={104} height={20} rx={10} fill="#eff6ff" stroke="#bfdbfe" />
                <text x={team.cx} y={26} textAnchor="middle" fontSize={10} fontWeight={600} fill="#1d4ed8">
                  Team
                </text>

                <text x={team.cx} y={48} textAnchor="middle" fontSize={10} fontWeight={600} fill="#334155">
                  {team.name.length > 18 ? `${team.name.slice(0, 17)}…` : team.name}
                </text>

                <rect x={team.cx - 45} y={54} width={90} height={16} rx={8} fill="#e2e8f0" />
                <text x={team.cx} y={65} textAnchor="middle" fontSize={9} fontWeight={600} fill="#334155">
                  {team.category_key}
                </text>
              </g>
            )
          })}

          {edges.map((edge, index) => (
            <line
              key={`${edge.teamId}-${index}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="#14b8a6"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={edgeOpacity(edge)}
              style={{ transition: 'opacity 0.2s' }}
            />
          ))}

          {nodes.map((node) => {
            const isManager = node.role === 'manager'
            const fill = !node.isActive ? '#d1d5db' : isManager ? '#8b5cf6' : '#14b8a6'
            const stroke = !node.isActive ? '#9ca3af' : isManager ? '#6d28d9' : '#0d9488'
            const isHovered = hoveredNode?.id === node.id

            return (
              <g
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTeam(node.teamId)
                }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer', opacity: nodeOpacity(node), transition: 'opacity 0.2s' }}
              >
                {isHovered && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_R + 6}
                    fill={fill}
                    fillOpacity={0.2}
                    stroke={fill}
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                  />
                )}

                <circle cx={node.x} cy={node.y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={isHovered ? 2.5 : 1.5} />

                <text x={node.x} y={node.y - 4} textAnchor="middle" fontSize={8} fontWeight={700} fill="white">
                  {node.empId.length > 8 ? node.empId.slice(0, 8) : node.empId}
                </text>

                <text x={node.x} y={node.y + 9} textAnchor="middle" fontSize={11}>
                  {isManager ? '👔' : '👤'}
                </text>

                {!node.isActive && (
                  <text x={node.x + 18} y={node.y - 18} fontSize={12} fill="#ef4444">
                    ✕
                  </text>
                )}
              </g>
            )
          })}

          {hoveredNode && (() => {
            const tx = Math.min(hoveredNode.x + NODE_R + 8, svgWidth - 170)
            const ty = Math.max(hoveredNode.y - 52, 8)
            return (
              <g>
                <rect
                  x={tx}
                  y={ty}
                  width={165}
                  height={82}
                  rx={8}
                  fill="white"
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  filter="drop-shadow(0 2px 6px rgba(0,0,0,0.12))"
                />
                <text x={tx + 10} y={ty + 18} fontSize={11} fontWeight={700} fill="#111827">
                  {hoveredNode.fullName}
                </text>
                <text x={tx + 10} y={ty + 34} fontSize={10} fill="#6b7280">
                  {hoveredNode.empId}
                </text>
                <text x={tx + 10} y={ty + 50} fontSize={10} fill="#6b7280">
                  {hoveredNode.teamName}
                </text>
                <text x={tx + 10} y={ty + 66} fontSize={10} fontWeight={600} fill="#1d4ed8">
                  Team key: {hoveredNode.teamKey}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>

      <p className="mt-2 text-right text-xs text-gray-400">
        {nodes.filter((n) => n.role === 'manager').length} managers · {nodes.filter((n) => n.role === 'employee').length} employees · {visibleTeams.length} teams
      </p>
    </div>
  )
}
