import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import * as userModel from '../models/userModel'
import * as assetModel from '../models/assetModel'
import ROLES from '../constants/ROLES'
import type { Role } from '../types'

async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await userModel.findAll()

    const usersWithCounts = await Promise.all(
      users.map(async u => {
        const refs = await userModel.getReferenceCounts(u.id)
        return {
          ...u,
          ticket_references_count: Number(refs.ticket_references_count),
          references_count:        Number(refs.references_count),
        }
      })
    )

    res.status(200).json({ success: true, users: usersWithCounts })
  } catch (err) {
    console.error('listUsers error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { emp_id, name, email, password, role, category_id, department } = req.body as {
      emp_id?: string; name?: string; email?: string; password?: string
      role?: string; category_id?: string; department?: string
    }

    if (!emp_id || !name || !email || !password || !role) {
      res.status(400).json({ success: false, message: 'emp_id, name, email, password, and role are required.' }); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' }); return
    }
    if (!Object.values(ROLES).includes(role as Role)) {
      res.status(400).json({ success: false, message: 'Invalid role.' }); return
    }
    if ((role === ROLES.EMPLOYEE || role === ROLES.MANAGER) && !category_id) {
      res.status(400).json({ success: false, message: 'category_id is required for employee and manager roles.' }); return
    }
    if (password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' }); return
    }

    const existingEmp = await userModel.findByEmpId(emp_id)
    if (existingEmp) { res.status(409).json({ success: false, message: 'Employee ID already in use.' }); return }

    const existingEmail = await userModel.findByEmail(email)
    if (existingEmail) { res.status(409).json({ success: false, message: 'Email already in use.' }); return }

    const password_hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
      emp_id, name, email, password_hash, role: role as Role,
      category_id: category_id ? Number(category_id) : null,
      department:  department ?? null,
    })

    // Auto-assign an unassigned asset via round-robin (employees only)
    let autoAssignedAsset: { id: number; name: string; serial_number: string } | null = null
    if (role === ROLES.EMPLOYEE && category_id) {
      const unassigned = await assetModel.findUnassignedRoundRobin(Number(category_id))
      if (unassigned) {
        try {
          await assetModel.transferOwnership({
            asset_id:       unassigned.id,
            from_user_id:   unassigned.assigned_to,
            to_user_id:     user.id,
            transferred_by: req.user.id,
            note:           'Auto-assigned on user creation (round-robin)',
          })
          autoAssignedAsset = {
            id:            unassigned.id,
            name:          unassigned.name,
            serial_number: unassigned.serial_number,
          }
        } catch (assetErr) {
          console.warn('Auto-assign asset failed (non-fatal):', (assetErr as Error).message)
        }
      }
    }

    res.status(201).json({
      success: true,
      user,
      auto_assigned_asset: autoAssignedAsset,
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException & { constraint?: string }).code === '23505') {
      const msg = String((err as { constraint?: string }).constraint ?? '').includes('email')
        ? 'Email already in use.'
        : 'Employee ID already in use.'
      res.status(409).json({ success: false, message: msg }); return
    }
    console.error('createUser error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = Number(req.params.id)
    if (!userId) { res.status(400).json({ success: false, message: 'Invalid user ID.' }); return }

    const target = await userModel.findById(userId)
    if (!target) { res.status(404).json({ success: false, message: 'User not found.' }); return }

    if (userId === req.user.id) {
      res.status(400).json({ success: false, message: 'You cannot delete your own account.' }); return
    }

    const refs = await userModel.getReferenceCounts(userId)
    if (Number(refs.references_count) > 0) {
      res.status(409).json({
        success: false,
        message: 'User has ownership references. Transfer ownership before deletion.',
        code:    'USER_HAS_REFERENCES',
        details: refs,
      }); return
    }

    const deleted = await userModel.deleteById(userId)
    res.status(200).json({ success: true, message: 'User deleted permanently.', user: deleted })
  } catch (err) {
    console.error('deleteUser error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function transferOwnership(req: Request, res: Response): Promise<void> {
  try {
    const { from_user_id, to_user_id } = req.body as { from_user_id?: unknown; to_user_id?: unknown }

    if (!from_user_id || !to_user_id || isNaN(Number(from_user_id)) || isNaN(Number(to_user_id))) {
      res.status(400).json({ success: false, message: 'from_user_id and to_user_id are required integers.' }); return
    }
    if (Number(from_user_id) === Number(to_user_id)) {
      res.status(400).json({ success: false, message: 'from and to users must be different.' }); return
    }

    const fromUser = await userModel.findById(Number(from_user_id))
    const toUser   = await userModel.findById(Number(to_user_id))

    if (!fromUser) { res.status(404).json({ success: false, message: 'Source user not found.' }); return }
    if (!toUser)   { res.status(404).json({ success: false, message: 'Target user not found.' }); return }

    const reassigned = await userModel.transferOwnershipReferences(Number(from_user_id), Number(to_user_id))

    res.status(200).json({ success: true, reassigned })
  } catch (err) {
    console.error('transferOwnership error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body as {
      currentPassword?: string; newPassword?: string; confirmPassword?: string
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ success: false, message: 'All password fields are required.' }); return
    }
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' }); return
    }
    if (!/[A-Z]/.test(newPassword)) {
      res.status(400).json({ success: false, message: 'New password must include at least one uppercase letter.' }); return
    }
    if (!/[a-z]/.test(newPassword)) {
      res.status(400).json({ success: false, message: 'New password must include at least one lowercase letter.' }); return
    }
    if (!/[0-9]/.test(newPassword)) {
      res.status(400).json({ success: false, message: 'New password must include at least one number.' }); return
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      res.status(400).json({ success: false, message: 'New password must include at least one special character.' }); return
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ success: false, message: 'New password and confirm password do not match.' }); return
    }
    if (newPassword === currentPassword) {
      res.status(400).json({ success: false, message: 'New password must differ from current password.' }); return
    }

    const user = await userModel.findByIdWithPassword(req.user.id)
    if (!user)          { res.status(404).json({ success: false, message: 'User not found.' }); return }
    if (!user.is_active) { res.status(401).json({ success: false, message: 'Account is deactivated.' }); return }

    const match = await bcrypt.compare(currentPassword, user.password_hash!)
    if (!match) { res.status(401).json({ success: false, message: 'Current password is incorrect.' }); return }

    const hashed      = await bcrypt.hash(newPassword, 10)
    const updatedUser = await userModel.updatePassword(req.user.id, hashed)

    res.status(200).json({ success: true, message: 'Password changed successfully.', user: updatedUser })
  } catch (err) {
    console.error('changePassword error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

export { listUsers, createUser, deleteUser, transferOwnership, changePassword }
