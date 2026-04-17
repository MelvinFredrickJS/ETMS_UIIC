import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ROLES } from './constants/ROLES'
import AppLayout from './components/layout/AppLayout'
import type { Role } from './types'

import LoginPage            from './pages/LoginPage'
import ChangePasswordPage   from './pages/ChangePasswordPage'
import DashboardPage        from './pages/DashboardPage'
import TicketsPage          from './pages/TicketsPage'
import NewTicketPage        from './pages/NewTicketPage'
import TicketDetailPage     from './pages/TicketDetailPage'
import PendingApprovalsPage from './pages/PendingApprovalsPage'
import ReportsPage          from './pages/ReportsPage'
import AdminPage            from './pages/AdminPage'
import AdminTeamsPage       from './pages/AdminTeamsPage'
import AssetsPage           from './pages/AssetsPage'
import DataPortalPage       from './pages/DataPortalPage'

// ── Protected Route ───────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: ReactNode
  roleRequired?: Role | Role[]
}

function ProtectedRoute({ children, roleRequired }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Forced password change — redirect everywhere except /change-password
  const requiresPasswordChange = sessionStorage.getItem('requiresPasswordChange') === 'true'
  if (requiresPasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  // Role guard
  if (roleRequired) {
    const allowedRoles = Array.isArray(roleRequired) ? roleRequired : [roleRequired]
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  if (user?.role === ROLES.DATA_TEAM && location.pathname !== '/data-portal') {
    return <Navigate to="/data-portal" replace />
  }

  return <AppLayout>{children}</AppLayout>
}

function DataPortalRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const requiresPasswordChange = sessionStorage.getItem('requiresPasswordChange') === 'true'
  if (requiresPasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (user?.role !== ROLES.DATA_TEAM) {
    return <Navigate to="/dashboard" replace />
  }

  return <DataPortalPage />
}

// ── App Routes ────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated only — password change gate */}
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/tickets" element={
        <ProtectedRoute><TicketsPage /></ProtectedRoute>
      } />
      <Route path="/tickets/new" element={
        <ProtectedRoute roleRequired={ROLES.EMPLOYEE}>
          <NewTicketPage />
        </ProtectedRoute>
      } />
      <Route path="/tickets/:id" element={
        <ProtectedRoute><TicketDetailPage /></ProtectedRoute>
      } />
      <Route path="/approvals" element={
        <ProtectedRoute roleRequired={ROLES.MANAGER}>
          <PendingApprovalsPage />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute roleRequired={ROLES.MANAGER}>
          <ReportsPage />
        </ProtectedRoute>
      } />
      <Route path="/assets" element={
        <ProtectedRoute roleRequired={[ROLES.EMPLOYEE, ROLES.MANAGER]}>
          <AssetsPage />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute roleRequired={ROLES.ADMIN}>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/teams" element={
        <ProtectedRoute roleRequired={ROLES.ADMIN}>
          <AdminTeamsPage />
        </ProtectedRoute>
      } />

      <Route path="/data-portal" element={
        <DataPortalRoute />
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
