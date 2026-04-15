import pool from '../config/db'
import type { TypeKey } from '../types'

async function generateTicketId(typeKey: TypeKey): Promise<string> {
  let prefix: string
  switch (typeKey) {
    case 'complaint': prefix = 'C'; break
    case 'request':   prefix = 'R'; break
    case 'data':      prefix = 'D'; break
    default:
      throw new Error(`Unknown ticket type: ${typeKey as string}`)
  }

  const year    = new Date().getFullYear()
  const pattern = `UIIC-${prefix}-${year}-%`

  const { rows } = await pool.query<{ last_seq: string }>(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_no, '-', 4) AS INTEGER)), 0) AS last_seq
     FROM tickets
     WHERE ticket_no LIKE $1`,
    [pattern]
  )

  const lastSeq = parseInt(rows[0].last_seq, 10)
  return `UIIC-${prefix}-${year}-${String(lastSeq + 1).padStart(6, '0')}`
}

export = generateTicketId
