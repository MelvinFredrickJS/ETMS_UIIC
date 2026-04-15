import pool from '../config/db'
import type { CategoryRow } from '../types'

async function findAll(): Promise<CategoryRow[]> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT tc.*, tt.name AS type_name, tt.type_key
     FROM ticket_categories tc
     JOIN ticket_types tt ON tc.ticket_type_id = tt.id
     ORDER BY tt.id, tc.id`
  )
  return rows
}

async function findById(id: number): Promise<CategoryRow | null> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT tc.*,
            tt.type_key,
            tt.name       AS type_name,
            mgr.id        AS manager_id,
            mgr.name      AS manager_name,
            mgr.email     AS manager_email
     FROM ticket_categories tc
     JOIN ticket_types tt  ON tc.ticket_type_id  = tt.id
     LEFT JOIN users mgr   ON tc.manager_user_id = mgr.id
     WHERE tc.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

async function findByManagerId(manager_user_id: number): Promise<CategoryRow[]> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT tc.*, tt.type_key, tt.name AS type_name
     FROM ticket_categories tc
     JOIN ticket_types tt ON tc.ticket_type_id = tt.id
     WHERE tc.manager_user_id = $1`,
    [manager_user_id]
  )
  return rows
}

export { findAll, findById, findByManagerId }
