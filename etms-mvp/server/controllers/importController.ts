import type { Request, Response } from 'express'
import * as XLSX from 'xlsx'
import pool from '../config/db'
import * as categoryModel from '../models/categoryModel'
import * as assetModel from '../models/assetModel'

// ── Column name normaliser ────────────────────────────────────────────────────
function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/[\s/]+/g, '_')
}

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

interface ImportRow {
  emp_id: string
  user_name: string
  machine_type: string
  model: string
  machine_serial: string
  ram: string
  hdd: string
  monitor_serial: string
  monitor_make: string
  system_ip: string
  port: string
  ms_office_ver: string
  os: string
  host_id: string
  floor: string
  branch: string
}

function parseRow(raw: Record<string, unknown>): ImportRow | null {
  const emp_id = cell(raw, 'emp_id', 'empid', 'emp id', 'emp_id')
  if (!emp_id) return null

  return {
    emp_id,
    user_name:      cell(raw, 'user_name', 'username', 'name', 'user_name'),
    // department and branch are stored but not used for category mapping
    machine_type:   cell(raw, 'machine_type', 'machinetype', 'machine_t'),
    model:          cell(raw, 'model'),
    machine_serial: cell(raw, 'machine_s.no', 'machine_sno', 'machine_s_no', 'machine_serial', 'serial'),
    ram:            cell(raw, 'ram'),
    hdd:            cell(raw, 'hdd'),
    monitor_serial: cell(raw, 'monitor_tft_sr.no', 'monitor_sr.no', 'monitor_serial', 'monitor_tft_sr_no', 'monitor_tft_sr.no'),
    monitor_make:   cell(raw, 'monitor_make', 'monitor_m'),
    system_ip:      cell(raw, 'system_ip', 'systemip', 'ip'),
    port:           cell(raw, 'port'),
    ms_office_ver:  cell(raw, 'ms_office_version', 'ms_office_ver', 'ms_office'),
    os:             cell(raw, 'os'),
    host_id:        cell(raw, 'host_id', 'hostid'),
    floor:          cell(raw, 'floor'),
    branch:         cell(raw, 'branch'),
  }
}

export async function importAssetsFromExcel(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded.' })
    return
  }

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    if (rawRows.length === 0) {
      res.status(400).json({ success: false, message: 'Excel sheet is empty.' })
      return
    }

    const normalisedRows: Record<string, unknown>[] = rawRows.map(row => {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(row)) out[norm(k)] = v
      return out
    })

    const parsed = normalisedRows.map(parseRow).filter((r): r is ImportRow => r !== null)

    if (parsed.length === 0) {
      res.status(400).json({ success: false, message: 'No valid rows found. Check that the sheet has an "Emp ID" column.' })
      return
    }

    // All imported assets go to the infra_team category
    const infraTeam = await categoryModel.findByKey('infra_team')
    if (!infraTeam) {
      res.status(500).json({ success: false, message: 'infra_team category not found in DB.' })
      return
    }
    const infraCategoryId = infraTeam.id

    const results = { imported: 0, skipped: 0, errors: [] as string[] }

    for (const row of parsed) {
      try {
        const { rows: userRows } = await pool.query<{ id: number; name: string }>(
          'SELECT id, name FROM users WHERE emp_id = $1',
          [row.emp_id]
        )

        if (!userRows.length) {
          results.skipped++
          results.errors.push(`Emp ID ${row.emp_id} (${row.user_name}) — user not found, skipped.`)
          continue
        }

        const userId = userRows[0].id

        // Build asset name from model + machine_type
        const nameParts = [row.model || row.machine_type || 'PC']
        const specs: string[] = []
        if (row.ram) specs.push(`${row.ram} RAM`)
        if (row.hdd) specs.push(`${row.hdd} HDD`)
        if (specs.length) nameParts.push(`(${specs.join(' / ')})`)
        const assetName = nameParts.join(' ').trim() || 'PC'

        const serial = row.machine_serial || row.system_ip || `AUTO-${row.emp_id}-${Date.now()}`

        const { rows: existingRows } = await pool.query<{ id: number; assigned_to: number }>(
          'SELECT id, assigned_to FROM assets WHERE serial_number = $1',
          [serial]
        )

        if (existingRows.length) {
          // Asset exists — update spec fields and reassign if needed
          const existing = existingRows[0]
          const client = await pool.connect()
          try {
            await client.query('BEGIN')
            // Update spec columns
            await client.query(
              `UPDATE assets SET
                machine_type = $2, model = $3, ram = $4, hdd = $5,
                monitor_serial = $6, monitor_make = $7, system_ip = $8,
                port = $9, ms_office_ver = $10, os = $11, host_id = $12,
                floor = $13, branch = $14, updated_at = NOW()
               WHERE id = $1`,
              [existing.id, row.machine_type || null, row.model || null,
               row.ram || null, row.hdd || null, row.monitor_serial || null,
               row.monitor_make || null, row.system_ip || null, row.port || null,
               row.ms_office_ver || null, row.os || null, row.host_id || null,
               row.floor || null, row.branch || null]
            )
            // Reassign if different user
            if (existing.assigned_to !== userId) {
              await client.query(
                `UPDATE asset_assignments SET returned_at = NOW() WHERE asset_id = $1 AND returned_at IS NULL`,
                [existing.id]
              )
              await client.query(
                `INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, note)
                 VALUES ($1, $2, $3, $4, 'Imported from Excel')`,
                [existing.id, existing.assigned_to, userId, req.user.id]
              )
              await client.query(
                `UPDATE assets SET assigned_to = $2, updated_at = NOW() WHERE id = $1`,
                [existing.id, userId]
              )
            }
            await client.query('COMMIT')
          } catch (e) {
            await client.query('ROLLBACK'); throw e
          } finally { client.release() }
          results.imported++
          continue
        }

        // New asset — insert with all spec fields
        const asset = await assetModel.create({
          name: assetName, serial_number: serial,
          category_id: infraCategoryId, assigned_to: userId, status: 'active',
          machine_type: row.machine_type || null, model: row.model || null,
          ram: row.ram || null, hdd: row.hdd || null,
          monitor_serial: row.monitor_serial || null, monitor_make: row.monitor_make || null,
          system_ip: row.system_ip || null, port: row.port || null,
          ms_office_ver: row.ms_office_ver || null, os: row.os || null,
          host_id: row.host_id || null, floor: row.floor || null, branch: row.branch || null,
        })

        await pool.query(
          `INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, note)
           VALUES ($1, NULL, $2, $3, 'Imported from Excel')`,
          [asset.id, userId, req.user.id]
        )

        results.imported++

        // Also import monitor as a separate asset if serial present
        if (row.monitor_serial) {
          const monSerial = row.monitor_serial
          const { rows: monExisting } = await pool.query<{ id: number }>(
            'SELECT id FROM assets WHERE serial_number = $1', [monSerial]
          )
          if (!monExisting.length) {
            const monAsset = await assetModel.create({
              name: `Monitor ${row.monitor_make || ''}`.trim() || 'Monitor',
              serial_number: monSerial,
              category_id: infraCategoryId, assigned_to: userId, status: 'active',
              monitor_make: row.monitor_make || null, monitor_serial: monSerial,
              floor: row.floor || null, branch: row.branch || null,
            })
            await pool.query(
              `INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, note)
               VALUES ($1, NULL, $2, $3, 'Imported from Excel (monitor)')`,
              [monAsset.id, userId, req.user.id]
            )
          }
        }

      } catch (rowErr) {
        results.errors.push(`Emp ID ${row.emp_id} — ${(rowErr as Error).message}`)
        results.skipped++
      }
    }

    res.status(200).json({
      success: true,
      message: `Import complete. ${results.imported} assets imported, ${results.skipped} skipped.`,
      imported: results.imported, skipped: results.skipped, errors: results.errors,
    })
  } catch (err) {
    console.error('importAssetsFromExcel error:', err)
    res.status(500).json({ success: false, message: 'Failed to parse Excel file.' })
  }
}
