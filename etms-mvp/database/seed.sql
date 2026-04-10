-- Hash for Password@123: $2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi
-- Admin gets password_changed_at = NOW() (pre-exempt from forced change)
-- All others get password_changed_at = NULL (must change on first login)
-- Every employee and manager should have category_id populated.
-- Because categories are inserted after users in this seed order,
-- category_id is populated in UPDATE statements after category inserts.

-- ── Ticket Types ──────────────────────────────────────
INSERT INTO ticket_types (name, type_key) VALUES
  ('Complaint', 'complaint'),
  ('Request',   'request'),
  ('Data',      'data');

-- ── Users ─────────────────────────────────────────────
-- Insert users BEFORE categories so manager_user_id FKs resolve.
-- 1 admin, 5 employees, 10 managers (one per category)
INSERT INTO users (emp_id, name, email, password_hash, role, department, password_changed_at) VALUES
  ('EMP001', 'Admin User',       'admin@uiic.co.in',        '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'admin',    'IT',       NOW()),
  ('EMP002', 'employee One',     'tech1@uiic.co.in',        '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP003', 'employee Two',     'tech2@uiic.co.in',        '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP004', 'Ravi Kumar',       'ravi@uiic.co.in',         '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Finance',  NULL),
  ('EMP005', 'Priya Sharma',     'priya@uiic.co.in',        '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Operations', NULL),
  ('EMP006', 'Hardware Tech',    'hw.tech@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  -- 10 managers — one will be assigned per category below
  ('MGR001', 'Network Manager',  'mgr.network@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR002', 'Software Manager', 'mgr.software@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR003', 'Hardware Manager', 'mgr.hardware@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR004', 'GatePass Manager', 'mgr.gatepass@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'Security', NULL),
  ('MGR005', 'Cred Manager',     'mgr.cred@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR006', 'Port Manager',     'mgr.port@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR007', 'Hardware Req Mgr', 'mgr.hwreq@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR008', 'Software Req Mgr', 'mgr.swreq@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR009', 'Payroll Manager',  'mgr.payroll@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'HR',       NULL),
  ('MGR010', 'Data Mgr',         'mgr.data@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL);

-- ── Ticket Categories (with manager_user_id + requires_approval) ──

-- Complaint (ticket_type_id = 1)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (1, 'Network Issue',  'network_issue',  'high', (SELECT id FROM users WHERE emp_id='MGR001'), TRUE),
  (1, 'Software Issue', 'software_issue', 'low',  (SELECT id FROM users WHERE emp_id='MGR002'), TRUE),
  (1, 'Hardware Issue', 'hardware_issue', 'high', (SELECT id FROM users WHERE emp_id='MGR003'), TRUE);

-- Request (ticket_type_id = 2)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (2, 'Gate Pass Request',        'gate_pass',          'low',    (SELECT id FROM users WHERE emp_id='MGR004'), FALSE),
  (2, 'Credential Request',       'credential_request', 'medium', (SELECT id FROM users WHERE emp_id='MGR005'), TRUE),
  (2, 'Port Request',             'port_request',       'high',   (SELECT id FROM users WHERE emp_id='MGR006'), TRUE),
  (2, 'New Hardware Requirement', 'new_hardware',       'low',    (SELECT id FROM users WHERE emp_id='MGR007'), TRUE),
  (2, 'New Software Requirement', 'new_software',       'low',    (SELECT id FROM users WHERE emp_id='MGR008'), TRUE);

-- Data (ticket_type_id = 3)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (3, 'Paycheque Balance',   'paycheque_balance', 'medium', (SELECT id FROM users WHERE emp_id='MGR009'), TRUE),
  (3, 'Data Backup Request', 'data_backup',       'medium', (SELECT id FROM users WHERE emp_id='MGR010'), TRUE);

-- ── Populate users.category_id (required for employee and manager) ──

UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'network_issue')
  WHERE emp_id = 'MGR001';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'software_issue')
  WHERE emp_id = 'MGR002';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'hardware_issue')
  WHERE emp_id = 'MGR003';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'gate_pass')
  WHERE emp_id = 'MGR004';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'credential_request')
  WHERE emp_id = 'MGR005';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'port_request')
  WHERE emp_id = 'MGR006';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'new_hardware')
  WHERE emp_id = 'MGR007';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'new_software')
  WHERE emp_id = 'MGR008';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'paycheque_balance')
  WHERE emp_id = 'MGR009';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'data_backup')
  WHERE emp_id = 'MGR010';

UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'network_issue')
  WHERE emp_id = 'EMP002';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'software_issue')
  WHERE emp_id = 'EMP003';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'paycheque_balance')
  WHERE emp_id = 'EMP004';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'gate_pass')
  WHERE emp_id = 'EMP005';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'hardware_issue')
  WHERE emp_id = 'EMP006';

-- ── Assets assigned to employees (sample) ──
INSERT INTO assets (name, serial_number, category_id, assigned_to, status) VALUES
  ('Dell Laptop', 'DL12345', (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='EMP002'), 'active'),
  ('Monitor',     'MN56789', (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='EMP002'), 'active'),
  ('Keyboard',    'KB99887', (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='EMP003'), 'active');

-- Initialize ownership history for current assignments
INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)
SELECT a.id, NULL, a.assigned_to, NULL, NOW(), 'Seed initial assignment'
FROM assets a;
