import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/ROLES'

export default function Sidebar() {
  const { user, logout } = useAuth()

  const base = 'group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200'
  const active = 'bg-gradient-to-r from-[#234b87] to-[#1B3A6B] text-white shadow-sm'
  const inactive = 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${base} ${isActive ? active : inactive}`

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-xl font-bold tracking-tight text-[#1B3A6B]">ETMS</p>
        <p className="mt-0.5 text-xs text-slate-500">United India Insurance</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        <NavLink to="/dashboard" className={linkClass}>
          🏠 Dashboard
        </NavLink>

        {/* Tickets — label differs by role */}
        {user?.role === ROLES.EMPLOYEE && (
          <NavLink to="/tickets" end className={linkClass}>
            🎫 My Tickets
          </NavLink>
        )}
        {user?.role === ROLES.MANAGER && (
          <NavLink to="/tickets" end className={linkClass}>
            🗂 Managed Tickets
          </NavLink>
        )}
        {user?.role === ROLES.ADMIN && (
          <NavLink to="/tickets" end className={linkClass}>
            📋 All Tickets
          </NavLink>
        )}

        {/* Raise Ticket — employee only */}
        {user?.role === ROLES.EMPLOYEE && (
          <NavLink to="/tickets/new" className={linkClass}>
            ➕ Raise Ticket
          </NavLink>
        )}

        {/* Assets — employee and manager only */}
        {user?.role === ROLES.EMPLOYEE && (
          <NavLink to="/assets" className={linkClass}>
            🖥️ My Assets
          </NavLink>
        )}
        {user?.role === ROLES.MANAGER && (
          <NavLink to="/assets" className={linkClass}>
            🖥️ Manage Assets
          </NavLink>
        )}

        {/* Re-approvals — manager only */}
        {user?.role === ROLES.MANAGER && (
          <NavLink to="/approvals" className={linkClass}>
            ✅ Re-approvals
          </NavLink>
        )}

        {user?.role === ROLES.MANAGER && (
          <NavLink to="/reports" className={linkClass}>
            📊 Reports
          </NavLink>
        )}

        {/* Admin section — admin only */}
        {user?.role === ROLES.ADMIN && (
          <>
            <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Admin</p>
            <NavLink to="/admin" end className={linkClass}>
              ⚙️ Admin Panel
            </NavLink>
            <NavLink to="/admin/teams" className={linkClass}>
              👥 Teams
            </NavLink>
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-200 px-4 py-4">
        <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
        <span className="mt-1 inline-block rounded-full bg-[#1B3A6B] px-2 py-0.5 text-xs capitalize text-white">
          {user?.role}
        </span>
        <button
          onClick={logout}
          className="mt-3 w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
        >
          ↩ Logout
        </button>
      </div>
    </div>
  )
}
