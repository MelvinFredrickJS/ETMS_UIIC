import fs from 'fs'
import path from 'path'
import type { Request, Response } from 'express'
import ROLES from '../constants/ROLES'
import * as ticketModel from '../models/ticketModel'
import * as categoryModel from '../models/categoryModel'
import * as userModel from '../models/userModel'
import * as emailService from '../services/emailService'
import { getNextEmployeeInCategory } from '../services/assignmentService'
import generateTicketId from '../utils/generateTicketId'
import { buildSafeFilename } from '../utils/sanitizeFilename'
import type { TicketRow } from '../types'

async function createTicket(req: Request, res: Response): Promise<void> {
  let tmpFilePath: string | null = null
  try {
    if (req.user.role !== ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }

    const { title, description, ticket_type_id, category_id, priority, sla_days } = req.body as {
      title?: string
      description?: string
      ticket_type_id?: string
      category_id?: string
      priority?: string
      sla_days?: string
    }

    const slaDays = Math.min(30, Math.max(1, Number(sla_days ?? 3)))
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
    if (category.type_key !== 'data') {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      res.status(400).json({ success: false, message: 'Data portal can only raise data tickets.' }); return
    }

    const targetTeam = await categoryModel.findByKey('data_team')

    if (!targetTeam || !targetTeam.is_team) {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      res.status(400).json({ success: false, message: 'Data Team is not configured for routing.' }); return
    }
    if (category.assigned_team_key !== 'data_team') {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      res.status(400).json({ success: false, message: 'Selected data category is not mapped to Data Team.' }); return
    }

    const ticket_no = await generateTicketId(category.type_key!)
    const ticket = await ticketModel.create({
      ticket_no,
      title,
      description,
      ticket_type_id: Number(ticket_type_id),
      category_id: Number(category_id),
      priority: priority as TicketRow['priority'],
      raised_by: req.user.id,
      approval_owner_id: null,
      asset_id: null,
      sla_days: slaDays,
    })

    await ticketModel.logAction({
      ticket_id: ticket.id,
      action: 'TICKET_CREATED',
      new_status: null,
      performed_by: req.user.id,
    })

    if (req.file && tmpFilePath) {
      const finalName = buildSafeFilename(ticket.id, req.file.originalname)
      const uploadDir = process.env.UPLOAD_DIR || './uploads'
      const finalPath = path.join(uploadDir, finalName)

      try {
        fs.renameSync(tmpFilePath, finalPath)
        tmpFilePath = null

        await ticketModel.saveAttachment({
          ticket_id: ticket.id,
          filename: finalName,
          original_name: req.file.originalname,
          file_path: finalPath,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          uploaded_by: req.user.id,
        })
      } catch (fileErr) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        else fs.unlink(finalPath, () => {})
        console.error('Data portal file handling error:', fileErr)
      }
    }

    await ticketModel.logAction({
      ticket_id: ticket.id,
      action: 'TEAM_ROUTED',
      old_status: null,
      new_status: null,
      performed_by: req.user.id,
      note: `Routed to ${targetTeam.name}`,
    })

    let employee
    try {
      employee = await getNextEmployeeInCategory(targetTeam.id)
    } catch {
      res.status(400).json({ success: false, message: 'No active employees are available in the mapped team.' }); return
    }

    await ticketModel.updateStatus(ticket.id, 'approved')
    await ticketModel.logAction({ ticket_id: ticket.id, action: 'APPROVED', old_status: 'pending_approval', new_status: 'approved', performed_by: null })

    await ticketModel.assign(ticket.id, employee.id)
    await ticketModel.logAction({ ticket_id: ticket.id, action: 'AUTO_ASSIGNED', old_status: 'approved', new_status: 'assigned', performed_by: null, note: `Auto-assigned to ${employee.name}` })

    const fullTicket = await ticketModel.findById(ticket.id)
    if (fullTicket) {
      emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email).catch(err => console.error('Email error:', (err as Error).message))
      if (req.user.email) {
        emailService.sendTicketApprovedEmail(fullTicket, req.user.email).catch(err => console.error('Email error:', (err as Error).message))
      }
    }

    res.status(201).json({
      success: true,
      ticket: await ticketModel.findById(ticket.id),
      routed_team: {
        id: targetTeam.id,
        name: targetTeam.name,
        category_key: targetTeam.category_key,
      },
    })
  } catch (err) {
    if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
    console.error('dataPortal createTicket error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function listTeams(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role !== ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }

    const teams = (await categoryModel.findTeams()).map((team) => ({
      id: team.id,
      name: team.name,
      category_key: team.category_key,
    }))

    res.status(200).json({ success: true, teams })
  } catch (err) {
    console.error('dataPortal listTeams error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function listTickets(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role !== ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }

    const { status, priority, page = '1', limit = '15' } = req.query as Record<string, string>
    const pageNum  = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))
    const categories = (await categoryModel.findAll()).filter(row => row.type_key === 'data')
    const categoryIds = categories.map(category => category.id)

    const result = await ticketModel.findAll({
      status,
      priority,
      page: pageNum,
      limit: limitNum,
      raised_by: req.user.id,
      category_ids: categoryIds,
    })

    res.status(200).json({
      success: true,
      tickets: result.rows,
      total: result.total,
      page: pageNum,
      totalPages: Math.ceil(result.total / limitNum),
    })
  } catch (err) {
    console.error('dataPortal listTickets error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getTicketById(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role !== ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }

    const id = Number(req.params.id)
    const ticket = await ticketModel.findById(id)
    if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found.' }); return }
    if (Number(ticket.raised_by) !== Number(req.user.id)) {
      res.status(403).json({ success: false, message: 'You do not have permission to view this ticket.' }); return
    }

    const [attachments, logs] = await Promise.all([
      ticketModel.getAttachments(id),
      ticketModel.getLogs(id),
    ])

    res.status(200).json({ success: true, ticket, attachments, logs })
  } catch (err) {
    console.error('dataPortal getTicketById error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function downloadResponseFile(req: Request, res: Response): Promise<void> {
  try {
    if (req.user.role !== ROLES.DATA_TEAM) {
      res.status(403).json({ success: false, message: 'Access denied.' })
      return
    }

    const id = Number(req.params.id)
    const ticket = await ticketModel.findById(id)
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found.' })
      return
    }
    if (Number(ticket.raised_by) !== Number(req.user.id)) {
      res.status(403).json({ success: false, message: 'You do not have permission to download this file.' })
      return
    }

    const attachments = await ticketModel.getAttachments(id)
    const responseAttachment = attachments.find(a => Number(a.uploaded_by) === Number(ticket.assigned_to))
    if (!responseAttachment) {
      res.status(404).json({ success: false, message: 'Requested data file is not available yet.' })
      return
    }

    res.download(responseAttachment.file_path, responseAttachment.original_name)
  } catch (err) {
    console.error('dataPortal downloadResponseFile error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

export { createTicket, listTickets, getTicketById, listTeams, downloadResponseFile }