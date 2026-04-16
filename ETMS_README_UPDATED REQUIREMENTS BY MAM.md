# ETMS — Employee Ticket Management System

**United India Insurance Co. Ltd. — Local Development Build**

A full-stack ticket management system for raising, approving, assigning, and resolving IT and operational tickets across departments. Redesigned around **2 managers**, **8 specialist teams**, a **type-driven approval model**, and **automatic SLA escalation**.

---

## What Changed (v2 Architecture)

| #   | Change           | Old                         | New                                             |
| --- | ---------------- | --------------------------- | ----------------------------------------------- |
| 1   | Managers         | 10 category managers        | **2 managers only** (Infra, Network)            |
| 2   | Teams            | Generic employees           | **8 named teams**                               |
| 3   | Approval routing | All requests to one manager | **Type-based**: Request → manager by domain     |
| 4   | Complaint flow   | Required manager approval   | **Auto-assigned** to mapped specialist team     |
| 5   | Data flow        | Separate data categories    | **Auto-assigned** to Security Team directly     |
| 6   | Data team login  | N/A                         | **Dedicated Data Team portal** for audits       |
| 7   | Asset management | Admin + manager only        | **Infra Team manages assets**                   |
| 8   | Ticket lifecycle | Manual escalation only      | **Auto-escalation** after configurable SLA days |

---

## Tech Stack

| Layer     | Technology                                 |
| --------- | ------------------------------------------ |
| Frontend  | React 18 + Vite + Tailwind CSS             |
| Backend   | Node.js 18 + Express.js                    |
| Database  | PostgreSQL (raw SQL, no ORM)               |
| Auth      | JWT (1h expiry) stored in `sessionStorage` |
| Password  | bcrypt (rounds = 10)                       |
| Files     | Multer — single file, max 5 MB             |
| Email     | Nodemailer (Ethereal for local dev)        |
| Scheduler | node-cron — daily SLA escalation job       |

---

## Roles

| Role        | Description                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `admin`     | Full access — manage users, assets, read all tickets. Cannot approve/assign/change ticket status.       |
| `manager`   | Approves/rejects REQUEST tickets in their domain. Can re-assign on escalation.                          |
| `employee`  | Member of one of the 8 teams. Raises tickets, works assigned tickets, closes resolved tickets.          |
| `data_team` | Special role — dedicated portal to request data/audit files from any team. Cannot raise normal tickets. |

> **Note:** `data_team` is a 4th role stored as `'data_team'` in `user_role_enum`. Data team users have their own login flow and portal that is separate from the main ETMS interface.

---

## The 2 Managers

| Manager ID  | Name            | Domain           | Approves                                                                     |
| ----------- | --------------- | ---------------- | ---------------------------------------------------------------------------- |
| `MGR-INFRA` | Infra Manager   | Infrastructure   | Credential Request, New Hardware, New Software (Webex, MS Excel, Email etc.) |
| `MGR-NET`   | Network Manager | Network & Access | Port Request, SR (Service Request), Gate Pass, ADID                          |

---

## The 8 Teams

Each team is a `ticket_category` row in the DB. Every employee belongs to exactly one team (`users.category_id`).

| Team Key         | Team Name      | Handles                                               |
| ---------------- | -------------- | ----------------------------------------------------- |
| `email_team`     | Email Team     | Email-related complaints & requests                   |
| `vc_team`        | VC Team        | Video conferencing complaints                         |
| `infra_team`     | Infra Team     | Hardware complaints, asset management, infra requests |
| `network_team`   | Network Team   | Network complaints, port/ADID/SR requests             |
| `security_team`  | Security Team  | Gate pass requests + ALL data/audit tickets           |
| `sap_team`       | SAP Team       | SAP-related complaints & requests                     |
| `gc_master_team` | GC Master Team | GC Master complaints & requests                       |
| `reports_team`   | Reports Team   | Reports complaints & requests                         |

---

## Ticket Types, Categories & Routing

### TYPE 1: Complaint 🔴

> **Auto-assigned to the mapped specialist team. No manager approval needed.**

| Category Key         | Category Name   | Auto-assigned Team |
| -------------------- | --------------- | ------------------ |
| `hardware_complaint` | Hardware Issue  | `infra_team`       |
| `network_complaint`  | Network Issue   | `network_team`     |
| `email_complaint`    | Email Issue     | `email_team`       |
| `vc_complaint`       | VC Issue        | `vc_team`          |
| `sap_complaint`      | SAP Issue       | `sap_team`         |
| `gc_complaint`       | GC Master Issue | `gc_master_team`   |
| `reports_complaint`  | Reports Issue   | `reports_team`     |

- `requires_approval = FALSE` for ALL complaint categories
- On creation: `pending_approval → approved → assigned` (all system, no human)
- Round-robin assigns to least-loaded member of the target team
- **Hardware complaint requires asset selection** (active asset assigned to raiser)

---

### TYPE 2: Request 🔵

> **Requires manager approval. Domain split between Infra Manager and Network Manager.**

#### Infra Manager approves:

| Category Key         | Category Name                                           | Default Priority |
| -------------------- | ------------------------------------------------------- | ---------------- |
| `credential_request` | Credential Request                                      | medium           |
| `new_hardware`       | New Hardware Requirement                                | low              |
| `new_software`       | New Software Requirement (Webex, MS Excel, Email, etc.) | low              |

#### Network Manager approves:

| Category Key   | Category Name        | Default Priority |
| -------------- | -------------------- | ---------------- |
| `port_request` | Port Request         | high             |
| `sr_request`   | Service Request (SR) | medium           |
| `gate_pass`    | Gate Pass Request    | low              |
| `adid_request` | ADID Request         | medium           |

- `requires_approval = TRUE` for ALL request categories
- On creation: `status = pending_approval` → email sent to the category's manager
- Manager approves → system round-robin assigns to appropriate team
- Manager rejects → ticket terminal at `rejected`

---

### TYPE 3: Data 🟡

> **Auto-assigned to Security Team. No manager approval needed.**

| Category Key     | Category Name          | Auto-assigned Team |
| ---------------- | ---------------------- | ------------------ |
| `data_audit`     | Data Audit Request     | `security_team`    |
| `data_backup`    | Data Backup Request    | `security_team`    |
| `paycheque_data` | Paycheque Data Request | `security_team`    |

- `requires_approval = FALSE` — auto-approved and assigned to Security Team
- Only `data_team` role users can raise Data tickets (enforced at API level)
- Normal employees cannot raise data type tickets

---

## Data Team — Dedicated Portal

The Data Team has a **separate login portal** (`/data-portal`) with its own interface.

**What the Data Team portal does:**

- Data team members log in with role = `data_team`
- They can raise **Data type tickets only** — requesting data or audit files from any other team
- The ticket is auto-assigned to the Security Team, who co-ordinates data collection
- Data team members can view status of their own data requests
- Data team members **cannot** access the main ETMS ticket interface (`/dashboard`)

**Routing:**

- `/data-portal` → `DataPortalPage` — protected to `data_team` role only
- `/login` → shared login page — detects `data_team` role and redirects to `/data-portal`
- All other routes redirect `data_team` users away to `/data-portal`

---

## Ticket Lifecycle

```
All users raise ticket
        │
        ├─── TYPE: complaint or data ────────────────────────────────────────────┐
        │    requires_approval = FALSE                                             │
        │    system auto: pending_approval → approved → assigned (round-robin)    │
        │                                                                          │
        └─── TYPE: request ──────────────────────────────────┐                    │
             requires_approval = TRUE                         │                    │
             status = pending_approval                        │                    │
             email → domain manager (Infra or Network)        │                    │
                    │                                         │                    │
                    ├── Manager rejects ──────────────────► rejected (terminal)   │
                    │                                                               │
                    └── Manager approves ──────────────────────────────────────────┘
                               │
                               ▼
                    approved → assigned (system round-robin to team)
                               │
                               ▼
                          in_progress  ◄── assigned employee clicks "Start Working"
                          /          \
                    resolved          reported ──► pending_approval (re-approval loop)
                    /      \               ↑ (system auto-transition, email manager)
                 closed   reported ──────────┘
              (terminal)   (creator disputes resolution — reason required min 10 chars)


── SLA ESCALATION (automatic, runs daily via cron) ─────────────────────────────
  Any ticket in [assigned | in_progress] status past its sla_due_date:
    → status remains unchanged (no forced transition)
    → escalated = TRUE flag set on ticket
    → email sent to the category's manager
    → escalation logged in ticket_logs (action = 'SLA_ESCALATED')
    → UI shows ⚠️ overdue badge on ticket
    → sla_due_date is set at ticket creation: NOW() + sla_days
    → sla_days is set per-ticket by the raiser (default: 3, min: 1, max: 30)
```

**Ticket ID format:** `UIIC-C-2026-000001` (C=Complaint, R=Request, D=Data)

---

## SLA Escalation Rules

| Field            | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `sla_days`       | Set by raiser at ticket creation (1–30 days). Default = 3.              |
| `sla_due_date`   | Computed: `created_at + sla_days`. Stored on ticket.                    |
| `escalated`      | Boolean flag. Set to TRUE when cron job detects overdue.                |
| `escalated_at`   | Timestamp when escalation was first triggered.                          |
| Cron schedule    | Daily at 00:00 server time.                                             |
| Who gets emailed | The `manager_user_id` of the ticket's category.                         |
| Re-escalation    | Cron re-sends email every 24h while ticket remains overdue and open.    |
| Resolution       | Flag cleared automatically when ticket moves to `resolved` or `closed`. |

**New columns on `tickets` table:**

```sql
sla_days      INTEGER NOT NULL DEFAULT 3 CHECK (sla_days BETWEEN 1 AND 30),
sla_due_date  TIMESTAMPTZ NOT NULL,   -- set on insert: created_at + sla_days
escalated     BOOLEAN DEFAULT FALSE,
escalated_at  TIMESTAMPTZ             -- first escalation timestamp
```

**New index:**

```sql
CREATE INDEX idx_tickets_sla ON tickets(sla_due_date) WHERE escalated = FALSE;
```

**Cron job file:** `server/jobs/slaEscalationJob.ts`

```js
// Runs daily — finds overdue open tickets and escalates them
// SELECT * FROM tickets
// WHERE status IN ('assigned','in_progress')
//   AND sla_due_date < NOW()
//   AND (escalated = FALSE OR escalated_at <= NOW() - INTERVAL '24 hours')
// For each: set escalated=TRUE, keep first escalated_at, log, email manager
```

---

## Status Transition Rules

| From               | To                 | Who                        | Notes                                       |
| ------------------ | ------------------ | -------------------------- | ------------------------------------------- |
| `pending_approval` | `approved`         | Manager (domain) or System | System for complaint/data auto-flow         |
| `pending_approval` | `rejected`         | Manager (domain only)      | `rejection_reason` required (min 10)        |
| `approved`         | `assigned`         | System only                | Round-robin within target team              |
| `assigned`         | `in_progress`      | Assigned employee only     | "Start Working" action                      |
| `in_progress`      | `resolved`         | Assigned employee only     | Work complete                               |
| `in_progress`      | `reported`         | Assigned employee only     | Can't resolve — escalates to manager        |
| `resolved`         | `closed`           | Ticket creator only        | Final acceptance                            |
| `resolved`         | `reported`         | Ticket creator only        | Dispute — `report_reason` required (min 10) |
| `reported`         | `pending_approval` | System only                | Auto-transition, emails manager             |
| `rejected`         | —                  | Nobody                     | Terminal                                    |
| `closed`           | —                  | Nobody                     | Terminal                                    |

**Admin cannot change any ticket status.** Admin is read-only on tickets.

---

## Asset Management (Infra Team)

Assets are managed **by the Infra Team**, not directly by managers.

- Assets are tracked per employee with full transfer history
- All assets linked to `hardware_complaint` category (infra team handles them)
- **Infra Team members** can: view assigned assets, flag under repair, initiate transfer request
- **Admin** can: create assets, approve transfers, change status, view all
- **Managers** can: view assets in their domain teams, initiate transfers
- **Report Issue** button on asset card → pre-fills New Ticket (Type: Complaint, Category: Hardware Issue, Asset pre-selected, skip to Step 3)
- Assignment history drawer per asset
- Transfer blocked when `status = 'under_repair'`

---

## Roles & Permissions Matrix

| Action                   | Employee                            | Manager         | Admin | Data Team    |
| ------------------------ | ----------------------------------- | --------------- | ----- | ------------ |
| Raise complaint ticket   | ✅                                  | ✅              | ❌    | ❌           |
| Raise request ticket     | ✅                                  | ✅              | ❌    | ❌           |
| Raise data ticket        | ❌                                  | ❌              | ❌    | ✅           |
| Approve / reject request | ❌                                  | ✅ (own domain) | ❌    | ❌           |
| Work assigned ticket     | ✅ (own)                            | ✅ (own)        | ❌    | ❌           |
| Close resolved ticket    | ✅ (creator)                        | ✅ (creator)    | ❌    | ✅ (creator) |
| View all tickets         | ❌                                  | All (scoped)    | ✅    | Own only     |
| Manage users             | ❌                                  | ❌              | ✅    | ❌           |
| Create assets            | ❌                                  | ❌              | ✅    | ❌           |
| Transfer assets          | ✅ (Infra Team only, scoped)        | ✅ (domain)     | ✅    | ❌           |
| View assets              | Own + infra queue (Infra Team only) | Domain-scoped   | All   | ❌           |
| Reports                  | ❌                                  | ✅              | ✅    | ❌           |
| Data portal              | ❌                                  | ❌              | ❌    | ✅           |

---

## Project Structure

> **Implementation note:** this repository is TypeScript-first. Source files use `.ts` / `.tsx`.

```
etms-mvp/
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.ts
│   │   │   ├── authApi.ts
│   │   │   └── ticketApi.ts         # all ticket, asset, user, approval APIs
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── CategoryOrgGraph.tsx  # SVG graph: managers → teams → employees
│   │   │   ├── common/
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── PriorityBadge.tsx
│   │   │   │   └── TypeBadge.tsx
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   └── tickets/
│   │   │       ├── TicketCard.tsx
│   │   │       ├── TicketTypeSelector.tsx
│   │   │       └── CategorySelector.tsx
│   │   ├── constants/
│   │   │   ├── ROLES.ts              # employee | manager | admin | data_team
│   │   │   ├── TICKET_STATUS.ts
│   │   │   ├── PRIORITY.ts
│   │   │   └── TICKET_TYPES.ts       # complaint | request | data
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx          # shared — detects data_team → redirect /data-portal
│   │   │   ├── ChangePasswordPage.tsx
│   │   │   ├── DashboardPage.tsx      # employee / manager / admin dashboard
│   │   │   ├── TicketsPage.tsx
│   │   │   ├── NewTicketPage.tsx      # 3-step wizard + SLA days field + Report Issue pre-fill
│   │   │   ├── TicketDetailPage.tsx
│   │   │   ├── PendingApprovalsPage.tsx  # manager only — REQUEST queue
│   │   │   ├── AssetsPage.tsx         # employee: cards | infra team: full table
│   │   │   ├── AdminPage.tsx          # 3 tabs: Users | Assets | All Tickets
│   │   │   └── DataPortalPage.tsx     # data_team role only — separate portal
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── server/
│   ├── config/
│   │   ├── db.ts
│   │   └── mailer.ts
│   ├── constants/
│   │   └── ROLES.ts                   # EMPLOYEE | MANAGER | ADMIN | DATA_TEAM
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── ticketController.ts
│   │   ├── approvalController.ts
│   │   ├── categoryController.ts
│   │   ├── assetController.ts
│   │   ├── userController.ts
│   │   ├── reportController.ts
│   │   └── dataPortalController.ts    # data team ticket raise + status view
│   ├── jobs/
│   │   └── slaEscalationJob.ts        # node-cron daily SLA checker + escalation emailer
│   ├── middleware/
│   │   ├── authMiddleware.ts
│   │   ├── roleMiddleware.ts
│   │   └── uploadMiddleware.ts
│   ├── models/
│   │   ├── userModel.ts
│   │   ├── ticketModel.ts
│   │   ├── categoryModel.ts
│   │   ├── assetModel.ts
│   │   └── reportModel.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── ticketRoutes.ts
│   │   ├── approvalRoutes.ts
│   │   ├── categoryRoutes.ts
│   │   ├── assetRoutes.ts
│   │   ├── userRoutes.ts
│   │   ├── reportRoutes.ts
│   │   └── dataPortalRoutes.ts        # /api/data-portal/*
│   ├── services/
│   │   ├── assignmentService.ts       # round-robin to team
│   │   └── emailService.ts            # 8 email triggers
│   ├── utils/
│   │   ├── generateTicketId.ts
│   │   ├── jwtUtils.ts
│   │   ├── sanitizeFilename.ts
│   │   └── ticketTransitions.ts
│   ├── app.ts
│   └── server.ts
│
├── database/
│   ├── schema.sql                     # 8 tables + SLA columns + ENUMs + indexes
│   └── seed.sql                       # 2 managers, 8 teams, categories, sample users
│
└── uploads/
```

---

## API Routes

### Auth

| Method | Endpoint        | Access |
| ------ | --------------- | ------ |
| POST   | /api/auth/login | Public |
| GET    | /api/auth/me    | All    |

### Tickets

| Method | Endpoint                          | Access               |
| ------ | --------------------------------- | -------------------- |
| POST   | /api/tickets                      | Employee, Manager    |
| GET    | /api/tickets                      | All (scoped by role) |
| GET    | /api/tickets/:id                  | All (scoped)         |
| GET    | /api/tickets/:id/allowed-statuses | All (scoped)         |
| PUT    | /api/tickets/:id/status           | Employee, Manager    |
| GET    | /api/tickets/:id/file             | All (scoped)         |

### Approvals (REQUEST type only)

| Method | Endpoint                           | Access                |
| ------ | ---------------------------------- | --------------------- |
| GET    | /api/approvals/pending             | Manager               |
| POST   | /api/approvals/:ticketId/approve   | Manager (domain only) |
| POST   | /api/approvals/:ticketId/reject    | Manager (domain only) |
| POST   | /api/approvals/:ticketId/reapprove | Manager (domain only) |

### Assets

| Method | Endpoint                 | Access                                             |
| ------ | ------------------------ | -------------------------------------------------- |
| GET    | /api/assets              | Admin, Manager, Employee (Infra Team only)         |
| GET    | /api/assets/my           | Employee, Manager                                  |
| GET    | /api/assets/:id          | All (scoped)                                       |
| GET    | /api/assets/:id/history  | Admin, Manager, Employee (Infra Team only, scoped) |
| POST   | /api/assets              | Admin only                                         |
| PATCH  | /api/assets/:id/status   | Admin, Manager, Employee (Infra Team only)         |
| POST   | /api/assets/:id/transfer | Admin, Manager, Employee (Infra Team only, scoped) |

### Users

| Method | Endpoint                      | Access |
| ------ | ----------------------------- | ------ |
| GET    | /api/users                    | Admin  |
| POST   | /api/users                    | Admin  |
| POST   | /api/users/transfer-ownership | Admin  |
| PATCH  | /api/users/change-password    | All    |
| PATCH  | /api/users/:id/toggle-active  | Admin  |
| PATCH  | /api/users/:id/name           | Admin  |
| DELETE | /api/users/:id                | Admin  |

### Categories

| Method | Endpoint                              | Access         |
| ------ | ------------------------------------- | -------------- |
| GET    | /api/categories                       | All            |
| GET    | /api/categories/:categoryId/employees | Admin, Manager |

### Reports

| Method | Endpoint                         | Access         |
| ------ | -------------------------------- | -------------- |
| GET    | /api/reports/top-failing-devices | Admin, Manager |

### Data Portal

| Method | Endpoint                     | Access         |
| ------ | ---------------------------- | -------------- |
| POST   | /api/data-portal/tickets     | Data Team only |
| GET    | /api/data-portal/tickets     | Data Team only |
| GET    | /api/data-portal/tickets/:id | Data Team only |

---

## Database Schema

```sql
-- ENUMs
DROP TYPE IF EXISTS priority_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;

CREATE TYPE user_role_enum AS ENUM ('employee', 'manager', 'admin', 'data_team');
CREATE TYPE priority_enum  AS ENUM ('low', 'medium', 'high', 'critical');

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
  department          VARCHAR(100),
  is_active           BOOLEAN DEFAULT TRUE,
  password_changed_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ticket_types  (3 rows: complaint, request, data)
CREATE TABLE ticket_types (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(50) NOT NULL,
  type_key VARCHAR(20) UNIQUE NOT NULL
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
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_category
  FOREIGN KEY (category_id) REFERENCES ticket_categories(id);

-- 4. assets
CREATE TABLE assets (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  serial_number VARCHAR(80) UNIQUE NOT NULL,
  category_id   INTEGER NOT NULL REFERENCES ticket_categories(id),
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
  title             VARCHAR(200) NOT NULL,
  description       TEXT NOT NULL,
  ticket_type_id    INTEGER NOT NULL REFERENCES ticket_types(id),
  category_id       INTEGER NOT NULL REFERENCES ticket_categories(id),
  priority          priority_enum NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending_approval'
                    CHECK (status IN (
                      'pending_approval',
                      'approved',
                      'assigned',
                      'in_progress',
                      'reported',
                      'resolved',
                      'closed',
                      'rejected'
                    )),
  raised_by         INTEGER NOT NULL REFERENCES users(id),
  assigned_to       INTEGER REFERENCES users(id),
  approval_owner_id INTEGER REFERENCES users(id),
  asset_id          INTEGER REFERENCES assets(id),
  rejection_reason  TEXT,
  report_reason     TEXT,
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

-- 8. ticket_logs  (append-only audit)
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
CREATE INDEX idx_tickets_raised_by      ON tickets(raised_by);
CREATE INDEX idx_tickets_assigned_to    ON tickets(assigned_to);
CREATE INDEX idx_tickets_approval_owner ON tickets(approval_owner_id);
CREATE INDEX idx_tickets_status         ON tickets(status);
CREATE INDEX idx_tickets_type           ON tickets(ticket_type_id);
CREATE INDEX idx_tickets_category       ON tickets(category_id);
CREATE INDEX idx_tickets_asset          ON tickets(asset_id);
CREATE INDEX idx_tickets_sla            ON tickets(sla_due_date) WHERE escalated = FALSE;
CREATE INDEX idx_categories_team_key    ON ticket_categories(assigned_team_key);
CREATE INDEX idx_categories_is_team     ON ticket_categories(is_team);

CREATE INDEX idx_assets_serial          ON assets(serial_number);
CREATE INDEX idx_assets_category        ON assets(category_id);
CREATE INDEX idx_assets_assigned_to     ON assets(assigned_to);
CREATE INDEX idx_assets_status          ON assets(status);

CREATE INDEX idx_asset_assign_asset     ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assign_active    ON asset_assignments(asset_id, returned_at);
CREATE UNIQUE INDEX uq_asset_assign_one_active
  ON asset_assignments(asset_id)
  WHERE returned_at IS NULL;

CREATE INDEX idx_logs_ticket            ON ticket_logs(ticket_id);
CREATE INDEX idx_categories_manager     ON ticket_categories(manager_user_id);
```

---

## Seed Data

```sql
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
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Database Setup

```bash
psql -U postgres -c "CREATE DATABASE uiicdb;"
psql -U postgres -d uiicdb -f etms-mvp/database/schema.sql
psql -U postgres -d uiicdb -f etms-mvp/database/seed.sql
```

### 2. Backend

```bash
cd etms-mvp/server
npm install
```

Create `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=uiicdb
DB_USER=postgres
DB_PASSWORD=your_password_here

JWT_SECRET=replace_with_a_long_random_string

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="ETMS <noreply@uiic.co.in>"

UPLOAD_DIR=./uploads

# SLA escalation cron — '0 0 * * *' = midnight daily
SLA_CRON_SCHEDULE=0 0 * * *
```

```bash
npm run dev
```

### 3. Frontend

```bash
cd etms-mvp/client
npm install
npm run dev    # → http://localhost:5173
```

### 4. Run Both Together

```bash
npm run dev    # concurrently from etms-mvp/
```

---

## Default Logins

| Role            | Email                  | Password     | Redirects to |
| --------------- | ---------------------- | ------------ | ------------ |
| Admin           | admin@uiic.co.in       | Password@123 | /dashboard   |
| Infra Manager   | mgr.infra@uiic.co.in   | Password@123 | /dashboard   |
| Network Manager | mgr.network@uiic.co.in | Password@123 | /dashboard   |
| Any employee    | (team email)           | Password@123 | /dashboard   |
| Data Team       | data.portal@uiic.co.in | Password@123 | /data-portal |

> All non-admin users are forced to change password on first login.

---

## Email Triggers (8 total)

| #   | Trigger                       | Recipients                        |
| --- | ----------------------------- | --------------------------------- |
| 1   | REQUEST ticket raised         | Domain manager (Infra or Network) |
| 2   | Ticket approved               | Raiser                            |
| 3   | Approval confirmation         | Manager (own record)              |
| 4   | Ticket rejected               | Raiser (with reason)              |
| 5   | Ticket assigned               | Assigned employee                 |
| 6   | Ticket resolved               | Raiser (to review)                |
| 7   | Ticket escalated (reported)   | Manager (re-approval needed)      |
| 8   | SLA overdue (auto-escalation) | Domain manager                    |

> Local dev uses [Ethereal](https://ethereal.email/) — preview URL logged to console.

---

## Frontend Routes

| Route              | Page                 | Access                   |
| ------------------ | -------------------- | ------------------------ |
| `/login`           | LoginPage            | Public                   |
| `/change-password` | ChangePasswordPage   | Authenticated            |
| `/dashboard`       | DashboardPage        | Employee, Manager, Admin |
| `/tickets`         | TicketsPage          | Employee, Manager, Admin |
| `/tickets/new`     | NewTicketPage        | Employee, Manager        |
| `/tickets/:id`     | TicketDetailPage     | All (scoped)             |
| `/approvals`       | PendingApprovalsPage | Manager only             |
| `/assets`          | AssetsPage           | Employee, Manager        |
| `/admin`           | AdminPage            | Admin only               |
| `/data-portal`     | DataPortalPage       | Data Team only           |

---

## Coding Rules

1. No ORM — raw SQL with `$1 $2` parameterised queries only
2. Never hardcode role/status/type strings — always import from `constants/`
3. Status transition logic lives **only** in `utils/ticketTransitions.ts`
4. Round-robin assignment logic lives **only** in `services/assignmentService.ts`
5. SLA escalation logic lives **only** in `jobs/slaEscalationJob.ts`
6. Admin can **never** approve, reject, assign, or change ticket status
7. `data_team` role can **only** raise data-type tickets via `/api/data-portal/*`
8. All API responses use `{ success: true/false, ...data }` shape
9. `sla_due_date` is always set at insert time: `NOW() + INTERVAL '$sla_days days'`
10. Complaint and data tickets: `approval_owner_id = NULL` (no manager in the loop)
11. `assigned_team_key` on `ticket_categories` is the source of truth for auto-routing
12. Never use role strings directly in SQL — use `ROLES` constant
13. File naming uses `sanitizeFilename.ts` — never raw `originalname`
14. Ticket number collision handled with retry loop (max 3 attempts → 409)

---

## Environment Variables

| Variable          | Description                  | Default                     |
| ----------------- | ---------------------------- | --------------------------- |
| PORT              | Server port                  | 5000                        |
| CLIENT_URL        | CORS origin                  | http://localhost:5173       |
| DB_HOST           | PostgreSQL host              | localhost                   |
| DB_PORT           | PostgreSQL port              | 5432                        |
| DB_NAME           | Database name                | uiicdb                      |
| DB_USER           | DB user                      | postgres                    |
| DB_PASSWORD       | DB password                  | —                           |
| JWT_SECRET        | JWT signing secret           | —                           |
| SMTP_HOST         | SMTP host (blank = Ethereal) | —                           |
| SMTP_PORT         | SMTP port                    | 587                         |
| SMTP_USER         | SMTP username                | —                           |
| SMTP_PASS         | SMTP password                | —                           |
| MAIL_FROM         | From address                 | ETMS \<noreply@uiic.co.in\> |
| UPLOAD_DIR        | Multer upload dir            | ./uploads                   |
| SLA_CRON_SCHEDULE | Cron expression for SLA job  | 0 0 \* \* \*                |

---

> 🔒 United India Insurance Co. Ltd. — ETMS MVP — Local Development Only
