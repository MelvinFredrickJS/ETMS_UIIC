const http = require('http')
const fs = require('fs')
const path = require('path')

const BASE_URL = process.env.ETMS_BASE_URL || 'http://localhost:5000'

const MANAGER_EMAIL_CANDIDATES = (
  process.env.ETMS_MANAGER_EMAILS ||
  [
    'mgr.network@uiic.co.in',
    'mgr.infra@uiic.co.in',
    'mgr.alpha@uiic.co.in',
    'mgr.beta@uiic.co.in',
    'mgr.hardware@uiic.co.in',
    'mgr.software@uiic.co.in',
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const EMPLOYEE_EMAIL_CANDIDATES = (
  process.env.ETMS_EMPLOYEE_EMAILS ||
  ['net1@uiic.co.in', 'tech1@uiic.co.in', 'net.tech1@uiic.co.in', 'infra1@uiic.co.in'].join(',')
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
  managerToken: null,
  employeeToken: null,
  adminToken: null,
  managerUser: null,
  employeeUser: null,
  adminUser: null,
  categoriesByKey: {},
  managerTickets: [],
  pendingReapprovals: [],
  reportDevices: [],
}

const results = {
  passed: 0,
  failed: 0,
  total: 0,
}

const cases = []

function addCase(name, fn) {
  cases.push({ name, fn })
}

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
  if (Array.isArray(expected)) {
    if (!expected.includes(actual)) {
      throw new Error(`${label} expected one of [${expected.join(', ')}], got ${actual}`)
    }
    return
  }
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`)
  }
}

function readText(relPath) {
  const full = path.join(__dirname, relPath)
  return fs.readFileSync(full, 'utf8')
}

async function loginWithCandidates(roleLabel, emails, passwords) {
  const attempts = []

  for (const email of emails) {
    for (const password of passwords) {
      const res = await request('POST', '/api/auth/login', { email, password })
      attempts.push(`${email}:${res.status}`)
      if (res.status === 200 && res.body?.token) {
        return { res, email, password, attempts }
      }
    }
  }

  throw new Error(
    `${roleLabel} login failed for all candidates. Attempts: ${attempts.join(', ') || 'none'}`
  )
}

async function runCase(testCase, idx) {
  results.total += 1
  try {
    await testCase.fn()
    results.passed += 1
    console.log(`[PASS ${String(idx + 1).padStart(3, '0')}] ${testCase.name}`)
  } catch (err) {
    results.failed += 1
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[FAIL ${String(idx + 1).padStart(3, '0')}] ${testCase.name} :: ${msg}`)
  }
}

// -----------------------------------------------------------------------------
// 001-012: Authentication and baseline setup
// -----------------------------------------------------------------------------
addCase('Auth rejects invalid manager login', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: MANAGER_EMAIL_CANDIDATES[0] || 'mgr.network@uiic.co.in',
    password: 'Invalid@123',
  })
  expectStatus(res.status, 401, 'invalid manager login')
})

addCase('Admin login succeeds', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: 'admin@uiic.co.in',
    password: 'Password@123',
  })
  expectStatus(res.status, 200, 'admin login')
  state.adminToken = res.body.token
  state.adminUser = res.body.user
})

addCase('Manager login succeeds', async () => {
  try {
    const { res } = await loginWithCandidates('manager', MANAGER_EMAIL_CANDIDATES, PASSWORD_CANDIDATES)
    expectStatus(res.status, 200, 'manager login')
    expect(!!res.body.token, 'manager token missing')
    expect(res.body.user?.role === 'manager', 'manager role mismatch')
    state.managerToken = res.body.token
    state.managerUser = res.body.user
    return
  } catch {
    expect(!!state.adminToken, 'admin token required to bootstrap manager login')

    const categoriesRes = await request('GET', '/api/categories', null, state.adminToken)
    expectStatus(categoriesRes.status, 200, 'categories fetch for manager bootstrap')

    const allCategories = (categoriesRes.body.types || []).flatMap((t) => t.categories || [])
    const managerCategory = allCategories.find((c) => c.requires_approval && !c.is_team) || allCategories[0]
    expect(!!managerCategory?.id, 'no category available for manager bootstrap')

    const ts = Date.now()
    const bootstrapPassword = process.env.ETMS_BOOTSTRAP_MANAGER_PASSWORD || 'Password@123'
    const bootstrapEmail = `mgr.test.${ts}@uiic.co.in`

    const createRes = await request(
      'POST',
      '/api/users',
      {
        emp_id: `MGRTEST${String(ts).slice(-6)}`,
        name: 'Manager Test User',
        email: bootstrapEmail,
        password: bootstrapPassword,
        role: 'manager',
        category_id: managerCategory.id,
        team: managerCategory.team_name || 'IT',
      },
      state.adminToken
    )
    expectStatus(createRes.status, 201, 'bootstrap manager creation')

    const loginRes = await request('POST', '/api/auth/login', {
      email: bootstrapEmail,
      password: bootstrapPassword,
    })
    expectStatus(loginRes.status, 200, 'bootstrap manager login')
    expect(loginRes.body.user?.role === 'manager', 'bootstrap manager role mismatch')

    state.managerToken = loginRes.body.token
    state.managerUser = loginRes.body.user
  }
})

addCase('Employee login succeeds', async () => {
  try {
    const { res } = await loginWithCandidates('employee', EMPLOYEE_EMAIL_CANDIDATES, PASSWORD_CANDIDATES)
    expectStatus(res.status, 200, 'employee login')
    state.employeeToken = res.body.token
    state.employeeUser = res.body.user
    return
  } catch {
    expect(!!state.adminToken, 'admin token required to bootstrap employee login')

    const categoriesRes = await request('GET', '/api/categories', null, state.adminToken)
    expectStatus(categoriesRes.status, 200, 'categories fetch for employee bootstrap')

    const allCategories = (categoriesRes.body.types || []).flatMap((t) => t.categories || [])
    const employeeCategory = allCategories.find((c) => !c.is_team) || allCategories[0]
    expect(!!employeeCategory?.id, 'no category available for employee bootstrap')

    const ts = Date.now()
    const bootstrapPassword = process.env.ETMS_BOOTSTRAP_EMPLOYEE_PASSWORD || 'Password@123'
    const bootstrapEmail = `emp.test.${ts}@uiic.co.in`

    const createRes = await request(
      'POST',
      '/api/users',
      {
        emp_id: `EMPTEST${String(ts).slice(-6)}`,
        name: 'Employee Test User',
        email: bootstrapEmail,
        password: bootstrapPassword,
        role: 'employee',
        category_id: employeeCategory.id,
        team: employeeCategory.team_name || 'IT',
      },
      state.adminToken
    )
    expectStatus(createRes.status, 201, 'bootstrap employee creation')

    const loginRes = await request('POST', '/api/auth/login', {
      email: bootstrapEmail,
      password: bootstrapPassword,
    })
    expectStatus(loginRes.status, 200, 'bootstrap employee login')
    expect(loginRes.body.user?.role === 'employee', 'bootstrap employee role mismatch')

    state.employeeToken = loginRes.body.token
    state.employeeUser = loginRes.body.user
  }
})

addCase('Manager token works on /api/auth/me', async () => {
  const res = await request('GET', '/api/auth/me', null, state.managerToken)
  expectStatus(res.status, 200, '/api/auth/me manager')
  expect(res.body.user?.role === 'manager', 'auth/me role mismatch')
})

addCase('No token is blocked from /api/auth/me', async () => {
  const res = await request('GET', '/api/auth/me')
  expectStatus(res.status, 401, '/api/auth/me without token')
})

addCase('Manager can list categories', async () => {
  const res = await request('GET', '/api/categories', null, state.managerToken)
  expectStatus(res.status, 200, '/api/categories manager')
  expect(Array.isArray(res.body.types), 'types list missing')

  for (const type of res.body.types) {
    for (const cat of type.categories || []) {
      state.categoriesByKey[cat.category_key] = cat
    }
  }
})

addCase('Essential request categories are present', async () => {
  const required = ['gate_pass', 'port_request', 'adid_request', 'credential_request']
  for (const key of required) {
    expect(!!state.categoriesByKey[key], `missing category key: ${key}`)
  }
})

addCase('Seed-data validation: manager domain must have at least one forbidden category', async () => {
  const categories = Object.values(state.categoriesByKey)
  expect(categories.length > 0, 'no categories available for seed-data validation')

  let forbidden = 0
  let readable = 0

  for (const category of categories) {
    const res = await request('GET', `/api/categories/${category.id}/employees`, null, state.managerToken)
    if (res.status === 403) forbidden += 1
    if (res.status === 200) readable += 1
  }

  expect(
    forbidden > 0,
    `manager-domain leakage detected in seed data: readable=${readable}, forbidden=${forbidden}.` +
      ' Expected at least one non-owned category to be blocked with 403.'
  )
})

addCase('Manager can load managed tickets endpoint', async () => {
  const res = await request('GET', '/api/tickets?page=1&limit=25', null, state.managerToken)
  expectStatus(res.status, 200, '/api/tickets manager')
  expect(Array.isArray(res.body.tickets), 'manager tickets array missing')
  state.managerTickets = res.body.tickets
})

addCase('Manager can load pending re-approvals endpoint', async () => {
  const res = await request('GET', '/api/approvals/pending', null, state.managerToken)
  expectStatus(res.status, 200, '/api/approvals/pending manager')
  expect(Array.isArray(res.body.tickets), 'pending tickets array missing')
  state.pendingReapprovals = res.body.tickets
})

addCase('Manager can load reports endpoint', async () => {
  const res = await request('GET', '/api/reports/top-failing-devices?limit=10', null, state.managerToken)
  expectStatus(res.status, 200, '/api/reports/top-failing-devices manager')
  expect(Array.isArray(res.body.devices), 'devices array missing')
  state.reportDevices = res.body.devices
})

addCase('Admin endpoint is blocked for manager', async () => {
  const res = await request('GET', '/api/users', null, state.managerToken)
  expectStatus(res.status, 403, '/api/users manager access')
})

// -----------------------------------------------------------------------------
// 013-044: Permission matrix checks for manager role
// -----------------------------------------------------------------------------
const managerBlockedEndpoints = [
  ['POST', '/api/tickets', { title: 'X', description: 'Y', ticket_type_id: 1, category_id: 1, priority: 'low' }, [400, 403]],
  ['POST', '/api/assets', { name: 'A', serial_number: 'S', category_id: 1, assigned_to: 1 }, 403],
  ['GET', '/api/categories/teams', null, 403],
  ['POST', '/api/categories/teams', { name: 'X Team', manager_user_id: 1 }, 403],
  ['DELETE', '/api/categories/teams/1', null, 403],
  ['GET', '/api/users', null, 403],
  ['POST', '/api/users', { name: 'X' }, 403],
]

managerBlockedEndpoints.forEach(([method, endpoint, body, expected], i) => {
  addCase(`Manager blocked endpoint check ${String(i + 1).padStart(2, '0')} (${method} ${endpoint})`, async () => {
    const res = await request(method, endpoint, body, state.managerToken)
    expectStatus(res.status, expected, `${method} ${endpoint}`)
  })
})

const managerAllowedEndpoints = [
  ['GET', '/api/tickets?page=1&limit=5', null, 200],
  ['GET', '/api/approvals/pending', null, 200],
  ['GET', '/api/reports/top-failing-devices?limit=5', null, 200],
  ['GET', '/api/assets', null, 200],
  ['GET', '/api/assets/my', null, 200],
]

managerAllowedEndpoints.forEach(([method, endpoint, body, expected], i) => {
  addCase(`Manager allowed endpoint check ${String(i + 1).padStart(2, '0')} (${method} ${endpoint})`, async () => {
    const res = await request(method, endpoint, body, state.managerToken)
    expectStatus(res.status, expected, `${method} ${endpoint}`)
  })
})

addCase('Reports endpoint rejects invalid limit 0', async () => {
  const res = await request('GET', '/api/reports/top-failing-devices?limit=0', null, state.managerToken)
  expectStatus(res.status, 400, 'reports limit 0')
})

addCase('Reports endpoint rejects invalid limit > 50', async () => {
  const res = await request('GET', '/api/reports/top-failing-devices?limit=51', null, state.managerToken)
  expectStatus(res.status, 400, 'reports limit 51')
})

addCase('Reports endpoint accepts upper valid limit 50', async () => {
  const res = await request('GET', '/api/reports/top-failing-devices?limit=50', null, state.managerToken)
  expectStatus(res.status, 200, 'reports limit 50')
})

for (let i = 1; i <= 10; i++) {
  addCase(`Manager ticket list supports repeated paginated reads (${i})`, async () => {
    const res = await request('GET', `/api/tickets?page=1&limit=${5 + (i % 10)}`, null, state.managerToken)
    expectStatus(res.status, 200, `manager paginated read ${i}`)
    expect(Array.isArray(res.body.tickets), 'tickets is not array')
  })
}

for (let i = 1; i <= 7; i++) {
  addCase(`Manager pending approvals endpoint stable repeat check (${i})`, async () => {
    const res = await request('GET', '/api/approvals/pending', null, state.managerToken)
    expectStatus(res.status, 200, `pending approvals repeat ${i}`)
    expect(Array.isArray(res.body.tickets), 'pending tickets is not array')
  })
}

// -----------------------------------------------------------------------------
// 045-083: Data consistency and escalation/re-approval integrity checks
// -----------------------------------------------------------------------------
addCase('Managed tickets exclude re-approval pending records', async () => {
  const res = await request('GET', '/api/tickets?page=1&limit=100', null, state.managerToken)
  expectStatus(res.status, 200, 'manager tickets for exclusion rule')
  const bad = (res.body.tickets || []).filter(
    (t) => t.status === 'pending_approval' && t.report_reason
  )
  expect(bad.length === 0, `found ${bad.length} re-approval pending records in managed tickets`)
})

addCase('Pending approvals list contains only re-approval records', async () => {
  const res = await request('GET', '/api/approvals/pending', null, state.managerToken)
  expectStatus(res.status, 200, 'pending approvals consistency')
  const bad = (res.body.tickets || []).filter((t) => !t.report_reason || t.status !== 'pending_approval')
  expect(bad.length === 0, `found ${bad.length} invalid pending re-approval entries`)
})

addCase('Manager domain can read employees for at least one owned category', async () => {
  const categories = Object.values(state.categoriesByKey)
  expect(categories.length > 0, 'no categories available for domain check')

  let foundOwned = null
  for (const category of categories) {
    const res = await request('GET', `/api/categories/${category.id}/employees`, null, state.managerToken)
    if (res.status === 200) {
      foundOwned = { category, res }
      break
    }
  }

  expect(!!foundOwned, 'manager cannot access employees for any category')
  expect(Array.isArray(foundOwned.res.body.employees), 'employees list missing for owned category')
})

addCase('Manager domain blocks employee list for at least one non-owned category', async () => {
  const categories = Object.values(state.categoriesByKey)
  expect(categories.length > 0, 'no categories available for non-owned check')

  let foundForbidden = null
  let successfulReads = 0
  for (const category of categories) {
    const res = await request('GET', `/api/categories/${category.id}/employees`, null, state.managerToken)
    if (res.status === 403) {
      foundForbidden = category
      break
    }
    if (res.status === 200) {
      successfulReads += 1
    }
  }

  expect(
    !!foundForbidden,
    `manager-domain leakage detected: manager could read employees for all ${successfulReads} tested categories`
  )
})

for (let i = 1; i <= 12; i++) {
  addCase(`Manager report payload shape validation (${i})`, async () => {
    const limit = (i % 10) + 1
    const res = await request('GET', `/api/reports/top-failing-devices?limit=${limit}`, null, state.managerToken)
    expectStatus(res.status, 200, `reports shape ${i}`)

    const devices = res.body.devices || []
    for (const d of devices) {
      expect(typeof d.id === 'number', 'device.id must be number')
      expect(typeof d.name === 'string' && d.name.length > 0, 'device.name must be non-empty string')
      expect(typeof d.serial_number === 'string' && d.serial_number.length > 0, 'serial_number missing')
      expect(!Number.isNaN(Number(d.total_issues)), 'total_issues must be numeric-like')
    }
  })
}

for (let i = 1; i <= 8; i++) {
  addCase(`Report ordering consistency descending by issue count (${i})`, async () => {
    const res = await request('GET', '/api/reports/top-failing-devices?limit=10', null, state.managerToken)
    expectStatus(res.status, 200, `reports ordering ${i}`)
    const arr = res.body.devices || []
    for (let j = 1; j < arr.length; j++) {
      expect(Number(arr[j - 1].total_issues) >= Number(arr[j].total_issues), 'report not sorted DESC by issues')
    }
  })
}

for (let i = 1; i <= 10; i++) {
  addCase(`Pending re-approval records contain required core fields (${i})`, async () => {
    const res = await request('GET', '/api/approvals/pending', null, state.managerToken)
    expectStatus(res.status, 200, `pending core fields ${i}`)
    const arr = res.body.tickets || []
    for (const t of arr) {
      expect(typeof t.id === 'number', 'ticket id missing')
      expect(typeof t.ticket_no === 'string' && t.ticket_no.length > 0, 'ticket_no missing')
      expect(typeof t.category_id === 'number', 'category_id missing')
      expect(typeof t.report_reason === 'string' && t.report_reason.trim().length > 0, 'report_reason missing')
    }
  })
}

// If pending tickets exist, verify log consistency for up to 5 tickets.
for (let i = 0; i < 5; i++) {
  addCase(`Re-approval log consistency sample check ${i + 1}`, async () => {
    const resPending = await request('GET', '/api/approvals/pending', null, state.managerToken)
    expectStatus(resPending.status, 200, 'pending approvals before log check')

    const ticket = (resPending.body.tickets || [])[i]
    if (!ticket) return

    const detail = await request('GET', `/api/tickets/${ticket.id}`, null, state.managerToken)
    expectStatus(detail.status, 200, `ticket detail ${ticket.id}`)

    const logs = detail.body.logs || []
    const hasEscalated = logs.some((l) => l.action === 'ESCALATED')
    const hasBack = logs.some((l) => l.action === 'BACK_TO_MANAGER')
    expect(hasEscalated, `ticket ${ticket.id} missing ESCALATED log`)
    expect(hasBack, `ticket ${ticket.id} missing BACK_TO_MANAGER log`)
  })
}

// -----------------------------------------------------------------------------
// 084-100: Frontend component and workflow guard checks (static)
// -----------------------------------------------------------------------------
const staticChecks = [
  {
    name: 'App route guards /tickets/new employee only',
    file: 'client/src/App.tsx',
    mustContain: ["path=\"/tickets/new\"", 'roleRequired={ROLES.EMPLOYEE}'],
  },
  {
    name: 'App contains manager reports route',
    file: 'client/src/App.tsx',
    mustContain: ["path=\"/reports\"", 'roleRequired={ROLES.MANAGER}'],
  },
  {
    name: 'Sidebar shows manager reports link',
    file: 'client/src/components/layout/Sidebar.tsx',
    mustContain: ['to="/reports"', 'Reports'],
  },
  {
    name: 'Sidebar has no manager raise ticket entry',
    file: 'client/src/components/layout/Sidebar.tsx',
    mustContain: ['Raise Ticket', 'user?.role === ROLES.EMPLOYEE'],
  },
  {
    name: 'Tickets page hides raise button for manager',
    file: 'client/src/pages/TicketsPage.tsx',
    mustContain: ['user?.role === ROLES.EMPLOYEE', 'Raise Ticket'],
  },
  {
    name: 'Dashboard manager CTA includes reports',
    file: 'client/src/pages/DashboardPage.tsx',
    mustContain: ["navigate('/reports')", 'View Reports'],
  },
  {
    name: 'Reports page auto-refresh enabled',
    file: 'client/src/pages/ReportsPage.tsx',
    mustContain: ['setInterval', '30000', 'Live refresh every 30s'],
  },
  {
    name: 'Reports page includes trend visualization bars',
    file: 'client/src/pages/ReportsPage.tsx',
    mustContain: ['Issue Trend', 'style={{ width }}', 'transition-all'],
  },
  {
    name: 'Reports API helper exists',
    file: 'client/src/api/ticketApi.ts',
    mustContain: ['getTopFailingDevices', '/reports/top-failing-devices'],
  },
  {
    name: 'Ticket route blocks manager create API',
    file: 'server/routes/ticketRoutes.ts',
    mustContain: ['router.post', 'requireRole(ROLES.EMPLOYEE)'],
  },
  {
    name: 'Category controller manager domain guard exists',
    file: 'server/controllers/categoryController.ts',
    mustContain: ['managedCategoryIds', 'canViewRequestedCategory', 'canViewMappedTeam'],
  },
  {
    name: 'Approval controller checks manager ownership before log healing',
    file: 'server/controllers/approvalController.ts',
    mustContain: ['You do not have permission to manage this approval.', 'hasEscalatedLog', 'hasBackToManagerLog'],
  },
]

staticChecks.forEach((check) => {
  addCase(`Static workflow check: ${check.name}`, async () => {
    const txt = readText(check.file)
    for (const fragment of check.mustContain) {
      expect(txt.includes(fragment), `missing fragment in ${check.file}: ${fragment}`)
    }
  })
})

for (let i = 1; i <= 4; i++) {
  addCase(`Reports page real-time static resiliency check ${i}`, async () => {
    const txt = readText('client/src/pages/ReportsPage.tsx')
    expect(txt.includes('load(false)'), 'manual refresh hook missing')
    expect(txt.includes('window.clearInterval'), 'interval cleanup missing')
    expect(txt.includes('topDevices'), 'topDevices aggregation missing')
    expect(txt.includes('maxIssues'), 'maxIssues normalization missing')
    expect(txt.includes('totalIssues'), 'totalIssues summary missing')
  })
}

// -----------------------------------------------------------------------------
// Execution
// -----------------------------------------------------------------------------
async function main() {
  console.log('============================================================')
  console.log('ETMS MANAGER ROLE TEST SUITE (100 CASES)')
  console.log(`Target: ${BASE_URL}`)
  console.log('============================================================')

  if (cases.length !== 100) {
    console.error(`Invalid suite size: expected 100, found ${cases.length}`)
    process.exit(1)
  }

  for (let i = 0; i < cases.length; i++) {
    await runCase(cases[i], i)
  }

  console.log('------------------------------------------------------------')
  console.log(`TOTAL:  ${results.total}`)
  console.log(`PASSED: ${results.passed}`)
  console.log(`FAILED: ${results.failed}`)
  console.log('------------------------------------------------------------')

  if (results.failed > 0) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err)
  process.exit(1)
})
