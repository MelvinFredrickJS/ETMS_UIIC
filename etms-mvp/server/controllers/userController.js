const bcrypt     = require('bcrypt')
const userModel  = require('../models/userModel')
const ROLES      = require('../constants/ROLES')

async function listUsers(req, res) {
  try {
    const users = await userModel.findAll()

    // Attach reference counts for each user
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

    return res.status(200).json({ success: true, users: usersWithCounts })
  } catch (err) {
    console.error('listUsers error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function createUser(req, res) {
  try {
    const { emp_id, name, email, password, role, category_id, department } = req.body

    if (!emp_id || !name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'emp_id, name, email, password, and role are required.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' })
    }

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' })
    }

    if ((role === ROLES.EMPLOYEE || role === ROLES.MANAGER) && !category_id) {
      return res.status(400).json({ success: false, message: 'category_id is required for employee and manager roles.' })
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' })
    }

    const existingEmp = await userModel.findByEmpId(emp_id)
    if (existingEmp) {
      return res.status(409).json({ success: false, message: 'Employee ID already in use.' })
    }

    const existingEmail = await userModel.findByEmail(email)
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already in use.' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
      emp_id, name, email, password_hash, role,
      category_id: category_id ? Number(category_id) : null,
      department:  department || null,
    })

    return res.status(201).json({ success: true, user })
  } catch (err) {
    if (err.code === '23505') {
      const msg = String(err.constraint || '').includes('email')
        ? 'Email already in use.'
        : 'Employee ID already in use.'
      return res.status(409).json({ success: false, message: msg })
    }
    console.error('createUser error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function deleteUser(req, res) {
  try {
    const userId = Number(req.params.id)
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid user ID.' })

    const target = await userModel.findById(userId)
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' })

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' })
    }

    const refs = await userModel.getReferenceCounts(userId)
    if (Number(refs.references_count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'User has ownership references. Transfer ownership before deletion.',
        code:    'USER_HAS_REFERENCES',
        details: refs,
      })
    }

    const deleted = await userModel.deleteById(userId)
    return res.status(200).json({ success: true, message: 'User deleted permanently.', user: deleted })
  } catch (err) {
    console.error('deleteUser error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function transferOwnership(req, res) {
  try {
    const { from_user_id, to_user_id } = req.body

    if (!from_user_id || !to_user_id || isNaN(from_user_id) || isNaN(to_user_id)) {
      return res.status(400).json({ success: false, message: 'from_user_id and to_user_id are required integers.' })
    }

    if (Number(from_user_id) === Number(to_user_id)) {
      return res.status(400).json({ success: false, message: 'from and to users must be different.' })
    }

    const fromUser = await userModel.findById(Number(from_user_id))
    const toUser   = await userModel.findById(Number(to_user_id))

    if (!fromUser) return res.status(404).json({ success: false, message: 'Source user not found.' })
    if (!toUser)   return res.status(404).json({ success: false, message: 'Target user not found.' })

    const reassigned = await userModel.transferOwnershipReferences(Number(from_user_id), Number(to_user_id))

    return res.status(200).json({
      success: true,
      reassigned: {
        tickets_raised:   reassigned.tickets_raised,
        tickets_assigned: reassigned.tickets_assigned,
        logs:             reassigned.logs,
        attachments:      reassigned.attachments,
      },
    })
  } catch (err) {
    console.error('transferOwnership error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required.' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' })
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must include at least one uppercase letter.' })
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must include at least one lowercase letter.' })
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must include at least one number.' })
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must include at least one special character.' })
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' })
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ success: false, message: 'New password must differ from current password.' })
    }

    const user = await userModel.findByIdWithPassword(req.user.id)
    if (!user)          return res.status(404).json({ success: false, message: 'User not found.' })
    if (!user.is_active) return res.status(401).json({ success: false, message: 'Account is deactivated.' })

    const match = await bcrypt.compare(currentPassword, user.password_hash)
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' })
    }

    const hashed      = await bcrypt.hash(newPassword, 10)
    const updatedUser = await userModel.updatePassword(req.user.id, hashed)

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      user:    updatedUser,
    })
  } catch (err) {
    console.error('changePassword error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

module.exports = { listUsers, createUser, deleteUser, transferOwnership, changePassword }
