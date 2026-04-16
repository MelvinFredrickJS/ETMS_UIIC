-- ══════════════════════════════════════════════════════════════════════════════
-- fix_categories.sql
-- Replaces the 4 Excel-imported categories with the 10 spec categories.
-- Keeps all existing users and assets intact.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Step 1: Drop FK constraints that reference ticket_categories ──────────────
-- (users.category_id and assets.category_id and tickets.category_id)
-- We'll re-add them after the data is clean.

ALTER TABLE users   DROP CONSTRAINT IF EXISTS fk_users_category;
ALTER TABLE assets  DROP CONSTRAINT IF EXISTS assets_category_id_fkey;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_category_id_fkey;
ALTER TABLE ticket_categories DROP CONSTRAINT IF EXISTS ticket_categories_manager_user_id_fkey;

-- ── Step 2: Temporarily null out category_id on users and assets ──────────────
UPDATE users  SET category_id = NULL;
ALTER TABLE assets ALTER COLUMN category_id DROP NOT NULL;
UPDATE assets SET category_id = NULL;

-- ── Step 3: Delete old categories ────────────────────────────────────────────
DELETE FROM ticket_categories;

-- ── Step 4: Reset the sequence so IDs start from 1 ───────────────────────────
ALTER SEQUENCE ticket_categories_id_seq RESTART WITH 1;

-- ── Step 5: Insert spec ticket types (skip if already exist) ─────────────────
INSERT INTO ticket_types (name, type_key)
VALUES
  ('Complaint', 'complaint'),
  ('Request',   'request'),
  ('Data',      'data')
ON CONFLICT (type_key) DO NOTHING;

-- ── Step 6: Insert spec managers (MGR001–MGR010) ─────────────────────────────
-- Keep existing 4 managers but give them proper emp_ids.
-- Insert 6 new managers for the remaining categories.
-- Password hash = Password@123

-- Update existing managers to spec emp_ids
UPDATE users SET emp_id = 'MGR003', name = 'Hardware Manager',  email = 'mgr.hardware@uiic.co.in',  team = 'IT'
  WHERE emp_id = 'MGR_HEALTH';

UPDATE users SET emp_id = 'MGR001', name = 'Network Manager',   email = 'mgr.network@uiic.co.in',   team = 'IT'
  WHERE emp_id = 'MGR_CUSTOMER_CARE';

UPDATE users SET emp_id = 'MGR007', name = 'Hardware Req Mgr',  email = 'mgr.hwreq@uiic.co.in',     team = 'IT'
  WHERE emp_id = 'MGR_R_D';

UPDATE users SET emp_id = 'MGR004', name = 'GatePass Manager',  email = 'mgr.gatepass@uiic.co.in',  team = 'Security'
  WHERE emp_id = 'MGR_RTI';

-- Insert the 6 missing spec managers
INSERT INTO users (emp_id, name, email, password_hash, role, team, password_changed_at)
VALUES
  ('MGR002','Software Manager','mgr.software@uiic.co.in','$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager','IT',NULL),
  ('MGR005','Cred Manager',    'mgr.cred@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager','IT',NULL),
  ('MGR006','Port Manager',    'mgr.port@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager','IT',NULL),
  ('MGR008','Software Req Mgr','mgr.swreq@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager','IT',NULL),
  ('MGR009','Payroll Manager', 'mgr.payroll@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager','HR',NULL),
  ('MGR010','Data Mgr',        'mgr.data@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager','IT',NULL)
ON CONFLICT (emp_id) DO NOTHING;

-- ── Step 7: Insert the 10 spec categories ────────────────────────────────────
-- Complaint (type_id = 1)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  ((SELECT id FROM ticket_types WHERE type_key='complaint'),
   'Network Issue',  'network_issue',  'high',
   (SELECT id FROM users WHERE emp_id='MGR001'), TRUE),

  ((SELECT id FROM ticket_types WHERE type_key='complaint'),
   'Software Issue', 'software_issue', 'low',
   (SELECT id FROM users WHERE emp_id='MGR002'), TRUE),

  ((SELECT id FROM ticket_types WHERE type_key='complaint'),
   'Hardware Issue', 'hardware_issue', 'high',
   (SELECT id FROM users WHERE emp_id='MGR003'), TRUE);

-- Request (type_id = 2)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  ((SELECT id FROM ticket_types WHERE type_key='request'),
   'Gate Pass Request',        'gate_pass',          'low',
   (SELECT id FROM users WHERE emp_id='MGR004'), FALSE),

  ((SELECT id FROM ticket_types WHERE type_key='request'),
   'Credential Request',       'credential_request', 'medium',
   (SELECT id FROM users WHERE emp_id='MGR005'), TRUE),

  ((SELECT id FROM ticket_types WHERE type_key='request'),
   'Port Request',             'port_request',       'high',
   (SELECT id FROM users WHERE emp_id='MGR006'), TRUE),

  ((SELECT id FROM ticket_types WHERE type_key='request'),
   'New Hardware Requirement', 'new_hardware',       'low',
   (SELECT id FROM users WHERE emp_id='MGR007'), TRUE),

  ((SELECT id FROM ticket_types WHERE type_key='request'),
   'New Software Requirement', 'new_software',       'low',
   (SELECT id FROM users WHERE emp_id='MGR008'), TRUE);

-- Data (type_id = 3)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  ((SELECT id FROM ticket_types WHERE type_key='data'),
   'Paycheque Balance',   'paycheque_balance', 'medium',
   (SELECT id FROM users WHERE emp_id='MGR009'), TRUE),

  ((SELECT id FROM ticket_types WHERE type_key='data'),
   'Data Backup Request', 'data_backup',       'medium',
   (SELECT id FROM users WHERE emp_id='MGR010'), TRUE);

-- ── Step 8: Assign all employees → hardware_issue category ───────────────────
UPDATE users
SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'hardware_issue')
WHERE role = 'employee';

-- ── Step 9: Assign managers → their respective categories ────────────────────
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='network_issue')
  WHERE emp_id = 'MGR001';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='software_issue')
  WHERE emp_id = 'MGR002';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='hardware_issue')
  WHERE emp_id = 'MGR003';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='gate_pass')
  WHERE emp_id = 'MGR004';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='credential_request')
  WHERE emp_id = 'MGR005';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='port_request')
  WHERE emp_id = 'MGR006';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_hardware')
  WHERE emp_id = 'MGR007';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_software')
  WHERE emp_id = 'MGR008';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='paycheque_balance')
  WHERE emp_id = 'MGR009';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='data_backup')
  WHERE emp_id = 'MGR010';

-- ── Step 10: Assign all assets → hardware_issue category ─────────────────────
UPDATE assets
SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'hardware_issue');

-- Restore NOT NULL on assets.category_id
ALTER TABLE assets ALTER COLUMN category_id SET NOT NULL;

-- ── Step 11: Re-add FK constraints ───────────────────────────────────────────
ALTER TABLE users
  ADD CONSTRAINT fk_users_category
  FOREIGN KEY (category_id) REFERENCES ticket_categories(id);

ALTER TABLE assets
  ADD CONSTRAINT assets_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES ticket_categories(id);

ALTER TABLE tickets
  ADD CONSTRAINT tickets_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES ticket_categories(id);

ALTER TABLE ticket_categories
  ADD CONSTRAINT ticket_categories_manager_user_id_fkey
  FOREIGN KEY (manager_user_id) REFERENCES users(id);

-- ── Step 12: Verify ───────────────────────────────────────────────────────────
SELECT tc.id, tc.name, tc.category_key, tt.type_key,
       u.emp_id AS manager_emp_id, tc.requires_approval
FROM ticket_categories tc
JOIN ticket_types tt ON tc.ticket_type_id = tt.id
LEFT JOIN users u ON tc.manager_user_id = u.id
ORDER BY tt.id, tc.id;

COMMIT;
