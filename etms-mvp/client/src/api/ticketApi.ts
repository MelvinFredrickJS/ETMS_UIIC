import api from './axiosInstance'
import type { Ticket, TicketLog, Attachment, Category, TicketTypeGroup, Asset, User, TicketStatus } from '../types'

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategories = () =>
  api.get<{ success: boolean; types: TicketTypeGroup[] }>('/categories')

// ── Tickets ───────────────────────────────────────────────────────────────────

export interface TicketListParams {
  page?: number
  limit?: number
  status?: string
  type?: string
  priority?: string
  ticket_id?: string
}

export interface TicketListResponse {
  success: boolean
  tickets: Ticket[]
  total: number
  page: number
  totalPages: number
}

export const getTickets = (params?: TicketListParams) =>
  api.get<TicketListResponse>('/tickets', { params })

export const getTicketById = (id: string | number) =>
  api.get<{ success: boolean; ticket: Ticket; attachments: Attachment[]; logs: TicketLog[] }>(
    `/tickets/${id}`
  )

export const getAllowedStatuses = (id: string | number) =>
  api.get<{ success: boolean; allowedStatuses: TicketStatus[] }>(
    `/tickets/${id}/allowed-statuses`
  )

export const createTicket = (data: FormData) =>
  api.post<{ success: boolean; ticket: Ticket }>(
    '/tickets',
    data,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

export const createDataPortalTicket = (data: FormData) =>
  api.post<{ success: boolean; ticket: Ticket }>(
    '/data-portal/tickets',
    data,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

export const getDataPortalTickets = (params?: TicketListParams) =>
  api.get<TicketListResponse>('/data-portal/tickets', { params })

export const getDataPortalTicketById = (id: string | number) =>
  api.get<{ success: boolean; ticket: Ticket; attachments: Attachment[]; logs: TicketLog[] }>(
    `/data-portal/tickets/${id}`
  )

export const getDataPortalTeams = () =>
  api.get<{ success: boolean; teams: Array<{ id: number; name: string; category_key: string }> }>(
    '/data-portal/teams'
  )

export const updateStatus = (id: string | number, status: TicketStatus, note?: string) =>
  api.put<{ success: boolean; ticket: Ticket }>(
    `/tickets/${id}/status`,
    { status, note }
  )

// ── Users (admin) ─────────────────────────────────────────────────────────────

export const getAllUsers = () =>
  api.get<{ success: boolean; users: User[] }>('/users')

export const createUser = (data: Partial<User> & { password?: string }) =>
  api.post<{
    success: boolean
    user: User
    auto_assigned_asset: { id: number; name: string; serial_number: string } | null
  }>('/users', data)

export const deleteUser = (id: number) =>
  api.delete<{ success: boolean; message: string }>(`/users/${id}`)

export const toggleUserActive = (id: number) =>
  api.patch<{ success: boolean; message: string; user: { id: number; emp_id: string; name: string; is_active: boolean } }>(
    `/users/${id}/toggle-active`
  )

export const updateUserName = (id: number, name: string) =>
  api.patch<{ success: boolean; user: { id: number; emp_id: string; name: string; role: string } }>(
    `/users/${id}/name`,
    { name }
  )

export const transferOwnership = (from_user_id: number, to_user_id: number) =>
  api.post<{ success: boolean }>('/users/transfer-ownership', { from_user_id, to_user_id })

// ── Employees by category (manager / admin) ───────────────────────────────────

export const getEmployeesByCategory = (categoryId: number) =>
  api.get<{ success: boolean; employees: Pick<User, 'id' | 'name' | 'emp_id' | 'email'>[] }>(
    `/categories/${categoryId}/employees`
  )

export interface TeamSummary {
  id: number
  name: string
  category_key: string
  manager_user_id: number | null
  manager_name: string | null
}

export const getTeams = () =>
  api.get<{ success: boolean; teams: TeamSummary[] }>('/categories/teams')

export const createTeam = (data: { name: string; category_key?: string; manager_user_id: number }) =>
  api.post<{ success: boolean; team: TeamSummary }>('/categories/teams', data)

export const deleteTeam = (teamId: number) =>
  api.delete<{ success: boolean; message: string }>(`/categories/teams/${teamId}`)

// ── Assets ────────────────────────────────────────────────────────────────────

export interface AssignmentHistory {
  id: number
  asset_id: number
  from_user_id: number | null
  to_user_id: number
  transferred_by: number | null
  assigned_at: string
  returned_at: string | null
  note: string | null
  from_name: string | null
  to_name: string | null
  by_name: string | null
}

export const getAllAssets = () =>
  api.get<{ success: boolean; assets: Asset[] }>('/assets')

export const getMyAssets = () =>
  api.get<{ success: boolean; assets: Asset[] }>('/assets/my')

export interface EmployeeLookupResult {
  user: {
    id: number; emp_id: string; name: string; email: string
    role: string; team: string | null; is_active: boolean
    category_name: string | null; created_at: string
  }
  assets: {
    id: number; name: string; serial_number: string
    category_name: string; status: string; assigned_at: string | null
  }[]
  ticket_stats: { open: number; total: number }
}

export const lookupEmployee = (q: string) =>
  api.get<{ success: boolean } & EmployeeLookupResult>(`/lookup/employee`, { params: { q } })

export const getAssetHistory = (assetId: number) =>
  api.get<{ success: boolean; history: AssignmentHistory[] }>(`/assets/${assetId}/history`)

export const createAsset = (data: {
  name: string; serial_number: string
  category_id: number; assigned_to: number; status?: string
}) =>
  api.post<{ success: boolean; asset: Asset }>('/assets', data)

export const updateAssetStatus = (assetId: number, status: string) =>
  api.patch<{ success: boolean; asset: Asset }>(`/assets/${assetId}/status`, { status })

export const transferAsset = (assetId: number, payload: { to_user_id: number; note?: string }) =>
  api.post<{ success: boolean; asset: Asset }>(`/assets/${assetId}/transfer`, payload)

// ── Reports ──────────────────────────────────────────────────────────────────

export interface TopFailingDevice {
  id: number
  name: string
  serial_number: string
  total_issues: string
}

export const getTopFailingDevices = (limit = 10) =>
  api.get<{ success: boolean; devices: TopFailingDevice[] }>('/reports/top-failing-devices', {
    params: { limit },
  })

// ── Approvals — manager only ──────────────────────────────────────────────────

export const getPendingApprovals = () =>
  api.get<{ success: boolean; tickets: Ticket[]; total: number }>('/approvals/pending')

export const approveTicket = (ticketId: string | number) =>
  api.post<{ success: boolean; ticket: Ticket }>(`/approvals/${ticketId}/approve`)

export const rejectTicket = (ticketId: string | number, rejection_reason: string) =>
  api.post<{ success: boolean; ticket: Ticket }>(
    `/approvals/${ticketId}/reject`,
    { rejection_reason }
  )

export const reapproveTicket = (ticketId: string | number, assigned_to: string | number) =>
  api.post<{ success: boolean; ticket: Ticket }>(
    `/approvals/${ticketId}/reapprove`,
    { assigned_to }
  )

// NOTE: assignTicket (admin direct assign) is REMOVED — assignment is only
// done automatically on approval or manually by manager on re-approval.
