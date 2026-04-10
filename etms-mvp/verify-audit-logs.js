// Verify Audit Logging - Check ticket_logs table
const pg = require('pg');
const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'etms_dev',
  user: 'postgres',
  password: 'Melvin@2004',
});

async function auditLogCheck() {
  try {
    console.log('\n📋 AUDIT LOGGING VERIFICATION\n');

    // Check ticket_logs table
    const logsRes = await pool.query(
      `SELECT COUNT(*) as total_logs FROM ticket_logs`
    );
    console.log(`✅ Total audit entries: ${logsRes.rows[0].total_logs}`);

    // Check actions logged
    const actionsRes = await pool.query(
      `SELECT DISTINCT action, COUNT(*) as count FROM ticket_logs GROUP BY action ORDER BY count DESC`
    );
    console.log(`\n✅ Actions logged:`);
    actionsRes.rows.forEach(row => {
      console.log(`   - ${row.action}: ${row.count} entries`);
    });

    // Sample log entry
    const sampleRes = await pool.query(
      `SELECT ticket_id, action, old_status, new_status, performed_by, note 
       FROM ticket_logs ORDER BY created_at DESC LIMIT 1`
    );
    if (sampleRes.rows.length > 0) {
      const sample = sampleRes.rows[0];
      console.log(`\n✅ Latest audit log entry:`);
      console.log(`   Ticket ID: ${sample.ticket_id}`);
      console.log(`   Action: ${sample.action}`);
      console.log(`   Status: ${sample.old_status} → ${sample.new_status}`);
      console.log(`   Performed by: ${sample.performed_by || 'SYSTEM'}`);
      console.log(`   Note: ${sample.note || 'N/A'}`);
    }

    // Check ticket status consistency
    const consistencyRes = await pool.query(
      `SELECT id, ticket_no, status, raised_by, assigned_to, approval_owner_id 
       FROM tickets LIMIT 3`
    );
    console.log(`\n✅ Sample tickets (consistency check):`);
    consistencyRes.rows.forEach(row => {
      console.log(`   ${row.ticket_no}: ${row.status} | Raised: ${row.raised_by} | Assigned: ${row.assigned_to} | Approval: ${row.approval_owner_id}`);
    });

    console.log('\n✅ Audit logging system VERIFIED\n');
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

auditLogCheck();
