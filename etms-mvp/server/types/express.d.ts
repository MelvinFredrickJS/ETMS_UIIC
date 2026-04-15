import type { UserRow } from './index'

declare global {
  namespace Express {
    interface Request {
      user: Pick<UserRow, 'id' | 'emp_id' | 'name' | 'email' | 'role' | 'is_active'>
    }
  }
}

export {}
