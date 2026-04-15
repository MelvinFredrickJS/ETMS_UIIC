import api from './axiosInstance'
import type { User } from '../types'

export interface LoginResponse {
  success: boolean
  token: string
  user: User
}

export const login = (email: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { email, password })

export const getMe = () =>
  api.get<{ success: boolean; user: User }>('/auth/me')

export const changePassword = (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) =>
  api.patch<{ success: boolean; message: string; user: User }>(
    '/users/change-password',
    { currentPassword, newPassword, confirmPassword }
  )
