-- ✅ ENUM TYPE DEFINITIONS (PostgreSQL best practice)
DROP TYPE IF EXISTS priority_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;

CREATE TYPE user_role_enum AS ENUM ('employee', 'manager', 'admin', 'data_team');
CREATE TYPE priority_enum  AS ENUM ('low', 'medium', 'high', 'critical');

-- ✅ NOTES on ENUM types:
--    - Priority values: 'low' | 'medium' | 'high' | 'critical'
--    - User role values: 'employee' | 'manager' | 'admin'
--    - Using ENUM prevents invalid string values at DB layer
--    - Type-safe, smaller storage, and enforces data integrity

-- Clean slate for local dev
DROP TABLE IF EXISTS attachments, ticket_logs, tickets, asset_assignments, assets,
                     ticket_categories, ticket_types, users CASCADE;

-- 1. users
CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  emp_id              VARCHAR(20)  UNIQUE NOT NULL,
  name                VARCHAR(100) NOT NULL,
  email               VARCHAR(150) UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  role                user_role_enum NOT NULL,
  category_id         INTEGER,
  team                VARCHAR(100),
  is_active           BOOLEAN DEFAULT TRUE,
  password_changed_at TIMESTAMPTZ,  -- NULL = requires forced password change on first login
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ticket_types  (3 rows: complaint, request, data)
CREATE TABLE ticket_types (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(50) NOT NULL,
  type_key VARCHAR(20) UNIQUE NOT NULL
  -- type_key values: 'complaint' | 'request' | 'data'
);

-- 3. ticket_categories
CREATE TABLE ticket_categories (
  id                SERIAL PRIMARY KEY,
  ticket_type_id    INTEGER REFERENCES ticket_types(id),
  name              VARCHAR(100) NOT NULL,
  category_key      VARCHAR(50)  UNIQUE NOT NULL,
  default_priority  priority_enum DEFAULT 'medium',
  manager_user_id   INTEGER REFERENCES users(id),
  assigned_team_key VARCHAR(50),
  is_team           BOOLEAN NOT NULL DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT TRUE
  -- Each category has exactly one dedicated manager.
  -- This is the user who receives the approval request when a ticket
  -- of this category is raised. Populated in seed.sql.
  -- If requires_approval = FALSE (e.g. gate_pass), ticket auto-approves & auto-assigns,
  -- bypassing manager queue.
);

-- Add users.category_id FK after ticket_categories exists
ALTER TABLE users
  ADD CONSTRAINT fk_users_category
  FOREIGN KEY (category_id) REFERENCES ticket_categories(id);

-- 4. assets
CREATE TABLE assets (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  serial_number VARCHAR(80) UNIQUE NOT NULL,
  category_id   INTEGER NOT NULL REFERENCES ticket_categories(id),
  -- DB safety: NOT NULL + FK prevents orphan assets and invalid category linkage
  assigned_to   INTEGER NOT NULL REFERENCES users(id),
  status        VARCHAR(30) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','under_repair','retired')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. asset_assignments (ownership history)
CREATE TABLE asset_assignments (
  id             SERIAL PRIMARY KEY,
  asset_id       INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_user_id   INTEGER REFERENCES users(id),
  to_user_id     INTEGER NOT NULL REFERENCES users(id),
  transferred_by INTEGER REFERENCES users(id),
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at    TIMESTAMPTZ,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (returned_at IS NULL OR returned_at >= assigned_at)
);

-- 6. tickets
CREATE TABLE tickets (
  id                SERIAL PRIMARY KEY,
  ticket_no         VARCHAR(25) UNIQUE NOT NULL,
  -- ticket_no format:
  --   UIIC-C-YYYY-XXXXXX  for complaint
  --   UIIC-R-YYYY-XXXXXX  for request
  --   UIIC-D-YYYY-XXXXXX  for data
  title             VARCHAR(200) NOT NULL,
  description       TEXT NOT NULL,
  ticket_type_id    INTEGER NOT NULL REFERENCES ticket_types(id),
  category_id       INTEGER NOT NULL REFERENCES ticket_categories(id),
  priority          priority_enum NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending_approval'
                    CHECK (status IN (
                      'pending_approval',  -- baseline DB insert status (may auto-transition to assigned)
                      'approved',          -- brief intermediate after manager approves
                      'assigned',          -- after round-robin (or re-assign) completes
                      'in_progress',       -- employee working
                      'reported',          -- employee escalated back to manager
                      'resolved',          -- employee done, awaiting employee confirm
                      'closed',            -- employee confirmed, terminal
                      'rejected'           -- manager rejected, terminal
                    )),
  raised_by         INTEGER NOT NULL REFERENCES users(id),
  assigned_to       INTEGER REFERENCES users(id),
  approval_owner_id INTEGER REFERENCES users(id),
  asset_id          INTEGER REFERENCES assets(id),
  rejection_reason  TEXT,               -- set when manager rejects
  report_reason     TEXT,               -- set when ticket is reported/escalated
  sla_days          INTEGER NOT NULL DEFAULT 3 CHECK (sla_days BETWEEN 1 AND 30),
  sla_due_date      TIMESTAMPTZ NOT NULL,
  escalated         BOOLEAN DEFAULT FALSE,
  escalated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. attachments
CREATE TABLE attachments (
  id            SERIAL PRIMARY KEY,
  ticket_id     INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_path     TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     VARCHAR(100),
  uploaded_by   INTEGER REFERENCES users(id),
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ticket_logs  (audit — insert only, never update or delete)
CREATE TABLE ticket_logs (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id),
  action       VARCHAR(100) NOT NULL,
  old_status   VARCHAR(30),
  new_status   VARCHAR(30),
  performed_by INTEGER REFERENCES users(id),
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_raised_by     ON tickets(raised_by);
CREATE INDEX idx_tickets_assigned_to   ON tickets(assigned_to);
CREATE INDEX idx_tickets_approval_owner ON tickets(approval_owner_id);
CREATE INDEX idx_tickets_status        ON tickets(status);
CREATE INDEX idx_tickets_type          ON tickets(ticket_type_id);
CREATE INDEX idx_tickets_category      ON tickets(category_id);
CREATE INDEX idx_tickets_asset         ON tickets(asset_id);
CREATE INDEX idx_tickets_sla           ON tickets(sla_due_date) WHERE escalated = FALSE;
CREATE INDEX idx_categories_team_key   ON ticket_categories(assigned_team_key);
CREATE INDEX idx_categories_is_team    ON ticket_categories(is_team);

CREATE INDEX idx_assets_serial         ON assets(serial_number);
CREATE INDEX idx_assets_category       ON assets(category_id);
CREATE INDEX idx_assets_assigned_to    ON assets(assigned_to);
CREATE INDEX idx_assets_status         ON assets(status);

CREATE INDEX idx_asset_assign_asset    ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assign_active   ON asset_assignments(asset_id, returned_at);
CREATE UNIQUE INDEX uq_asset_assign_one_active
  ON asset_assignments(asset_id)
  WHERE returned_at IS NULL;

CREATE INDEX idx_logs_ticket           ON ticket_logs(ticket_id);
CREATE INDEX idx_categories_manager    ON ticket_categories(manager_user_id);
