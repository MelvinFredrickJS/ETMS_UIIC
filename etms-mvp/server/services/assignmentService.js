// Round-robin employee assignment within a category.
// Finds the active employee with the FEWEST currently open tickets.
// "Open" = any status that is not resolved, closed, or rejected.
// Used by approvalController on first approval.
// NOT used on re-approval after reported — manager picks manually.

const pool  = require('../config/db')
const ROLES = require('../constants/ROLES')

async function getNextEmployeeInCategory(categoryId) {
  const { rows } = await pool.query(
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

  return rows[0]  // { id, name, email, open_count }
}

module.exports = { getNextEmployeeInCategory }
