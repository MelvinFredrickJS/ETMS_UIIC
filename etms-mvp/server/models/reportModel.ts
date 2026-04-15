import pool from '../config/db'

interface FailingDevice {
  id: number
  name: string
  serial_number: string
  total_issues: string
}

async function getTopFailingDevices(limit = 10): Promise<FailingDevice[]> {
  const { rows } = await pool.query<FailingDevice>(
    `SELECT a.id, a.name, a.serial_number, COUNT(t.id) AS total_issues
     FROM assets a
     JOIN tickets t ON t.asset_id = a.id
     GROUP BY a.id, a.name, a.serial_number
     ORDER BY total_issues DESC
     LIMIT $1`,
    [limit]
  )
  return rows
}

export { getTopFailingDevices }
