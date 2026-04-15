import { Router } from 'express'
import { lookupEmployee } from '../controllers/lookupController'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'

const router = Router()

// GET /api/lookup/employee?q=EMP001  or  ?q=SN-SERIAL-123
router.get('/employee', protect, requireRole(ROLES.ADMIN), lookupEmployee)

export = router
