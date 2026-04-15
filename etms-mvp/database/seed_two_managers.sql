-- ETMS Seed — Two-Manager Variant
-- Both managers (MGR_A, MGR_B) handle ALL categories via round-robin approval routing.
-- ticket_categories.manager_user_id is set to MGR_A by default (used for org graph display only).
-- Actual approval routing uses managerAssignmentService.getNextApprovalManager().
-- Hash for Password@123: $2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi

-- ── Ticket Types ──────────────────────────────────────
INSERT INTO ticket_types (name, type_key) VALUES
  ('Complaint', 'complaint'),
  ('Request',   'request'),
  ('Data',      'data');

-- ── Users ─────────────────────────────────────────────
INSERT INTO users (emp_id, name, email, password_hash, role, department, password_changed_at) VALUES
  -- Admin
  ('EMP001', 'Admin User',   'admin@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'admin',   'IT', NOW()),

  -- Two global managers
  ('MGR_A',  'Manager Alpha','mgr.alpha@uiic.co.in','$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager', 'IT', NULL),
  ('MGR_B',  'Manager Beta', 'mgr.beta@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager', 'IT', NULL),

  -- Employees: network_issue (2)
  ('EMP101', 'Network Tech One',    'net.tech1@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP102', 'Network Tech Two',    'net.tech2@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: software_issue (2)
  ('EMP201', 'Software Tech One',   'sw.tech1@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP202', 'Software Tech Two',   'sw.tech2@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: hardware_issue (4 — real UIIC staff)
  ('29488.0', 'DHIRENDRA SINGH SHEKHAWAT', 'emp29488@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health', NULL),
  ('45359.0', 'S.S. SARATH',               'emp45359@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health', NULL),
  ('60109.0', 'ABIRAMI',                   'emp60109@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health', NULL),
  ('60442.0', 'TEJ MONJU',                 'emp60442@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health', NULL),

  -- Employees: gate_pass (2)
  ('EMP401', 'Gate Pass Staff One', 'gate.staff1@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Security', NULL),
  ('EMP402', 'Gate Pass Staff Two', 'gate.staff2@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Security', NULL),

  -- Employees: credential_request (2)
  ('EMP501', 'Cred Staff One',      'cred.staff1@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP502', 'Cred Staff Two',      'cred.staff2@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: port_request (2)
  ('EMP601', 'Port Staff One',      'port.staff1@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP602', 'Port Staff Two',      'port.staff2@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: new_hardware (2)
  ('EMP701', 'HW Req Staff One',    'hwreq.staff1@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP702', 'HW Req Staff Two',    'hwreq.staff2@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: new_software (2)
  ('EMP801', 'SW Req Staff One',    'swreq.staff1@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP802', 'SW Req Staff Two',    'swreq.staff2@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: paycheque_balance (2)
  ('EMP901', 'Payroll Staff One',   'payroll.staff1@uiic.co.in','$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'HR',      NULL),
  ('EMP902', 'Payroll Staff Two',   'payroll.staff2@uiic.co.in','$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'HR',      NULL),

  -- Employees: data_backup (2)
  ('EMP1001','Data Staff One',      'data.staff1@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP1002','Data Staff Two',      'data.staff2@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL);

-- ── Ticket Categories ─────────────────────────────────
-- manager_user_id = MGR_A for all (display only — routing uses round-robin)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (1,'Network Issue',            'network_issue',      'high',   (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE),
  (1,'Software Issue',           'software_issue',     'low',    (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE),
  (1,'Hardware Issue',           'hardware_issue',     'high',   (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE),
  (2,'Gate Pass Request',        'gate_pass',          'low',    (SELECT id FROM users WHERE emp_id='MGR_A'), FALSE),
  (2,'Credential Request',       'credential_request', 'medium', (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE),
  (2,'Port Request',             'port_request',       'high',   (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE),
  (2,'New Hardware Requirement', 'new_hardware',       'low',    (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE),
  (2,'New Software Requirement', 'new_software',       'low',    (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE),
  (3,'Paycheque Balance',        'paycheque_balance',  'medium', (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE),
  (3,'Data Backup Request',      'data_backup',        'medium', (SELECT id FROM users WHERE emp_id='MGR_A'), TRUE);

-- ── Populate users.category_id ────────────────────────
-- Managers have no specific category (they handle all)
UPDATE users SET category_id = NULL WHERE emp_id IN ('MGR_A','MGR_B');

UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='network_issue')      WHERE emp_id IN ('EMP101','EMP102');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='software_issue')     WHERE emp_id IN ('EMP201','EMP202');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='hardware_issue')     WHERE emp_id IN ('29488.0','45359.0','60109.0','60442.0');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='gate_pass')          WHERE emp_id IN ('EMP401','EMP402');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='credential_request') WHERE emp_id IN ('EMP501','EMP502');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='port_request')       WHERE emp_id IN ('EMP601','EMP602');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_hardware')       WHERE emp_id IN ('EMP701','EMP702');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_software')       WHERE emp_id IN ('EMP801','EMP802');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='paycheque_balance')  WHERE emp_id IN ('EMP901','EMP902');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='data_backup')        WHERE emp_id IN ('EMP1001','EMP1002');

-- ── Assets (hardware_issue employees) ─────────────────
INSERT INTO assets (name, serial_number, category_id, assigned_to, status) VALUES
  ('DELL OPTIPLEX3070',    'F5K9MB3',   (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='29488.0'), 'active'),
  ('HP PRO DESK 2 TWR G1A','1N1537078H',(SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='45359.0'), 'active'),
  ('HP PRO DESK 2 TWR G1A','1N153705QB',(SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60109.0'), 'active'),
  ('DELL OPTIPLEX3070',    'JKM9MB3',   (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60442.0'), 'active');

INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)
SELECT a.id, NULL, a.assigned_to, NULL, NOW(), 'Seed initial assignment' FROM assets a;
