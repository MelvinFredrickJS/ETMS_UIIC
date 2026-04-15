import type { Role } from '../types'

export const ROLES: Record<string, Role> = {
  EMPLOYEE: 'employee',
  MANAGER:  'manager',
  ADMIN:    'admin',
} as const
