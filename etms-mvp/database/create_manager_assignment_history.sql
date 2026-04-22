-- Create manager assignment history table
-- This tracks when managers are assigned/removed from categories

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

-- Add some sample data for existing manager assignments
INSERT INTO manager_assignment_history (category_id, manager_user_id, action, assigned_by, assigned_at, reason)
SELECT 
    tc.id as category_id,
    tc.manager_user_id,
    'assigned' as action,
    1 as assigned_by, -- Assuming admin user ID 1
    tc.created_at as assigned_at,
    'Initial assignment during system setup' as reason
FROM ticket_categories tc
WHERE tc.manager_user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM manager_assignment_history mah 
    WHERE mah.category_id = tc.id AND mah.manager_user_id = tc.manager_user_id
);