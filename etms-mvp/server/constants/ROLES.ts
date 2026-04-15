import type { Role } from '../types'

// Single source of truth for role strings on the backend.
// Import this everywhere a role string is needed — never write 'admin' raw.

const ROLES: Record<string, Role> = {
  EMPLOYEE: 'employee',
  MANAGER:  'manager',
  ADMIN:    'admin',
} as const

export = ROLES
