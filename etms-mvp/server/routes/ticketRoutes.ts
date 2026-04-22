import { Router } from 'express'
import {
	createTicket,
	listTickets,
	getTicketById,
	getAllowedStatuses,
	updateTicketStatus,
	downloadTicketFile,
	uploadDataResponseFile,
	downloadTicketResponseFile,
} from '../controllers/ticketController'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import { upload } from '../middleware/uploadMiddleware'
import ROLES from '../constants/ROLES'

const router = Router()

router.post('/',                    protect, requireRole(ROLES.EMPLOYEE), upload.single('file'), createTicket)
router.get('/',                     protect, listTickets)
router.get('/:id',                  protect, getTicketById)
router.get('/:id/allowed-statuses', protect, getAllowedStatuses)
router.put('/:id/status',           protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER), updateTicketStatus)
router.get('/:id/file',             protect, downloadTicketFile)
router.post('/:id/response-file',   protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER), upload.single('file'), uploadDataResponseFile)
router.get('/:id/response-file',    protect, downloadTicketResponseFile)

export = router
