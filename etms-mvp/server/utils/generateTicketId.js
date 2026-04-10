// Generates a year-scoped unique ticket number.
// Format: UIIC-{C|R|D}-{YYYY}-{XXXXXX}
//
// Concurrency contract:
//   This function returns a candidate ID from a live DB snapshot.
//   Under concurrent inserts, candidates can collide.
//   Caller MUST handle err.code === '23505' on ticket_no unique violation with retry (max 3).

const pool = require('../config/db')

async function generateTicketId(typeKey) {
  let prefix
  switch (typeKey) {
    case 'complaint': prefix = 'C'; break
    case 'request':   prefix = 'R'; break
    case 'data':      prefix = 'D'; break
    default:
      throw new Error(`Unknown ticket type: ${typeKey}`)
  }

  const year    = new Date().getFullYear()
  const pattern = `UIIC-${prefix}-${year}-%`

  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_no, '-', 4) AS INTEGER)), 0) AS last_seq
     FROM tickets
     WHERE ticket_no LIKE $1`,
    [pattern]
  )

  const lastSeq = parseInt(rows[0].last_seq, 10)
  return `UIIC-${prefix}-${year}-${String(lastSeq + 1).padStart(6, '0')}`
  // Examples:
  //   generateTicketId('complaint') → 'UIIC-C-2026-000003'
  //   generateTicketId('request')   → 'UIIC-R-2026-000001'
  //   generateTicketId('data')      → 'UIIC-D-2026-000002'
}

module.exports = generateTicketId
