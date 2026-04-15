import pool from '../config/db'
import ROLES from '../constants/ROLES'

interface AssignedEmployee {
  id: number
  name: string
  email: string
  open_count: string
}

async function getNextEmployeeInCategory(categoryId: number): Promise<AssignedEmployee> {
  const { rows } = await pool.query<AssignedEmployee>(
    `SELECT u.id, u.name, u.email,
            COUNT(t.id) AS open_count
     FROM users u
     LEFT JOIN tickets t
       ON t.assigned_to = u.id
      AND t.status NOT IN ('resolved', 'closed', 'rejected')
     WHERE u.category_id = $1
       AND u.role        = $2
       AND u.is_active   = true
     GROUP BY u.id
     ORDER BY COUNT(t.id) ASC, u.created_at ASC
     LIMIT 1`,
    [categoryId, ROLES.EMPLOYEE]
  )

  if (!rows.length) {
    throw new Error('No active employees available for assignment in this category.')
  }

  return rows[0]
}

export { getNextEmployeeInCategory }
