-- =====================================================
-- ETMS Permission System Migration
-- =====================================================
-- Purpose: Create database-driven permission system
-- Date: 2026-04-22
-- =====================================================

-- 1. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  permission_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'ticket', 'asset', 'category', 'report', 'data_portal'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL, -- 'admin', 'manager', 'employee', 'data_team'
  permission_key VARCHAR(100) NOT NULL REFERENCES permissions(permission_key) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission_key)
);

-- 3. Create user_permissions table (for user-specific overrides)
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL REFERENCES permissions(permission_key) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT TRUE, -- TRUE = grant, FALSE = revoke
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission_key)
);

-- 4. Insert core permissions
INSERT INTO permissions (permission_key, permission_name, description, category) VALUES
  -- Category permissions
  ('category.view.all', 'View All Categories', 'Can view all categories regardless of ownership', 'category'),
  ('category.view.owned', 'View Owned Categories', 'Can view categories they manage', 'category'),
  ('category.view.assigned', 'View Assigned Category', 'Can view their assigned category', 'category'),
  ('category.manage.all', 'Manage All Categories', 'Can create, update, delete any category', 'category'),
  ('category.manage.owned', 'Manage Owned Categories', 'Can manage categories they own', 'category'),
  
  -- Ticket permissions
  ('ticket.view.all', 'View All Tickets', 'Can view all tickets in the system', 'ticket'),
  ('ticket.view.owned', 'View Owned Tickets', 'Can view tickets in managed categories', 'ticket'),
  ('ticket.view.raised', 'View Raised Tickets', 'Can view tickets they raised', 'ticket'),
  ('ticket.view.assigned', 'View Assigned Tickets', 'Can view tickets assigned to them', 'ticket'),
  ('ticket.create', 'Create Tickets', 'Can create new tickets', 'ticket'),
  ('ticket.update.all', 'Update All Tickets', 'Can update any ticket', 'ticket'),
  ('ticket.update.assigned', 'Update Assigned Tickets', 'Can update tickets assigned to them', 'ticket'),
  ('ticket.approve', 'Approve Tickets', 'Can approve pending tickets', 'ticket'),
  ('ticket.assign', 'Assign Tickets', 'Can assign tickets to employees', 'ticket'),
  ('ticket.close.raised', 'Close Raised Tickets', 'Can close tickets they raised', 'ticket'),
  
  -- Asset permissions
  ('asset.view.all', 'View All Assets', 'Can view all assets in the system', 'asset'),
  ('asset.view.category', 'View Category Assets', 'Can view assets in their category', 'asset'),
  ('asset.view.assigned', 'View Assigned Assets', 'Can view assets assigned to them', 'asset'),
  ('asset.manage.all', 'Manage All Assets', 'Can create, update, delete any asset', 'asset'),
  ('asset.manage.infra', 'Manage Infrastructure Assets', 'Can manage assets in infra_team', 'asset'),
  ('asset.transfer', 'Transfer Assets', 'Can transfer assets between users', 'asset'),
  
  -- Report permissions
  ('report.view.all', 'View All Reports', 'Can view all reports', 'report'),
  ('report.view.category', 'View Category Reports', 'Can view reports for managed categories', 'report'),
  ('report.generate', 'Generate Reports', 'Can generate new reports', 'report'),
  
  -- Data Portal permissions
  ('data_portal.access', 'Access Data Portal', 'Can access data portal features', 'data_portal'),
  ('data_portal.upload', 'Upload Data', 'Can upload data files', 'data_portal'),
  ('data_portal.download', 'Download Data', 'Can download data files', 'data_portal')
ON CONFLICT (permission_key) DO NOTHING;

-- 5. Assign permissions to roles
-- ADMIN: Full access
INSERT INTO role_permissions (role, permission_key) VALUES
  ('admin', 'category.view.all'),
  ('admin', 'category.manage.all'),
  ('admin', 'ticket.view.all'),
  ('admin', 'ticket.create'),
  ('admin', 'ticket.update.all'),
  ('admin', 'ticket.approve'),
  ('admin', 'ticket.assign'),
  ('admin', 'asset.view.all'),
  ('admin', 'asset.manage.all'),
  ('admin', 'asset.transfer'),
  ('admin', 'report.view.all'),
  ('admin', 'report.generate'),
  ('admin', 'data_portal.access'),
  ('admin', 'data_portal.upload'),
  ('admin', 'data_portal.download')
ON CONFLICT (role, permission_key) DO NOTHING;

-- MANAGER: Category and approval management
INSERT INTO role_permissions (role, permission_key) VALUES
  ('manager', 'category.view.owned'),
  ('manager', 'category.manage.owned'),
  ('manager', 'ticket.view.owned'),
  ('manager', 'ticket.view.raised'),
  ('manager', 'ticket.create'),
  ('manager', 'ticket.approve'),
  ('manager', 'ticket.assign'),
  ('manager', 'ticket.close.raised'),
  ('manager', 'asset.view.category'),
  ('manager', 'report.view.category'),
  ('manager', 'report.generate')
ON CONFLICT (role, permission_key) DO NOTHING;

-- EMPLOYEE: Basic ticket and asset access
INSERT INTO role_permissions (role, permission_key) VALUES
  ('employee', 'category.view.assigned'),
  ('employee', 'ticket.view.raised'),
  ('employee', 'ticket.view.assigned'),
  ('employee', 'ticket.create'),
  ('employee', 'ticket.update.assigned'),
  ('employee', 'ticket.close.raised'),
  ('employee', 'asset.view.assigned'),
  ('employee', 'data_portal.access'),
  ('employee', 'data_portal.upload')
ON CONFLICT (role, permission_key) DO NOTHING;

-- DATA_TEAM: Restricted access
INSERT INTO role_permissions (role, permission_key) VALUES
  ('data_team', 'ticket.view.assigned'),
  ('data_team', 'ticket.update.assigned'),
  ('data_team', 'data_portal.access'),
  ('data_team', 'data_portal.upload'),
  ('data_team', 'data_portal.download')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- 7. Create helper function to check permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id INTEGER,
  p_role VARCHAR(50),
  p_permission_key VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_override BOOLEAN;
  v_role_has_permission BOOLEAN;
BEGIN
  -- Check user-specific override first
  SELECT granted INTO v_user_override
  FROM user_permissions
  WHERE user_id = p_user_id AND permission_key = p_permission_key;
  
  IF v_user_override IS NOT NULL THEN
    RETURN v_user_override;
  END IF;
  
  -- Check role permission
  SELECT EXISTS(
    SELECT 1 FROM role_permissions
    WHERE role = p_role AND permission_key = p_permission_key
  ) INTO v_role_has_permission;
  
  RETURN v_role_has_permission;
END;
$$ LANGUAGE plpgsql;

-- 8. Create helper function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id INTEGER,
  p_role VARCHAR(50)
) RETURNS TABLE(permission_key VARCHAR(100), granted BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.permission_key,
    COALESCE(up.granted, TRUE) as granted
  FROM role_permissions rp
  LEFT JOIN user_permissions up ON up.user_id = p_user_id AND up.permission_key = rp.permission_key
  WHERE rp.role = p_role
  UNION
  SELECT 
    up.permission_key,
    up.granted
  FROM user_permissions up
  WHERE up.user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp 
      WHERE rp.role = p_role AND rp.permission_key = up.permission_key
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Migration Complete
-- =====================================================
-- To apply: psql -U your_user -d etms_db -f create_permissions_system.sql
-- To verify: SELECT * FROM permissions; SELECT * FROM role_permissions;
-- =====================================================
