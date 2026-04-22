/**
 * Run Migration Via Server
 * 
 * This script runs the migration by making a request to the server
 * which already has a working database connection.
 */

import fs from 'fs'
import path from 'path'

// Create a simple migration endpoint
const migrationEndpoint = `
// Add this to your server routes temporarily
app.post('/admin/migrate-manager-history', async (req, res) => {
  try {
    const migrationSQL = \`
-- Create manager assignment history table
CREATE TABLE IF NOT EXISTS manager_assignment_history (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    manager_user_id INTEGER NOT NULL,
    action VARCHAR(20) CHECK (action IN ('assigned', 'removed')) NOT NULL,
    assigned_by INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    
    -- Foreign key constraints
    FOREIGN KEY (category_id) REFERENCES ticket_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manager_assignment_category_id ON manager_assignment_history(category_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignment_manager_user_id ON manager_assignment_history(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignment_assigned_at ON manager_assignment_history(assigned_at);
CREATE INDEX IF NOT EXISTS idx_manager_assignment_action ON manager_assignment_history(action);
\`;

    // Execute the migration
    await pool.query(migrationSQL);

    // Add sample data for existing manager assignments
    const insertSQL = \`
INSERT INTO manager_assignment_history (category_id, manager_user_id, action, assigned_by, assigned_at, reason)
SELECT 
    tc.id as category_id,
    tc.manager_user_id,
    'assigned' as action,
    1 as assigned_by,
    tc.created_at as assigned_at,
    'Initial assignment during system setup' as reason
FROM ticket_categories tc
WHERE tc.manager_user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM manager_assignment_history mah 
    WHERE mah.category_id = tc.id AND mah.manager_user_id = tc.manager_user_id
);
\`;

    await pool.query(insertSQL);

    // Get counts
    const { rows: historyCount } = await pool.query('SELECT COUNT(*) as count FROM manager_assignment_history');
    const { rows: categoryCount } = await pool.query('SELECT COUNT(*) as count FROM ticket_categories WHERE manager_user_id IS NOT NULL');

    res.json({
      success: true,
      message: 'Migration completed successfully',
      historyRecords: historyCount[0].count,
      categoriesWithManagers: categoryCount[0].count
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
`

console.log('🔧 Manual Migration Instructions:')
console.log('================================')
console.log('')
console.log('Since the automated migration script has database connection issues,')
console.log('here are the manual steps to run the migration:')
console.log('')
console.log('Option 1: Add temporary endpoint to server')
console.log('------------------------------------------')
console.log('1. Add this code to your server.ts or app.ts file:')
console.log('')
console.log(migrationEndpoint)
console.log('')
console.log('2. Start your server: npm run dev')
console.log('3. Make a POST request to: http://localhost:5000/admin/migrate-manager-history')
console.log('4. Remove the endpoint after migration')
console.log('')
console.log('Option 2: Run SQL directly in database')
console.log('--------------------------------------')

// Read and display the SQL
const migrationPath = path.join(__dirname, '../../database/create_manager_assignment_history.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

console.log('Execute this SQL in your PostgreSQL database:')
console.log('')
console.log('```sql')
console.log(migrationSQL)
console.log('```')
console.log('')
console.log('Option 3: Use database GUI tool')
console.log('-------------------------------')
console.log('1. Open pgAdmin, DBeaver, or similar tool')
console.log('2. Connect to database: uiicdb_v2')
console.log('3. Execute the SQL above')
console.log('')
console.log('✅ After migration, you can test with:')
console.log('   npx ts-node scripts/testManagerService.ts')