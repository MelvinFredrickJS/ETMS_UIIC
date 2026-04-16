import type { Role } from '../types'

export const ROLES: Record<string, Role> = {
  EMPLOYEE: 'employee',
  MANAGER:  'manager',
  ADMIN:    'admin',
  DATA_TEAM:'data_team',
} as const
