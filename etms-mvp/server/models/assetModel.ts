import pool from '../config/db'
import type { AssetRow } from '../types'

async function findById(id: number): Promise<AssetRow | null> {
  const { rows } = await pool.query<AssetRow>(
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
  return rows[0] ?? null
}

async function findBySerial(serial_number: string): Promise<AssetRow | null> {
  const { rows } = await pool.query<AssetRow>(
    'SELECT * FROM assets WHERE serial_number = $1',
    [serial_number]
  )
  return rows[0] ?? null
}

async function findByAssignedUser(user_id: number): Promise<AssetRow[]> {
  const { rows } = await pool.query<AssetRow>(
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

interface CreateAssetInput {
  name: string
  serial_number: string
  category_id: number
  assigned_to: number
  status?: string
  machine_type?: string | null
  model?: string | null
  ram?: string | null
  hdd?: string | null
  monitor_serial?: string | null
  monitor_make?: string | null
  system_ip?: string | null
  port?: string | null
  ms_office_ver?: string | null
  os?: string | null
  host_id?: string | null
  floor?: string | null
  branch?: string | null
}

async function create(input: CreateAssetInput): Promise<AssetRow> {
  const {
    name, serial_number, category_id, assigned_to, status = 'active',
    machine_type, model, ram, hdd, monitor_serial, monitor_make,
    system_ip, port, ms_office_ver, os, host_id, floor, branch,
  } = input
  const { rows } = await pool.query<AssetRow>(
    `INSERT INTO assets
       (name, serial_number, category_id, assigned_to, status,
        machine_type, model, ram, hdd, monitor_serial, monitor_make,
        system_ip, port, ms_office_ver, os, host_id, floor, branch)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [name, serial_number, category_id, assigned_to, status,
     machine_type ?? null, model ?? null, ram ?? null, hdd ?? null,
     monitor_serial ?? null, monitor_make ?? null, system_ip ?? null,
     port ?? null, ms_office_ver ?? null, os ?? null, host_id ?? null,
     floor ?? null, branch ?? null]
  )
  return rows[0]
}

async function updateSpec(id: number, spec: Partial<Pick<AssetRow,
  'machine_type' | 'model' | 'ram' | 'hdd' | 'monitor_serial' | 'monitor_make' |
  'system_ip' | 'port' | 'ms_office_ver' | 'os' | 'host_id' | 'floor' | 'branch'
>>): Promise<AssetRow | null> {
  const fields = Object.entries(spec).filter(([, v]) => v !== undefined)
  if (!fields.length) return null
  const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ')
  const values = fields.map(([, v]) => v)
  const { rows } = await pool.query<AssetRow>(
    `UPDATE assets SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  )
  return rows[0] ?? null
}

async function deleteById(id: number): Promise<AssetRow | null> {
  const { rows } = await pool.query<AssetRow>(
    'DELETE FROM assets WHERE id = $1 RETURNING *',
    [id]
  )
  return rows[0] ?? null
}

async function updateStatus(id: number, status: string): Promise<AssetRow | null> {
  const { rows } = await pool.query<AssetRow>(
    'UPDATE assets SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, status]
  )
  return rows[0] ?? null
}

interface TransferOwnershipInput {
  asset_id: number
  from_user_id: number
  to_user_id: number
  transferred_by: number
  note: string | null
}

async function transferOwnership(input: TransferOwnershipInput): Promise<AssetRow> {
  const { asset_id, from_user_id, to_user_id, transferred_by, note } = input
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: assetRows } = await client.query<AssetRow>(
      'SELECT * FROM assets WHERE id = $1 FOR UPDATE',
      [asset_id]
    )
    if (!assetRows.length) throw new Error('Asset not found.')

    await client.query(
      `UPDATE asset_assignments SET returned_at = NOW() WHERE asset_id = $1 AND returned_at IS NULL`,
      [asset_id]
    )

    await client.query(
      `INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [asset_id, from_user_id, to_user_id, transferred_by, note ?? null]
    )

    const { rows: updated } = await client.query<AssetRow>(
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

export interface AssignmentHistoryRow {
  id: number
  asset_id: number
  from_user_id: number | null
  to_user_id: number
  transferred_by: number | null
  assigned_at: string
  returned_at: string | null
  note: string | null
  from_name: string | null
  to_name: string | null
  by_name: string | null
}

async function findAll(category_ids?: number[]): Promise<AssetRow[]> {
  const params: unknown[] = []
  const where = category_ids && category_ids.length
    ? [`a.category_id = ANY($1::int[])`]
    : []
  if (category_ids && category_ids.length) params.push(category_ids)

  const { rows } = await pool.query<AssetRow>(
    `SELECT a.*,
            u.emp_id        AS assigned_emp_id,
            u.name          AS assigned_user_name,
            tc.name         AS category_name,
            tc.category_key
     FROM assets a
     JOIN users u              ON a.assigned_to  = u.id
     JOIN ticket_categories tc ON a.category_id  = tc.id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY tc.name, a.name`,
    params
  )
  return rows
}

async function getHistory(asset_id: number): Promise<AssignmentHistoryRow[]> {
  const { rows } = await pool.query<AssignmentHistoryRow>(
    `SELECT aa.*,
            fu.name AS from_name,
            tu.name AS to_name,
            bu.name AS by_name
     FROM asset_assignments aa
     LEFT JOIN users fu ON aa.from_user_id    = fu.id
     LEFT JOIN users tu ON aa.to_user_id      = tu.id
     LEFT JOIN users bu ON aa.transferred_by  = bu.id
     WHERE aa.asset_id = $1
     ORDER BY aa.assigned_at DESC`,
    [asset_id]
  )
  return rows
}

// Round-robin: find the active asset in this category that has been
// sitting unassigned the longest (NULL assigned_to or assigned to a
// placeholder sentinel — we use a dedicated "unassigned pool" user id
// convention, but simpler: assets with no open assignment record).
// Strategy: pick the active asset whose most-recent assignment ended
// (returned_at IS NOT NULL) earliest, or assets that have NEVER been
// assigned at all — ordered by updated_at ASC so the stalest goes first.
async function findUnassignedRoundRobin(category_id: number): Promise<AssetRow | null> {
  const { rows } = await pool.query<AssetRow>(
    `SELECT a.*,
            tc.name         AS category_name,
            tc.category_key
     FROM assets a
     JOIN ticket_categories tc ON a.category_id = tc.id
     WHERE a.category_id = $1
       AND a.status       = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM asset_assignments aa
         WHERE aa.asset_id    = a.id
           AND aa.returned_at IS NULL
       )
     ORDER BY a.updated_at ASC
     LIMIT 1`,
    [category_id]
  )
  return rows[0] ?? null
}

export { findById, findBySerial, findByAssignedUser, findAll, getHistory,
         findUnassignedRoundRobin, create, updateSpec, deleteById, updateStatus, transferOwnership }
