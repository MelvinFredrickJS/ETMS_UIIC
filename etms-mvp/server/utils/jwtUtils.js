const jwt = require('jsonwebtoken')

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, emp_id: user.emp_id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET) // returns payload or throws
}

module.exports = { generateToken, verifyToken }
