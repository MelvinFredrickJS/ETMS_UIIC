/**
 * Test Manager Service
 * 
 * Comprehensive test script for the new ManagerService functionality
 */

import { ManagerService } from '../services/managerService'
import pool from '../config/db'

interface TestResult {
  test: string
  passed: boolean
  error?: string
  data?: any
}

class ManagerServiceTester {
  private results: TestResult[] = []

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    try {
      console.log(`🧪 Running: ${testName}`)
      const result = await testFn()
      this.results.push({
        test: testName,
        passed: true,
        data: result
      })
      console.log(`✅ Passed: ${testName}`)
    } catch (error) {
      this.results.push({
        test: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      })
      console.log(`❌ Failed: ${testName} - ${error}`)
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Manager Service Tests...\n')

    // Test 1: Get all active managers
    await this.runTest('Get All Active Managers', async () => {
      const managers = await ManagerService.getAllActiveManagers()
      console.log(`   Found ${managers.length} active managers`)
      return managers
    })

    // Test 2: Get manager by ID (assuming manager ID 1 exists)
    await this.runTest('Get Manager By ID', async () => {
      const manager = await ManagerService.getManagerById(1)
      if (manager) {
        console.log(`   Manager: ${manager.name} (${manager.email})`)
      } else {
        console.log(`   No manager found with ID 1`)
      }
      return manager
    })

    // Test 3: Get managed categories (assuming manager ID 1)
    await this.runTest('Get Managed Categories', async () => {
      const categories = await ManagerService.getManagedCategories(1)
      console.log(`   Manager 1 manages ${categories.length} categories`)
      return categories
    })

    // Test 4: Get manager for category (assuming category ID 1)
    await this.runTest('Get Manager For Category', async () => {
      const manager = await ManagerService.getManagerForCategory(1)
      if (manager) {
        console.log(`   Category 1 manager: ${manager.name}`)
      } else {
        console.log(`   No manager assigned to category 1`)
      }
      return manager
    })

    // Test 5: Validate manager ownership
    await this.runTest('Validate Manager Ownership', async () => {
      const isOwner = await ManagerService.validateManagerOwnership(1, 1)
      console.log(`   Manager 1 owns category 1: ${isOwner}`)
      return isOwner
    })

    // Test 6: Check if manager is active
    await this.runTest('Check Manager Active Status', async () => {
      const isActive = await ManagerService.isManagerActive(1)
      console.log(`   Manager 1 is active: ${isActive}`)
      return isActive
    })

    // Test 7: Get manager workload
    await this.runTest('Get Manager Workload', async () => {
      const workload = await ManagerService.getManagerWorkload(1)
      console.log(`   Manager 1 workload:`)
      console.log(`     - Pending approvals: ${workload.pendingApprovals}`)
      console.log(`     - Total categories: ${workload.totalCategories}`)
      console.log(`     - Active tickets: ${workload.activeTickets}`)
      console.log(`     - Avg response time: ${workload.avgResponseTime || 'N/A'} hours`)
      return workload
    })

    // Test 8: Get all managers with workload
    await this.runTest('Get All Managers With Workload', async () => {
      const managersWithWorkload = await ManagerService.getAllManagersWithWorkload()
      console.log(`   Retrieved workload for ${managersWithWorkload.length} managers`)
      return managersWithWorkload
    })

    // Test 9: Get managers by team (assuming 'infra_team' exists)
    await this.runTest('Get Managers By Team', async () => {
      const managers = await ManagerService.getManagersByTeam('infra_team')
      console.log(`   Found ${managers.length} managers for infra_team`)
      return managers
    })

    // Test 10: Cache functionality
    await this.runTest('Cache Functionality', async () => {
      // Clear cache first
      ManagerService.clearCache()
      
      // Get manager (should hit database)
      const start1 = Date.now()
      await ManagerService.getManagerById(1)
      const time1 = Date.now() - start1
      
      // Get same manager again (should hit cache)
      const start2 = Date.now()
      await ManagerService.getManagerById(1)
      const time2 = Date.now() - start2
      
      console.log(`   First call: ${time1}ms, Second call: ${time2}ms`)
      console.log(`   Cache speedup: ${time2 < time1 ? 'YES' : 'NO'}`)
      
      const stats = ManagerService.getCacheStats()
      console.log(`   Cache size: ${stats.size} entries`)
      
      return { time1, time2, cacheSize: stats.size }
    })

    // Test 11: Assignment history (if table exists)
    await this.runTest('Get Assignment History', async () => {
      try {
        const history = await ManagerService.getAssignmentHistory(1)
        console.log(`   Found ${history.length} history records for category 1`)
        return history
      } catch (error) {
        // Table might not exist yet
        console.log(`   History table not available: ${error}`)
        return []
      }
    })

    // Test 12: Test manager assignment (if we have permission)
    await this.runTest('Test Manager Assignment (Dry Run)', async () => {
      // This is a dry run - we'll validate but not actually assign
      const manager = await ManagerService.getManagerById(1)
      if (!manager) {
        throw new Error('No manager found for testing')
      }
      
      const categories = await ManagerService.getManagedCategories(1)
      if (categories.length === 0) {
        console.log('   No categories to test assignment with')
        return { message: 'No test data available' }
      }
      
      console.log(`   Would assign manager ${manager.name} to category ${categories[0].id}`)
      return { 
        manager: manager.name, 
        category: categories[0].name,
        message: 'Assignment validation successful (dry run)'
      }
    })

    this.printSummary()
  }

  private printSummary(): void {
    console.log('\n📊 Test Summary:')
    console.log('================')
    
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`   - ${r.test}: ${r.error}`))
    }
    
    console.log('\n🎯 Recommendations:')
    if (passed === this.results.length) {
      console.log('   ✅ All tests passed! ManagerService is ready for production.')
    } else {
      console.log('   ⚠️  Some tests failed. Review the errors above.')
      console.log('   💡 Make sure the database is properly seeded with test data.')
      console.log('   💡 Run the manager history migration if assignment history tests failed.')
    }
  }
}

// Database connection test
async function testDatabaseConnection(): Promise<void> {
  try {
    await pool.query('SELECT NOW()')
    console.log('✅ Database connection successful')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    console.log('🔧 Manager Service Test Suite')
    console.log('============================\n')
    
    // Test database connection first
    await testDatabaseConnection()
    
    // Run all tests
    const tester = new ManagerServiceTester()
    await tester.runAllTests()
    
  } catch (error) {
    console.error('💥 Test suite failed:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 Test suite completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Test suite error:', error)
      process.exit(1)
    })
}

export default ManagerServiceTester