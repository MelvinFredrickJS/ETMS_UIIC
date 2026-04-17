const http = require('http')

const BASE_URL = process.env.ETMS_BASE_URL || 'http://localhost:5000'

const MANAGER_EMAIL_CANDIDATES = (
  process.env.ETMS_MANAGER_EMAILS ||
  ['mgr.network@uiic.co.in', 'mgr.infra@uiic.co.in', 'mgr.alpha@uiic.co.in'].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const EMPLOYEE_EMAIL_CANDIDATES = (
  process.env.ETMS_EMPLOYEE_EMAILS ||
  ['tech1@uiic.co.in', 'net1@uiic.co.in', 'infra1@uiic.co.in'].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const PASSWORD_CANDIDATES = (
  process.env.ETMS_PASSWORDS ||
  [
    process.env.ETMS_MANAGER_PASSWORD,
    process.env.ETMS_EMPLOYEE_PASSWORD,
    process.env.ETMS_ADMIN_PASSWORD,
    'Password@123',
  ]
    .filter(Boolean)
    .join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const state = {
  adminToken: null,
  managerToken: null,
  employeeToken: null,
  assigneeToken: null,
  managerUser: null,
  employeeUser: null,
  assigneeUser: null,
  targetCategory: null,
  targetTeam: null,
  targetTicket: null,
}

const results = { total: 0, passed: 0, failed: 0 }

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

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

function expectStatus(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`)
}

async function test(name, fn) {
  results.total += 1
  try {
    await fn()
    results.passed += 1
    console.log(`PASS: ${name}`)
  } catch (err) {
    results.failed += 1
    console.log(`FAIL: ${name} :: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function loginWithCandidates(roleLabel, emails, passwords) {
  const attempts = []
  for (const email of emails) {
    for (const password of passwords) {
      const res = await request('POST', '/api/auth/login', { email, password })
      attempts.push(`${email}:${res.status}`)
      if (res.status === 200 && res.body?.token) {
        return { token: res.body.token, user: res.body.user }
      }
    }
  }
  throw new Error(`${roleLabel} login failed. Attempts: ${attempts.join(', ') || 'none'}`)
}

async function ensureManagerUser() {
  try {
    const { token, user } = await loginWithCandidates('manager', MANAGER_EMAIL_CANDIDATES, PASSWORD_CANDIDATES)
    state.managerToken = token
    state.managerUser = user
    return
  } catch {
    expect(!!state.adminToken, 'admin token required to bootstrap manager user')

    const categoriesRes = await request('GET', '/api/categories', null, state.adminToken)
    expectStatus(categoriesRes.status, 200, 'categories fetch for manager bootstrap')

    const allCategories = (categoriesRes.body.types || []).flatMap((t) => t.categories || [])
    const managerCategory = allCategories.find((c) => c.requires_approval && !c.is_team) || allCategories.find((c) => !c.is_team)
    expect(!!managerCategory?.id, 'no category available for manager bootstrap')

    const ts = Date.now()
    const email = `mgr.cycle.${ts}@uiic.co.in`
    const password = process.env.ETMS_BOOTSTRAP_MANAGER_PASSWORD || 'Password@123'

    const createRes = await request(
      'POST',
      '/api/users',
      {
        emp_id: `MGRCYC${String(ts).slice(-6)}`,
        name: 'Manager Cycle User',
        email,
        password,
        role: 'manager',
        category_id: managerCategory.id,
        team: managerCategory.team_name || 'IT',
      },
      state.adminToken
    )
    expectStatus(createRes.status, 201, 'manager bootstrap create')

    const loginRes = await request('POST', '/api/auth/login', { email, password })
    expectStatus(loginRes.status, 200, 'manager bootstrap login')
    state.managerToken = loginRes.body.token
    state.managerUser = loginRes.body.user
  }
}

async function ensureEmployeeUser(categoryId, teamName) {
  try {
    const { token, user } = await loginWithCandidates('employee', EMPLOYEE_EMAIL_CANDIDATES, PASSWORD_CANDIDATES)
    state.employeeToken = token
    state.employeeUser = user
    return
  } catch {
    expect(!!state.adminToken, 'admin token required to bootstrap employee user')

    const ts = Date.now()
    const email = `emp.cycle.${ts}@uiic.co.in`
    const password = process.env.ETMS_BOOTSTRAP_EMPLOYEE_PASSWORD || 'Password@123'

    const createRes = await request(
      'POST',
      '/api/users',
      {
        emp_id: `EMPCYC${String(ts).slice(-6)}`,
        name: 'Employee Cycle User',
        email,
        password,
        role: 'employee',
        category_id: categoryId,
        team: teamName || 'IT',
      },
      state.adminToken
    )
    expectStatus(createRes.status, 201, 'employee bootstrap create')

    const loginRes = await request('POST', '/api/auth/login', { email, password })
    expectStatus(loginRes.status, 200, 'employee bootstrap login')
    state.employeeToken = loginRes.body.token
    state.employeeUser = loginRes.body.user
  }
}

async function ensureDedicatedAssignee(teamCategoryId, teamName) {
  expect(!!state.adminToken, 'admin token required to bootstrap dedicated assignee')

  const ts = Date.now()
  const email = `emp.assignee.${ts}@uiic.co.in`
  const password = process.env.ETMS_BOOTSTRAP_EMPLOYEE_PASSWORD || 'Password@123'

  const createRes = await request(
    'POST',
    '/api/users',
    {
      emp_id: `EMPASG${String(ts).slice(-6)}`,
      name: 'Employee Dedicated Assignee',
      email,
      password,
      role: 'employee',
      category_id: teamCategoryId,
      team: teamName || 'IT',
    },
    state.adminToken
  )
  expectStatus(createRes.status, 201, 'dedicated assignee bootstrap create')

  const loginRes = await request('POST', '/api/auth/login', { email, password })
  expectStatus(loginRes.status, 200, 'dedicated assignee bootstrap login')
  state.assigneeToken = loginRes.body.token
  state.assigneeUser = loginRes.body.user
}

function getLogCount(logs, action) {
  return (logs || []).filter((log) => log.action === action).length
}

function makeTicketPayload(category, suffix) {
  return {
    title: `Cycle Consistency ${suffix}`,
    description: `Ticket ${suffix} validates status and audit consistency for reported transitions.`,
    ticket_type_id: Number(category.ticket_type_id),
    category_id: Number(category.id),
    priority: 'medium',
    sla_days: 3,
  }
}

async function run() {
  console.log('============================================================')
  console.log('ETMS TICKET CYCLE CONSISTENCY TEST')
  console.log(`Target: ${BASE_URL}`)
  console.log('============================================================')

  await test('Admin login succeeds', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'admin@uiic.co.in',
      password: 'Password@123',
    })
    expectStatus(res.status, 200, 'admin login')
    state.adminToken = res.body.token
  })

  await test('Manager login succeeds', async () => {
    await ensureManagerUser()
    const { token, user } = { token: state.managerToken, user: state.managerUser }
    expect(user?.role === 'manager', 'manager role mismatch')
    expect(!!token, 'manager token missing')
  })

  await test('Pick a manager-owned approval category', async () => {
    const res = await request('GET', '/api/categories', null, state.adminToken)
    expectStatus(res.status, 200, 'categories fetch')

    const categories = (res.body.types || []).flatMap((t) => t.categories || [])
    const managerOwned = categories.find(
      (c) => c.requires_approval && !c.is_team && Number(c.manager_user_id || 0) === Number(state.managerUser.id)
    )

    const approvalCategory = managerOwned || categories.find((c) => c.requires_approval && !c.is_team)
    expect(!!approvalCategory, 'no approval category found')

    state.targetCategory = approvalCategory
  })

  await test('Resolve target mapped team for assignment', async () => {
    expect(!!state.targetCategory?.assigned_team_key, 'target category has no assigned_team_key')

    const teamsRes = await request('GET', '/api/categories/teams', null, state.adminToken)
    expectStatus(teamsRes.status, 200, 'teams fetch')

    const team = (teamsRes.body.teams || []).find(
      (t) => t.category_key === state.targetCategory.assigned_team_key
    )
    expect(!!team?.id, `could not resolve mapped team for key ${state.targetCategory.assigned_team_key}`)
    state.targetTeam = team
  })

  await test('Employee login/bootstrap succeeds', async () => {
    expect(!!state.targetCategory, 'target category missing before employee bootstrap')
    await ensureEmployeeUser(state.targetCategory.id, state.targetCategory.team_name)
    expect(state.employeeUser?.role === 'employee', 'employee role mismatch')
    expect(!!state.employeeToken, 'employee token missing')
  })

  await test('Dedicated assignee bootstrap succeeds in mapped team', async () => {
    expect(!!state.targetTeam?.id, 'target team missing before assignee bootstrap')
    await ensureDedicatedAssignee(state.targetTeam.id, state.targetTeam.name)
    expect(state.assigneeUser?.role === 'employee', 'dedicated assignee role mismatch')
    expect(!!state.assigneeToken, 'dedicated assignee token missing')
  })

  await test('Create and approve tickets until dedicated assignee is selected', async () => {
    expect(!!state.targetCategory, 'target category missing')
    const maxAttempts = Number(process.env.ETMS_ASSIGNMENT_ATTEMPTS || 12)
    let fallbackTicket = null
    let fallbackAssignedUserId = null

    for (let i = 1; i <= maxAttempts; i++) {
      const createRes = await request(
        'POST',
        '/api/tickets',
        makeTicketPayload(state.targetCategory, `A${Date.now()}-${i}`),
        state.employeeToken
      )
      if (createRes.status !== 201 || !createRes.body?.ticket?.id) continue

      const ticketId = createRes.body.ticket.id
      const approveRes = await request('POST', `/api/approvals/${ticketId}/approve`, {}, state.managerToken)
      if (approveRes.status !== 200) continue

      const detail = await request('GET', `/api/tickets/${ticketId}`, null, state.employeeToken)
      if (detail.status !== 200 || !detail.body?.ticket) continue

      const ticket = detail.body.ticket
      fallbackTicket = ticket
      fallbackAssignedUserId = ticket.assigned_to

      if (ticket.status === 'assigned' && Number(ticket.assigned_to) === Number(state.assigneeUser.id)) {
        state.targetTicket = ticket
        break
      }
    }

    if (!state.targetTicket && fallbackTicket && fallbackAssignedUserId) {
      const usersRes = await request('GET', '/api/users', null, state.adminToken)
      expectStatus(usersRes.status, 200, 'admin users list for fallback assignee')

      const fallbackUser = (usersRes.body.users || []).find(
        (user) => Number(user.id) === Number(fallbackAssignedUserId)
      )

      if (fallbackUser?.email) {
        for (const password of PASSWORD_CANDIDATES) {
          const loginRes = await request('POST', '/api/auth/login', {
            email: fallbackUser.email,
            password,
          })
          if (loginRes.status === 200 && loginRes.body?.token) {
            state.assigneeToken = loginRes.body.token
            state.assigneeUser = loginRes.body.user
            state.targetTicket = fallbackTicket
            break
          }
        }
      }
    }

    expect(
      !!state.targetTicket,
      'Could not get a usable assigned ticket. Increase ETMS_ASSIGNMENT_ATTEMPTS or set ETMS_EMPLOYEE_EMAILS/ETMS_PASSWORDS.'
    )
    expect(!!state.assigneeToken, 'assignee token missing for assigned ticket')
  })

  await test('Assignee reports from in_progress routes to raiser path (no escalation)', async () => {
    expect(!!state.targetTicket, 'target ticket missing before assignee report test')
    const ticketId = state.targetTicket.id

    const startRes = await request(
      'PUT',
      `/api/tickets/${ticketId}/status`,
      { status: 'in_progress' },
      state.assigneeToken
    )
    expectStatus(startRes.status, 200, 'set in_progress')

    const reportRes = await request(
      'PUT',
      `/api/tickets/${ticketId}/status`,
      { status: 'reported', note: 'Work blocker found during execution.' },
      state.assigneeToken
    )
    expectStatus(reportRes.status, 200, 'report from in_progress')

    const detail = await request('GET', `/api/tickets/${ticketId}`, null, state.assigneeToken)
    expectStatus(detail.status, 200, 'detail after in_progress report')

    const ticket = detail.body.ticket
    const logs = detail.body.logs || []

    expect(ticket.status === 'resolved', `expected resolved after in_progress report, got ${ticket.status}`)
    expect(getLogCount(logs, 'REPORTED_BY_ASSIGNEE') >= 1, 'missing REPORTED_BY_ASSIGNEE log')
    expect(getLogCount(logs, 'REPORTED_TO_RAISER') >= 1, 'missing REPORTED_TO_RAISER log')
    expect(getLogCount(logs, 'ESCALATED') === 0, 'unexpected ESCALATED log for in_progress report')
    expect(getLogCount(logs, 'BACK_TO_MANAGER') === 0, 'unexpected BACK_TO_MANAGER log for in_progress report')
  })

  await test('Raiser report from resolved escalates to manager pending approval', async () => {
    expect(!!state.targetTicket, 'target ticket missing before resolved report test')
    const ticketId = state.targetTicket.id

    const escalateRes = await request(
      'PUT',
      `/api/tickets/${ticketId}/status`,
      { status: 'reported', report_reason: 'Issue still persists after resolution verification.' },
      state.employeeToken
    )
    expectStatus(escalateRes.status, 200, 'report from resolved')

    const detail = await request('GET', `/api/tickets/${ticketId}`, null, state.employeeToken)
    expectStatus(detail.status, 200, 'detail after resolved report')

    const ticket = detail.body.ticket
    const logs = detail.body.logs || []

    expect(ticket.status === 'pending_approval', `expected pending_approval, got ${ticket.status}`)
    expect(getLogCount(logs, 'ESCALATED') >= 1, 'missing ESCALATED log after resolved report')
    expect(getLogCount(logs, 'BACK_TO_MANAGER') >= 1, 'missing BACK_TO_MANAGER log after resolved report')
  })

  await test('Re-approve does not synthesize extra ESCALATED/BACK_TO_MANAGER logs', async () => {
    expect(!!state.targetTicket, 'target ticket missing before reapprove test')
    const ticketId = state.targetTicket.id

    const before = await request('GET', `/api/tickets/${ticketId}`, null, state.employeeToken)
    expectStatus(before.status, 200, 'detail before reapprove')

    const logsBefore = before.body.logs || []
    const escalatedBefore = getLogCount(logsBefore, 'ESCALATED')
    const backBefore = getLogCount(logsBefore, 'BACK_TO_MANAGER')

    const employeesRes = await request(
      'GET',
      `/api/categories/${state.targetTicket.category_id}/employees`,
      null,
      state.managerToken
    )
    expectStatus(employeesRes.status, 200, 'manager category employees fetch')

    const assignee = (employeesRes.body.employees || []).find(
      (employee) => Number(employee.id) === Number(state.assigneeUser.id)
    )
    expect(!!assignee?.id, 'no eligible employee found for reapprove')

    const reapproveRes = await request(
      'POST',
      `/api/approvals/${ticketId}/reapprove`,
      { assigned_to: assignee.id },
      state.managerToken
    )
    expectStatus(reapproveRes.status, 200, 'reapprove ticket')

    const after = await request('GET', `/api/tickets/${ticketId}`, null, state.employeeToken)
    expectStatus(after.status, 200, 'detail after reapprove')

    const logsAfter = after.body.logs || []
    const escalatedAfter = getLogCount(logsAfter, 'ESCALATED')
    const backAfter = getLogCount(logsAfter, 'BACK_TO_MANAGER')

    expect(escalatedAfter === escalatedBefore, `ESCALATED count changed: ${escalatedBefore} -> ${escalatedAfter}`)
    expect(backAfter === backBefore, `BACK_TO_MANAGER count changed: ${backBefore} -> ${backAfter}`)
  })

  console.log('------------------------------------------------------------')
  console.log(`TOTAL:  ${results.total}`)
  console.log(`PASSED: ${results.passed}`)
  console.log(`FAILED: ${results.failed}`)
  console.log('------------------------------------------------------------')

  if (results.failed > 0) process.exitCode = 1
}

run().catch((err) => {
  console.error('Fatal test runner error:', err)
  process.exit(1)
})
