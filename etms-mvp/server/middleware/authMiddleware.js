const pool               = require('../config/db')
const { verifyToken }    = require('../utils/jwtUtils')

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token. Please log in.' })
    }

    const token = authHeader.split(' ')[1]

    let payload
    try {
      payload = verifyToken(token)
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' })
    }

    const { rows } = await pool.query(
      'SELECT id, emp_id, name, email, role, is_active FROM users WHERE id = $1',
      [payload.id]
    )

    const user = rows[0]
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' })
    }

    req.user = user
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

module.exports = { protect }
