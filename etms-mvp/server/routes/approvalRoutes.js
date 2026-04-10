const express      = require('express')
const { getPendingApprovals, approveTicket, rejectTicket, reapproveTicket } = require('../controllers/approvalController')
const { protect }     = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')
const ROLES           = require('../constants/ROLES')

const router = express.Router()

router.get('/pending',                  protect, requireRole(ROLES.MANAGER), getPendingApprovals)
router.post('/:ticketId/approve',       protect, requireRole(ROLES.MANAGER), approveTicket)
router.post('/:ticketId/reject',        protect, requireRole(ROLES.MANAGER), rejectTicket)
router.post('/:ticketId/reapprove',     protect, requireRole(ROLES.MANAGER), reapproveTicket)

module.exports = router
