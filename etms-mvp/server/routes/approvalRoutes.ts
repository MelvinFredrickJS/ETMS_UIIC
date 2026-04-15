import { Router } from 'express'
import { getPendingApprovals, approveTicket, rejectTicket, reapproveTicket } from '../controllers/approvalController'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'

const router = Router()

router.get('/pending',              protect, requireRole(ROLES.MANAGER), getPendingApprovals)
router.post('/:ticketId/approve',   protect, requireRole(ROLES.MANAGER), approveTicket)
router.post('/:ticketId/reject',    protect, requireRole(ROLES.MANAGER), rejectTicket)
router.post('/:ticketId/reapprove', protect, requireRole(ROLES.MANAGER), reapproveTicket)

export = router
