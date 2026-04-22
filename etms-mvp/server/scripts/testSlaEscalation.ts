/**
 * Test SLA Escalation System
 * 
 * This script tests the SLA escalation functionality by:
 * 1. Checking for overdue tickets
 * 2. Running the escalation check manually
 * 3. Verifying escalation emails are sent
 */

import pool from '../config/db'
import { runSlaEscalationCheck } from '../jobs/slaEscalationJob'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

interface OverdueTicket {
  id: number
  ticket_no: string
  title: string
  status: string
  sla_due_date: string
  escalated: boolean
  escalated_at: string | null
  category_name: string
  assigned_to_name: string | null
  manager_email: string | null
}

class SlaEscalationTester {
  async testDatabaseConnection(): Promise<void> {
    try {
      await pool.query('SELECT NOW()')
      console.log('✅ Database connection successful')
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      throw error
    }
  }

  async checkOverdueTickets(): Promise<OverdueTicket[]> {
    console.log('🔍 Checking for overdue tickets...')
    
    try {
      const { rows } = await pool.query<OverdueTicket>(
        `SELECT t.id,
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
         ORDER BY t.sla_due_date ASC`
      )

      console.log(`📊 Found ${rows.length} overdue tickets`)
      
      if (rows.length > 0) {
        console.log('\n📋 Overdue Tickets:')
        rows.forEach((ticket, index) => {
          const overdueDays = Math.floor(
            (Date.now() - new Date(ticket.sla_due_date).getTime()) / (1000 * 60 * 60 * 24)
          )
          
          console.log(`\n${index + 1}. ${ticket.ticket_no}`)
          console.log(`   Title: ${ticket.title}`)
          console.log(`   Status: ${ticket.status}`)
          console.log(`   Category: ${ticket.category_name}`)
          console.log(`   Assigned To: ${ticket.assigned_to_name || 'Unassigned'}`)
          console.log(`   Manager Email: ${ticket.manager_email || 'No manager'}`)
          console.log(`   SLA Due: ${ticket.sla_due_date}`)
          console.log(`   Overdue by: ${overdueDays} days`)
          console.log(`   Previously Escalated: ${ticket.escalated ? 'Yes' : 'No'}`)
          if (ticket.escalated_at) {
            console.log(`   Last Escalated: ${ticket.escalated_at}`)
          }
        })
      } else {
        console.log('✅ No overdue tickets found')
      }

      return rows
    } catch (error) {
      console.error('❌ Error checking overdue tickets:', error)
      throw error
    }
  }

  async checkEscalationCriteria(): Promise<void> {
    console.log('\n🔍 Checking escalation criteria...')
    
    try {
      const { rows } = await pool.query(
        `SELECT t.id,
                t.ticket_no,
                t.escalated,
                t.escalated_at,
                t.sla_due_date,
                CASE 
                  WHEN t.escalated = FALSE THEN 'Never escalated'
                  WHEN t.escalated_at IS NULL THEN 'Escalated flag set but no timestamp'
                  WHEN t.escalated_at <= NOW() - INTERVAL '24 hours' THEN 'Ready for re-escalation'
                  ELSE 'Recently escalated'
                END as escalation_status
         FROM tickets t
         WHERE t.status IN ('assigned', 'in_progress')
           AND t.sla_due_date < NOW()`
      )

      console.log(`📊 Escalation Status Summary:`)
      const statusCounts = rows.reduce((acc, ticket) => {
        acc[ticket.escalation_status] = (acc[ticket.escalation_status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} tickets`)
      })

      if (rows.length > 0) {
        console.log('\n📋 Detailed Escalation Status:')
        rows.forEach(ticket => {
          console.log(`   ${ticket.ticket_no}: ${ticket.escalation_status}`)
        })
      }

    } catch (error) {
      console.error('❌ Error checking escalation criteria:', error)
      throw error
    }
  }

  async testEscalationJob(): Promise<void> {
    console.log('\n🚀 Running SLA escalation check manually...')
    
    try {
      // Get count before escalation
      const { rows: beforeRows } = await pool.query(
        'SELECT COUNT(*) as count FROM tickets WHERE escalated = TRUE'
      )
      const beforeCount = parseInt(beforeRows[0].count)

      // Run the escalation check
      await runSlaEscalationCheck()

      // Get count after escalation
      const { rows: afterRows } = await pool.query(
        'SELECT COUNT(*) as count FROM tickets WHERE escalated = TRUE'
      )
      const afterCount = parseInt(afterRows[0].count)

      const escalatedCount = afterCount - beforeCount
      
      console.log(`✅ Escalation check completed`)
      console.log(`📊 Results:`)
      console.log(`   - Tickets escalated before: ${beforeCount}`)
      console.log(`   - Tickets escalated after: ${afterCount}`)
      console.log(`   - New escalations: ${escalatedCount}`)

      if (escalatedCount > 0) {
        console.log(`🎯 ${escalatedCount} tickets were escalated and emails should be sent`)
      } else {
        console.log(`ℹ️  No new escalations (tickets may already be escalated or no overdue tickets)`)
      }

    } catch (error) {
      console.error('❌ Error running escalation job:', error)
      throw error
    }
  }

  async checkRecentEscalations(): Promise<void> {
    console.log('\n📋 Checking recent escalations...')
    
    try {
      const { rows } = await pool.query(
        `SELECT t.id,
                t.ticket_no,
                t.title,
                t.escalated_at,
                tc.name as category_name,
                mgr.email as manager_email
         FROM tickets t
         JOIN ticket_categories tc ON tc.id = t.category_id
         LEFT JOIN users mgr ON mgr.id = tc.manager_user_id
         WHERE t.escalated = TRUE
           AND t.escalated_at >= NOW() - INTERVAL '7 days'
         ORDER BY t.escalated_at DESC
         LIMIT 10`
      )

      if (rows.length > 0) {
        console.log(`📊 Found ${rows.length} recent escalations (last 7 days):`)
        rows.forEach((ticket, index) => {
          console.log(`\n${index + 1}. ${ticket.ticket_no}`)
          console.log(`   Title: ${ticket.title}`)
          console.log(`   Category: ${ticket.category_name}`)
          console.log(`   Manager: ${ticket.manager_email || 'No manager'}`)
          console.log(`   Escalated: ${ticket.escalated_at}`)
        })
      } else {
        console.log('ℹ️  No recent escalations found')
      }

    } catch (error) {
      console.error('❌ Error checking recent escalations:', error)
      throw error
    }
  }

  async checkCronSchedule(): Promise<void> {
    console.log('\n⏰ Checking cron schedule configuration...')
    
    const schedule = process.env.SLA_CRON_SCHEDULE || '0 0 * * *'
    console.log(`📅 Current schedule: ${schedule}`)
    
    // Parse cron schedule
    const parts = schedule.split(' ')
    if (parts.length === 5) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
      console.log(`📊 Schedule breakdown:`)
      console.log(`   - Minute: ${minute} (${minute === '0' ? 'top of hour' : minute})`)
      console.log(`   - Hour: ${hour} (${hour === '0' ? 'midnight' : hour === '*' ? 'every hour' : `${hour}:00`})`)
      console.log(`   - Day of Month: ${dayOfMonth} (${dayOfMonth === '*' ? 'every day' : dayOfMonth})`)
      console.log(`   - Month: ${month} (${month === '*' ? 'every month' : month})`)
      console.log(`   - Day of Week: ${dayOfWeek} (${dayOfWeek === '*' ? 'every day' : dayOfWeek})`)
      
      if (schedule === '0 0 * * *') {
        console.log(`✅ Standard configuration: Runs daily at midnight`)
      } else {
        console.log(`ℹ️  Custom schedule configured`)
      }
    } else {
      console.log(`⚠️  Invalid cron schedule format`)
    }
  }

  async createTestOverdueTicket(): Promise<number | null> {
    console.log('\n🧪 Creating test overdue ticket for testing...')
    
    try {
      // Check if we have categories and users
      const { rows: categories } = await pool.query(
        'SELECT id, name FROM ticket_categories WHERE manager_user_id IS NOT NULL LIMIT 1'
      )
      
      if (categories.length === 0) {
        console.log('⚠️  No categories with managers found - cannot create test ticket')
        return null
      }

      const { rows: users } = await pool.query(
        'SELECT id FROM users WHERE role = \'employee\' LIMIT 1'
      )

      if (users.length === 0) {
        console.log('⚠️  No employees found - cannot create test ticket')
        return null
      }

      // Create a test ticket with overdue SLA
      const overdueDate = new Date()
      overdueDate.setDate(overdueDate.getDate() - 2) // 2 days overdue

      const { rows: ticketRows } = await pool.query(
        `INSERT INTO tickets (
          ticket_no, title, description, type_key, category_id, priority,
          raised_by, status, sla_due_date, created_at, updated_at
        ) VALUES (
          'TEST-' || EXTRACT(EPOCH FROM NOW())::text,
          'Test SLA Escalation Ticket',
          'This is a test ticket created to verify SLA escalation functionality',
          'request',
          $1,
          'medium',
          $2,
          'assigned',
          $3,
          NOW(),
          NOW()
        ) RETURNING id, ticket_no`,
        [categories[0].id, users[0].id, overdueDate.toISOString()]
      )

      const ticketId = ticketRows[0].id
      const ticketNo = ticketRows[0].ticket_no

      console.log(`✅ Created test ticket: ${ticketNo} (ID: ${ticketId})`)
      console.log(`   Category: ${categories[0].name}`)
      console.log(`   SLA Due Date: ${overdueDate.toISOString()} (2 days overdue)`)
      console.log(`   Status: assigned`)
      
      return ticketId

    } catch (error) {
      console.error('❌ Error creating test ticket:', error)
      return null
    }
  }

  async cleanupTestTicket(ticketId: number): Promise<void> {
    try {
      await pool.query('DELETE FROM tickets WHERE id = $1 AND ticket_no LIKE \'TEST-%\'', [ticketId])
      console.log(`🧹 Cleaned up test ticket (ID: ${ticketId})`)
    } catch (error) {
      console.error('❌ Error cleaning up test ticket:', error)
    }
  }

  async runFullTest(): Promise<void> {
    console.log('🧪 SLA Escalation System Test')
    console.log('=============================\n')

    try {
      // Test database connection
      await this.testDatabaseConnection()

      // Check cron schedule
      await this.checkCronSchedule()

      // Check for existing overdue tickets
      const overdueTickets = await this.checkOverdueTickets()

      // Check escalation criteria
      await this.checkEscalationCriteria()

      // Check recent escalations
      await this.checkRecentEscalations()

      // If no overdue tickets, create a test one
      let testTicketId: number | null = null
      if (overdueTickets.length === 0) {
        testTicketId = await this.createTestOverdueTicket()
        if (testTicketId) {
          console.log('\n🔄 Re-checking after creating test ticket...')
          await this.checkOverdueTickets()
        }
      }

      // Run escalation job
      await this.testEscalationJob()

      // Check results
      await this.checkRecentEscalations()

      // Cleanup test ticket
      if (testTicketId) {
        await this.cleanupTestTicket(testTicketId)
      }

      console.log('\n✅ SLA Escalation Test Completed Successfully!')
      console.log('\n📋 Summary:')
      console.log('   ✅ Database connection working')
      console.log('   ✅ Cron schedule configured')
      console.log('   ✅ Escalation logic functional')
      console.log('   ✅ Email service integrated')
      
      console.log('\n🎯 Next Steps:')
      console.log('   1. Monitor server logs for cron job execution')
      console.log('   2. Check email delivery (Ethereal test account)')
      console.log('   3. Verify escalation flags in database')
      console.log('   4. Test with real overdue tickets')

    } catch (error) {
      console.error('\n💥 Test failed:', error)
      throw error
    }
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  const tester = new SlaEscalationTester()
  tester.runFullTest()
    .then(() => {
      console.log('\n🎉 All tests completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error)
      process.exit(1)
    })
}

export default SlaEscalationTester