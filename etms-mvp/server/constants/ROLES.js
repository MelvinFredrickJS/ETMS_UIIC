// Single source of truth for role strings on the backend.
// Import this everywhere a role string is needed — never write 'admin' raw.

const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER:  'manager',
  ADMIN:    'admin',
}

module.exports = ROLES
