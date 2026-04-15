import { Router } from 'express'
import { getTopFailingDevices } from '../controllers/reportController'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'

const router = Router()

router.get('/top-failing-devices', protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), getTopFailingDevices)

export = router
