/**
 * Apply Permissions System Migration
 * 
 * This script applies the permissions system database migration.
 */

import fs from 'fs'
import path from 'path'
import pool from '../config/db'

async function applyMigration() {
  console.log('🚀 Starting permissions system migration...\n')

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../database/create_permissions_system.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    console.log('📄 SQL file loaded successfully')
    console.log(`📏 File size: ${sql.length} characters\n`)

    // Execute the migration
    console.log('⚙️  Executing migration...')
    await pool.query(sql)

    console.log('✅ Migration executed successfully!\n')

    // Verify the migration
    console.log('🔍 Verifying migration...\n')

    // Check permissions table
    const permissionsResult = await pool.query('SELECT COUNT(*) as count FROM permissions')
    const permissionsCount = parseInt(permissionsResult.rows[0].count)
    console.log(`✅ Permissions table: ${permissionsCount} permissions created`)

    // Check role_permissions table
    const rolePermissionsResult = await pool.query('SELECT COUNT(*) as count FROM role_permissions')
    const rolePermissionsCount = parseInt(rolePermissionsResult.rows[0].count)
    console.log(`✅ Role permissions table: ${rolePermissionsCount} role-permission mappings created`)

    // Check user_permissions table
    const userPermissionsResult = await pool.query('SELECT COUNT(*) as count FROM user_permissions')
    const userPermissionsCount = parseInt(userPermissionsResult.rows[0].count)
    console.log(`✅ User permissions table: ${userPermissionsCount} user-specific permissions`)

    // Check functions
    const functionsResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM pg_proc 
      WHERE proname IN ('has_permission', 'get_user_permissions')
    `)
    const functionsCount = parseInt(functionsResult.rows[0].count)
    console.log(`✅ Helper functions: ${functionsCount} functions created`)

    // Check indexes
    const indexesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE tablename IN ('permissions', 'role_permissions', 'user_permissions')
    `)
    const indexesCount = parseInt(indexesResult.rows[0].count)
    console.log(`✅ Indexes: ${indexesCount} indexes created`)

    // Show permissions by category
    console.log('\n📊 Permissions by category:')
    const categoriesResult = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM permissions 
      GROUP BY category 
      ORDER BY category
    `)
    categoriesResult.rows.forEach(row => {
      console.log(`   - ${row.category}: ${row.count} permissions`)
    })

    // Show role assignments
    console.log('\n👥 Role permission assignments:')
    const rolesResult = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM role_permissions 
      GROUP BY role 
      ORDER BY role
    `)
    rolesResult.rows.forEach(row => {
      console.log(`   - ${row.role}: ${row.count} permissions`)
    })

    console.log('\n✅ Migration verification complete!')
    console.log('\n🎉 Permissions system successfully installed!\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('\nError details:', (error as Error).message)
    process.exit(1)
  }
}

// Run the migration
applyMigration()
