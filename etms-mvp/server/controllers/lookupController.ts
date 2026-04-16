import type { Request, Response } from 'express'
import pool from '../config/db'

export async function lookupEmployee(req: Request, res: Response): Promise<void> {
  try {
    const query = String(req.query.q ?? '').trim()
    if (!query) {
      res.status(400).json({ success: false, message: 'Query parameter q is required.' })
      return
    }

    // Try to find user by emp_id first, then by asset serial_number
    const { rows: byEmpId } = await pool.query<{
      id: number; emp_id: string; name: string; email: string
      role: string; team: string | null; is_active: boolean
      category_name: string | null
    }>(
      `SELECT u.id, u.emp_id, u.name, u.email, u.role, u.team, u.is_active,
              tc.name AS category_name
       FROM users u
       LEFT JOIN ticket_categories tc ON u.category_id = tc.id
       WHERE LOWER(u.emp_id) = LOWER($1)`,
      [query]
    )

    let userId: number | null = null

    if (byEmpId.length) {
      userId = byEmpId[0].id
    } else {
      // Try by asset serial number
      const { rows: bySerial } = await pool.query<{ assigned_to: number }>(
        `SELECT assigned_to FROM assets WHERE LOWER(serial_number) = LOWER($1) LIMIT 1`,
        [query]
      )
      if (bySerial.length) userId = bySerial[0].assigned_to
    }

    if (!userId) {
      res.status(404).json({ success: false, message: `No employee or asset found for "${query}".` })
      return
    }

    // Fetch full user details
    const { rows: userRows } = await pool.query<{
      id: number; emp_id: string; name: string; email: string
      role: string; team: string | null; is_active: boolean
      category_name: string | null; created_at: string
    }>(
      `SELECT u.id, u.emp_id, u.name, u.email, u.role, u.team, u.is_active,
              tc.name AS category_name, u.created_at
       FROM users u
       LEFT JOIN ticket_categories tc ON u.category_id = tc.id
       WHERE u.id = $1`,
      [userId]
    )

    if (!userRows.length) {
      res.status(404).json({ success: false, message: 'User not found.' })
      return
    }

    // Fetch all assets assigned to this user
    const { rows: assets } = await pool.query<{
      id: number; name: string; serial_number: string
      category_name: string; status: string; assigned_at: string | null
    }>(
      `SELECT a.id, a.name, a.serial_number,
              tc.name AS category_name,
              a.status,
              aa.assigned_at
       FROM assets a
       JOIN ticket_categories tc ON a.category_id = tc.id
       LEFT JOIN asset_assignments aa
         ON aa.asset_id = a.id AND aa.returned_at IS NULL
       WHERE a.assigned_to = $1
       ORDER BY a.name`,
      [userId]
    )

    // Fetch open ticket count
    const { rows: ticketCount } = await pool.query<{ open: string; total: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('closed','rejected')) AS open,
         COUNT(*) AS total
       FROM tickets
       WHERE raised_by = $1 OR assigned_to = $1`,
      [userId]
    )

    res.status(200).json({
      success: true,
      user: userRows[0],
      assets,
      ticket_stats: {
        open:  Number(ticketCount[0]?.open  ?? 0),
        total: Number(ticketCount[0]?.total ?? 0),
      },
    })
  } catch (err) {
    console.error('lookupEmployee error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}
