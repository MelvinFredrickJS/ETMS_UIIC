import api from './axiosInstance'

// Categories
export const getCategories = () => api.get('/categories')

// Tickets
export const getTickets        = (params)  => api.get('/tickets', { params })
export const getTicketById     = (id)      => api.get(`/tickets/${id}`)
export const getAllowedStatuses = (id)      => api.get(`/tickets/${id}/allowed-statuses`)
export const createTicket      = (data)    =>
  api.post('/tickets', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateStatus      = (id, status, note) =>
  api.put(`/tickets/${id}/status`, { status, note })

// Users (admin)
export const getAllUsers  = ()     => api.get('/users')
export const createUser  = (data) => api.post('/users', data)
export const deleteUser  = (id)   => api.delete(`/users/${id}`)
export const transferOwnership = (from_user_id, to_user_id) =>
  api.post('/users/transfer-ownership', { from_user_id, to_user_id })

// Employees by category (manager / admin)
export const getEmployeesByCategory = (categoryId) =>
  api.get(`/categories/${categoryId}/employees`)

// Assets
export const getMyAssets   = ()                      => api.get('/assets/my')
export const transferAsset = (assetId, payload)      => api.post(`/assets/${assetId}/transfer`, payload)

// Approvals — manager only
export const getPendingApprovals = ()                          => api.get('/approvals/pending')
export const approveTicket       = (ticketId)                  => api.post(`/approvals/${ticketId}/approve`)
export const rejectTicket        = (ticketId, rejection_reason) =>
  api.post(`/approvals/${ticketId}/reject`, { rejection_reason })
export const reapproveTicket     = (ticketId, assigned_to)     =>
  api.post(`/approvals/${ticketId}/reapprove`, { assigned_to })

// NOTE: assignTicket (admin direct assign) is REMOVED — assignment is only
// done automatically on approval or manually by manager on re-approval.
