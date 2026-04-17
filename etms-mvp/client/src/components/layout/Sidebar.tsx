import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/ROLES'

export default function Sidebar() {
  const { user, logout } = useAuth()

  const base     = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors'
  const active   = 'bg-[#1B3A6B] text-white'
  const inactive = 'text-gray-600 hover:bg-gray-100'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${base} ${isActive ? active : inactive}`

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="text-xl font-bold text-[#1B3A6B]">ETMS</p>
        <p className="text-xs text-gray-400 mt-0.5">United India Insurance</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
            <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Admin</p>
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
      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-[#1B3A6B] text-white capitalize">
          {user?.role}
        </span>
        <button
          onClick={logout}
          className="mt-3 w-full text-sm text-left text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
