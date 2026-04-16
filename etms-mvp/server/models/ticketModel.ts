import pool from '../config/db'
import type { TicketRow, TicketLogRow, AttachmentRow, TicketStatus, Priority } from '../types'

interface CreateTicketInput {
  ticket_no: string
  title: string
  description: string
  ticket_type_id: number
  category_id: number
  priority: Priority
  raised_by: number
  approval_owner_id: number | null
  asset_id: number | null
  sla_days: number
}

async function create(input: CreateTicketInput): Promise<TicketRow> {
  const { ticket_no, title, description, ticket_type_id, category_id, priority,
          raised_by, approval_owner_id, asset_id, sla_days } = input
  const { rows } = await pool.query<TicketRow>(
    `INSERT INTO tickets
       (ticket_no, title, description, ticket_type_id, category_id, priority,
        status, raised_by, approval_owner_id, asset_id, sla_days, sla_due_date, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,'pending_approval',$7,$8,$9,$10,NOW() + (($10::int) * INTERVAL '1 day'),NOW(),NOW())
     RETURNING *`,
    [ticket_no, title, description, ticket_type_id, category_id, priority,
     raised_by, approval_owner_id ?? null, asset_id ?? null, sla_days]
  )
  return rows[0]
}

async function findById(id: number): Promise<TicketRow | null> {
  const { rows } = await pool.query<TicketRow>(
    `SELECT
       t.*,
       tt.name           AS type_name,
       tt.type_key,
       tc.name           AS category_name,
       tc.category_key,
       a.id              AS asset_id,
       a.name            AS asset_name,
       a.serial_number   AS asset_serial_number,
       raiser.name       AS raised_by_name,
       raiser.emp_id     AS raised_by_emp_id,
       raiser.email      AS raised_by_email,
       tech.name         AS assigned_to_name
     FROM tickets t
     JOIN ticket_types tt        ON t.ticket_type_id = tt.id
     JOIN ticket_categories tc   ON t.category_id    = tc.id
     LEFT JOIN assets a          ON t.asset_id        = a.id
     JOIN users raiser           ON t.raised_by        = raiser.id
     LEFT JOIN users tech        ON t.assigned_to      = tech.id
     WHERE t.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

interface FindAllOptions {
  raised_by?: number
  assigned_to?: number
  approval_owner_id?: number
  status?: string
  ticket_type_id?: number
  category_id?: number
  category_ids?: number[]
  priority?: string
  page?: number
  limit?: number
}

async function findAll(options: FindAllOptions = {}): Promise<{ rows: TicketRow[]; total: number }> {
  const {
    raised_by, assigned_to, approval_owner_id, status, ticket_type_id,
    category_id, category_ids, priority,
    page = 1, limit = 15
  } = options

  const params: unknown[] = []
  const where: string[] = []
  let idx = 1

  if (raised_by !== undefined && raised_by !== null) {
    where.push(`t.raised_by = $${idx++}`)
    params.push(raised_by)
  }
  if (assigned_to !== undefined && assigned_to !== null) {
    where.push(`t.assigned_to = $${idx++}`)
    params.push(assigned_to)
  }
  if (approval_owner_id !== undefined && approval_owner_id !== null) {
    where.push(`t.approval_owner_id = $${idx++}`)
    params.push(approval_owner_id)
  }
  if (category_id !== undefined && category_id !== null) {
    where.push(`t.category_id = $${idx++}`)
    params.push(category_id)
  }
  if (Array.isArray(category_ids) && category_ids.length > 0) {
    where.push(`t.category_id = ANY($${idx++}::int[])`)
    params.push(category_ids)
  }
  if (status) {
    where.push(`t.status = $${idx++}`)
    params.push(status)
  }
  if (ticket_type_id) {
    where.push(`t.ticket_type_id = $${idx++}`)
    params.push(ticket_type_id)
  }
  if (priority) {
    where.push(`t.priority = $${idx++}`)
    params.push(priority)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const offset      = (page - 1) * limit
  const limitIdx    = idx++
  const offsetIdx   = idx++

  const dataQuery = `
    SELECT t.*,
           tt.name       AS type_name,
           tt.type_key,
           tc.name       AS category_name,
           tc.category_key,
           raiser.name   AS raised_by_name,
           tech.name     AS assigned_to_name
    FROM tickets t
    JOIN ticket_types tt        ON t.ticket_type_id = tt.id
    JOIN ticket_categories tc   ON t.category_id    = tc.id
    JOIN users raiser           ON t.raised_by       = raiser.id
    LEFT JOIN users tech        ON t.assigned_to     = tech.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `
  params.push(limit, offset)

  const countParams = params.slice(0, params.length - 2)
  const countQuery  = `
    SELECT COUNT(*) AS total
    FROM tickets t
    JOIN ticket_types tt        ON t.ticket_type_id = tt.id
    JOIN ticket_categories tc   ON t.category_id    = tc.id
    JOIN users raiser           ON t.raised_by       = raiser.id
    LEFT JOIN users tech        ON t.assigned_to     = tech.id
    ${whereClause}
  `

  const [dataResult, countResult] = await Promise.all([
    pool.query<TicketRow>(dataQuery, params),
    pool.query<{ total: string }>(countQuery, countParams),
  ])

  return {
    rows:  dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  }
}

async function findPendingForManager(approval_owner_id: number): Promise<TicketRow[]> {
  const { rows } = await pool.query<TicketRow>(
    `SELECT t.*,
            tt.name       AS type_name,
            tt.type_key,
            tc.name       AS category_name,
            tc.category_key,
            raiser.name   AS raised_by_name
     FROM tickets t
     JOIN ticket_categories tc ON t.category_id    = tc.id
     JOIN ticket_types tt      ON t.ticket_type_id = tt.id
     JOIN users raiser         ON t.raised_by       = raiser.id
     WHERE t.approval_owner_id = $1
       AND t.status = 'pending_approval'
     ORDER BY t.created_at ASC`,
    [approval_owner_id]
  )
  return rows
}

async function updateStatus(id: number, status: TicketStatus): Promise<TicketRow | null> {
  const shouldClearEscalation = status === 'resolved' || status === 'closed'
  const { rows } = await pool.query<TicketRow>(
    `UPDATE tickets
     SET status = $2,
         escalated = CASE WHEN $3 THEN FALSE ELSE escalated END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, shouldClearEscalation]
  )
  return rows[0] ?? null
}

async function updateStatusWithNote(
  id: number,
  status: TicketStatus,
  field: 'rejection_reason' | 'report_reason',
  value: string | null
): Promise<TicketRow | null> {
  const ALLOWED_FIELDS = ['rejection_reason', 'report_reason'] as const
  if (!ALLOWED_FIELDS.includes(field)) {
    throw new Error(`Invalid field name: ${field}`)
  }
  const shouldClearEscalation = status === 'resolved' || status === 'closed'
  const { rows } = await pool.query<TicketRow>(
    `UPDATE tickets
     SET status = $2,
         ${field} = $3,
         escalated = CASE WHEN $4 THEN FALSE ELSE escalated END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, value, shouldClearEscalation]
  )
  return rows[0] ?? null
}

async function assign(id: number, assigned_to: number): Promise<TicketRow | null> {
  const { rows } = await pool.query<TicketRow>(
    `UPDATE tickets SET assigned_to = $2, status = 'assigned', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, assigned_to]
  )
  return rows[0] ?? null
}

interface LogActionInput {
  ticket_id: number
  action: string
  old_status?: TicketStatus | null
  new_status?: TicketStatus | null
  performed_by?: number | null
  note?: string | null
}

async function logAction(input: LogActionInput): Promise<TicketLogRow> {
  const { ticket_id, action, old_status, new_status, performed_by, note } = input
  const { rows } = await pool.query<TicketLogRow>(
    `INSERT INTO ticket_logs (ticket_id, action, old_status, new_status, performed_by, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
    [ticket_id, action, old_status ?? null, new_status ?? null, performed_by ?? null, note ?? null]
  )
  return rows[0]
}

interface SaveAttachmentInput {
  ticket_id: number
  filename: string
  original_name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by: number
}

async function saveAttachment(input: SaveAttachmentInput): Promise<AttachmentRow> {
  const { ticket_id, filename, original_name, file_path, file_size, mime_type, uploaded_by } = input
  const { rows } = await pool.query<AttachmentRow>(
    `INSERT INTO attachments (ticket_id, filename, original_name, file_path, file_size, mime_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [ticket_id, filename, original_name, file_path, file_size, mime_type, uploaded_by]
  )
  return rows[0]
}

async function getAttachments(ticket_id: number): Promise<AttachmentRow[]> {
  const { rows } = await pool.query<AttachmentRow>(
    'SELECT * FROM attachments WHERE ticket_id = $1',
    [ticket_id]
  )
  return rows
}

async function getLogs(ticket_id: number): Promise<TicketLogRow[]> {
  const { rows } = await pool.query<TicketLogRow>(
    `SELECT tl.*, u.name AS actor_name
     FROM ticket_logs tl
     LEFT JOIN users u ON tl.performed_by = u.id
     WHERE tl.ticket_id = $1
     ORDER BY tl.created_at ASC`,
    [ticket_id]
  )
  return rows
}

export {
  create, findById, findAll, findPendingForManager,
  updateStatus, updateStatusWithNote, assign,
  logAction, saveAttachment, getAttachments, getLogs,
}
