-- patch_data_team_routing.sql
-- One-time patch for existing databases:
-- 1) Ensures Data Team exists as a team row
-- 2) Ensures assignable Data Team employees exist
-- 3) Routes all data categories to data_team

-- Backward-compatibility for older schemas.
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'data_team';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ticket_categories'
      AND column_name = 'assigned_team_key'
  ) THEN
    ALTER TABLE ticket_categories ADD COLUMN assigned_team_key VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ticket_categories'
      AND column_name = 'is_team'
  ) THEN
    ALTER TABLE ticket_categories ADD COLUMN is_team BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'team'
  ) THEN
    ALTER TABLE users ADD COLUMN team VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_changed_at'
  ) THEN
    ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;
  END IF;
END $$;

BEGIN;

-- Ensure Data ticket type exists
INSERT INTO ticket_types (name, type_key)
SELECT 'Data', 'data'
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_types WHERE type_key = 'data'
);

-- Ensure Data Team row exists
INSERT INTO ticket_categories (
  ticket_type_id, name, category_key, default_priority,
  manager_user_id, assigned_team_key, is_team, requires_approval
)
SELECT
  (SELECT id FROM ticket_types WHERE type_key = 'data' LIMIT 1),
  'Data Team', 'data_team', 'medium',
  NULL, NULL, TRUE, FALSE
ON CONFLICT (category_key) DO UPDATE
SET name = EXCLUDED.name,
    is_team = TRUE,
    assigned_team_key = NULL,
    requires_approval = FALSE,
    ticket_type_id = COALESCE(ticket_categories.ticket_type_id, EXCLUDED.ticket_type_id);

-- Ensure two Data Team employee users exist for assignment
UPDATE users
SET role = 'data_team', team = COALESCE(team, 'Data')
WHERE emp_id = 'DATA001';

INSERT INTO users (emp_id, name, email, password_hash, role, team, password_changed_at)
SELECT 'DATA001', 'Data Portal User', 'data.portal@uiic.co.in',
       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi',
       'data_team', 'Data', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE emp_id = 'DATA001');

INSERT INTO users (emp_id, name, email, password_hash, role, team, password_changed_at)
SELECT 'EMP-DATA-01', 'Data Team Member 1', 'data1@uiic.co.in',
       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi',
       'employee', 'Data', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE emp_id = 'EMP-DATA-01');

INSERT INTO users (emp_id, name, email, password_hash, role, team, password_changed_at)
SELECT 'EMP-DATA-02', 'Data Team Member 2', 'data2@uiic.co.in',
       '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi',
       'employee', 'Data', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE emp_id = 'EMP-DATA-02');

-- Assign Data Team employees to the data_team category row
UPDATE users
SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'data_team')
WHERE emp_id IN ('EMP-DATA-01', 'EMP-DATA-02');

-- Keep data portal requester as dedicated role user (not assignable worker)
UPDATE users
SET category_id = NULL
WHERE emp_id = 'DATA001';

-- Route all data-type categories to data_team
UPDATE ticket_categories tc
SET assigned_team_key = 'data_team'
FROM ticket_types tt
WHERE tc.ticket_type_id = tt.id
  AND tt.type_key = 'data'
  AND tc.is_team = FALSE;

COMMIT;
