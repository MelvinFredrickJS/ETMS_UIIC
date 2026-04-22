// ── Domain types ──────────────────────────────────────────────────────────────

export type Role = 'employee' | 'manager' | 'admin' | 'data_team'

export type TicketStatus =
  | 'pending_approval'
  | 'approved'
  | 'assigned'
  | 'in_progress'
  | 'reported'
  | 'resolved'
  | 'closed'
  | 'rejected'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export type TypeKey = 'complaint' | 'request' | 'data'

// ── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  emp_id: string
  name: string
  email: string
  role: Role
  team: string | null
  can_manage_assets?: boolean
  category_id: number | null
  is_active: boolean
  password_changed_at: string | null
  references_count?: number
  ticket_references_count?: number
}

// ── Ticket ───────────────────────────────────────────────────────────────────

export interface Ticket {
  id: number
  ticket_no: string
  title: string
  description: string
  status: TicketStatus
  priority: Priority
  type_key: TypeKey
  type_name: string
  category_id: number
  category_name: string
  category_key: string
  raised_by: number
  raised_by_name: string
  raised_by_emp_id: string
  raised_by_email: string
  assigned_to: number | null
  assigned_to_name: string | null
  approval_owner_id: number | null
  asset_id: number | null
  asset_name: string | null
  asset_serial_number: string | null
  rejection_reason: string | null
  report_reason: string | null
  sla_days?: number
  sla_due_date?: string
  escalated?: boolean
  escalated_at?: string | null
  created_at: string
  updated_at: string
}

// ── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: number
  name: string
  category_key: string
  default_priority: Priority | null
  requires_approval: boolean
  ticket_type_id?: number | null
  assigned_team_key?: string | null
  is_team?: boolean
}

export interface TicketTypeGroup {
  type_key: TypeKey
  type_name: string
  categories: Category[]
}

// ── Asset ────────────────────────────────────────────────────────────────────

export interface Asset {
  id: number
  name: string
  serial_number: string
  category_id: number
  category_name: string
  assigned_to: number
  status: 'active' | 'under_repair' | 'retired'
}

// ── Ticket Log ───────────────────────────────────────────────────────────────

export interface TicketLog {
  id: number
  ticket_id: number
  action: string
  old_status: TicketStatus | null
  new_status: TicketStatus | null
  performed_by: number | null
  actor_name: string | null
  note: string | null
  created_at: string
}

// ── Attachment ───────────────────────────────────────────────────────────────

export interface Attachment {
  id: number
  ticket_id: number
  filename: string
  original_name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by: number
}
