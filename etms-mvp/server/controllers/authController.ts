import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import * as userModel from '../models/userModel'
import * as categoryModel from '../models/categoryModel'
import { generateToken } from '../utils/jwtUtils'

async function resolveCanManageAssets(userId: number, role: string): Promise<boolean> {
  if (role !== 'manager') return false
  const managedCategories = await categoryModel.findByManagerId(userId)
  return managedCategories.some(category => category.category_key === 'infra_team')
}

async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' }); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' }); return
    }
    if (String(password).length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' }); return
    }

    const user = await userModel.findByEmail(email)
    if (!user) { res.status(401).json({ success: false, message: 'Invalid credentials.' }); return }
    if (!user.is_active) { res.status(401).json({ success: false, message: 'Account is deactivated.' }); return }

    const match = await bcrypt.compare(password, user.password_hash!)
    if (!match) { res.status(401).json({ success: false, message: 'Invalid credentials.' }); return }

    const token = generateToken(user)
    const can_manage_assets = await resolveCanManageAssets(user.id, user.role)

    res.status(200).json({
      success: true,
      token,
      user: {
        id:         user.id,
        emp_id:     user.emp_id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        team: user.team,
        can_manage_assets,
        password_changed_at: user.password_changed_at,
      },
    })
  } catch (err) {
    console.error('login error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await userModel.findByIdWithPassword(req.user.id)
    if (!user) { res.status(401).json({ success: false, message: 'User not found.' }); return }
    const can_manage_assets = await resolveCanManageAssets(user.id, user.role)
    res.status(200).json({
      success: true,
      user: {
        id:                  user.id,
        emp_id:              user.emp_id,
        name:                user.name,
        email:               user.email,
        role:                user.role,
        team:                user.team,
        category_id:         user.category_id,
        is_active:           user.is_active,
        can_manage_assets,
        password_changed_at: user.password_changed_at,
      },
    })
  } catch (err) {
    console.error('me error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

export { login, me }
