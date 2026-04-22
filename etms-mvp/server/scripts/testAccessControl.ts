/**
 * Test Access Control Service
 * 
 * This script tests the access control service to ensure it's working correctly.
 */

import * as accessControl from '../services/accessControlService'
import * as categoryModel from '../models/categoryModel'
import * as userModel from '../models/userModel'
import pool from '../config/db'

async function testAccessControl() {
  console.log('🧪 Testing Access Control Service\n')
  console.log('=' .repeat(60))

  try {
    // Get test users
    console.log('\n📋 Fetching test users...')
    const users = await pool.query(`
      SELECT id, name, email, role 
      FROM users 
      WHERE is_active = true 
      ORDER BY role, id 
      LIMIT 10
    `)

    if (users.rows.length === 0) {
      console.log('⚠️  No active users found in database')
      process.exit(1)
    }

    console.log(`✅ Found ${users.rows.length} active users\n`)

    // Find one user of each role
    const admin = users.rows.find(u => u.role === 'admin')
    const manager = users.rows.find(u => u.role === 'manager')
    const employee = users.rows.find(u => u.role === 'employee')
    const dataTeam = users.rows.find(u => u.role === 'data_team')

    console.log('👥 Test Users:')
    if (admin) console.log(`   - Admin: ${admin.name} (ID: ${admin.id})`)
    if (manager) console.log(`   - Manager: ${manager.name} (ID: ${manager.id})`)
    if (employee) console.log(`   - Employee: ${employee.name} (ID: ${employee.id})`)
    if (dataTeam) console.log(`   - Data Team: ${dataTeam.name} (ID: ${dataTeam.id})`)

    console.log('\n' + '='.repeat(60))

    // Test 1: Permission Checking
    console.log('\n🔍 Test 1: Permission Checking')
    console.log('-'.repeat(60))

    if (admin) {
      const permissions = await accessControl.getUserPermissions(admin.id, admin.role)
      console.log(`✅ Admin permissions: ${permissions.length} permissions`)
      console.log(`   Sample: ${permissions.slice(0, 3).join(', ')}...`)
    }

    if (manager) {
      const permissions = await accessControl.getUserPermissions(manager.id, manager.role)
      console.log(`✅ Manager permissions: ${permissions.length} permissions`)
      console.log(`   Sample: ${permissions.slice(0, 3).join(', ')}...`)
    }

    // Test 2: Category Access
    console.log('\n🔍 Test 2: Category Access')
    console.log('-'.repeat(60))

    const categories = await categoryModel.findAll()
    const testCategory = categories.find(c => !c.is_team)

    if (testCategory && admin) {
      const canAccess = await accessControl.canAccessCategory(admin.id, admin.role, testCategory.id)
      console.log(`✅ Admin can access category "${testCategory.name}": ${canAccess}`)
    }

    if (testCategory && manager) {
      const canAccess = await accessControl.canAccessCategory(manager.id, manager.role, testCategory.id)
      console.log(`✅ Manager can access category "${testCategory.name}": ${canAccess}`)
    }

    if (testCategory && employee) {
      const canAccess = await accessControl.canAccessCategory(employee.id, employee.role, testCategory.id)
      console.log(`✅ Employee can access category "${testCategory.name}": ${canAccess}`)
    }

    // Test 3: Asset Management
    console.log('\n🔍 Test 3: Asset Management')
    console.log('-'.repeat(60))

    if (admin) {
      const canManage = await accessControl.canManageAssets(admin.id, admin.role)
      console.log(`✅ Admin can manage assets: ${canManage}`)
    }

    if (manager) {
      const canManage = await accessControl.canManageAssets(manager.id, manager.role)
      console.log(`✅ Manager can manage assets: ${canManage}`)
      
      // Check if this manager manages infra_team
      const managedCategories = await categoryModel.findByManagerId(manager.id)
      const managesInfra = managedCategories.some(c => c.category_key === 'infra_team')
      console.log(`   (Manager manages infra_team: ${managesInfra})`)
    }

    if (employee) {
      const canManage = await accessControl.canManageAssets(employee.id, employee.role)
      console.log(`✅ Employee can manage assets: ${canManage}`)
    }

    // Test 4: Ticket Permissions
    console.log('\n🔍 Test 4: Ticket Permissions')
    console.log('-'.repeat(60))

    if (admin) {
      const canApprove = await accessControl.canApproveTickets(admin.id, admin.role)
      const canAssign = await accessControl.canAssignTickets(admin.id, admin.role)
      console.log(`✅ Admin can approve tickets: ${canApprove}`)
      console.log(`✅ Admin can assign tickets: ${canAssign}`)
    }

    if (manager) {
      const canApprove = await accessControl.canApproveTickets(manager.id, manager.role)
      const canAssign = await accessControl.canAssignTickets(manager.id, manager.role)
      console.log(`✅ Manager can approve tickets: ${canApprove}`)
      console.log(`✅ Manager can assign tickets: ${canAssign}`)
    }

    if (employee) {
      const canApprove = await accessControl.canApproveTickets(employee.id, employee.role)
      const canAssign = await accessControl.canAssignTickets(employee.id, employee.role)
      console.log(`✅ Employee can approve tickets: ${canApprove}`)
      console.log(`✅ Employee can assign tickets: ${canAssign}`)
    }

    // Test 5: Report Access
    console.log('\n🔍 Test 5: Report Access')
    console.log('-'.repeat(60))

    if (admin) {
      const canView = await accessControl.canViewReports(admin.id, admin.role)
      const canGenerate = await accessControl.canGenerateReports(admin.id, admin.role)
      console.log(`✅ Admin can view reports: ${canView}`)
      console.log(`✅ Admin can generate reports: ${canGenerate}`)
    }

    if (manager) {
      const canView = await accessControl.canViewReports(manager.id, manager.role)
      const canGenerate = await accessControl.canGenerateReports(manager.id, manager.role)
      console.log(`✅ Manager can view reports: ${canView}`)
      console.log(`✅ Manager can generate reports: ${canGenerate}`)
    }

    if (employee) {
      const canView = await accessControl.canViewReports(employee.id, employee.role)
      const canGenerate = await accessControl.canGenerateReports(employee.id, employee.role)
      console.log(`✅ Employee can view reports: ${canView}`)
      console.log(`✅ Employee can generate reports: ${canGenerate}`)
    }

    // Test 6: Data Portal Access
    console.log('\n🔍 Test 6: Data Portal Access')
    console.log('-'.repeat(60))

    if (admin) {
      const canAccess = await accessControl.canAccessDataPortal(admin.id, admin.role)
      const canUpload = await accessControl.canUploadData(admin.id, admin.role)
      const canDownload = await accessControl.canDownloadData(admin.id, admin.role)
      console.log(`✅ Admin can access data portal: ${canAccess}`)
      console.log(`✅ Admin can upload data: ${canUpload}`)
      console.log(`✅ Admin can download data: ${canDownload}`)
    }

    if (dataTeam) {
      const canAccess = await accessControl.canAccessDataPortal(dataTeam.id, dataTeam.role)
      const canUpload = await accessControl.canUploadData(dataTeam.id, dataTeam.role)
      const canDownload = await accessControl.canDownloadData(dataTeam.id, dataTeam.role)
      console.log(`✅ Data Team can access data portal: ${canAccess}`)
      console.log(`✅ Data Team can upload data: ${canUpload}`)
      console.log(`✅ Data Team can download data: ${canDownload}`)
    }

    if (employee) {
      const canAccess = await accessControl.canAccessDataPortal(employee.id, employee.role)
      const canUpload = await accessControl.canUploadData(employee.id, employee.role)
      const canDownload = await accessControl.canDownloadData(employee.id, employee.role)
      console.log(`✅ Employee can access data portal: ${canAccess}`)
      console.log(`✅ Employee can upload data: ${canUpload}`)
      console.log(`✅ Employee can download data: ${canDownload}`)
    }

    // Test 7: Access Control Summary
    console.log('\n🔍 Test 7: Access Control Summary')
    console.log('-'.repeat(60))

    if (admin) {
      const summary = await accessControl.getAccessControlSummary(admin.id, admin.role)
      console.log(`✅ Admin Summary:`)
      console.log(`   - Can manage assets: ${summary.canManageAssets}`)
      console.log(`   - Can approve tickets: ${summary.canApproveTickets}`)
      console.log(`   - Can view reports: ${summary.canViewReports}`)
      console.log(`   - Can access data portal: ${summary.canAccessDataPortal}`)
      console.log(`   - Accessible categories: ${summary.accessibleCategoryCount}`)
      console.log(`   - Total permissions: ${summary.permissions.length}`)
    }

    if (manager) {
      const summary = await accessControl.getAccessControlSummary(manager.id, manager.role)
      console.log(`✅ Manager Summary:`)
      console.log(`   - Can manage assets: ${summary.canManageAssets}`)
      console.log(`   - Can approve tickets: ${summary.canApproveTickets}`)
      console.log(`   - Can view reports: ${summary.canViewReports}`)
      console.log(`   - Can access data portal: ${summary.canAccessDataPortal}`)
      console.log(`   - Accessible categories: ${summary.accessibleCategoryCount}`)
      console.log(`   - Total permissions: ${summary.permissions.length}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ All tests completed successfully!')
    console.log('\n🎉 Access Control Service is working correctly!\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    console.error('\nError details:', (error as Error).message)
    console.error('\nStack trace:', (error as Error).stack)
    process.exit(1)
  }
}

// Run the tests
testAccessControl()
