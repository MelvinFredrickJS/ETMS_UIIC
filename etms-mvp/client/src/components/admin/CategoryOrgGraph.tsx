import { useState, useMemo } from 'react'
import type { User, TicketTypeGroup } from '../../types'

interface Props {
  users: User[]
  typeGroups: TicketTypeGroup[]
}

type TypeFilter = 'all' | 'complaint' | 'request' | 'data'

const TYPE_META = {
  complaint: { label: 'Complaint', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  request:   { label: 'Request',   color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  data:      { label: 'Data',      color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
} as const

// SVG layout constants
const COL_W      = 200   // horizontal space per category column
const MGR_Y      = 80    // manager node Y
const EMP_Y_START= 200   // first employee Y
const EMP_GAP    = 80    // vertical gap between employees
const NODE_R     = 28    // node radius
const PADDING_X  = 60    // left/right canvas padding

interface NodeData {
  id: number
  x: number
  y: number
  label: string      // short display (emp_id)
  fullName: string
  empId: string
  role: 'manager' | 'employee'
  categoryId: number
  categoryName: string
  typeKey: string
  requiresApproval: boolean
  isActive: boolean
}

interface EdgeData {
  x1: number; y1: number
  x2: number; y2: number
  categoryId: number
}

export default function CategoryOrgGraph({ users, typeGroups }: Props) {
  const [filter,      setFilter]      = useState<TypeFilter>('all')
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)

  // Flatten all categories with their type info
  const allCategories = useMemo(() =>
    typeGroups.flatMap(tg =>
      tg.categories.map(c => ({
        ...c,
        typeKey: tg.type_key,
        typeName: tg.type_name,
      }))
    ), [typeGroups])

  // Apply type filter
  const visibleCategories = useMemo(() =>
    filter === 'all' ? allCategories : allCategories.filter(c => c.typeKey === filter),
    [allCategories, filter])

  // Build nodes + edges
  const { nodes, edges, svgWidth, svgHeight } = useMemo(() => {
    const nodes: NodeData[] = []
    const edges: EdgeData[] = []

    let colIndex = 0

    for (const cat of visibleCategories) {
      const cx = PADDING_X + colIndex * COL_W + COL_W / 2

      // Find manager for this category
      const manager = users.find(
        u => u.role === 'manager' && u.category_id === cat.id
      )

      // Find employees for this category
      const employees = users.filter(
        u => u.role === 'employee' && u.category_id === cat.id
      )

      const mgrX = cx
      const mgrY = MGR_Y

      if (manager) {
        nodes.push({
          id: manager.id,
          x: mgrX, y: mgrY,
          label: manager.emp_id,
          fullName: manager.name,
          empId: manager.emp_id,
          role: 'manager',
          categoryId: cat.id,
          categoryName: cat.name,
          typeKey: cat.typeKey,
          requiresApproval: cat.requires_approval,
          isActive: manager.is_active,
        })
      }

      employees.forEach((emp, i) => {
        const ex = cx
        const ey = EMP_Y_START + i * EMP_GAP

        nodes.push({
          id: emp.id,
          x: ex, y: ey,
          label: emp.emp_id,
          fullName: emp.name,
          empId: emp.emp_id,
          role: 'employee',
          categoryId: cat.id,
          categoryName: cat.name,
          typeKey: cat.typeKey,
          requiresApproval: cat.requires_approval,
          isActive: emp.is_active,
        })

        if (manager) {
          edges.push({ x1: mgrX, y1: mgrY + NODE_R, x2: ex, y2: ey - NODE_R, categoryId: cat.id })
        }
      })

      colIndex++
    }

    const maxEmployees = Math.max(
      0,
      ...visibleCategories.map(cat =>
        users.filter(u => u.role === 'employee' && u.category_id === cat.id).length
      )
    )

    const svgWidth  = Math.max(600, PADDING_X * 2 + visibleCategories.length * COL_W)
    const svgHeight = EMP_Y_START + maxEmployees * EMP_GAP + 60

    return { nodes, edges, svgWidth, svgHeight }
  }, [visibleCategories, users])

  // Category column headers (type pill + name + approval badge)
  const colHeaders = useMemo(() =>
    visibleCategories.map((cat, i) => ({
      ...cat,
      cx: PADDING_X + i * COL_W + COL_W / 2,
    })), [visibleCategories])

  function nodeOpacity(node: NodeData) {
    if (activeCategory === null) return 1
    return node.categoryId === activeCategory ? 1 : 0.2
  }

  function edgeOpacity(edge: EdgeData) {
    if (activeCategory === null) return 1
    return edge.categoryId === activeCategory ? 1 : 0.1
  }

  const filterBtns: { key: TypeFilter; label: string; color: string }[] = [
    { key: 'all',       label: 'All',        color: '#6b7280' },
    { key: 'complaint', label: '🔴 Complaints', color: '#f97316' },
    { key: 'request',   label: '🔵 Requests',   color: '#3b82f6' },
    { key: 'data',      label: '🟡 Data',        color: '#d97706' },
  ]

  if (visibleCategories.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No categories found for this filter.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-800">Category Org Graph</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Managers → Employees by category. Click a column to highlight it.
          </p>
        </div>
        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {filterBtns.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              style={filter === btn.key ? { borderColor: btn.color, color: btn.color, background: btn.color + '18' } : {}}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                ${filter === btn.key ? 'border-current' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 mb-4 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-violet-500 inline-block" /> Manager
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" /> Employee
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Inactive
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-4 h-0.5 bg-teal-400 inline-block" /> Assignment edge
        </span>
      </div>

      {/* SVG canvas — scrollable horizontally */}
      <div className="overflow-x-auto rounded-lg bg-gray-50 border border-gray-100">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block"
          onClick={() => setActiveCategory(null)}
        >
          {/* Column header area */}
          {colHeaders.map(cat => {
            const meta = TYPE_META[cat.typeKey as keyof typeof TYPE_META]
            const isActive = activeCategory === cat.id
            return (
              <g
                key={cat.id}
                onClick={e => { e.stopPropagation(); setActiveCategory(isActive ? null : cat.id) }}
                style={{ cursor: 'pointer' }}
              >
                {/* Column background highlight */}
                {isActive && (
                  <rect
                    x={cat.cx - COL_W / 2 + 4}
                    y={8}
                    width={COL_W - 8}
                    height={svgHeight - 16}
                    rx={10}
                    fill={meta?.color ?? '#6b7280'}
                    fillOpacity={0.06}
                    stroke={meta?.color ?? '#6b7280'}
                    strokeOpacity={0.2}
                    strokeWidth={1}
                  />
                )}

                {/* Type pill */}
                <rect
                  x={cat.cx - 38} y={10}
                  width={76} height={20}
                  rx={10}
                  fill={meta?.bg ?? '#f3f4f6'}
                  stroke={meta?.border ?? '#e5e7eb'}
                  strokeWidth={1}
                />
                <text
                  x={cat.cx} y={24}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={meta?.color ?? '#374151'}
                >
                  {meta?.label ?? cat.typeKey}
                </text>

                {/* Category name */}
                <text
                  x={cat.cx} y={46}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#374151"
                  fontWeight={500}
                >
                  {cat.name.length > 18 ? cat.name.slice(0, 17) + '…' : cat.name}
                </text>

                {/* Approval badge */}
                <rect
                  x={cat.cx - 30} y={52}
                  width={60} height={16}
                  rx={8}
                  fill={cat.requires_approval ? '#ede9fe' : '#d1fae5'}
                />
                <text
                  x={cat.cx} y={63}
                  textAnchor="middle"
                  fontSize={9}
                  fill={cat.requires_approval ? '#7c3aed' : '#065f46'}
                  fontWeight={600}
                >
                  {cat.requires_approval ? 'Approval' : 'Auto'}
                </text>
              </g>
            )
          })}

          {/* Edges */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1}
              x2={e.x2} y2={e.y2}
              stroke="#14b8a6"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={edgeOpacity(e)}
              style={{ transition: 'opacity 0.2s' }}
            />
          ))}

          {/* Nodes */}
          {nodes.map(node => {
            const isManager  = node.role === 'manager'
            const fillColor  = !node.isActive ? '#d1d5db' : isManager ? '#8b5cf6' : '#14b8a6'
            const strokeColor= !node.isActive ? '#9ca3af' : isManager ? '#6d28d9' : '#0d9488'
            const isHovered  = hoveredNode?.id === node.id

            return (
              <g
                key={node.id}
                onClick={e => { e.stopPropagation(); setActiveCategory(node.categoryId) }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer', opacity: nodeOpacity(node), transition: 'opacity 0.2s' }}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle
                    cx={node.x} cy={node.y}
                    r={NODE_R + 6}
                    fill={fillColor}
                    fillOpacity={0.2}
                    stroke={fillColor}
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={node.x} cy={node.y}
                  r={NODE_R}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />

                {/* Emp ID label inside */}
                <text
                  x={node.x} y={node.y - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={700}
                  fill="white"
                >
                  {node.empId.length > 8 ? node.empId.slice(0, 8) : node.empId}
                </text>

                {/* Role icon */}
                <text
                  x={node.x} y={node.y + 9}
                  textAnchor="middle"
                  fontSize={11}
                >
                  {isManager ? '👔' : '👤'}
                </text>

                {/* Inactive X badge */}
                {!node.isActive && (
                  <text x={node.x + 18} y={node.y - 18} fontSize={12} fill="#ef4444">✕</text>
                )}
              </g>
            )
          })}

          {/* Tooltip */}
          {hoveredNode && (() => {
            const tx = Math.min(hoveredNode.x + NODE_R + 8, svgWidth - 160)
            const ty = Math.max(hoveredNode.y - 50, 8)
            const meta = TYPE_META[hoveredNode.typeKey as keyof typeof TYPE_META]
            return (
              <g>
                <rect
                  x={tx} y={ty}
                  width={155} height={80}
                  rx={8}
                  fill="white"
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  filter="drop-shadow(0 2px 6px rgba(0,0,0,0.12))"
                />
                <text x={tx + 10} y={ty + 18} fontSize={11} fontWeight={700} fill="#111827">
                  {hoveredNode.fullName}
                </text>
                <text x={tx + 10} y={ty + 33} fontSize={10} fill="#6b7280">
                  {hoveredNode.empId}
                </text>
                <text x={tx + 10} y={ty + 48} fontSize={10} fill="#6b7280">
                  {hoveredNode.categoryName}
                </text>
                <text x={tx + 10} y={ty + 63} fontSize={10} fill={meta?.color ?? '#6b7280'} fontWeight={600}>
                  {meta?.label ?? hoveredNode.typeKey} · {hoveredNode.requiresApproval ? 'Needs approval' : 'Auto-approve'}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>

      <p className="text-xs text-gray-400 mt-2 text-right">
        {nodes.filter(n => n.role === 'manager').length} managers · {nodes.filter(n => n.role === 'employee').length} employees · {visibleCategories.length} categories
      </p>
    </div>
  )
}
