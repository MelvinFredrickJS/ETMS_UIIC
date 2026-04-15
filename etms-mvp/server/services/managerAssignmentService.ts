// Round-robin approval assignment between the 2 global managers.
// Picks the manager with the fewest currently pending tickets.
// Tie-breaker: earliest created_at wins.
// Used by ticketController.createTicket() to set approval_owner_id.

import pool from '../config/db'
import ROLES from '../constants/ROLES'

interface ManagerRow {
  id: number
  name: string
  email: string
  pending_count: string
}

export async function getNextApprovalManager(): Promise<ManagerRow> {
  const { rows } = await pool.query<ManagerRow>(
    `SELECT u.id, u.name, u.email,
            COUNT(t.id) AS pending_count
     FROM users u
     LEFT JOIN tickets t
       ON t.approval_owner_id = u.id
      AND t.status = 'pending_approval'
     WHERE u.role = $1
       AND u.is_active = true
     GROUP BY u.id
     ORDER BY COUNT(t.id) ASC, u.created_at ASC
     LIMIT 1`,
    [ROLES.MANAGER]
  )

  if (!rows.length) {
    throw new Error('No active managers available for approval assignment.')
  }

  return rows[0]
}
