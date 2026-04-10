const bcrypt        = require('bcrypt')
const userModel     = require('../models/userModel')
const { generateToken } = require('../utils/jwtUtils')

async function login(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' })
    }

    const user = await userModel.findByEmail(email)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' })
    }
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated.' })
    }

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' })
    }

    const token = generateToken(user)

    return res.status(200).json({
      success: true,
      token,
      user: {
        id:         user.id,
        emp_id:     user.emp_id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        department: user.department,
        password_changed_at: user.password_changed_at,
      },
    })
  } catch (err) {
    console.error('login error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function me(req, res) {
  try {
    // Fetch full user including password_changed_at for forced-change detection
    const user = await require('../models/userModel').findByIdWithPassword(req.user.id)
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' })
    return res.status(200).json({
      success: true,
      user: {
        id:                  user.id,
        emp_id:              user.emp_id,
        name:                user.name,
        email:               user.email,
        role:                user.role,
        department:          user.department,
        category_id:         user.category_id,
        is_active:           user.is_active,
        password_changed_at: user.password_changed_at,
      },
    })
  } catch (err) {
    console.error('me error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

module.exports = { login, me }
