const pool = require('../config/db')

async function getTopFailingDevices(limit = 10) {
  const { rows } = await pool.query(
    `SELECT
       a.id,
       a.name,
       a.serial_number,
       COUNT(t.id) AS total_issues
     FROM assets a
     JOIN tickets t ON t.asset_id = a.id
     GROUP BY a.id, a.name, a.serial_number
     ORDER BY total_issues DESC
     LIMIT $1`,
    [limit]
  )
  return rows
}

module.exports = { getTopFailingDevices }
