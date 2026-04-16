-- ETMS Seed Data — v2 Architecture
-- 2 managers, 8 team rows, ticket categories mapped through assigned_team_key.
-- Data team users log in through /data-portal.

-- ── Ticket Types ──────────────────────────────────────
INSERT INTO ticket_types (name, type_key) VALUES
  ('Complaint', 'complaint'),
  ('Request',   'request'),
  ('Data',      'data');

-- ── Team Rows ─────────────────────────────────────────
-- These rows represent the 8 handling teams. Employees belong to exactly one team.
INSERT INTO ticket_categories
  (ticket_type_id, name, category_key, default_priority, manager_user_id, assigned_team_key, is_team, requires_approval)
VALUES
  (NULL, 'Email Team',         'email_team',        'medium', NULL, NULL, TRUE,  FALSE),
  (NULL, 'VC Team',            'vc_team',           'medium', NULL, NULL, TRUE,  FALSE),
  (NULL, 'Infra Team',         'infra_team',        'medium', NULL, NULL, TRUE,  FALSE),
  (NULL, 'Network Team',       'network_team',      'medium', NULL, NULL, TRUE,  FALSE),
  (NULL, 'Security Team',      'security_team',     'medium', NULL, NULL, TRUE,  FALSE),
  (NULL, 'SAP Team',           'sap_team',          'medium', NULL, NULL, TRUE,  FALSE),
  (NULL, 'GC Master Team',     'gc_master_team',    'medium', NULL, NULL, TRUE,  FALSE),
  (NULL, 'Reports Team',       'reports_team',      'medium', NULL, NULL, TRUE,  FALSE);

-- ── Users ─────────────────────────────────────────────
INSERT INTO users (emp_id, name, email, password_hash, role, department, password_changed_at) VALUES
  -- Admin
  ('EMP001', 'Admin User',        'admin@uiic.co.in',       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'admin',     'IT',       NOW()),

  -- Managers
  ('MGR-INFRA', 'Infra Manager',   'mgr.infra@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',   'IT',       NULL),
  ('MGR-NET',   'Network Manager', 'mgr.network@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'manager',   'Network',  NULL),

  -- Team members
  ('EMP-EMAIL-01',  'Email Team Member 1',   'email1@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'IT',       NULL),
  ('EMP-EMAIL-02',  'Email Team Member 2',   'email2@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'IT',       NULL),
  ('EMP-VC-01',     'VC Team Member 1',      'vc1@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'IT',       NULL),
  ('EMP-INFRA-01',  'Infra Team Member 1',   'infra1@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'IT',       NULL),
  ('EMP-INFRA-02',  'Infra Team Member 2',   'infra2@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'IT',       NULL),
  ('EMP-NET-01',    'Network Team Member 1', 'net1@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'Network',  NULL),
  ('EMP-NET-02',    'Network Team Member 2', 'net2@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'Network',  NULL),
  ('EMP-SEC-01',    'Security Team Member 1','sec1@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'Security', NULL),
  ('EMP-SAP-01',    'SAP Team Member 1',     'sap1@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'SAP',      NULL),
  ('EMP-GC-01',     'GC Master Member 1',    'gc1@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'GC',       NULL),
  ('EMP-RPT-01',    'Reports Team Member 1', 'reports1@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'employee',  'Reports',  NULL),

  -- Data portal user
  ('DATA001', 'Data Portal User', 'data.portal@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi', 'data_team', 'Data', NULL);

-- ── Ticket Categories ─────────────────────────────────
-- Complaint categories map directly to one of the 8 teams.
INSERT INTO ticket_categories
  (ticket_type_id, name, category_key, default_priority, manager_user_id, assigned_team_key, is_team, requires_approval)
VALUES
  ((SELECT id FROM ticket_types WHERE type_key='complaint'), 'Hardware Complaint', 'hardware_complaint', 'high',   NULL, 'infra_team',        FALSE, FALSE),
  ((SELECT id FROM ticket_types WHERE type_key='complaint'), 'Network Complaint',  'network_complaint',  'high',   NULL, 'network_team',      FALSE, FALSE),
  ((SELECT id FROM ticket_types WHERE type_key='complaint'), 'Email Complaint',    'email_complaint',    'medium', NULL, 'email_team',        FALSE, FALSE),
  ((SELECT id FROM ticket_types WHERE type_key='complaint'), 'VC Complaint',       'vc_complaint',       'medium', NULL, 'vc_team',           FALSE, FALSE),
  ((SELECT id FROM ticket_types WHERE type_key='complaint'), 'SAP Complaint',      'sap_complaint',      'medium', NULL, 'sap_team',          FALSE, FALSE),
  ((SELECT id FROM ticket_types WHERE type_key='complaint'), 'GC Master Complaint','gc_complaint',       'medium', NULL, 'gc_master_team',    FALSE, FALSE),
  ((SELECT id FROM ticket_types WHERE type_key='complaint'), 'Reports Complaint',  'reports_complaint',  'medium', NULL, 'reports_team',      FALSE, FALSE);

-- Request categories. Gate Pass is routed to the Security Team after approval.
INSERT INTO ticket_categories
  (ticket_type_id, name, category_key, default_priority, manager_user_id, assigned_team_key, is_team, requires_approval)
VALUES
  ((SELECT id FROM ticket_types WHERE type_key='request'), 'Credential Request',        'credential_request', 'medium', (SELECT id FROM users WHERE emp_id='MGR-INFRA'), 'infra_team',    FALSE, TRUE),
  ((SELECT id FROM ticket_types WHERE type_key='request'), 'New Hardware Requirement',  'new_hardware',        'low',    (SELECT id FROM users WHERE emp_id='MGR-INFRA'), 'infra_team',    FALSE, TRUE),
  ((SELECT id FROM ticket_types WHERE type_key='request'), 'New Software Requirement',  'new_software',        'low',    (SELECT id FROM users WHERE emp_id='MGR-INFRA'), 'infra_team',    FALSE, TRUE),
  ((SELECT id FROM ticket_types WHERE type_key='request'), 'Port Request',              'port_request',        'high',   (SELECT id FROM users WHERE emp_id='MGR-NET'),   'network_team',  FALSE, TRUE),
  ((SELECT id FROM ticket_types WHERE type_key='request'), 'SR Request',                'sr_request',          'medium', (SELECT id FROM users WHERE emp_id='MGR-NET'),   'network_team',  FALSE, TRUE),
  ((SELECT id FROM ticket_types WHERE type_key='request'), 'Gate Pass Request',         'gate_pass',           'low',    (SELECT id FROM users WHERE emp_id='MGR-NET'),   'security_team', FALSE, TRUE),
  ((SELECT id FROM ticket_types WHERE type_key='request'), 'ADID Request',              'adid_request',        'medium', (SELECT id FROM users WHERE emp_id='MGR-NET'),   'network_team',  FALSE, TRUE);

-- Data categories always route to the Security Team.
INSERT INTO ticket_categories
  (ticket_type_id, name, category_key, default_priority, manager_user_id, assigned_team_key, is_team, requires_approval)
VALUES
  ((SELECT id FROM ticket_types WHERE type_key='data'), 'Data Audit Request',   'data_audit',    'medium', NULL, 'security_team', FALSE, FALSE),
  ((SELECT id FROM ticket_types WHERE type_key='data'), 'Data Backup Request',  'data_backup',   'medium', NULL, 'security_team', FALSE, FALSE),
  ((SELECT id FROM ticket_types WHERE type_key='data'), 'Paycheque Data Request','paycheque_data','medium', NULL, 'security_team', FALSE, FALSE);

-- ── Assign users to their team rows ───────────────────
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='email_team')     WHERE emp_id IN ('EMP-EMAIL-01', 'EMP-EMAIL-02');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='vc_team')        WHERE emp_id IN ('EMP-VC-01');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='infra_team')     WHERE emp_id IN ('EMP-INFRA-01', 'EMP-INFRA-02', 'MGR-INFRA');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='network_team')   WHERE emp_id IN ('EMP-NET-01', 'EMP-NET-02', 'MGR-NET');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='security_team')   WHERE emp_id IN ('EMP-SEC-01');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='sap_team')        WHERE emp_id IN ('EMP-SAP-01');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='gc_master_team')  WHERE emp_id IN ('EMP-GC-01');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='reports_team')    WHERE emp_id IN ('EMP-RPT-01');
UPDATE users SET category_id = NULL                                                                   WHERE emp_id IN ('EMP001', 'DATA001');
UPDATE ticket_categories SET manager_user_id = (SELECT id FROM users WHERE emp_id='MGR-INFRA') WHERE category_key = 'infra_team';
UPDATE ticket_categories SET manager_user_id = (SELECT id FROM users WHERE emp_id='MGR-NET')   WHERE category_key = 'network_team';

-- ── Assets assigned to Infra Team employees ───────────
INSERT INTO assets (name, serial_number, category_id, assigned_to, status) VALUES
  ('DELL OPTIPLEX3070',    'F5K9MB3',   (SELECT id FROM ticket_categories WHERE category_key='infra_team'), (SELECT id FROM users WHERE emp_id='EMP-INFRA-01'), 'active'),
  ('HP PRO DESK 2 TWR G1A','1N1537078H',(SELECT id FROM ticket_categories WHERE category_key='infra_team'), (SELECT id FROM users WHERE emp_id='EMP-INFRA-02'), 'active'),
  ('DELL OPTIPLEX3070',    'JKM9MB3',   (SELECT id FROM ticket_categories WHERE category_key='infra_team'), (SELECT id FROM users WHERE emp_id='EMP-INFRA-01'), 'active');

-- Initialize ownership history for all assets
INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)
SELECT a.id, NULL, a.assigned_to, NULL, NOW(), 'Seed initial assignment' FROM assets a;
