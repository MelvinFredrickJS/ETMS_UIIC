import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'
import { createTicket, listTickets, getTicketById } from '../controllers/dataPortalController'

const router = Router()

router.use(protect, requireRole(ROLES.DATA_TEAM))

router.post('/tickets', createTicket)
router.get('/tickets', listTickets)
router.get('/tickets/:id', getTicketById)

export = router