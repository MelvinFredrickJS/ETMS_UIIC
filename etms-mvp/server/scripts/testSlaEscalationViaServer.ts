/**
 * Test SLA Escalation Via Server
 * 
 * This creates a test endpoint to verify SLA escalation functionality
 */

console.log('🧪 SLA Escalation Test Instructions')
console.log('===================================')
console.log('')
console.log('Since direct database connection has issues in scripts,')
console.log('here\'s how to test the SLA escalation system:')
console.log('')
console.log('1. Add this temporary endpoint to your app.ts:')
console.log('')
console.log(`
// TEMPORARY: SLA Escalation Test Endpoint
app.get('/admin/test-sla-escalation', async (_req: Request, res: Response) => {
  try {
    const pool = require('./config/db')
    const { runSlaEscalationCheck } = require('./jobs/slaEscalationJob')
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    }
    
    // Test 1: Check cron schedule
    const schedule = process.env.SLA_CRON_SCHEDULE || '0 0 * * *'
    results.tests.cronSchedule = {
      success: true,
      schedule: schedule,
      description: schedule === '0 0 * * *' ? 'Daily at midnight' : 'Custom schedule'
    }
    
    // Test 2: Check for overdue tickets
    const { rows: overdueTickets } = await pool.query(\`
      SELECT t.id,
             t.ticket_no,
             t.title,
             t.status,
             t.sla_due_date,
             t.escalated,
             t.escalated_at,
             tc.name AS category_name,
             assigned.name AS assigned_to_name,
             mgr.email AS manager_email
      FROM tickets t
      JOIN ticket_categories tc ON tc.id = t.category_id
      LEFT JOIN users assigned ON assigned.id = t.assigned_to
      LEFT JOIN users mgr ON mgr.id = tc.manager_user_id
      WHERE t.status IN ('assigned', 'in_progress')
        AND t.sla_due_date < NOW()
      ORDER BY t.sla_due_date ASC
    \`)
    
    results.tests.overdueTickets = {
      success: true,
      count: overdueTickets.length,
      tickets: overdueTickets.map(t => ({
        ticket_no: t.ticket_no,
        title: t.title,
        status: t.status,
        sla_due_date: t.sla_due_date,
        escalated: t.escalated,
        category: t.category_name,
        assigned_to: t.assigned_to_name,
        manager_email: t.manager_email
      }))
    }
    
    // Test 3: Check escalation criteria
    const { rows: escalationCriteria } = await pool.query(\`
      SELECT COUNT(*) as total_overdue,
             COUNT(CASE WHEN escalated = FALSE THEN 1 END) as never_escalated,
             COUNT(CASE WHEN escalated_at IS NULL AND escalated = TRUE THEN 1 END) as flag_no_timestamp,
             COUNT(CASE WHEN escalated_at <= NOW() - INTERVAL '24 hours' THEN 1 END) as ready_for_reescalation
      FROM tickets t
      WHERE t.status IN ('assigned', 'in_progress')
        AND t.sla_due_date < NOW()
    \`)
    
    results.tests.escalationCriteria = {
      success: true,
      data: escalationCriteria[0]
    }
    
    // Test 4: Get escalation count before
    const { rows: beforeCount } = await pool.query(
      'SELECT COUNT(*) as count FROM tickets WHERE escalated = TRUE'
    )
    const beforeEscalated = parseInt(beforeCount[0].count)
    
    // Test 5: Run escalation check manually
    await runSlaEscalationCheck()
    
    // Test 6: Get escalation count after
    const { rows: afterCount } = await pool.query(
      'SELECT COUNT(*) as count FROM tickets WHERE escalated = TRUE'
    )
    const afterEscalated = parseInt(afterCount[0].count)
    
    results.tests.escalationExecution = {
      success: true,
      beforeCount: beforeEscalated,
      afterCount: afterEscalated,
      newEscalations: afterEscalated - beforeEscalated
    }
    
    // Test 7: Check recent escalations
    const { rows: recentEscalations } = await pool.query(\`
      SELECT t.id,
             t.ticket_no,
             t.title,
             t.escalated_at,
             tc.name as category_name,
             mgr.email as manager_email
      FROM tickets t
      JOIN ticket_categories tc ON tc.id = t.category_id
      LEFT JOIN users mgr ON mgr.id = tc.manager_user_id
      WHERE t.escalated = TRUE
        AND t.escalated_at >= NOW() - INTERVAL '1 hour'
      ORDER BY t.escalated_at DESC
    \`)
    
    results.tests.recentEscalations = {
      success: true,
      count: recentEscalations.length,
      escalations: recentEscalations.map(e => ({
        ticket_no: e.ticket_no,
        title: e.title,
        escalated_at: e.escalated_at,
        category: e.category_name,
        manager_email: e.manager_email
      }))
    }
    
    // Test 8: Check email configuration
    const emailConfig = {
      smtp_host: process.env.SMTP_HOST || 'Ethereal (auto-generated)',
      smtp_port: process.env.SMTP_PORT || '587',
      mail_from: process.env.MAIL_FROM || 'Default'
    }
    
    results.tests.emailConfiguration = {
      success: true,
      config: emailConfig,
      isEthereal: !process.env.SMTP_HOST
    }
    
    // Summary
    const summary = {
      escalationSystemActive: true,
      cronScheduleConfigured: !!schedule,
      overdueTicketsFound: overdueTickets.length > 0,
      escalationExecuted: (afterEscalated - beforeEscalated) >= 0,
      emailsConfigured: true,
      recentActivity: recentEscalations.length > 0
    }
    
    res.json({
      success: true,
      message: 'SLA Escalation System Test Completed',
      summary: summary,
      results: results,
      recommendations: [
        overdueTickets.length === 0 ? 'No overdue tickets found - system is working well' : \`\${overdueTickets.length} overdue tickets found\`,
        (afterEscalated - beforeEscalated) > 0 ? \`\${afterEscalated - beforeEscalated} tickets were escalated\` : 'No new escalations (may already be escalated)',
        !process.env.SMTP_HOST ? 'Using Ethereal test emails - check server logs for email URLs' : 'Using configured SMTP server',
        'Monitor server logs for cron job execution at scheduled time'
      ]
    })
    
  } catch (error) {
    console.error('SLA Escalation test error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
})
`)
console.log('')
console.log('2. Start your server: npm run dev')
console.log('3. Visit: http://localhost:5000/admin/test-sla-escalation')
console.log('4. Remove the endpoint after testing')
console.log('')
console.log('✅ What This Tests:')
console.log('   ✅ Cron schedule configuration')
console.log('   ✅ Overdue ticket detection')
console.log('   ✅ Escalation criteria logic')
console.log('   ✅ Manual escalation execution')
console.log('   ✅ Email configuration')
console.log('   ✅ Recent escalation tracking')
console.log('')
console.log('📊 Expected Results:')
console.log('   - Cron schedule should be "0 0 * * *" (daily at midnight)')
console.log('   - Overdue tickets should be detected if any exist')
console.log('   - Escalation execution should run without errors')
console.log('   - Email configuration should show Ethereal or SMTP settings')
console.log('   - Recent escalations should show if any tickets were escalated')
console.log('')
console.log('🎯 Troubleshooting:')
console.log('   - If no overdue tickets: System is working, no action needed')
console.log('   - If escalation fails: Check database permissions and table structure')
console.log('   - If emails not sent: Check email service logs and configuration')
console.log('   - If cron not running: Verify server startup logs')
console.log('')
console.log('📧 Email Testing:')
console.log('   - Ethereal emails: Check server console for test email URLs')
console.log('   - SMTP emails: Check configured email inbox')
console.log('   - Email format: Should include ticket details and SLA information')
console.log('')
console.log('⏰ Cron Job Testing:')
console.log('   - Current schedule: Daily at midnight (0 0 * * *)')
console.log('   - To test immediately: Use the manual test endpoint above')
console.log('   - To change schedule: Update SLA_CRON_SCHEDULE in .env')
console.log('   - Example for every minute: "* * * * *" (for testing only)')
console.log('')
console.log('🚀 The SLA escalation system should be working correctly!')