import type { Request, Response } from 'express'
import * as ticketModel from '../models/ticketModel'
import * as userModel from '../models/userModel'
import * as emailService from '../services/emailService'
import ROLES from '../constants/ROLES'
import { getNextEmployeeInCategory } from '../services/assignmentService'

async function getPendingApprovals(req: Request, res: Response): Promise<void> {
  try {
    const tickets = await ticketModel.findPendingForManager(req.user.id)
    res.status(200).json({ success: true, tickets, total: tickets.length })
  } catch (err) {
    console.error('getPendingApprovals error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function approveTicket(req: Request, res: Response): Promise<void> {
  try {
    const ticketId = Number(req.params.ticketId)

    const ticket = await ticketModel.findById(ticketId)
    if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found.' }); return }

    if (ticket.status !== 'pending_approval') {
      res.status(400).json({ success: false, message: 'Can only approve pending tickets.' }); return
    }
    if (Number(ticket.approval_owner_id) !== Number(req.user.id)) {
      res.status(403).json({ success: false, message: 'You do not have permission to manage this approval.' }); return
    }

    let employee: Awaited<ReturnType<typeof getNextEmployeeInCategory>>
    try {
      employee = await getNextEmployeeInCategory(ticket.category_id)
    } catch {
      res.status(400).json({
        success: false,
        message: 'No active employees are available in this category. Approval is not allowed.',
      }); return
    }

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

    if (fullTicket && raiser) {
      emailService.sendTicketApprovedEmail(fullTicket, raiser.email).catch(err => console.error('Email error:', (err as Error).message))
      emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email).catch(err => console.error('Email error:', (err as Error).message))
      emailService.sendApprovalConfirmationToManager(fullTicket, req.user.email).catch(err => console.error('Email error:', (err as Error).message))
    }

    res.status(200).json({ success: true, ticket: fullTicket })
  } catch (err) {
    console.error('approveTicket error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function rejectTicket(req: Request, res: Response): Promise<void> {
  try {
    const ticketId = Number(req.params.ticketId)

    const ticket = await ticketModel.findById(ticketId)
    if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found.' }); return }

    if (ticket.status !== 'pending_approval') {
      res.status(400).json({ success: false, message: 'Can only reject pending tickets.' }); return
    }
    if (Number(ticket.approval_owner_id) !== Number(req.user.id)) {
      res.status(403).json({ success: false, message: 'You do not have permission to manage this approval.' }); return
    }

    const { rejection_reason } = req.body as { rejection_reason?: string }
    if (!rejection_reason || !rejection_reason.trim()) {
      res.status(400).json({ success: false, message: 'Rejection reason is required.' }); return
    }
    if (rejection_reason.trim().length < 10) {
      res.status(400).json({ success: false, message: 'Rejection reason must be at least 10 characters.' }); return
    }

    await ticketModel.updateStatusWithNote(ticketId, 'rejected', 'rejection_reason', rejection_reason)
    await ticketModel.logAction({
      ticket_id: ticketId, action: 'REJECTED',
      old_status: 'pending_approval', new_status: 'rejected',
      performed_by: req.user.id, note: rejection_reason,
    })

    const fullTicket = await ticketModel.findById(ticketId)
    const raiser     = await userModel.findById(ticket.raised_by)

    if (fullTicket && raiser) {
      emailService.sendTicketRejectedEmail(fullTicket, raiser.email).catch(err => console.error('Email error:', (err as Error).message))
    }

    res.status(200).json({ success: true, ticket: fullTicket })
  } catch (err) {
    console.error('rejectTicket error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function reapproveTicket(req: Request, res: Response): Promise<void> {
  try {
    const ticketId = Number(req.params.ticketId)

    const ticket = await ticketModel.findById(ticketId)
    if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found.' }); return }

    if (ticket.status !== 'pending_approval') {
      res.status(400).json({ success: false, message: 'Can only re-approve pending tickets.' }); return
    }
    const logs = await ticketModel.getLogs(ticketId)
    const isEscalatedTicket = logs.some(l => l.action === 'ESCALATED' || l.action === 'BACK_TO_MANAGER')
    if (!isEscalatedTicket) {
      res.status(400).json({ success: false, message: 'This is not an escalated ticket.' }); return
    }
    if (Number(ticket.approval_owner_id) !== Number(req.user.id)) {
      res.status(403).json({ success: false, message: 'You do not have permission to manage this approval.' }); return
    }

    const { assigned_to } = req.body as { assigned_to?: string }
    if (!assigned_to) { res.status(400).json({ success: false, message: 'assigned_to is required.' }); return }

    const employee = await userModel.findById(Number(assigned_to))
    if (!employee || employee.role !== ROLES.EMPLOYEE) {
      res.status(400).json({ success: false, message: 'Assigned user must be an active employee.' }); return
    }

    const categoryEmployees = await userModel.findEmployeesByCategory(ticket.category_id)
    const isEligible = categoryEmployees.some(e => Number(e.id) === Number(assigned_to))
    if (!isEligible) {
      res.status(400).json({ success: false, message: 'Employee is not assigned to this category.' }); return
    }

    await ticketModel.updateStatus(ticketId, 'approved')
    await ticketModel.logAction({
      ticket_id: ticketId, action: 'RE_APPROVED',
      old_status: 'pending_approval', new_status: 'approved',
      performed_by: req.user.id,
    })

    await ticketModel.assign(ticketId, Number(assigned_to))
    await ticketModel.logAction({
      ticket_id: ticketId, action: 'MANUALLY_ASSIGNED',
      old_status: 'approved', new_status: 'assigned',
      performed_by: req.user.id,
      note: `Re-assigned to ${employee.name} by manager`,
    })

    const fullTicket = await ticketModel.findById(ticketId)
    const raiser     = await userModel.findById(ticket.raised_by)

    if (fullTicket && raiser) {
      emailService.sendTicketApprovedEmail(fullTicket, raiser.email).catch(err => console.error('Email error:', (err as Error).message))
      emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email).catch(err => console.error('Email error:', (err as Error).message))
      emailService.sendApprovalConfirmationToManager(fullTicket, req.user.email).catch(err => console.error('Email error:', (err as Error).message))
    }

    res.status(200).json({ success: true, ticket: fullTicket })
  } catch (err) {
    console.error('reapproveTicket error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

export { getPendingApprovals, approveTicket, rejectTicket, reapproveTicket }
