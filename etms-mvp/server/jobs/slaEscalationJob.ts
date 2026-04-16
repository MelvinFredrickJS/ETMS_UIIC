import cron from 'node-cron'
import pool from '../config/db'
import * as ticketModel from '../models/ticketModel'
import * as emailService from '../services/emailService'

async function runSlaEscalationCheck(): Promise<void> {
  const client = await pool.connect()
  try {
    const { rows } = await client.query<{
      id: number
      ticket_no: string
      category_id: number
      category_name: string
      title: string
      assigned_to_name: string | null
      raised_by_name: string | null
      manager_email: string | null
      sla_due_date: string
    }>(
      `SELECT t.id,
              t.ticket_no,
              t.category_id,
              tc.name AS category_name,
              t.title,
              assigned.name AS assigned_to_name,
              raiser.name AS raised_by_name,
              mgr.email AS manager_email,
              t.sla_due_date
       FROM tickets t
       JOIN ticket_categories tc ON tc.id = t.category_id
       LEFT JOIN users assigned ON assigned.id = t.assigned_to
       JOIN users raiser ON raiser.id = t.raised_by
       LEFT JOIN users mgr ON mgr.id = tc.manager_user_id
       WHERE t.status IN ('assigned', 'in_progress')
         AND t.sla_due_date < NOW()
         AND (
           t.escalated = FALSE
           OR t.escalated_at IS NULL
           OR t.escalated_at <= NOW() - INTERVAL '24 hours'
         )`
    )

    for (const ticket of rows) {
      await client.query(
        `UPDATE tickets
         SET escalated = TRUE,
             escalated_at = COALESCE(escalated_at, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [ticket.id]
      )

      await ticketModel.logAction({
        ticket_id: ticket.id,
        action: 'SLA_ESCALATED',
        old_status: null,
        new_status: null,
        performed_by: null,
        note: `SLA overdue since ${ticket.sla_due_date}`,
      })

      if (ticket.manager_email) {
        await emailService.sendSlaEscalationEmail({
          id: ticket.id,
          ticket_no: ticket.ticket_no,
          category_id: ticket.category_id,
          category_name: ticket.category_name,
          title: ticket.title,
          assigned_to_name: ticket.assigned_to_name ?? ticket.raised_by_name ?? 'N/A',
          sla_due_date: ticket.sla_due_date,
          escalated_at: new Date().toISOString(),
        } as unknown as Parameters<typeof emailService.sendSlaEscalationEmail>[0], ticket.manager_email)
      }
    }
  } finally {
    client.release()
  }
}

function startSlaEscalationJob(): void {
  const schedule = process.env.SLA_CRON_SCHEDULE || '0 0 * * *'
  cron.schedule(schedule, () => {
    runSlaEscalationCheck().catch(err => {
      console.error('[slaEscalationJob] failed:', (err as Error).message)
    })
  })
}

export { startSlaEscalationJob, runSlaEscalationCheck }