import { sendMail } from '../config/mailer'
import type { TicketRow } from '../types'

function buildEmailLayout({ heading, rows, footer }: {
  heading: string
  rows: [string, string | null | undefined][]
  footer: string
}): string {
  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;width:40%;border-bottom:1px solid #eee;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;color:#222;border-bottom:1px solid #eee;vertical-align:top;">${value ?? 'N/A'}</td>
    </tr>`).join('')

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:#1B3A6B;padding:24px 32px;">
                  <p style="margin:0;font-size:11px;color:#a0b4d6;letter-spacing:1px;text-transform:uppercase;">United India Insurance Co. Ltd.</p>
                  <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">${heading}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:4px;">
                    ${tableRows}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;">
                  <p style="margin:0;font-size:13px;color:#777;">${footer}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 32px;background:#1B3A6B;">
                  <p style="margin:0;font-size:11px;color:#a0b4d6;">ETMS — Employee Ticket Management System &nbsp;|&nbsp; This is an automated message, please do not reply.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`
}

function fmt(date: string | null | undefined): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

async function sendPendingApprovalEmail(ticket: TicketRow, managerEmail: string): Promise<void> {
  const subject = `[ETMS] Approval Required: ${ticket.ticket_no}`
  const html = buildEmailLayout({
    heading: 'Approval Required',
    rows: [
      ['Ticket No',  ticket.ticket_no],
      ['Type',       ticket.type_name ?? ticket.type_key ?? 'N/A'],
      ['Category',   ticket.category_name ?? ''],
      ['Title',      ticket.title],
      ['Priority',   ticket.priority],
      ['Raised By',  ticket.raised_by_name ?? ''],
      ['Date',       fmt(ticket.created_at)],
    ],
    footer: 'Log in to ETMS to approve or reject this ticket.',
  })
  sendMail(managerEmail, subject, html).catch(err =>
    console.error('[emailService] sendPendingApprovalEmail failed:', (err as Error).message)
  )
}

async function sendTicketApprovedEmail(ticket: TicketRow, employeeEmail: string): Promise<void> {
  const subject = `[ETMS] Your Ticket ${ticket.ticket_no} Has Been Approved`
  const html = buildEmailLayout({
    heading: 'Ticket Approved',
    rows: [
      ['Ticket No',     ticket.ticket_no],
      ['Category',      ticket.category_name ?? ''],
      ['Title',         ticket.title],
      ['Assigned To',   ticket.assigned_to_name ?? 'N/A'],
      ['Date Approved', fmt(ticket.updated_at)],
    ],
    footer: 'Your ticket has been assigned to our team and is being worked on.',
  })
  sendMail(employeeEmail, subject, html).catch(err =>
    console.error('[emailService] sendTicketApprovedEmail failed:', (err as Error).message)
  )
}

async function sendApprovalConfirmationToManager(ticket: TicketRow, managerEmail: string): Promise<void> {
  const subject = `[ETMS] Approval Confirmed: ${ticket.ticket_no}`
  const html = buildEmailLayout({
    heading: 'Approval Confirmed',
    rows: [
      ['Ticket No',     ticket.ticket_no],
      ['Category',      ticket.category_name ?? ''],
      ['Title',         ticket.title],
      ['Assigned To',   ticket.assigned_to_name ?? 'N/A'],
      ['Date Approved', fmt(ticket.updated_at)],
    ],
    footer: 'The ticket has been approved and assigned successfully.',
  })
  sendMail(managerEmail, subject, html).catch(err =>
    console.error('[emailService] sendApprovalConfirmationToManager failed:', (err as Error).message)
  )
}

async function sendTicketRejectedEmail(ticket: TicketRow, employeeEmail: string): Promise<void> {
  const subject = `[ETMS] Your Ticket ${ticket.ticket_no} Was Rejected`
  const html = buildEmailLayout({
    heading: 'Ticket Rejected',
    rows: [
      ['Ticket No',        ticket.ticket_no],
      ['Category',         ticket.category_name ?? ''],
      ['Title',            ticket.title],
      ['Rejection Reason', ticket.rejection_reason ?? 'N/A'],
      ['Date',             fmt(ticket.updated_at)],
    ],
    footer: 'Please contact your manager if you have questions.',
  })
  sendMail(employeeEmail, subject, html).catch(err =>
    console.error('[emailService] sendTicketRejectedEmail failed:', (err as Error).message)
  )
}

async function sendTicketAssignedToEmployeeEmail(ticket: TicketRow, employeeEmail: string): Promise<void> {
  const subject = `[ETMS] New Ticket Assigned to You: ${ticket.ticket_no}`
  const html = buildEmailLayout({
    heading: 'New Ticket Assigned to You',
    rows: [
      ['Ticket No', ticket.ticket_no],
      ['Type',      ticket.type_name ?? ticket.type_key ?? 'N/A'],
      ['Category',  ticket.category_name ?? ''],
      ['Title',     ticket.title],
      ['Priority',  ticket.priority],
      ['Raised By', ticket.raised_by_name ?? ''],
    ],
    footer: 'Log in to ETMS to work on this ticket.',
  })
  sendMail(employeeEmail, subject, html).catch(err =>
    console.error('[emailService] sendTicketAssignedToEmployeeEmail failed:', (err as Error).message)
  )
}

async function sendTicketResolvedEmail(ticket: TicketRow, raisedByEmail: string): Promise<void> {
  const subject = `[ETMS] Your Ticket ${ticket.ticket_no} Has Been Resolved`
  const html = buildEmailLayout({
    heading: 'Ticket Resolved',
    rows: [
      ['Ticket No',   ticket.ticket_no],
      ['Title',       ticket.title],
      ['Resolved By', ticket.assigned_to_name ?? 'N/A'],
      ['Date',        fmt(ticket.updated_at)],
    ],
    footer: 'Please log in to confirm the resolution and close the ticket.',
  })
  sendMail(raisedByEmail, subject, html).catch(err =>
    console.error('[emailService] sendTicketResolvedEmail failed:', (err as Error).message)
  )
}

async function sendEscalationEmail(ticket: TicketRow, managerEmail: string): Promise<void> {
  const subject = `[ETMS] Escalation — Ticket ${ticket.ticket_no} Reported`
  const html = buildEmailLayout({
    heading: 'Ticket Escalated',
    rows: [
      ['Ticket No',     ticket.ticket_no],
      ['Category',      ticket.category_name ?? ''],
      ['Title',         ticket.title],
      ['Employee',      ticket.assigned_to_name ?? ticket.raised_by_name ?? 'N/A'],
      ['Report Reason', ticket.report_reason ?? 'N/A'],
      ['Date',          fmt(ticket.updated_at)],
    ],
    footer: 'This ticket has been escalated and is back in your approval queue.',
  })
  sendMail(managerEmail, subject, html).catch(err =>
    console.error('[emailService] sendEscalationEmail failed:', (err as Error).message)
  )
}

async function sendSlaEscalationEmail(ticket: TicketRow, managerEmail: string): Promise<void> {
  const subject = `[ETMS] SLA Overdue: ${ticket.ticket_no}`
  const html = buildEmailLayout({
    heading: 'SLA Overdue',
    rows: [
      ['Ticket No',     ticket.ticket_no],
      ['Category',      ticket.category_name ?? ''],
      ['Title',         ticket.title],
      ['Assigned To',   ticket.assigned_to_name ?? 'N/A'],
      ['SLA Due Date',  fmt(ticket.sla_due_date)],
      ['Escalated At',  fmt(ticket.escalated_at)],
    ],
    footer: 'This ticket has crossed its SLA threshold and remains open.',
  })
  sendMail(managerEmail, subject, html).catch(err =>
    console.error('[emailService] sendSlaEscalationEmail failed:', (err as Error).message)
  )
}

export {
  sendPendingApprovalEmail,
  sendTicketApprovedEmail,
  sendApprovalConfirmationToManager,
  sendTicketRejectedEmail,
  sendTicketAssignedToEmployeeEmail,
  sendTicketResolvedEmail,
  sendEscalationEmail,
  sendSlaEscalationEmail,
}
