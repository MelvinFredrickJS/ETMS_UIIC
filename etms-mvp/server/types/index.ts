// ── Domain row types (match DB columns) ──────────────────────────────────────

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

export interface UserRow {
  id: number
  emp_id: string
  name: string
  email: string
  role: Role
  category_id: number | null
  department: string | null
  is_active: boolean
  password_hash?: string
  password_changed_at?: string | null
  created_at?: string
}

export interface TicketRow {
  id: number
  ticket_no: string
  title: string
  description: string
  ticket_type_id: number
  category_id: number
  priority: Priority
  status: TicketStatus
  raised_by: number
  assigned_to: number | null
  approval_owner_id: number | null
  asset_id: number | null
  rejection_reason: string | null
  report_reason: string | null
  sla_days?: number
  sla_due_date?: string
  escalated?: boolean
  escalated_at?: string | null
  created_at: string
  updated_at: string
  // Joined fields
  type_name?: string
  type_key?: TypeKey
  category_name?: string
  category_key?: string
  raised_by_name?: string
  raised_by_emp_id?: string
  raised_by_email?: string
  assigned_to_name?: string | null
  asset_name?: string | null
  asset_serial_number?: string | null
}

export interface CategoryRow {
  id: number
  name: string
  category_key: string
  ticket_type_id: number | null
  default_priority: Priority
  requires_approval: boolean
  manager_user_id: number | null
  assigned_team_key?: string | null
  is_team?: boolean
  // Joined fields
  type_key?: TypeKey
  type_name?: string
  manager_id?: number | null
  manager_name?: string | null
  manager_email?: string | null
}

export interface AssetRow {
  id: number
  name: string
  serial_number: string
  category_id: number
  assigned_to: number
  status: 'active' | 'under_repair' | 'retired'
  created_at?: string
  updated_at?: string
  // Joined fields
  assigned_emp_id?: string
  assigned_user_name?: string
  category_name?: string
  category_key?: string
}

export interface TicketLogRow {
  id: number
  ticket_id: number
  action: string
  old_status: TicketStatus | null
  new_status: TicketStatus | null
  performed_by: number | null
  note: string | null
  created_at: string
  // Joined
  actor_name?: string | null
}

export interface AttachmentRow {
  id: number
  ticket_id: number
  filename: string
  original_name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by: number
}
