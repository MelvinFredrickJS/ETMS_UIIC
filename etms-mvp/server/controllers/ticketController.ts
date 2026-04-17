import fs from 'fs'
import path from 'path'
import type { Request, Response } from 'express'
import ROLES from '../constants/ROLES'
import { validateTransition, getAllowedNextStatuses } from '../utils/ticketTransitions'
import { buildSafeFilename } from '../utils/sanitizeFilename'
import generateTicketId from '../utils/generateTicketId'
import * as ticketModel from '../models/ticketModel'
import * as categoryModel from '../models/categoryModel'
import * as assetModel from '../models/assetModel'
import * as userModel from '../models/userModel'
import * as emailService from '../services/emailService'
import { getNextEmployeeInCategory } from '../services/assignmentService'
import { getApprovalManagerForCategory } from '../services/managerAssignmentService'
import type { TicketRow, TicketStatus, Role } from '../types'

const MAX_TICKET_ID_RETRIES = 3

async function createTicket(req: Request, res: Response): Promise<void> {
  let tmpFilePath: string | null = null
  try {
    const { title, description, ticket_type_id, category_id, priority } = req.body as {
      title?: string; description?: string; ticket_type_id?: string
      category_id?: string; priority?: string; asset_id?: string; sla_days?: string
    }
    let { asset_id } = req.body as { asset_id?: string }
    const slaDays = Math.min(30, Math.max(1, Number(req.body.sla_days ?? 3)))
    const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical']

    if (!title || !description || !ticket_type_id || !category_id || !priority) {
      if (req.file) fs.unlink(req.file.path, () => {})
      res.status(400).json({ success: false, message: 'All fields are required.' }); return
    }
    if (String(title).trim().length < 5 || String(title).trim().length > 200) {
      if (req.file) fs.unlink(req.file.path, () => {})
      res.status(400).json({ success: false, message: 'title must be between 5 and 200 characters.' }); return
    }
    if (String(description).trim().length < 20) {
      if (req.file) fs.unlink(req.file.path, () => {})
      res.status(400).json({ success: false, message: 'description must be at least 20 characters.' }); return
    }
    if (!PRIORITY_VALUES.includes(String(priority))) {
      if (req.file) fs.unlink(req.file.path, () => {})
      res.status(400).json({ success: false, message: 'priority must be one of: low, medium, high, critical.' }); return
    }
    if (!Number.isFinite(slaDays) || slaDays < 1 || slaDays > 30) {
      if (req.file) fs.unlink(req.file.path, () => {})
      res.status(400).json({ success: false, message: 'sla_days must be between 1 and 30.' }); return
    }

    if (req.file) tmpFilePath = req.file.path

    const category = await categoryModel.findById(Number(category_id))
    if (!category) {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      res.status(400).json({ success: false, message: 'Category not found.' }); return
    }
    if (Number(category.ticket_type_id) !== Number(ticket_type_id)) {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      res.status(400).json({ success: false, message: 'Category does not belong to the selected ticket type.' }); return
    }

    const targetTeam = category.assigned_team_key
      ? await categoryModel.findByKey(category.assigned_team_key)
      : null
    if (!targetTeam) {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      res.status(400).json({ success: false, message: 'Ticket category is not mapped to a team.' }); return
    }

    if (category.category_key === 'hardware_complaint') {
      if (!asset_id) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        res.status(400).json({ success: false, message: 'asset_id is required for hardware complaint tickets.' }); return
      }
      const asset = await assetModel.findById(Number(asset_id))
      if (!asset) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        res.status(400).json({ success: false, message: 'Asset not found.' }); return
      }
      if (Number(asset.assigned_to) !== Number(req.user.id)) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        res.status(403).json({ success: false, message: 'Asset is not assigned to you.' }); return
      }
      if (Number(asset.category_id) !== Number(targetTeam.id)) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        res.status(400).json({ success: false, message: 'Asset does not belong to the mapped infra team.' }); return
      }
      if (asset.status !== 'active') {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        res.status(400).json({ success: false, message: 'Asset must be active to raise a ticket.' }); return
      }
    } else {
      asset_id = undefined
    }

    const isAutoAssignedType = category.type_key === 'complaint' || category.type_key === 'data'

    let approvalOwnerId: number | null = null
    let approvalManagerEmail: string | null = null

    if (!isAutoAssignedType && category.requires_approval) {
      try {
        const approvalManager = await getApprovalManagerForCategory(category.id)
        approvalOwnerId      = approvalManager.id
        approvalManagerEmail = approvalManager.email
      } catch {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        res.status(400).json({ success: false, message: 'No active managers available for approval.' }); return
      }
    }

    let newTicket: TicketRow | null = null
    for (let attempt = 1; attempt <= MAX_TICKET_ID_RETRIES; attempt++) {
      const ticket_no = await generateTicketId(category.type_key!)
      try {
        newTicket = await ticketModel.create({
          ticket_no,
          title,
          description,
          ticket_type_id: Number(ticket_type_id),
          category_id:    Number(category_id),
          priority:       priority as TicketRow['priority'],
          raised_by:         req.user.id,
          approval_owner_id: approvalOwnerId,
          asset_id:          asset_id ? Number(asset_id) : null,
          sla_days:          slaDays,
        })
        break
      } catch (err) {
        const pgErr = err as { code?: string; constraint?: string; detail?: string }
        const isCollision = pgErr.code === '23505' && String(pgErr.constraint ?? pgErr.detail ?? '').includes('ticket_no')
        if (isCollision && attempt < MAX_TICKET_ID_RETRIES) continue
        if (isCollision) {
          if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
          res.status(409).json({ success: false, message: 'Could not allocate unique ticket number. Please retry.', code: 'TICKET_NO_CONFLICT' }); return
        }
        throw err
      }
    }

    if (!newTicket) {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      res.status(500).json({ success: false, message: 'Failed to create ticket.' }); return
    }

    if (req.file && tmpFilePath) {
      const finalName = buildSafeFilename(newTicket.id, req.file.originalname)
      const uploadDir = process.env.UPLOAD_DIR || './uploads'
      const finalPath = path.join(uploadDir, finalName)
      try {
        fs.renameSync(tmpFilePath, finalPath)
        tmpFilePath = null
        await ticketModel.saveAttachment({
          ticket_id:     newTicket.id,
          filename:      finalName,
          original_name: req.file.originalname,
          file_path:     finalPath,
          file_size:     req.file.size,
          mime_type:     req.file.mimetype,
          uploaded_by:   req.user.id,
        })
      } catch (fileErr) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        else             fs.unlink(finalPath, () => {})
        console.error('File handling error:', fileErr)
      }
    }

    await ticketModel.logAction({
      ticket_id: newTicket.id, action: 'TICKET_CREATED',
      new_status: 'pending_approval', performed_by: req.user.id,
    })

    let fullTicket = await ticketModel.findById(newTicket.id)
    const raiser   = await userModel.findById(newTicket.raised_by)

    if (isAutoAssignedType || !category.requires_approval) {
      let employee: Awaited<ReturnType<typeof getNextEmployeeInCategory>>
      try {
        employee = await getNextEmployeeInCategory(targetTeam.id)
      } catch {
        res.status(400).json({ success: false, message: 'No active employees are available in the mapped team. Ticket cannot be approved.' }); return
      }

      await ticketModel.updateStatus(newTicket.id, 'approved')
      await ticketModel.logAction({ ticket_id: newTicket.id, action: 'APPROVED', old_status: 'pending_approval', new_status: 'approved', performed_by: null })

      await ticketModel.assign(newTicket.id, employee.id)
      await ticketModel.logAction({ ticket_id: newTicket.id, action: 'AUTO_ASSIGNED', old_status: 'approved', new_status: 'assigned', performed_by: null, note: `Auto-routed to ${targetTeam.name}; assigned to ${employee.name}` })

      fullTicket = await ticketModel.findById(newTicket.id)

      if (fullTicket) {
        emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email).catch(err => console.error('Email error:', (err as Error).message))
        if (raiser) emailService.sendTicketApprovedEmail(fullTicket, raiser.email).catch(err => console.error('Email error:', (err as Error).message))
      }
    } else {
      if (fullTicket && approvalManagerEmail) {
        emailService.sendPendingApprovalEmail(fullTicket, approvalManagerEmail).catch(err => console.error('Email error:', (err as Error).message))
      }
    }

    res.status(201).json({ success: true, ticket: await ticketModel.findById(newTicket.id) })
  } catch (err) {
    if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
    console.error('createTicket error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function listTickets(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role === ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }
    const { status, type: ticket_type_id, priority, page = '1', limit = '15' } = req.query as Record<string, string>
    const pageNum  = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))
    const filters = {
      status,
      ticket_type_id: ticket_type_id ? Number(ticket_type_id) : undefined,
      priority,
      page: pageNum,
      limit: limitNum,
    }

    let result: { rows: TicketRow[]; total: number }

    if (req.user.role === ROLES.ADMIN) {
      result = await ticketModel.findAll(filters)
    } else if (req.user.role === ROLES.MANAGER) {
      result = await ticketModel.findAll({
        ...filters,
        approval_owner_id: req.user.id,
        exclude_reapproval_pending: true,
      })
    } else if (req.user.role === ROLES.DATA_TEAM) {
      result = await ticketModel.findAll({ ...filters, raised_by: req.user.id })
    } else {
      const view = req.query.view as string | undefined
      if (view === 'raised') {
        result = await ticketModel.findAll({ ...filters, raised_by: req.user.id })
      } else if (view === 'assigned') {
        result = await ticketModel.findAll({ ...filters, assigned_to: req.user.id })
      } else {
        const [raised, assigned] = await Promise.all([
          ticketModel.findAll({ ...filters, raised_by: req.user.id }),
          ticketModel.findAll({ ...filters, assigned_to: req.user.id }),
        ])
        const seen = new Set<number>()
        const merged: TicketRow[] = []
        for (const t of [...raised.rows, ...assigned.rows]) {
          if (!seen.has(t.id)) { seen.add(t.id); merged.push(t) }
        }
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const total = merged.length
        const paginated = merged.slice((pageNum - 1) * limitNum, pageNum * limitNum)
        res.status(200).json({ success: true, tickets: paginated, total, page: pageNum, totalPages: Math.ceil(total / limitNum) })
        return
      }
    }

    res.status(200).json({
      success: true, tickets: result.rows, total: result.total,
      page: pageNum, totalPages: Math.ceil(result.total / limitNum),
    })
  } catch (err) {
    console.error('listTickets error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getTicketById(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role === ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }
    const id = Number(req.params.id)
    const ticket = await ticketModel.findById(id)
    if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found.' }); return }

    const allowed = await canAccessTicket(req.user, ticket)
    if (!allowed) { res.status(403).json({ success: false, message: 'You do not have permission to view this ticket.' }); return }

    const [attachments, logs] = await Promise.all([
      ticketModel.getAttachments(id),
      ticketModel.getLogs(id),
    ])

    res.status(200).json({ success: true, ticket, attachments, logs })
  } catch (err) {
    console.error('getTicketById error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getAllowedStatuses(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role === ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }
    const id = Number(req.params.id)
    const ticket = await ticketModel.findById(id)
    if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found.' }); return }

    const allowed = await canAccessTicket(req.user, ticket)
    if (!allowed) { res.status(403).json({ success: false, message: 'You do not have permission to view this ticket.' }); return }

    let allowedStatuses = getAllowedNextStatuses(ticket.status, req.user.role as Role)

    if (req.user.role === ROLES.DATA_TEAM) {
      allowedStatuses = []
    }
    if (['assigned', 'in_progress'].includes(ticket.status) && Number(req.user.id) !== Number(ticket.assigned_to)) {
      allowedStatuses = []
    }
    if (ticket.status === 'resolved' && Number(req.user.id) !== Number(ticket.raised_by)) {
      allowedStatuses = []
    }
    if ((['approved', 'reported', 'closed', 'rejected'] as TicketStatus[]).includes(ticket.status)) {
      allowedStatuses = []
    }

    res.status(200).json({ success: true, allowedStatuses })
  } catch (err) {
    console.error('getAllowedStatuses error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function updateTicketStatus(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role === ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }
    const id = Number(req.params.id)
    const { status, note, report_reason } = req.body as { status?: string; note?: string; report_reason?: string }

    if (!status) { res.status(400).json({ success: false, message: 'status is required.' }); return }

    const ticket = await ticketModel.findById(id)
    if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found.' }); return }

    if (['closed', 'rejected'].includes(ticket.status)) {
      res.status(400).json({ success: false, message: `Cannot move from terminal status '${ticket.status}'.` }); return
    }

    if (['assigned', 'in_progress'].includes(ticket.status)) {
      if (Number(req.user.id) !== Number(ticket.assigned_to)) {
        res.status(403).json({ success: false, message: 'You do not have permission to update this ticket.' }); return
      }
    } else if (ticket.status === 'resolved') {
      if (Number(req.user.id) !== Number(ticket.raised_by)) {
        res.status(403).json({ success: false, message: 'Only the ticket creator can close or report a resolved ticket.' }); return
      }
    } else {
      res.status(403).json({ success: false, message: 'You do not have permission to update this ticket.' }); return
    }

    const { valid, reason } = validateTransition(ticket.status, status as TicketStatus, req.user.role as Role)
    if (!valid) { res.status(400).json({ success: false, message: reason }); return }

    if (status === 'reported') {
      const escalationReason = String(report_reason ?? note ?? '').trim()

      if (ticket.status === 'resolved' && escalationReason.length < 10) {
        res.status(400).json({ success: false, message: 'report_reason must be at least 10 characters.' }); return
      }

      await ticketModel.updateStatusWithNote(id, 'reported', 'report_reason', escalationReason || null)
      await ticketModel.logAction({ ticket_id: id, action: 'ESCALATED', old_status: ticket.status, new_status: 'reported', performed_by: req.user.id, note: escalationReason || null })

      await ticketModel.updateStatus(id, 'pending_approval')
      await ticketModel.logAction({ ticket_id: id, action: 'BACK_TO_MANAGER', old_status: 'reported', new_status: 'pending_approval', performed_by: null })

      const category  = await categoryModel.findById(ticket.category_id)
      const fullTicket = await ticketModel.findById(id)
      if (fullTicket && category?.manager_email) {
        emailService.sendEscalationEmail(fullTicket, category.manager_email).catch(err => console.error('Email error:', (err as Error).message))
      }
    } else {
      await ticketModel.updateStatus(id, status as TicketStatus)
      const action = ticket.status === 'assigned' && status === 'in_progress' ? 'WORK_STARTED' : 'STATUS_CHANGED'
      await ticketModel.logAction({ ticket_id: id, action, old_status: ticket.status, new_status: status as TicketStatus, performed_by: req.user.id, note: note ?? null })

      if (status === 'resolved') {
        const raiser     = await userModel.findById(ticket.raised_by)
        const fullTicket = await ticketModel.findById(id)
        if (fullTicket && raiser) {
          emailService.sendTicketResolvedEmail(fullTicket, raiser.email).catch(err => console.error('Email error:', (err as Error).message))
        }
      }
    }

    res.status(200).json({ success: true, ticket: await ticketModel.findById(id) })
  } catch (err) {
    console.error('updateTicketStatus error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function downloadTicketFile(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role === ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }
    const id = Number(req.params.id)
    const ticket = await ticketModel.findById(id)
    if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found.' }); return }

    const allowed = await canAccessTicket(req.user, ticket)
    if (!allowed) { res.status(403).json({ success: false, message: 'You do not have permission to access this file.' }); return }

    const attachments = await ticketModel.getAttachments(id)
    if (!attachments.length) { res.status(404).json({ success: false, message: 'No attachments found.' }); return }

    const attachment = attachments[0]
    res.download(attachment.file_path, attachment.original_name)
  } catch (err) {
    console.error('downloadTicketFile error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function canAccessTicket(user: Request['user'], ticket: TicketRow): Promise<boolean> {
  if (user.role === ROLES.ADMIN)                          return true
  if (Number(ticket.raised_by)   === Number(user.id))    return true
  if (Number(ticket.assigned_to) === Number(user.id))    return true
  if (user.role === ROLES.DATA_TEAM)                     return false
  if (user.role === ROLES.MANAGER)                       return Number(ticket.approval_owner_id) === Number(user.id)
  return false
}

export { createTicket, listTickets, getTicketById, getAllowedStatuses, updateTicketStatus, downloadTicketFile }
