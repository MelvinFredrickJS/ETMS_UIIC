// Resolve approval manager by category domain mapping.
// Each request category owns a specific manager via ticket_categories.manager_user_id.

import pool from '../config/db'
import ROLES from '../constants/ROLES'

interface ManagerRow {
  id: number
  name: string
  email: string
}

export async function getApprovalManagerForCategory(categoryId: number): Promise<ManagerRow> {
  const { rows } = await pool.query<ManagerRow>(
    `SELECT u.id, u.name, u.email
     FROM ticket_categories tc
     JOIN users u ON u.id = tc.manager_user_id
     WHERE tc.id = $1
       AND u.role = $2
       AND u.is_active = true
     LIMIT 1`,
    [categoryId, ROLES.MANAGER]
  )

  if (!rows.length) {
    throw new Error('No active domain manager configured for this category.')
  }

  return rows[0]
}
