const pool  = require('../config/db')
const ROLES = require('../constants/ROLES')

async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  )
  return rows[0] || null
}

async function findByEmpId(emp_id) {
  const { rows } = await pool.query(
    `SELECT id, emp_id, name, email, role, category_id, department, is_active
     FROM users WHERE emp_id = $1`,
    [emp_id]
  )
  return rows[0] || null
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, emp_id, name, email, role, category_id, department, is_active
     FROM users WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

async function findAll() {
  const { rows } = await pool.query(
    `SELECT id, emp_id, name, email, role, category_id, department, is_active, created_at
     FROM users ORDER BY created_at DESC`
  )
  return rows
}

async function create({ emp_id, name, email, password_hash, role, category_id, department }) {
  const { rows } = await pool.query(
    `INSERT INTO users (emp_id, name, email, password_hash, role, category_id, department)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, emp_id, name, email, role, category_id, department`,
    [emp_id, name, email, password_hash, role, category_id || null, department || null]
  )
  return rows[0]
}

async function findByIdWithPassword(id) {
  const { rows } = await pool.query(
    `SELECT id, emp_id, name, email, role, category_id, department,
            is_active, password_hash, password_changed_at
     FROM users WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

async function updatePassword(id, password_hash) {
  const { rows } = await pool.query(
    `UPDATE users
     SET password_hash = $2, password_changed_at = NOW()
     WHERE id = $1
     RETURNING id, emp_id, name, email, role, category_id, department,
               is_active, password_changed_at`,
    [id, password_hash]
  )
  return rows[0] || null
}

async function findEmployeesByCategory(category_id) {
  const { rows } = await pool.query(
    `SELECT id, name, emp_id, email FROM users
     WHERE category_id = $1 AND role = $2 AND is_active = true
     ORDER BY name`,
    [category_id, ROLES.EMPLOYEE]
  )
  return rows
}

async function findManagers() {
  const { rows } = await pool.query(
    `SELECT id, name, emp_id, email FROM users
     WHERE role = $1 AND is_active = true ORDER BY name`,
    [ROLES.MANAGER]
  )
  return rows
}

async function findAnotherActiveManager(exclude_user_id) {
  const { rows } = await pool.query(
    `SELECT id, name, emp_id, email FROM users
     WHERE role = $1 AND is_active = true AND id <> $2
     ORDER BY created_at ASC LIMIT 1`,
    [ROLES.MANAGER, exclude_user_id]
  )
  return rows[0] || null
}

async function getReferenceCounts(user_id) {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM tickets WHERE raised_by = $1 OR assigned_to = $1) AS ticket_references_count,
       (SELECT COUNT(*) FROM tickets    WHERE raised_by = $1 OR assigned_to = $1)
     + (SELECT COUNT(*) FROM ticket_logs WHERE performed_by = $1)
     + (SELECT COUNT(*) FROM attachments WHERE uploaded_by = $1) AS references_count`,
    [user_id]
  )
  return rows[0]
}

async function deleteById(id) {
  const { rows } = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id, emp_id, name, email',
    [id]
  )
  return rows[0] || null
}

async function transferOwnershipReferences(from_user_id, to_user_id) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const r1 = await client.query(
      'UPDATE tickets SET raised_by = $2 WHERE raised_by = $1 RETURNING id',
      [from_user_id, to_user_id]
    )
    const r2 = await client.query(
      'UPDATE tickets SET assigned_to = $2 WHERE assigned_to = $1 RETURNING id',
      [from_user_id, to_user_id]
    )
    const r3 = await client.query(
      'UPDATE ticket_logs SET performed_by = $2 WHERE performed_by = $1 RETURNING id',
      [from_user_id, to_user_id]
    )
    const r4 = await client.query(
      'UPDATE attachments SET uploaded_by = $2 WHERE uploaded_by = $1 RETURNING id',
      [from_user_id, to_user_id]
    )

    await client.query('COMMIT')

    return {
      tickets_raised:   r1.rowCount,
      tickets_assigned: r2.rowCount,
      logs:             r3.rowCount,
      attachments:      r4.rowCount,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = {
  findByEmail,
  findByEmpId,
  findById,
  findAll,
  create,
  findByIdWithPassword,
  updatePassword,
  findEmployeesByCategory,
  findManagers,
  findAnotherActiveManager,
  getReferenceCounts,
  deleteById,
  transferOwnershipReferences,
}
