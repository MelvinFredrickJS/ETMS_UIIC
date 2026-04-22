import jwt from 'jsonwebtoken'
import type { UserRow } from '../types'

interface JwtPayload {
  id: number
  role: string
  emp_id: string
}

function generateToken(user: Pick<UserRow, 'id' | 'role' | 'emp_id'>): string {
  return jwt.sign(
    { id: user.id, role: user.role, emp_id: user.emp_id },
    process.env.JWT_SECRET as string,
    { expiresIn: '8h' }
  )
}

function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
}

export { generateToken, verifyToken }
