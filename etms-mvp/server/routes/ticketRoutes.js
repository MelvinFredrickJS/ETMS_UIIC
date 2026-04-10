const express      = require('express')
const { createTicket, listTickets, getTicketById, getAllowedStatuses,
        updateTicketStatus, downloadTicketFile } = require('../controllers/ticketController')
const { protect }     = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')
const { upload }      = require('../middleware/uploadMiddleware')
const ROLES           = require('../constants/ROLES')

const router = express.Router()

router.post('/',                    protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER), upload.single('file'), createTicket)
router.get('/',                     protect, listTickets)
router.get('/:id',                  protect, getTicketById)
router.get('/:id/allowed-statuses', protect, getAllowedStatuses)
router.put('/:id/status',           protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER), updateTicketStatus)
router.get('/:id/file',             protect, downloadTicketFile)

module.exports = router
