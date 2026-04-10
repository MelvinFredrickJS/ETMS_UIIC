const express      = require('express')
const { getTopFailingDevices } = require('../controllers/reportController')
const { protect }     = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')
const ROLES           = require('../constants/ROLES')

const router = express.Router()

router.get('/top-failing-devices', protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), getTopFailingDevices)

module.exports = router
