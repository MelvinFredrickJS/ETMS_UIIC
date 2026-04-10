import api from './axiosInstance'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const getMe = () => api.get('/auth/me')

export const changePassword = (currentPassword, newPassword, confirmPassword) =>
  api.patch('/users/change-password', { currentPassword, newPassword, confirmPassword })
