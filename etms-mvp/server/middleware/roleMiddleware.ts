import type { Request, Response, NextFunction } from 'express'
import type { Role } from '../types'

function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }
    next()
  }
}

export { requireRole }
