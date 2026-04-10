const express      = require('express')
const { listUsers, createUser, deleteUser, transferOwnership, changePassword } = require('../controllers/userController')
const { protect }     = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')
const ROLES           = require('../constants/ROLES')

const router = express.Router()

router.get('/',                    protect, requireRole(ROLES.ADMIN), listUsers)
router.post('/',                   protect, requireRole(ROLES.ADMIN), createUser)
router.post('/transfer-ownership', protect, requireRole(ROLES.ADMIN), transferOwnership)  // must be before /:id
router.patch('/change-password',   protect, changePassword)                               // must be before /:id
router.delete('/:id',              protect, requireRole(ROLES.ADMIN), deleteUser)

module.exports = router
