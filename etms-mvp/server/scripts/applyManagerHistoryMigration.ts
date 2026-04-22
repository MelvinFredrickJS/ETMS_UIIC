/**
 * Apply Manager Assignment History Migration
 * 
 * This script creates the manager_assignment_history table and populates it
 * with existing manager assignments from ticket_categories.
 */

import pool from '../config/db'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function applyMigration(): Promise<void> {
  console.log('🚀 Starting Manager Assignment History Migration...')

  try {
    // Test connection first
    await pool.query('SELECT NOW()')
    console.log('✅ Database connection verified')

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../database/create_manager_assignment_history.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement)
      }
    }

    console.log('✅ Manager assignment history table created successfully')
    console.log('✅ Existing manager assignments migrated to history')

    // Verify the migration
    const { rows: historyCount } = await pool.query(
      'SELECT COUNT(*) as count FROM manager_assignment_history'
    )
    
    const { rows: categoryCount } = await pool.query(
      'SELECT COUNT(*) as count FROM ticket_categories WHERE manager_user_id IS NOT NULL'
    )

    console.log(`📊 Migration Summary:`)
    console.log(`   - Categories with managers: ${categoryCount[0].count}`)
    console.log(`   - History records created: ${historyCount[0].count}`)

    if (Number(historyCount[0].count) >= Number(categoryCount[0].count)) {
      console.log('✅ Migration completed successfully!')
    } else {
      console.log('⚠️  Warning: History count is less than expected')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  applyMigration()
    .then(() => {
      console.log('🎉 Manager Assignment History Migration Complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration Error:', error)
      process.exit(1)
    })
}

export default applyMigration