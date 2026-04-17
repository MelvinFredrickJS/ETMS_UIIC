const http = require('http')

const BASE_URL = process.env.ETMS_BASE_URL || 'http://localhost:5000'

const ASSIGNEE_EMAILS = (
  process.env.ETMS_ASSIGNEE_EMAILS ||
  process.env.ETMS_EMPLOYEE_EMAILS ||
  ['tech1@uiic.co.in', 'net1@uiic.co.in', 'infra1@uiic.co.in'].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const ASSIGNEE_PASSWORDS = (
  process.env.ETMS_ASSIGNEE_PASSWORDS ||
  process.env.ETMS_PASSWORDS ||
  [process.env.ETMS_ASSIGNEE_PASSWORD, process.env.ETMS_EMPLOYEE_PASSWORD, 'Password@123']
    .filter(Boolean)
    .join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const EXPLICIT_TICKET_ID = Number(process.env.ETMS_ASSIGNEE_TICKET_ID || '') || null

function request(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint)
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} })
          } catch {
            resolve({ status: res.statusCode, body: data })
          }
        })
      }
    )

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertStatus(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`)
}

async function loginAssignee() {
  const attempts = []
  for (const email of ASSIGNEE_EMAILS) {
    for (const password of ASSIGNEE_PASSWORDS) {
      const res = await request('POST', '/api/auth/login', { email, password })
      attempts.push(`${email}:${res.status}`)
      if (res.status === 200 && res.body?.token && res.body?.user?.role === 'employee') {
        return { token: res.body.token, user: res.body.user }
      }
    }
  }
  throw new Error(`assignee login failed. Attempts: ${attempts.join(', ') || 'none'}`)
}

async function pickTicket(token, userId) {
  if (EXPLICIT_TICKET_ID) {
    const detail = await request('GET', `/api/tickets/${EXPLICIT_TICKET_ID}`, null, token)
    assertStatus(detail.status, 200, 'explicit ticket detail')
    const ticket = detail.body.ticket
    assert(Number(ticket.assigned_to) === Number(userId), 'explicit ticket is not assigned to assignee')
    assert(['assigned', 'in_progress'].includes(ticket.status), `explicit ticket must be assigned/in_progress, got ${ticket.status}`)
    return ticket
  }

  const assignedRes = await request('GET', '/api/tickets?view=assigned&status=assigned&page=1&limit=20', null, token)
  assertStatus(assignedRes.status, 200, 'assigned tickets query')
  const assigned = (assignedRes.body.tickets || [])[0]
  if (assigned) return assigned

  const inProgressRes = await request('GET', '/api/tickets?view=assigned&status=in_progress&page=1&limit=20', null, token)
  assertStatus(inProgressRes.status, 200, 'in_progress tickets query')
  const inProgress = (inProgressRes.body.tickets || [])[0]
  if (inProgress) return inProgress

  throw new Error('no assigned/in_progress ticket found for assignee. Set ETMS_ASSIGNEE_TICKET_ID to a suitable ticket id.')
}

async function run() {
  console.log('============================================================')
  console.log('ETMS REPORTED TRANSITION REGRESSION')
  console.log(`Target: ${BASE_URL}`)
  console.log('============================================================')

  const { token, user } = await loginAssignee()
  console.log(`Assignee login ok: ${user.email} (id=${user.id})`)

  const ticket = await pickTicket(token, user.id)
  console.log(`Using ticket: #${ticket.ticket_no} (id=${ticket.id}, status=${ticket.status})`)

  if (ticket.status === 'assigned') {
    const startRes = await request('PUT', `/api/tickets/${ticket.id}/status`, { status: 'in_progress' }, token)
    assertStatus(startRes.status, 200, 'set in_progress')
  }

  const reason = `Regression check: assignee reported issue at ${new Date().toISOString()}`
  const reportRes = await request(
    'PUT',
    `/api/tickets/${ticket.id}/status`,
    { status: 'reported', report_reason: reason },
    token
  )
  assertStatus(reportRes.status, 200, 'set reported')

  const detailRes = await request('GET', `/api/tickets/${ticket.id}`, null, token)
  assertStatus(detailRes.status, 200, 'detail after report')

  const updated = detailRes.body.ticket
  const logs = detailRes.body.logs || []

  assert(updated.status === 'reported', `expected status=reported, got ${updated.status}`)
  assert((updated.report_reason || '').includes('Regression check: assignee reported issue'), 'report_reason not persisted')

  const hasReportedByAssignee = logs.some((l) => l.action === 'REPORTED_BY_ASSIGNEE' && (l.note || '').includes('Regression check: assignee reported issue'))
  assert(hasReportedByAssignee, 'missing REPORTED_BY_ASSIGNEE log with reason')

  console.log('PASS: in_progress -> reported persisted and logged correctly')
}

run().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
