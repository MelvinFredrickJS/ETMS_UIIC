import type { Request, Response, NextFunction } from 'express'
import pool from '../config/db'
import { verifyToken } from '../utils/jwtUtils'

async function protect(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token. Please log in.' })
      return
    }

    const token = authHeader.split(' ')[1]

    let payload: ReturnType<typeof verifyToken>
    try {
      payload = verifyToken(token)
    } catch {
      res.status(401).json({ success: false, message: 'Invalid or expired token.' })
      return
    }

    const { rows } = await pool.query<{
      id: number; emp_id: string; name: string; email: string; role: string; is_active: boolean
    }>(
      'SELECT id, emp_id, name, email, role, is_active FROM users WHERE id = $1',
      [payload.id]
    )

    const user = rows[0]
    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Account not found or deactivated.' })
      return
    }

    req.user = user as Request['user']
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

export { protect }
