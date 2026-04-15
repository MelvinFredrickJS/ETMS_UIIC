-- Adds 2 employees per non-hardware category so approvals never fail.
-- Safe to run on existing DB — uses ON CONFLICT DO NOTHING.

BEGIN;

INSERT INTO users (emp_id, name, email, password_hash, role, department, password_changed_at) VALUES
  -- network_issue
  ('EMP101','Network Tech One',   'net.tech1@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  ('EMP102','Network Tech Two',   'net.tech2@uiic.co.in',    '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  -- software_issue
  ('EMP201','Software Tech One',  'sw.tech1@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  ('EMP202','Software Tech Two',  'sw.tech2@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  -- gate_pass
  ('EMP401','Gate Pass Staff One','gate.staff1@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','Security',NULL),
  ('EMP402','Gate Pass Staff Two','gate.staff2@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','Security',NULL),
  -- credential_request
  ('EMP501','Cred Staff One',     'cred.staff1@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  ('EMP502','Cred Staff Two',     'cred.staff2@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  -- port_request
  ('EMP601','Port Staff One',     'port.staff1@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  ('EMP602','Port Staff Two',     'port.staff2@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  -- new_hardware
  ('EMP701','HW Req Staff One',   'hwreq.staff1@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  ('EMP702','HW Req Staff Two',   'hwreq.staff2@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  -- new_software
  ('EMP801','SW Req Staff One',   'swreq.staff1@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  ('EMP802','SW Req Staff Two',   'swreq.staff2@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  -- paycheque_balance
  ('EMP901','Payroll Staff One',  'payroll.staff1@uiic.co.in','$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','HR',      NULL),
  ('EMP902','Payroll Staff Two',  'payroll.staff2@uiic.co.in','$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','HR',      NULL),
  -- data_backup
  ('EMP1001','Data Staff One',    'data.staff1@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL),
  ('EMP1002','Data Staff Two',    'data.staff2@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee','IT',      NULL)
ON CONFLICT (emp_id) DO NOTHING;

-- Assign category_id for each new employee
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='network_issue')      WHERE emp_id IN ('EMP101','EMP102');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='software_issue')     WHERE emp_id IN ('EMP201','EMP202');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='gate_pass')          WHERE emp_id IN ('EMP401','EMP402');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='credential_request') WHERE emp_id IN ('EMP501','EMP502');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='port_request')       WHERE emp_id IN ('EMP601','EMP602');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_hardware')       WHERE emp_id IN ('EMP701','EMP702');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='new_software')       WHERE emp_id IN ('EMP801','EMP802');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='paycheque_balance')  WHERE emp_id IN ('EMP901','EMP902');
UPDATE users SET category_id = (SELECT id FROM ticket_categories WHERE category_key='data_backup')        WHERE emp_id IN ('EMP1001','EMP1002');

-- Verify: each category now has at least 2 employees
SELECT tc.category_key, COUNT(u.id) AS employee_count
FROM ticket_categories tc
LEFT JOIN users u ON u.category_id = tc.id AND u.role = 'employee' AND u.is_active = true
GROUP BY tc.category_key
ORDER BY tc.category_key;

COMMIT;
