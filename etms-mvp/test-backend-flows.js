// Test ETMS Backend Flows
// This script tests all major backend workflows

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let testResults = { passed: 0, failed: 0, total: 0 };

// Helper to make HTTP requests
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : { success: true };
          resolve({ status: res.statusCode, body: parsed });
        } catch (err) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test helper
async function test(name, fn) {
  testResults.total++;
  try {
    await fn();
    console.log(`✅ ${name}`);
    testResults.passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    testResults.failed++;
  }
}

// Main tests
async function runTests() {
  console.log('\n🚀 ETMS Backend Testing Suite\n');
  console.log('Target: ' + BASE_URL + '\n');

  // ═══════════════════════════════════════════════════════════
  // 1. AUTH TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━ TEST 1: LOGIN FLOW ━━\n');

  let adminToken, empToken, mgrToken;
  let adminUser, empUser, mgrUser;

  await test('Admin login (EMP001 / Password@123)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'admin@uiic.co.in',
      password: 'Password@123',
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.token) throw new Error('No token returned');
    adminToken = res.body.token;
    adminUser = res.body.user;
    console.log(`   ID: ${adminUser.id}, Role: ${adminUser.role}`);
  });

  await test('Employee login (EMP002 / Password@123)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'tech1@uiic.co.in',
      password: 'Password@123',
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.token) throw new Error('No token returned');
    empToken = res.body.token;
    empUser = res.body.user;
    console.log(`   ID: ${empUser.id}, Role: ${empUser.role}`);
  });

  await test('Manager login (MGR001 / Password@123)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'mgr.network@uiic.co.in',
      password: 'Password@123',
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.token) throw new Error('No token returned');
    mgrToken = res.body.token;
    mgrUser = res.body.user;
    console.log(`   ID: ${mgrUser.id}, Role: ${mgrUser.role}`);
  });

  await test('Invalid credentials rejected', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'admin@uiic.co.in',
      password: 'wrongpassword',
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════════════
  // 2. CATEGORIES TEST
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━ TEST 2: CATEGORIES ━━\n');

  let categoryId = null;
  let requiresApprovalCategoryId = null;

  await test('Get categories with nested structure', async () => {
    const res = await request('GET', '/api/categories', null, empToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.types || res.body.types.length === 0) throw new Error('No types returned');
    const complaint = res.body.types.find(t => t.type_key === 'complaint');
    if (!complaint || complaint.categories.length === 0) throw new Error('No complaint categories');
    categoryId = complaint.categories[0].id;
    requiresApprovalCategoryId = complaint.categories[0].id;
    console.log(`   Types: ${res.body.types.length}, First type: ${res.body.types[0].type_key}`);
    console.log(`   Sample category ID: ${categoryId}`);
  });

  // ═══════════════════════════════════════════════════════════
  // 3. TICKET CREATION TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━ TEST 3: TICKET CREATION ━━\n');

  let ticketId = null;
  let ticketNumberRequiresApproval = null;

  await test('Create ticket requiring approval (Network Issue)', async () => {
    const res = await request('POST', '/api/tickets', {
      title: 'Test Network Issue',
      description: 'Network is down on my desk',
      ticket_type_id: 1,
      category_id: requiresApprovalCategoryId,
      priority: 'high',
    }, empToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.ticket) throw new Error('No ticket in response');
    ticketId = res.body.ticket.id;
    ticketNumberRequiresApproval = res.body.ticket.ticket_no;
    if (res.body.ticket.status !== 'pending_approval') {
      throw new Error(`Expected pending_approval, got ${res.body.ticket.status}`);
    }
    console.log(`   Ticket ID: ${ticketId}, Status: ${res.body.ticket.status}`);
    console.log(`   Ticket #: ${ticketNumberRequiresApproval}`);
  });

  await test('Employee can view their created ticket', async () => {
    const res = await request('GET', `/api/tickets/${ticketId}`, null, empToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.ticket.id !== ticketId) throw new Error('Wrong ticket returned');
    console.log(`   Status: ${res.body.ticket.status}, Raised by: ${res.body.ticket.raised_by}`);
  });

  // ═══════════════════════════════════════════════════════════
  // 4. APPROVAL WORKFLOW TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━ TEST 4: APPROVAL WORKFLOW ━━\n');

  await test('Manager can see pending approvals', async () => {
    const res = await request('GET', '/api/approvals/pending', null, mgrToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.tickets)) throw new Error('Expected tickets array');
    const pending = res.body.tickets.find(t => t.id === ticketId);
    if (!pending) throw new Error('Created ticket not in pending approvals');
    console.log(`   Total pending: ${res.body.tickets.length}`);
  });

  await test('Manager approves ticket', async () => {
    const res = await request('POST', `/api/approvals/${ticketId}/approve`, {}, mgrToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.ticket) throw new Error('No ticket in response');
    // After approval and auto-assignment, status should be 'assigned'
    console.log(`   New status: ${res.body.ticket.status}, Assigned to: ${res.body.ticket.assigned_to_name || 'N/A'}`);
  });

  // Reload ticket to check status after approval
  await test('Ticket status is assigned after approval', async () => {
    const res = await request('GET', `/api/tickets/${ticketId}`, null, empToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.ticket.status !== 'assigned') {
      throw new Error(`Expected assigned, got ${res.body.ticket.status}`);
    }
    console.log(`   Status confirmed: ${res.body.ticket.status}`);
  });

  // ═══════════════════════════════════════════════════════════
  // 5. TICKET STATUS TRANSITIONS
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━ TEST 5: STATUS TRANSITIONS ━━\n');

  let ticketAssignedTo = null;

  await test('Get assigned employee for ticket', async () => {
    const res = await request('GET', `/api/tickets/${ticketId}`, null, empToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    ticketAssignedTo = res.body.ticket.assigned_to;
    console.log(`   Assigned to user ID: ${ticketAssignedTo}`);
  });

  // Note: To test assigned -> in_progress, we'd need to log in as the assigned employee
  // For now, let's test with the current employee
  await test('Create second ticket for status transition testing', async () => {
    const res = await request('POST', '/api/tickets', {
      title: 'Test Gate Pass',
      description: 'Need a gate pass',
      ticket_type_id: 2,
      category_id: 4, // gate_pass (no approval required)
      priority: 'low',
    }, empToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    // This should auto-approve and auto-assign
    if (res.body.ticket.status !== 'assigned') {
      throw new Error(`Expected auto-assigned, got ${res.body.ticket.status}`);
    }
    console.log(`   Ticket created with auto-approval and assignment`);
    console.log(`   Status: ${res.body.ticket.status}`);
  });

  // ═══════════════════════════════════════════════════════════
  // 6. REJECTION WORKFLOW
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━ TEST 6: REJECTION WORKFLOW ━━\n');

  let rejectTicketId = null;

  await test('Create ticket to test rejection', async () => {
    const res = await request('POST', '/api/tickets', {
      title: 'Test Rejection',
      description: 'This will be rejected',
      ticket_type_id: 1,
      category_id: requiresApprovalCategoryId,
      priority: 'low',
    }, empToken);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    rejectTicketId = res.body.ticket.id;
    console.log(`   Ticket ID: ${rejectTicketId}`);
  });

  await test('Manager rejects ticket with reason', async () => {
    const res = await request('POST', `/api/approvals/${rejectTicketId}/reject`, {
      rejection_reason: 'This is not within policy guidelines and cannot be approved.',
    }, mgrToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (res.body.ticket.status !== 'rejected') {
      throw new Error(`Expected rejected, got ${res.body.ticket.status}`);
    }
    console.log(`   Ticket rejected with reason`);
  });

  await test('Cannot transition from terminal rejected status', async () => {
    const res = await request('PUT', `/api/tickets/${rejectTicketId}/status`, {
      status: 'in_progress',
    }, empToken);
    if (res.status === 200) throw new Error('Should not allow transition from rejected');
    console.log(`   Correctly blocked transition from terminal status`);
  });

  // ═══════════════════════════════════════════════════════════
  // 7. ASSET MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━ TEST 7: ASSET MANAGEMENT ━━\n');

  await test('Get employee assets', async () => {
    const res = await request('GET', '/api/assets/my', null, empToken);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.assets)) throw new Error('Expected assets array');
    console.log(`   Total assets: ${res.body.assets.length}`);
    if (res.body.assets.length > 0) {
      console.log(`   First asset: ${res.body.assets[0].name} (${res.body.assets[0].serial_number})`);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // 8. SUMMARY & RESULTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 TEST RESULTS\n`);
  console.log(`  Total Tests:  ${testResults.total}`);
  console.log(`  ✅ Passed:    ${testResults.passed}`);
  console.log(`  ❌ Failed:    ${testResults.failed}`);
  console.log(`  Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%\n`);

  if (testResults.failed === 0) {
    console.log(`🎉 All tests passed!\n`);
  } else {
    console.log(`⚠️  Some tests failed. Review the output above.\n`);
    process.exit(1);
  }
}

// Wait for server to be ready before running tests
async function waitForServer(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await request('GET', '/api/categories', null, 'fake-token');
      // Any response means server is up (even 401)
      return true;
    } catch (err) {
      if (i < maxRetries - 1) {
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  throw new Error('Server did not start in time');
}

async function main() {
  try {
    console.log('⏳ Waiting for server to be ready...');
    await waitForServer();
    console.log('\n✅ Server is ready\n');
    await runTests();
  } catch (err) {
    console.error('\n❌ Test setup failed:', err.message);
    process.exit(1);
  }
}

main();
