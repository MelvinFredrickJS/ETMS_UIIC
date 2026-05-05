# ETMS — Employee Ticket Management System (etms-mvp)

**United India Insurance Co. Ltd. — Local Development Guide**

Full-stack ticket management system for raising, approving, assigning, and resolving IT and operational tickets across departments.

---

## Quick Start

### 1. Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** (comes with Node.js)
- Git

### 2. Install All Dependencies

From the `etms-mvp` folder:

```powershell
npm run install:all
```

This installs dependencies for:

- Root monorepo
- `client/` (React + Vite frontend)
- `server/` (Express + TypeScript backend)

### 3. Database Setup

Create and initialize PostgreSQL database:

```powershell
# Open PowerShell as Admin and run:
psql -U postgres

# Then in psql:
CREATE DATABASE uiicdb;
\q

# Apply schema and seed data:
cd etms-mvp
psql -U postgres -d uiicdb -f database/schema.sql
psql -U postgres -d uiicdb -f database/seed.sql
```

Seed data includes:

- 8 ticket types (Complaint, Request, Data)
- Sample categories (Network, Hardware, Software, etc.)
- Default users (admin, manager, employee accounts)
- Test assets and sample tickets

### 4. Configure Backend Environment

Create `server/.env`:

```env
PORT=5003
CLIENT_URL=http://localhost:5173

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uiicdb
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# JWT
JWT_SECRET=your_secret_key_here_make_it_long_and_random_at_least_32_chars

# Email (leave blank for local dev — uses Ethereal auto account)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=ETMS <noreply@uiic.co.in>

# File uploads
UPLOAD_DIR=./uploads
RESPONSE_UPLOAD_DIR=./uploads/responses

# SLA escalation job (cron schedule)
SLA_CRON_SCHEDULE=0 0 * * *
```

### 5. Configure Frontend Environment

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5003/api
```

### 6. Start Development Servers

From `etms-mvp/`:

```powershell
npm run dev
```

This uses `concurrently` to start:

- **Backend** (Express + nodemon) → `http://localhost:5003`
- **Frontend** (Vite dev server) → `http://localhost:5173`

Both services will automatically reload on file changes.

---

## Access the Application

Once both servers are running:

- **Frontend**: `http://localhost:5173`
- **API Docs (Swagger UI)**: `http://localhost:5003/api/docs`

### Default Login Credentials

| Role     | Email                  | Password     | Notes                                 |
| -------- | ---------------------- | ------------ | ------------------------------------- |
| Admin    | admin@uiic.co.in       | Password@123 | Can manage users, assets, all tickets |
| Manager  | mgr.network@uiic.co.in | Password@123 | Approves tickets, manages team assets |
| Employee | tech1@uiic.co.in       | Password@123 | Raises tickets, views own data        |

> All non-admin users are required to change their password on first login.

---

## Tech Stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS    |
| Backend  | Node.js + Express.js + TypeScript              |
| Database | PostgreSQL 14+ (raw SQL, parameterised only)   |
| Auth     | JWT (8-hour expiry) stored in `sessionStorage` |
| Password | bcrypt (10 rounds)                             |
| Files    | Multer (max 5 MB, single file)                 |
| Email    | Nodemailer (Ethereal for local dev)            |
| API Docs | OpenAPI 3.0 + Swagger UI (`/api/docs`)         |

---

## Project Structure

```
etms-mvp/
│
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.ts         # Axios client + JWT interceptor
│   │   │   ├── authApi.ts               # login, getMe, changePassword
│   │   │   └── ticketApi.ts             # All CRUD + approval, asset, lookup
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── CategoryOrgGraph.tsx  # SVG org chart visualization
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
│   │   │   ├── ROLES.ts
│   │   │   ├── TICKET_STATUS.ts
│   │   │   ├── PRIORITY.ts
│   │   │   └── TICKET_TYPES.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx           # JWT + sessionStorage isolation
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TicketsPage.tsx
│   │   │   ├── NewTicketPage.tsx
│   │   │   ├── TicketDetailPage.tsx
│   │   │   ├── PendingApprovalsPage.tsx
│   │   │   ├── AssetsPage.tsx
│   │   │   ├── AdminPage.tsx
│   │   │   ├── DataPortalPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── ChangePasswordPage.tsx
│   │   ├── types/
│   │   │   └── index.ts                  # Shared TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts                   # Vite proxy + React plugin
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env                              # Local env (VITE_API_URL)
│
├── server/                     # Express + TypeScript backend
│   ├── config/
│   │   ├── db.ts                         # PostgreSQL Pool
│   │   └── mailer.ts                     # Nodemailer setup
│   ├── constants/
│   │   ├── ROLES.ts
│   │   └── LIMITS.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── ticketController.ts
│   │   ├── approvalController.ts
│   │   ├── categoryController.ts
│   │   ├── assetController.ts
│   │   ├── userController.ts
│   │   ├── reportController.ts
│   │   ├── dataPortalController.ts
│   │   ├── importController.ts
│   │   └── lookupController.ts
│   ├── middleware/
│   │   ├── authMiddleware.ts             # JWT protection
│   │   ├── roleMiddleware.ts             # Role-based access
│   │   └── uploadMiddleware.ts           # Multer file handling
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
│   │   ├── dataPortalRoutes.ts
│   │   ├── importRoutes.ts
│   │   └── lookupRoutes.ts
│   ├── services/
│   │   ├── accessControlService.ts       # Permission checks
│   │   ├── assignmentService.ts          # Round-robin logic
│   │   ├── emailService.ts               # 7 email triggers
│   │   ├── managerService.ts
│   │   ├── managerAssignmentService.ts
│   │   └── README_ManagerService.md
│   ├── jobs/
│   │   └── slaEscalationJob.ts           # Nightly cron job
│   ├── scripts/
│   │   ├── applyManagerHistoryMigration.ts
│   │   ├── applyPermissionsMigration.ts
│   │   ├── runMigrationViaServer.ts
│   │   ├── testAccessControl.ts
│   │   ├── testManagerService.ts
│   │   ├── testSlaEscalation.ts
│   │   └── verifyManagerService.ts
│   ├── types/
│   │   ├── index.ts                      # DB row types
│   │   └── express.d.ts                  # Extended Express.Request
│   ├── utils/
│   │   ├── generateTicketId.ts           # UIIC-C-2026-XXXXXX
│   │   ├── jwtUtils.ts
│   │   ├── sanitizeFilename.ts
│   │   ├── ticketTransitions.ts          # Status logic
│   │   └── validateEnv.ts
│   ├── app.ts                            # Express app setup
│   ├── server.ts                         # Server entry point
│   ├── tsconfig.json
│   ├── package.json
│   └── .env                              # Local env (DB, JWT, SMTP, etc.)
│
├── database/
│   ├── schema.sql                        # 8 tables, ENUMs, indexes, constraints
│   ├── seed.sql                          # Categories, ticket types, default users
│   ├── seed_two_managers.sql
│   ├── add_category_employees.sql
│   ├── create_manager_assignment_history.sql
│   ├── create_permissions_system.sql
│   ├── fix_categories.sql
│   ├── migrate_asset_spec_columns.sql
│   └── patch_data_team_routing.sql
│
├── docs/
│   ├── openapi.yaml                      # OpenAPI spec
│   └── PROJECT_DOCUMENTATION.md
│
├── scripts/
│   └── generate_seed_from_xlsx.py        # Python script for Excel import
│
├── uploads/                              # Multer file storage (gitignored)
│   └── responses/
│
├── package.json                          # Root monorepo scripts
├── README.md                             # This file (comprehensive guide)
└── setup-db.ps1                          # PowerShell database setup script
```

---

## NPM Scripts

### Root Monorepo

```bash
npm run install:all     # Install deps for root + client + server
npm run dev             # Start both server + client concurrently (concurrently)
npm run dev:server      # Start backend only
npm run dev:client      # Start frontend only
```

### Server

```bash
cd server
npm run dev             # nodemon + ts-node (auto-reload on file changes)
npm run build           # Compile TypeScript to dist/
npm run start           # Run compiled JavaScript (dist/server.js)
npm run typecheck       # TypeScript --noEmit strict check
```

### Client

```bash
cd client
npm run dev             # Start Vite dev server (hot module replacement)
npm run build           # Build optimized production bundle
npm run preview         # Preview production build locally
npm run typecheck       # TypeScript strict type check
```

---

## Ticket Lifecycle

```
┌─────────────────────────────────┐
│  Employee/Manager Raises Ticket │
└────────────┬────────────────────┘
             │
             ▼
    ┌─────────────────────┐
    │  pending_approval   │
    └────┬─────────────┬──┘
         │ Rejected    │ Approved
         │             │
         ▼             ▼
      REJECTED     ┌──────────┐
   (terminal)      │ approved │
                   └────┬─────┘
                        │ Auto-assign (round-robin)
                        ▼
                   ┌──────────────┐
                   │ in_progress  │
                   └──┬───────┬───┘
           Resolved   │       │  Reported back
                      │       │
              ┌───────▼──┐  ┌─┴──────────────────┐
              │ resolved │  │ pending_approval   │ (loops)
              └───┬──────┘  └────────────────────┘
                  │
         ┌────────▼────────┐
         │  closed (end)   │
         └─────────────────┘
```

**Ticket ID format:** `UIIC-C-2026-000001`

- `C` = Complaint, `R` = Request, `D` = Data
- Year + sequential number (retried if collision)

---

## Roles & Permissions Matrix

| Feature                    | Employee   | Manager    | Admin |
| -------------------------- | ---------- | ---------- | ----- |
| Raise ticket               | ✅         | ✅         | ❌    |
| View own tickets           | ✅         | ✅         | ❌    |
| View all tickets           | ❌         | ❌         | ✅\*  |
| Approve/Reject tickets     | ❌         | ✅\*\*     | ❌    |
| Update ticket status       | ✅\*\*\*   | ✅\*\*\*   | ❌    |
| Close/Report ticket        | ✅\*\*\*\* | ✅\*\*\*\* | ❌    |
| View own assets            | ✅         | ✅\*\*     | ✅    |
| Transfer assets            | ❌         | ✅\*\*     | ✅    |
| Manage users               | ❌         | ❌         | ✅    |
| Employee lookup            | ❌         | ❌         | ✅    |
| Top failing devices report | ❌         | ✅         | ✅    |
| Data Portal                | ✅         | ✅         | ✅    |

`*` Read-only view of all tickets
`**` Scoped to manager's category
`***` Only if ticket assigned to them
`****` Only if creator of ticket

---

## API Endpoints Overview

For complete interactive API documentation, visit: **http://localhost:5003/api/docs** (Swagger UI)

### Authentication

```
POST   /api/auth/login          (public)          → JWT token
GET    /api/auth/me             (protected)       → current user profile
PATCH  /api/auth/change-password (protected)      → change password
```

### Tickets

```
POST   /api/tickets                      (Employee, Manager)    → create ticket
GET    /api/tickets                      (all, scoped)          → list tickets
GET    /api/tickets/:id                  (all, scoped)          → get ticket detail
PUT    /api/tickets/:id/status           (Employee, Manager)    → transition status
GET    /api/tickets/:id/allowed-statuses (all, scoped)          → valid next statuses
GET    /api/tickets/:id/file             (all, scoped)          → download attachment
```

### Approvals

```
GET    /api/approvals/pending            (Manager)    → pending approval queue
POST   /api/approvals/:id/approve        (Manager)    → approve ticket
POST   /api/approvals/:id/reject         (Manager)    → reject ticket
POST   /api/approvals/:id/reapprove      (Manager)    → re-approve after report
```

### Assets

```
GET    /api/assets                       (Admin, Manager)       → list assets
GET    /api/assets/my                    (Employee, Manager)    → my assigned assets
GET    /api/assets/:id                   (all, scoped)          → asset detail
POST   /api/assets                       (Admin)                → create asset
PATCH  /api/assets/:id/status            (Admin, Manager)       → update status
POST   /api/assets/:id/transfer          (Admin, Manager)       → transfer to employee
GET    /api/assets/:id/history           (Admin, Manager)       → transfer history
```

### Users

```
GET    /api/users                        (Admin)    → list all users
POST   /api/users                        (Admin)    → create user
DELETE /api/users/:id                    (Admin)    → delete user
POST   /api/users/transfer-ownership     (Admin)    → transfer user's assets
```

### Categories

```
GET    /api/categories                   (all)           → list categories
GET    /api/categories/:id/employees     (Admin, Manager) → employees in category
```

### Reports

```
GET    /api/reports/top-failing-devices (Admin, Manager) → device failure analytics
```

### Other

```
GET    /api/lookup/employee?q=           (Admin)                  → employee search
POST   /api/import/assets                (Admin)                  → bulk asset import
POST   /api/data-portal/tickets          (Employee, Manager, Admin) → external team data
```

---

## Environment Variables Reference

### Backend (server/.env)

| Variable              | Required | Default                 | Description                       |
| --------------------- | -------- | ----------------------- | --------------------------------- |
| `PORT`                | No       | `5003`                  | Express server port               |
| `CLIENT_URL`          | No       | `http://localhost:5173` | CORS allowed origin               |
| `DB_HOST`             | Yes      | `localhost`             | PostgreSQL host                   |
| `DB_PORT`             | No       | `5432`                  | PostgreSQL port                   |
| `DB_NAME`             | Yes      | `uiicdb`                | Database name                     |
| `DB_USER`             | Yes      | `postgres`              | Database user                     |
| `DB_PASSWORD`         | Yes      | —                       | Database password                 |
| `JWT_SECRET`          | Yes      | —                       | Secret key for JWT (32+ chars)    |
| `SMTP_HOST`           | No       | —                       | SMTP host (blank = Ethereal)      |
| `SMTP_PORT`           | No       | `587`                   | SMTP port                         |
| `SMTP_USER`           | No       | —                       | SMTP username                     |
| `SMTP_PASS`           | No       | —                       | SMTP password                     |
| `MAIL_FROM`           | No       | `ETMS <noreply@...>`    | Email from address                |
| `UPLOAD_DIR`          | No       | `./uploads`             | File upload directory             |
| `RESPONSE_UPLOAD_DIR` | No       | `./uploads/responses`   | Response file directory           |
| `SLA_CRON_SCHEDULE`   | No       | `0 0 * * *`             | SLA escalation job cron (nightly) |

### Frontend (client/.env)

| Variable       | Required | Default                     | Description          |
| -------------- | -------- | --------------------------- | -------------------- |
| `VITE_API_URL` | No       | `http://localhost:5003/api` | Backend API base URL |

---

## TypeScript

Both frontend and backend use `strict: true` TypeScript.

**Type checking:**

```bash
# Frontend
cd client && npm run typecheck

# Backend
cd server && npm run typecheck
```

**Type files:**

- Client: `client/src/types/index.ts` — User, Ticket, Asset, Category, etc.
- Server: `server/types/index.ts` — DB row types; `server/types/express.d.ts` — extends Express.Request

---

## Development Tips

### Email Testing (Local)

During local dev, Ethereal auto-generates a test account:

```
[nodemon] starting `ts-node server.ts`
📬 Ethereal test account created: sxddsgct6tpuwpra@ethereal.email
```

Preview test emails at the URL shown in server logs.

To use real SMTP (Gmail, SendGrid, etc.), populate `SMTP_*` vars in `server/.env`.

### File Uploads

- Max file size: **5 MB** (Multer config in `server/middleware/uploadMiddleware.ts`)
- Allowed types: PDF, DOC, DOCX, PNG, JPG
- Storage location: `uploads/` and `uploads/responses/` (gitignored)

### JWT & Session

- JWT expires after **8 hours**
- Stored in `sessionStorage` (per-tab isolation)
- 401 responses auto-logout via Axios interceptor
- New login required after expiry

### SLA Escalation Job

- Runs nightly at 00:00 (configurable via `SLA_CRON_SCHEDULE`)
- Escalates pending approval tickets after SLA threshold
- Triggered in `server/jobs/slaEscalationJob.ts`

---

## Troubleshooting

### Login Connection Refused

**Error:** `Failed to load resource: net::ERR_CONNECTION_REFUSED`

**Solution:**

1. Verify backend is running: `http://localhost:5003`
2. Check `client/.env` has `VITE_API_URL=http://localhost:5003/api`
3. Check `client/vite.config.ts` proxy is set to `http://localhost:5003`
4. Restart both servers: `npm run dev`

### Database Connection Failed

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**

1. Start PostgreSQL service
2. Verify credentials in `server/.env`
3. Confirm database exists: `psql -U postgres -d uiicdb`
4. Re-run schema & seed: `psql -U postgres -d uiicdb -f database/schema.sql`

### `npm run dev` Only Starts One Service

**Solution:**

1. Run `npm run install:all` to ensure all `node_modules` exist
2. Check for errors in each terminal:
   - `npm run dev:server`
   - `npm run dev:client`
3. Restart: `npm run dev`

### Port Already in Use

**Backend port 5003 in use:**

```powershell
# Find process on port 5003 (Windows)
netstat -ano | findstr :5003

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or change PORT in server/.env
```

**Frontend port 5173 in use:**

```powershell
# Find process on port 5173
netstat -ano | findstr :5173

# Kill process or run Vite on different port
npm run dev -- --port 5174
```

### Dependency Issues

Fix non-breaking vulnerabilities:

```bash
npm --prefix client audit fix
npm --prefix server audit fix
```

Fix all (may introduce breaking changes):

```bash
npm --prefix client audit fix --force
npm --prefix server audit fix --force
```

---

## Testing & Development

**Run test scripts (from `server/scripts/`):**

```bash
# Access control testing
npm --prefix server run test:access-control

# Manager service verification
npm --prefix server run test:manager-service

# SLA escalation testing
npm --prefix server run test:sla-escalation
```

**Build for production:**

```bash
# Frontend
cd client
npm run build

# Backend
cd server
npm run build
npm run start
```

---

## Coding Standards

1. **No ORM** — raw SQL with `$1 $2` parameterised queries only
2. **Hardcoded values** — import role/status/type strings from `constants/`
3. **Status logic** — lives in `utils/ticketTransitions.ts` only
4. **Assignment logic** — lives in `services/assignmentService.ts` only
5. **Admin restrictions** — admin cannot approve, reject, assign, or update ticket status
6. **API responses** — always use `{ success: true/false, ...data }` shape
7. **File handling** — use `sanitizeFilename.ts`; never raw `originalname`
8. **Ticket ID collisions** — handled with retry loop (max 3 attempts → 409 Conflict)

---

## See Also

- **Root README** (../../README.md) — comprehensive overview & features
- **API Docs** — `http://localhost:5003/api/docs` (live Swagger UI)
- **Backend Services** — `server/services/README_ManagerService.md`
- **Database Schema** — `database/schema.sql`

---

## Support

For issues, check:

1. Server logs at `http://localhost:5003`
2. Browser DevTools Network tab for API errors
3. PostgreSQL logs: `psql -U postgres -d uiicdb`
4. Ethereal test email preview URL (printed on server start)
