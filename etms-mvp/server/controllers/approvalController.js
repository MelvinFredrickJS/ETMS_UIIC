const ticketModel    = require('../models/ticketModel')
const userModel      = require('../models/userModel')
const categoryModel  = require('../models/categoryModel')
const emailService   = require('../services/emailService')
const ROLES          = require('../constants/ROLES')
const { getNextEmployeeInCategory } = require('../services/assignmentService')

async function getPendingApprovals(req, res) {
  try {
    const tickets = await ticketModel.findPendingForManager(req.user.id)
    return res.status(200).json({ success: true, tickets, total: tickets.length })
  } catch (err) {
    console.error('getPendingApprovals error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function approveTicket(req, res) {
  try {
    const ticketId = Number(req.params.ticketId)

    const ticket = await ticketModel.findById(ticketId)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' })

    if (ticket.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Can only approve pending tickets.' })
    }
    if (Number(ticket.approval_owner_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this approval.' })
    }

    // Resolve an assignee first so we never approve a ticket that cannot be assigned.
    let employee
    try {
      employee = await getNextEmployeeInCategory(ticket.category_id)
    } catch {
      return res.status(400).json({
        success: false,
        message: 'No active employees are available in this category. Approval is not allowed.',
      })
    }

    // Approve only after a valid employee has been found.
    await ticketModel.updateStatus(ticketId, 'approved')
    await ticketModel.logAction({
      ticket_id: ticketId, action: 'APPROVED',
      old_status: 'pending_approval', new_status: 'approved',
      performed_by: req.user.id,
    })

    await ticketModel.assign(ticketId, employee.id)
    await ticketModel.logAction({
      ticket_id: ticketId, action: 'AUTO_ASSIGNED',
      old_status: 'approved', new_status: 'assigned',
      performed_by: null, note: `Auto-assigned to ${employee.name}`,
    })

    const fullTicket = await ticketModel.findById(ticketId)
    const raiser     = await userModel.findById(ticket.raised_by)

    emailService.sendTicketApprovedEmail(fullTicket, raiser.email)
      .catch(err => console.error('Email error:', err.message))
    emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email)
      .catch(err => console.error('Email error:', err.message))
    emailService.sendApprovalConfirmationToManager(fullTicket, req.user.email)
      .catch(err => console.error('Email error:', err.message))

    return res.status(200).json({ success: true, ticket: fullTicket })
  } catch (err) {
    console.error('approveTicket error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function rejectTicket(req, res) {
  try {
    const ticketId = Number(req.params.ticketId)

    const ticket = await ticketModel.findById(ticketId)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' })

    if (ticket.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Can only reject pending tickets.' })
    }
    if (Number(ticket.approval_owner_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this approval.' })
    }

    const { rejection_reason } = req.body
    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' })
    }
    if (rejection_reason.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Rejection reason must be at least 10 characters.' })
    }

    await ticketModel.updateStatusWithNote(ticketId, 'rejected', 'rejection_reason', rejection_reason)
    await ticketModel.logAction({
      ticket_id: ticketId, action: 'REJECTED',
      old_status: 'pending_approval', new_status: 'rejected',
      performed_by: req.user.id, note: rejection_reason,
    })

    const fullTicket = await ticketModel.findById(ticketId)
    const raiser     = await userModel.findById(ticket.raised_by)

    emailService.sendTicketRejectedEmail(fullTicket, raiser.email)
      .catch(err => console.error('Email error:', err.message))

    return res.status(200).json({ success: true, ticket: fullTicket })
  } catch (err) {
    console.error('rejectTicket error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function reapproveTicket(req, res) {
  try {
    const ticketId = Number(req.params.ticketId)

    const ticket = await ticketModel.findById(ticketId)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' })

    if (ticket.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Can only re-approve pending tickets.' })
    }
    const logs = await ticketModel.getLogs(ticketId)
    const isEscalatedTicket = logs.some(l => l.action === 'ESCALATED' || l.action === 'BACK_TO_MANAGER')
    if (!isEscalatedTicket) {
      return res.status(400).json({ success: false, message: 'This is not an escalated ticket.' })
    }
    if (Number(ticket.approval_owner_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this approval.' })
    }

    const { assigned_to } = req.body
    if (!assigned_to) {
      return res.status(400).json({ success: false, message: 'assigned_to is required.' })
    }

    const employee = await userModel.findById(Number(assigned_to))
    if (!employee || employee.role !== ROLES.EMPLOYEE) {
      return res.status(400).json({ success: false, message: 'Assigned user must be an active employee.' })
    }

    // Validate employee is in the same category as the ticket
    const categoryEmployees = await userModel.findEmployeesByCategory(ticket.category_id)
    const isEligible = categoryEmployees.some(e => Number(e.id) === Number(assigned_to))
    if (!isEligible) {
      return res.status(400).json({ success: false, message: 'Employee is not assigned to this category.' })
    }

    // Re-approve
    await ticketModel.updateStatus(ticketId, 'approved')
    await ticketModel.logAction({
      ticket_id: ticketId, action: 'RE_APPROVED',
      old_status: 'pending_approval', new_status: 'approved',
      performed_by: req.user.id,
    })

    // Manual assign
    await ticketModel.assign(ticketId, Number(assigned_to))
    await ticketModel.logAction({
      ticket_id: ticketId, action: 'MANUALLY_ASSIGNED',
      old_status: 'approved', new_status: 'assigned',
      performed_by: req.user.id,
      note: `Re-assigned to ${employee.name} by manager`,
    })

    const fullTicket = await ticketModel.findById(ticketId)
    const raiser     = await userModel.findById(ticket.raised_by)

    emailService.sendTicketApprovedEmail(fullTicket, raiser.email)
      .catch(err => console.error('Email error:', err.message))
    emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email)
      .catch(err => console.error('Email error:', err.message))
    emailService.sendApprovalConfirmationToManager(fullTicket, req.user.email)
      .catch(err => console.error('Email error:', err.message))

    return res.status(200).json({ success: true, ticket: fullTicket })
  } catch (err) {
    console.error('reapproveTicket error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

module.exports = { getPendingApprovals, approveTicket, rejectTicket, reapproveTicket }
