const pool = require('../config/db')

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT a.*,
            u.emp_id        AS assigned_emp_id,
            u.name          AS assigned_user_name,
            tc.name         AS category_name,
            tc.category_key
     FROM assets a
     JOIN users u              ON a.assigned_to  = u.id
     JOIN ticket_categories tc ON a.category_id  = tc.id
     WHERE a.id = $1`,
    [id]
  )
  return rows[0] || null
}

async function findBySerial(serial_number) {
  const { rows } = await pool.query(
    'SELECT * FROM assets WHERE serial_number = $1',
    [serial_number]
  )
  return rows[0] || null
}

async function findByAssignedUser(user_id) {
  const { rows } = await pool.query(
    `SELECT a.id, a.name, a.serial_number, a.category_id,
            tc.name AS category_name, a.status
     FROM assets a
     JOIN ticket_categories tc ON a.category_id = tc.id
     WHERE a.assigned_to = $1
     ORDER BY a.name ASC`,
    [user_id]
  )
  return rows
}

async function create({ name, serial_number, category_id, assigned_to, status = 'active' }) {
  const { rows } = await pool.query(
    `INSERT INTO assets (name, serial_number, category_id, assigned_to, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, serial_number, category_id, assigned_to, status]
  )
  return rows[0]
}

async function updateStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE assets SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, status]
  )
  return rows[0] || null
}

async function transferOwnership({ asset_id, from_user_id, to_user_id, transferred_by, note }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lock the asset row
    const { rows: assetRows } = await client.query(
      'SELECT * FROM assets WHERE id = $1 FOR UPDATE',
      [asset_id]
    )
    if (!assetRows.length) throw new Error('Asset not found.')

    // Close the current active assignment
    await client.query(
      `UPDATE asset_assignments
       SET returned_at = NOW()
       WHERE asset_id = $1 AND returned_at IS NULL`,
      [asset_id]
    )

    // Insert new assignment record
    await client.query(
      `INSERT INTO asset_assignments
         (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [asset_id, from_user_id, to_user_id, transferred_by, note || null]
    )

    // Update asset's current owner
    const { rows: updated } = await client.query(
      'UPDATE assets SET assigned_to = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [asset_id, to_user_id]
    )

    await client.query('COMMIT')
    return updated[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { findById, findBySerial, findByAssignedUser, create, updateStatus, transferOwnership }
