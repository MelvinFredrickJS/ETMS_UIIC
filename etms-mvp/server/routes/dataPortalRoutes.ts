import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'
import { createTicket, listTickets, getTicketById, listTeams, downloadResponseFile } from '../controllers/dataPortalController'
import { upload } from '../middleware/uploadMiddleware'

const router = Router()

router.use(protect, requireRole(ROLES.DATA_TEAM))

router.get('/teams', listTeams)
router.post('/tickets', upload.single('file'), createTicket)
router.get('/tickets', listTickets)
router.get('/tickets/:id', getTicketById)
router.get('/tickets/:id/response-file', downloadResponseFile)

export = router