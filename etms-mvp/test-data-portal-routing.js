const http = require('http')

const BASE_URL = process.env.ETMS_BASE_URL || 'http://localhost:5000'

const results = { total: 0, passed: 0, failed: 0 }
const state = {
  adminToken: null,
  dataToken: null,
  dataUser: null,
  targetTeam: null,
  targetCategory: null,
  createdTicket: null,
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

function requestMultipart(endpoint, fields, file, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint)
    const boundary = `----etmsBoundary${Date.now()}`
    const chunks = []

    for (const [key, value] of Object.entries(fields)) {
      chunks.push(Buffer.from(`--${boundary}\r\n`))
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`))
      chunks.push(Buffer.from(String(value)))
      chunks.push(Buffer.from('\r\n'))
    }

    if (file) {
      chunks.push(Buffer.from(`--${boundary}\r\n`))
      chunks.push(
        Buffer.from(
          `Content-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
            `Content-Type: ${file.mimetype}\r\n\r\n`
        )
      )
      chunks.push(file.buffer)
      chunks.push(Buffer.from('\r\n'))
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`))

    const body = Buffer.concat(chunks)
    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
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
    req.write(body)
    req.end()
  })
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

function expectStatus(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`)
  }
}

async function test(name, fn) {
  results.total += 1
  try {
    await fn()
    results.passed += 1
    console.log(`PASS: ${name}`)
  } catch (err) {
    results.failed += 1
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`FAIL: ${name} :: ${msg}`)
  }
}

async function ensureDataPortalUser() {
  const loginCandidates = [
    { email: process.env.ETMS_DATA_EMAIL, password: process.env.ETMS_DATA_PASSWORD },
    { email: 'data.portal@uiic.co.in', password: 'Password@123' },
  ].filter((c) => c.email && c.password)

  for (const candidate of loginCandidates) {
    const res = await request('POST', '/api/auth/login', candidate)
    if (res.status === 200 && res.body?.token && res.body?.user?.role === 'data_team') {
      state.dataToken = res.body.token
      state.dataUser = res.body.user
      return
    }
  }

  const ts = Date.now()
  const email = `data.route.${ts}@uiic.co.in`
  const password = process.env.ETMS_DATA_PASSWORD || 'Password@123'

  const create = await request(
    'POST',
    '/api/users',
    {
      emp_id: `DATAROUTE${String(ts).slice(-6)}`,
      name: 'Data Routing Test User',
      email,
      password,
      role: 'data_team',
      team: 'Data',
    },
    state.adminToken
  )
  expectStatus(create.status, 201, 'bootstrap data_team user creation')

  const login = await request('POST', '/api/auth/login', { email, password })
  expectStatus(login.status, 200, 'bootstrap data_team login')
  state.dataToken = login.body.token
  state.dataUser = login.body.user
}

async function run() {
  console.log('============================================================')
  console.log('ETMS DATA PORTAL TEAM ROUTING TEST')
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

  await test('Data portal user login/bootstrap succeeds', async () => {
    expect(!!state.adminToken, 'admin token required before data user bootstrap')
    await ensureDataPortalUser()
    expect(!!state.dataToken, 'data portal token missing')
    expect(state.dataUser?.role === 'data_team', 'data portal role mismatch')
  })

  await test('Data portal teams endpoint is available', async () => {
    const res = await request('GET', '/api/data-portal/teams', null, state.dataToken)
    if (res.status === 404) {
      throw new Error('GET /api/data-portal/teams returned 404. Restart backend so latest routes are loaded.')
    }
    expectStatus(res.status, 200, 'data portal teams')
    expect(Array.isArray(res.body.teams) && res.body.teams.length > 0, 'no data portal teams returned')

    const preferred = (res.body.teams || []).find((t) => t.category_key === 'network_team')
    state.targetTeam = preferred || res.body.teams[0]
  })

  await test('Data category exists for Data Portal', async () => {
    const res = await request('GET', '/api/categories', null, state.dataToken)
    expectStatus(res.status, 200, 'categories fetch')

    const dataGroup = (res.body.types || []).find((g) => g.type_key === 'data')
    const firstCategory = dataGroup?.categories?.[0]
    expect(!!firstCategory, 'no data category found')

    state.targetCategory = firstCategory
  })

  await test('Create data portal ticket with explicit target team', async () => {
    expect(!!state.targetTeam, 'target team is missing; check /api/data-portal/teams availability')
    expect(!!state.targetCategory, 'target category is missing')

    const payload = {
      title: 'Data Portal Team Routing Test',
      description: 'This ticket verifies that Data Portal routes the ticket to the explicitly selected team.',
      ticket_type_id: String(state.targetCategory.ticket_type_id || 3),
      category_id: String(state.targetCategory.id),
      priority: 'medium',
      sla_days: '3',
      assigned_team_key: state.targetTeam.category_key,
    }

    const res = await request('POST', '/api/data-portal/tickets', payload, state.dataToken)
    expectStatus(res.status, 201, 'data portal ticket creation')

    expect(res.body?.routed_team?.category_key === state.targetTeam.category_key,
      `routed team mismatch: expected ${state.targetTeam.category_key}, got ${res.body?.routed_team?.category_key}`)

    const ticket = res.body?.ticket
    expect(!!ticket?.id, 'created ticket id missing')
    expect(Number(ticket.raised_by) === Number(state.dataUser.id), 'ticket raised_by mismatch')
    expect(Number(ticket.assigned_to) > 0, 'ticket was not assigned to any employee')

    state.createdTicket = ticket
  })

  await test('Assigned employee belongs to selected team', async () => {
    expect(!!state.createdTicket, 'no created ticket available from previous step')
    expect(!!state.targetTeam, 'target team is missing')

    const usersRes = await request('GET', '/api/users', null, state.adminToken)
    expectStatus(usersRes.status, 200, 'admin users list')

    const assignedUser = (usersRes.body.users || []).find(
      (u) => Number(u.id) === Number(state.createdTicket.assigned_to)
    )

    expect(!!assignedUser, 'assigned user not found in admin users list')
    expect(
      Number(assignedUser.category_id) === Number(state.targetTeam.id),
      `assigned user category mismatch: expected team id ${state.targetTeam.id}, got ${assignedUser.category_id}`
    )
  })

  await test('Ticket logs include explicit team-routing action', async () => {
    expect(!!state.createdTicket, 'no created ticket available from previous step')

    const res = await request('GET', `/api/data-portal/tickets/${state.createdTicket.id}`, null, state.dataToken)
    expectStatus(res.status, 200, 'data portal ticket detail')

    const logs = res.body.logs || []
    const hasTeamRouted = logs.some((l) => l.action === 'TEAM_ROUTED')
    expect(hasTeamRouted, 'TEAM_ROUTED log is missing')
  })

  await test('Create data portal ticket with attachment', async () => {
    expect(!!state.targetTeam, 'target team is missing')
    expect(!!state.targetCategory, 'target category is missing')

    const fields = {
      title: 'Data Portal Attachment Test',
      description: 'This ticket validates attachment upload support for Data Portal tickets.',
      ticket_type_id: String(state.targetCategory.ticket_type_id || 3),
      category_id: String(state.targetCategory.id),
      priority: 'medium',
      sla_days: '3',
      assigned_team_key: state.targetTeam.category_key,
    }

    const file = {
      filename: 'data-portal-proof.png',
      mimetype: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x45, 0x54, 0x4d, 0x53]),
    }

    const createRes = await requestMultipart('/api/data-portal/tickets', fields, file, state.dataToken)
    expectStatus(createRes.status, 201, 'data portal ticket creation with attachment')

    const ticketId = createRes.body?.ticket?.id
    expect(!!ticketId, 'created ticket id missing for attachment test')

    const detailRes = await request('GET', `/api/data-portal/tickets/${ticketId}`, null, state.dataToken)
    expectStatus(detailRes.status, 200, 'data portal ticket detail with attachment')

    const attachments = detailRes.body.attachments || []
    expect(attachments.length > 0, 'expected at least one attachment on ticket')

    const hasUploadedFile = attachments.some((a) => a.original_name === 'data-portal-proof.png')
    expect(hasUploadedFile, 'uploaded attachment not found in ticket attachments')
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
