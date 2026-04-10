const fs            = require('fs')
const path          = require('path')
const ROLES         = require('../constants/ROLES')
const { validateTransition, getAllowedNextStatuses } = require('../utils/ticketTransitions')
const { buildSafeFilename }  = require('../utils/sanitizeFilename')
const generateTicketId       = require('../utils/generateTicketId')
const ticketModel            = require('../models/ticketModel')
const categoryModel          = require('../models/categoryModel')
const assetModel             = require('../models/assetModel')
const userModel              = require('../models/userModel')
const emailService           = require('../services/emailService')
const { getNextEmployeeInCategory } = require('../services/assignmentService')

const MAX_TICKET_ID_RETRIES = 3

async function createTicket(req, res) {
  let tmpFilePath = null
  try {
    const { title, description, ticket_type_id, category_id, priority } = req.body
    let   { asset_id } = req.body
    const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical']

    if (!title || !description || !ticket_type_id || !category_id || !priority) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(400).json({ success: false, message: 'All fields are required.' })
    }
    if (String(title).trim().length < 5 || String(title).trim().length > 200) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(400).json({ success: false, message: 'title must be between 5 and 200 characters.' })
    }
    if (String(description).trim().length < 20) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(400).json({ success: false, message: 'description must be at least 20 characters.' })
    }
    if (!PRIORITY_VALUES.includes(String(priority))) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(400).json({ success: false, message: 'priority must be one of: low, medium, high, critical.' })
    }

    if (req.file) tmpFilePath = req.file.path

    // Validate category
    const category = await categoryModel.findById(Number(category_id))
    if (!category) {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      return res.status(400).json({ success: false, message: 'Category not found.' })
    }
    if (Number(category.ticket_type_id) !== Number(ticket_type_id)) {
      if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
      return res.status(400).json({ success: false, message: 'Category does not belong to the selected ticket type.' })
    }

    // Asset validation
    if (category.category_key === 'hardware_issue') {
      if (!asset_id) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        return res.status(400).json({ success: false, message: 'asset_id is required for hardware issue tickets.' })
      }
      const asset = await assetModel.findById(Number(asset_id))
      if (!asset) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        return res.status(400).json({ success: false, message: 'Asset not found.' })
      }
      if (Number(asset.assigned_to) !== Number(req.user.id)) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        return res.status(403).json({ success: false, message: 'Asset is not assigned to you.' })
      }
      if (Number(asset.category_id) !== Number(category_id)) {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        return res.status(400).json({ success: false, message: 'Asset does not belong to the selected category.' })
      }
      if (asset.status !== 'active') {
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        return res.status(400).json({ success: false, message: 'Asset must be active to raise a ticket.' })
      }
    } else {
      asset_id = null
    }

    // Determine approval owner
    const isManagerInOwnCategory =
      req.user.role === ROLES.MANAGER && Number(category.manager_id) === Number(req.user.id)

    const approvalOwnerId      = category.requires_approval ? category.manager_id : null
    const approvalManagerEmail = category.requires_approval ? category.manager_email : null

    // Create ticket with collision-safe retry
    let newTicket = null
    for (let attempt = 1; attempt <= MAX_TICKET_ID_RETRIES; attempt++) {
      const ticket_no = await generateTicketId(category.type_key)
      try {
        newTicket = await ticketModel.create({
          ticket_no,
          title,
          description,
          ticket_type_id: Number(ticket_type_id),
          category_id:    Number(category_id),
          priority,
          raised_by:         req.user.id,
          approval_owner_id: approvalOwnerId,
          asset_id:          asset_id ? Number(asset_id) : null,
        })
        break
      } catch (err) {
        const isCollision = err.code === '23505' && String(err.constraint || err.detail || '').includes('ticket_no')
        if (isCollision && attempt < MAX_TICKET_ID_RETRIES) continue
        if (isCollision) {
          if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
          return res.status(409).json({
            success: false,
            message: 'Could not allocate unique ticket number. Please retry.',
            code: 'TICKET_NO_CONFLICT',
          })
        }
        throw err
      }
    }

    // Handle file upload — rename tmp → ticketId-prefixed name
    if (req.file && tmpFilePath) {
      const finalName = buildSafeFilename(newTicket.id, req.file.originalname)
      const uploadDir = process.env.UPLOAD_DIR || './uploads'
      const finalPath = path.join(uploadDir, finalName)
      try {
        fs.renameSync(tmpFilePath, finalPath)
        tmpFilePath = null // no longer tmp
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
        // Clean up whichever file exists
        if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
        else             fs.unlink(finalPath, () => {})
        console.error('File handling error:', fileErr)
        // Ticket was created — continue without attachment rather than failing
      }
    }

    // Log TICKET_CREATED
    await ticketModel.logAction({
      ticket_id:    newTicket.id,
      action:       'TICKET_CREATED',
      new_status:   'pending_approval',
      performed_by: req.user.id,
    })

    let fullTicket = await ticketModel.findById(newTicket.id)
    const raiser   = await userModel.findById(newTicket.raised_by)

    // Auto-approve + auto-assign if no approval required OR manager in own category
    if (!category.requires_approval || isManagerInOwnCategory) {
      let employee
      try {
        employee = await getNextEmployeeInCategory(Number(category_id))
      } catch {
        return res.status(400).json({
          success: false,
          message: 'No active employees are available in this category. Ticket cannot be approved.',
        })
      }

      await ticketModel.updateStatus(newTicket.id, 'approved')
      await ticketModel.logAction({
        ticket_id: newTicket.id, action: 'APPROVED',
        old_status: 'pending_approval', new_status: 'approved', performed_by: null,
      })

      await ticketModel.assign(newTicket.id, employee.id)
      await ticketModel.logAction({
        ticket_id: newTicket.id, action: 'AUTO_ASSIGNED',
        old_status: 'approved', new_status: 'assigned', performed_by: null,
        note: `Auto-assigned to ${employee.name}`,
      })

      fullTicket = await ticketModel.findById(newTicket.id)

      emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email)
        .catch(err => console.error('Email error:', err.message))
      emailService.sendTicketApprovedEmail(fullTicket, raiser.email)
        .catch(err => console.error('Email error:', err.message))
    } else {
      // Requires approval — notify manager
      emailService.sendPendingApprovalEmail(fullTicket, approvalManagerEmail)
        .catch(err => console.error('Email error:', err.message))
    }

    return res.status(201).json({ success: true, ticket: await ticketModel.findById(newTicket.id) })
  } catch (err) {
    if (tmpFilePath) fs.unlink(tmpFilePath, () => {})
    console.error('createTicket error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function listTickets(req, res) {
  try {
    const { status, type: ticket_type_id, priority, page = 1, limit = 15 } = req.query
    const pageNum  = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))

    let result

    if (req.user.role === ROLES.ADMIN) {
      result = await ticketModel.findAll({
        status, ticket_type_id: ticket_type_id ? Number(ticket_type_id) : undefined,
        priority, page: pageNum, limit: limitNum,
      })
    } else if (req.user.role === ROLES.MANAGER) {
      const managedCategories = await categoryModel.findByManagerId(req.user.id)
      const category_ids = managedCategories.map(c => c.id)
      result = await ticketModel.findAll({
        category_ids,
        status, ticket_type_id: ticket_type_id ? Number(ticket_type_id) : undefined,
        priority, page: pageNum, limit: limitNum,
      })
    } else {
      // EMPLOYEE — scope to their own raised + assigned tickets
      const view = req.query.view // 'raised' | 'assigned' | undefined (both)
      const filters = {
        status, ticket_type_id: ticket_type_id ? Number(ticket_type_id) : undefined,
        priority, page: pageNum, limit: limitNum,
      }
      if (view === 'raised')   filters.raised_by   = req.user.id
      else if (view === 'assigned') filters.assigned_to = req.user.id
      else {
        // Default: tickets raised by OR assigned to the employee
        // Run two queries and merge (simple approach for MVP)
        const [raised, assigned] = await Promise.all([
          ticketModel.findAll({ ...filters, raised_by: req.user.id }),
          ticketModel.findAll({ ...filters, assigned_to: req.user.id }),
        ])
        // Deduplicate by id
        const seen = new Set()
        const merged = []
        for (const t of [...raised.rows, ...assigned.rows]) {
          if (!seen.has(t.id)) { seen.add(t.id); merged.push(t) }
        }
        merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const total = merged.length
        const paginated = merged.slice((pageNum - 1) * limitNum, pageNum * limitNum)
        return res.status(200).json({
          success: true, tickets: paginated, total,
          page: pageNum, totalPages: Math.ceil(total / limitNum),
        })
      }
      result = await ticketModel.findAll(filters)
    }

    return res.status(200).json({
      success: true,
      tickets: result.rows,
      total:   result.total,
      page:    pageNum,
      totalPages: Math.ceil(result.total / limitNum),
    })
  } catch (err) {
    console.error('listTickets error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getTicketById(req, res) {
  try {
    const id = Number(req.params.id)
    const ticket = await ticketModel.findById(id)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' })

    const allowed = await canAccessTicket(req.user, ticket)
    if (!allowed) return res.status(403).json({ success: false, message: 'You do not have permission to view this ticket.' })

    const [attachments, logs] = await Promise.all([
      ticketModel.getAttachments(id),
      ticketModel.getLogs(id),
    ])

    return res.status(200).json({ success: true, ticket, attachments, logs })
  } catch (err) {
    console.error('getTicketById error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getAllowedStatuses(req, res) {
  try {
    const id = Number(req.params.id)
    const ticket = await ticketModel.findById(id)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' })

    const allowed = await canAccessTicket(req.user, ticket)
    if (!allowed) return res.status(403).json({ success: false, message: 'You do not have permission to view this ticket.' })

    let allowedStatuses = getAllowedNextStatuses(ticket.status, req.user.role)

    // Ownership post-filters
    if (['assigned', 'in_progress'].includes(ticket.status) && Number(req.user.id) !== Number(ticket.assigned_to)) {
      allowedStatuses = []
    }
    if (ticket.status === 'resolved' && Number(req.user.id) !== Number(ticket.raised_by)) {
      allowedStatuses = []
    }
    if (['approved', 'reported', 'closed', 'rejected'].includes(ticket.status)) {
      allowedStatuses = []
    }

    return res.status(200).json({ success: true, allowedStatuses })
  } catch (err) {
    console.error('getAllowedStatuses error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function updateTicketStatus(req, res) {
  try {
    const id = Number(req.params.id)
    const { status, note, report_reason } = req.body

    if (!status) return res.status(400).json({ success: false, message: 'status is required.' })

    const ticket = await ticketModel.findById(id)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' })

    // Terminal status guard
    if (['closed', 'rejected'].includes(ticket.status)) {
      return res.status(400).json({ success: false, message: `Cannot move from terminal status '${ticket.status}'.` })
    }

    // Ownership guard based on current status
    if (['assigned', 'in_progress'].includes(ticket.status)) {
      if (Number(req.user.id) !== Number(ticket.assigned_to)) {
        return res.status(403).json({ success: false, message: 'You do not have permission to update this ticket.' })
      }
    } else if (ticket.status === 'resolved') {
      if (Number(req.user.id) !== Number(ticket.raised_by)) {
        return res.status(403).json({ success: false, message: 'Only the ticket creator can close or report a resolved ticket.' })
      }
    } else {
      // pending_approval, approved, reported — not updatable from this endpoint
      return res.status(403).json({ success: false, message: 'You do not have permission to update this ticket.' })
    }

    // Transition validation
    const { valid, reason } = validateTransition(ticket.status, status, req.user.role)
    if (!valid) return res.status(400).json({ success: false, message: reason })

    if (status === 'reported') {
      // resolved → reported requires note (min 10)
      const escalationReason = String(report_reason ?? note ?? '').trim()

      if (ticket.status === 'resolved' && escalationReason.length < 10) {
        return res.status(400).json({ success: false, message: 'report_reason must be at least 10 characters.' })
      }

      await ticketModel.updateStatusWithNote(id, 'reported', 'report_reason', escalationReason || null)
      await ticketModel.logAction({
        ticket_id: id, action: 'ESCALATED',
        old_status: ticket.status, new_status: 'reported',
        performed_by: req.user.id, note: escalationReason || null,
      })

      // Auto-transition: reported → pending_approval
      await ticketModel.updateStatus(id, 'pending_approval')
      await ticketModel.logAction({
        ticket_id: id, action: 'BACK_TO_MANAGER',
        old_status: 'reported', new_status: 'pending_approval', performed_by: null,
      })

      // Notify category manager
      const category  = await categoryModel.findById(ticket.category_id)
      const fullTicket = await ticketModel.findById(id)
      emailService.sendEscalationEmail(fullTicket, category.manager_email)
        .catch(err => console.error('Email error:', err.message))
    } else {
      await ticketModel.updateStatus(id, status)
      const action = ticket.status === 'assigned' && status === 'in_progress'
        ? 'WORK_STARTED'
        : 'STATUS_CHANGED'
      await ticketModel.logAction({
        ticket_id: id, action,
        old_status: ticket.status, new_status: status,
        performed_by: req.user.id, note: note || null,
      })

      if (status === 'resolved') {
        const raiser     = await userModel.findById(ticket.raised_by)
        const fullTicket = await ticketModel.findById(id)
        emailService.sendTicketResolvedEmail(fullTicket, raiser.email)
          .catch(err => console.error('Email error:', err.message))
      }
    }

    return res.status(200).json({ success: true, ticket: await ticketModel.findById(id) })
  } catch (err) {
    console.error('updateTicketStatus error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function downloadTicketFile(req, res) {
  try {
    const id = Number(req.params.id)
    const ticket = await ticketModel.findById(id)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' })

    const allowed = await canAccessTicket(req.user, ticket)
    if (!allowed) return res.status(403).json({ success: false, message: 'You do not have permission to access this file.' })

    const attachments = await ticketModel.getAttachments(id)
    if (!attachments.length) return res.status(404).json({ success: false, message: 'No attachments found.' })

    const attachment = attachments[0]
    return res.download(attachment.file_path, attachment.original_name)
  } catch (err) {
    console.error('downloadTicketFile error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ── Shared access check helper ────────────────────────────────────────────────
async function canAccessTicket(user, ticket) {
  if (user.role === ROLES.ADMIN)                          return true
  if (Number(ticket.raised_by)   === Number(user.id))    return true
  if (Number(ticket.assigned_to) === Number(user.id))    return true
  if (user.role === ROLES.MANAGER) {
    const category = await categoryModel.findById(ticket.category_id)
    return category && Number(category.manager_id) === Number(user.id)
  }
  return false
}

module.exports = {
  createTicket,
  listTickets,
  getTicketById,
  getAllowedStatuses,
  updateTicketStatus,
  downloadTicketFile,
}
