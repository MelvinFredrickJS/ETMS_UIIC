-- ETMS Seed Data — United India Insurance Co. Ltd.
-- Hash for Password@123: $2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi
-- Admin gets password_changed_at = NOW() (pre-exempt from forced change)
-- All others get password_changed_at = NULL (must change on first login)
-- Every category has at least 2 active employees so approvals never fail.

-- ── Ticket Types ──────────────────────────────────────
INSERT INTO ticket_types (name, type_key) VALUES
  ('Complaint', 'complaint'),
  ('Request',   'request'),
  ('Data',      'data');

-- ── Users ─────────────────────────────────────────────
-- 1 admin, 10 managers (one per category), 2+ employees per category
-- Real employees from UIIC data are placed in hardware_issue.
-- Spec employees cover the remaining 9 categories.

INSERT INTO users (emp_id, name, email, password_hash, role, department, password_changed_at) VALUES
  -- Admin
  ('EMP001', 'Admin User',                'admin@uiic.co.in',             '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'admin',    'IT',       NOW()),

  -- Managers (one per spec category)
  ('MGR001', 'Network Manager',           'mgr.network@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR002', 'Software Manager',          'mgr.software@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR003', 'Hardware Manager',          'mgr.hardware@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR004', 'GatePass Manager',          'mgr.gatepass@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'Security', NULL),
  ('MGR005', 'Cred Manager',              'mgr.cred@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR006', 'Port Manager',              'mgr.port@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR007', 'Hardware Req Mgr',          'mgr.hwreq@uiic.co.in',         '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR008', 'Software Req Mgr',          'mgr.swreq@uiic.co.in',         '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),
  ('MGR009', 'Payroll Manager',           'mgr.payroll@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'HR',       NULL),
  ('MGR010', 'Data Mgr',                  'mgr.data@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',  'IT',       NULL),

  -- Employees: network_issue (2)
  ('EMP101', 'Network Tech One',          'net.tech1@uiic.co.in',         '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP102', 'Network Tech Two',          'net.tech2@uiic.co.in',         '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: software_issue (2)
  ('EMP201', 'Software Tech One',         'sw.tech1@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP202', 'Software Tech Two',         'sw.tech2@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: hardware_issue — real UIIC employees (18)
  ('29488.0', 'DHIRENDRA SINGH SHEKHAWAT','emp29488@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('45359.0', 'S.S. SARATH',              'emp45359@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60109.0', 'ABIRAMI',                  'emp60109@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60442.0', 'TEJ MONJU',                'emp60442@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('29759.0', 'KABILAN',                  'emp29759@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60760.0', 'AJAY V',                   'emp60760@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60304.0', 'SHENBAGAKARTHIYAINI M',    'emp60304@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('27904.0', 'ANUJ',                     'emp27904@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60318.0', 'ANUPRIYA',                 'emp60318@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60305.0', 'DIPTI DHOTRE',             'emp60305@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60354.0', 'BOOPATHI RAJKUMAR',        'emp60354@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('29822.0', 'VENKATA SUBRAMANIAN S',    'emp29822@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60301.0', 'PRAVEENA DR',              'emp60301@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60815.0', 'VIVEK PATLE',              'emp60815@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('60743.0', 'NISHANT ARYAN',            'emp60743@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('29001.0', 'VISHNUPRIYA RADHAKRISHNAN','emp29001@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('29172.0', 'KALAIVANI J',              'emp29172@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Health',   NULL),
  ('27953.0', 'RAHUL KUMAR',              'emp27953@uiic.co.in',          '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'R&D',      NULL),

  -- Employees: gate_pass (2)
  ('EMP401', 'Gate Pass Staff One',       'gate.staff1@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Security', NULL),
  ('EMP402', 'Gate Pass Staff Two',       'gate.staff2@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'Security', NULL),

  -- Employees: credential_request (2)
  ('EMP501', 'Cred Staff One',            'cred.staff1@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP502', 'Cred Staff Two',            'cred.staff2@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: port_request (2)
  ('EMP601', 'Port Staff One',            'port.staff1@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP602', 'Port Staff Two',            'port.staff2@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: new_hardware (2)
  ('EMP701', 'HW Req Staff One',          'hwreq.staff1@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP702', 'HW Req Staff Two',          'hwreq.staff2@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: new_software (2)
  ('EMP801', 'SW Req Staff One',          'swreq.staff1@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP802', 'SW Req Staff Two',          'swreq.staff2@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),

  -- Employees: paycheque_balance (2)
  ('EMP901', 'Payroll Staff One',         'payroll.staff1@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'HR',       NULL),
  ('EMP902', 'Payroll Staff Two',         'payroll.staff2@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'HR',       NULL),

  -- Employees: data_backup (2)
  ('EMP1001', 'Data Staff One',           'data.staff1@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL),
  ('EMP1002', 'Data Staff Two',           'data.staff2@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee', 'IT',       NULL);

-- ── Ticket Categories (10 spec categories) ────────────
-- Complaint (type 1)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (1, 'Network Issue',            'network_issue',      'high',   (SELECT id FROM users WHERE emp_id='MGR001'), TRUE),
  (1, 'Software Issue',           'software_issue',     'low',    (SELECT id FROM users WHERE emp_id='MGR002'), TRUE),
  (1, 'Hardware Issue',           'hardware_issue',     'high',   (SELECT id FROM users WHERE emp_id='MGR003'), TRUE);

-- Request (type 2)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (2, 'Gate Pass Request',        'gate_pass',          'low',    (SELECT id FROM users WHERE emp_id='MGR004'), FALSE),
  (2, 'Credential Request',       'credential_request', 'medium', (SELECT id FROM users WHERE emp_id='MGR005'), TRUE),
  (2, 'Port Request',             'port_request',       'high',   (SELECT id FROM users WHERE emp_id='MGR006'), TRUE),
  (2, 'New Hardware Requirement', 'new_hardware',       'low',    (SELECT id FROM users WHERE emp_id='MGR007'), TRUE),
  (2, 'New Software Requirement', 'new_software',       'low',    (SELECT id FROM users WHERE emp_id='MGR008'), TRUE);

-- Data (type 3)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (3, 'Paycheque Balance',        'paycheque_balance',  'medium', (SELECT id FROM users WHERE emp_id='MGR009'), TRUE),
  (3, 'Data Backup Request',      'data_backup',        'medium', (SELECT id FROM users WHERE emp_id='MGR010'), TRUE);

-- ── Populate users.category_id ────────────────────────
-- Managers
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='network_issue')      WHERE emp_id='MGR001';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='software_issue')     WHERE emp_id='MGR002';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='hardware_issue')     WHERE emp_id='MGR003';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='gate_pass')          WHERE emp_id='MGR004';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='credential_request') WHERE emp_id='MGR005';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='port_request')       WHERE emp_id='MGR006';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_hardware')       WHERE emp_id='MGR007';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_software')       WHERE emp_id='MGR008';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='paycheque_balance')  WHERE emp_id='MGR009';
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='data_backup')        WHERE emp_id='MGR010';

-- network_issue employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='network_issue')      WHERE emp_id IN ('EMP101','EMP102');

-- software_issue employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='software_issue')     WHERE emp_id IN ('EMP201','EMP202');

-- hardware_issue employees (real UIIC staff)
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='hardware_issue')
  WHERE emp_id IN (
    '29488.0','45359.0','60109.0','60442.0','29759.0','60760.0',
    '60304.0','27904.0','60318.0','60305.0','60354.0','29822.0',
    '60301.0','60815.0','60743.0','29001.0','29172.0','27953.0'
  );

-- gate_pass employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='gate_pass')          WHERE emp_id IN ('EMP401','EMP402');

-- credential_request employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='credential_request') WHERE emp_id IN ('EMP501','EMP502');

-- port_request employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='port_request')       WHERE emp_id IN ('EMP601','EMP602');

-- new_hardware employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_hardware')       WHERE emp_id IN ('EMP701','EMP702');

-- new_software employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_software')       WHERE emp_id IN ('EMP801','EMP802');

-- paycheque_balance employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='paycheque_balance')  WHERE emp_id IN ('EMP901','EMP902');

-- data_backup employees
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='data_backup')        WHERE emp_id IN ('EMP1001','EMP1002');

-- ── Assets assigned to hardware_issue employees ───────
INSERT INTO assets (name, serial_number, category_id, assigned_to, status) VALUES
  ('DELL OPTIPLEX3070',    'F5K9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='29488.0'), 'active'),
  ('HP PRO DESK 2 TWR G1A','1N1537078H',           (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='45359.0'), 'active'),
  ('HP PRO DESK 2 TWR G1A','1N153705QB',           (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60109.0'), 'active'),
  ('DELL OPTIPLEX3070',    'JKM9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60442.0'), 'active'),
  ('HP PRO DESK 2 TWR G1A','1N153705C7',           (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='29759.0'), 'active'),
  ('DELL OPTIPLEX3070',    '4HM9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60760.0'), 'active'),
  ('DELL OPTIPLEX3070',    'CNN9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60304.0'), 'active'),
  ('DELL OPTIPLEX3070',    '54K9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='27904.0'), 'active'),
  ('DELL OPTIPLEX3070',    '6MN9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60318.0'), 'active'),
  ('DELL OPTIPLEX3070',    'GMN9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60305.0'), 'active'),
  ('DELL OPTIPLEX3070',    '4KM9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60354.0'), 'active'),
  ('HP PRO DESK 2 TWR G1A','1N153705KT',           (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='29822.0'), 'active'),
  ('DELL OPTIPLEX3070',    '75K9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60301.0'), 'active'),
  ('ACER VERITON X2710G',  'UDVY3SI00753718A520700',(SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60815.0'), 'active'),
  ('ACER VERITON X2710G',  'UDVY3SI00753718A790700',(SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='60743.0'), 'active'),
  ('HP PRO DESK 2 TWR G1A','1N1537058Q',           (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='29001.0'), 'active'),
  ('DELL OPTIPLEX3070',    '24K9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='29172.0'), 'active'),
  ('DELL OPTIPLEX3070',    'C8M9MB3',              (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='27953.0'), 'active');

-- Initialize ownership history for all assets
INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)
SELECT a.id, NULL, a.assigned_to, NULL, NOW(), 'Seed initial assignment' FROM assets a;

