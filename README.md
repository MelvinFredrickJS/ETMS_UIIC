# ETMS — Employee Ticket Management System

**United India Insurance Co. Ltd. — Local Development Build**

A full-stack ticket management system for raising, approving, assigning, and resolving IT and operational tickets across departments.

---

## Tech Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend  | Node.js + Express.js + TypeScript           |
| Database | PostgreSQL (raw SQL, no ORM)                |
| Auth     | JWT (8h expiry) stored in `sessionStorage`  |
| Password | bcrypt (rounds = 10)                        |
| Files    | Multer — single file, max 5 MB              |
| Email    | Nodemailer (Ethereal for local dev)         |
| API Docs | OpenAPI 3.0 + Swagger UI at `/api/docs`     |

---

## Project Structure

```
etms-mvp/
├── client/                         # React + Vite frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.ts    # Axios with JWT interceptor + 401 auto-logout
│   │   │   ├── authApi.ts          # login, getMe, changePassword
│   │   │   └── ticketApi.ts        # All ticket, asset, user, approval, import, lookup APIs
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── CategoryOrgGraph.tsx   # SVG org graph — managers → employees
│   │   │   ├── common/
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── PriorityBadge.tsx
│   │   │   │   └── TypeBadge.tsx
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   └── tickets/
│   │   │       ├── TicketCard.tsx          # Status-coloured cards
│   │   │       ├── TicketTypeSelector.tsx
│   │   │       └── CategorySelector.tsx
│   │   ├── constants/
│   │   │   ├── ROLES.ts
│   │   │   ├── TICKET_STATUS.ts
│   │   │   ├── PRIORITY.ts
│   │   │   └── TICKET_TYPES.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # JWT + sessionStorage per-tab isolation
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ChangePasswordPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TicketsPage.tsx
│   │   │   ├── NewTicketPage.tsx
│   │   │   ├── TicketDetailPage.tsx
│   │   │   ├── PendingApprovalsPage.tsx
│   │   │   ├── AssetsPage.tsx       # Employee: read-only cards | Manager: full table
│   │   │   └── AdminPage.tsx        # 3 tabs: Users | Assets | All Tickets
│   │   ├── types/
│   │   │   └── index.ts             # Shared TS interfaces: User, Ticket, Asset, etc.
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── server/                          # Express + TypeScript backend
│   ├── config/
│   │   ├── db.ts                    # pg Pool + testConnection()
│   │   └── mailer.ts                # Nodemailer (Ethereal or real SMTP)
│   ├── constants/
│   │   └── ROLES.ts                 # Single source of truth for role strings
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── ticketController.ts
│   │   ├── approvalController.ts
│   │   ├── categoryController.ts
│   │   ├── assetController.ts
│   │   ├── userController.ts
│   │   ├── reportController.ts
│   │   └── lookupController.ts      # Employee lookup by Emp ID or serial number
│   ├── middleware/
│   │   ├── authMiddleware.ts        # JWT protect
│   │   ├── roleMiddleware.ts        # requireRole(...roles)
│   │   └── uploadMiddleware.ts      # Multer disk storage, 5 MB cap
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
│   │   └── lookupRoutes.ts          # GET  /api/lookup/employee?q=
│   ├── services/
│   │   ├── assignmentService.ts     # Round-robin employee assignment
│   │   └── emailService.ts          # 7 email triggers
│   ├── types/
│   │   ├── index.ts                 # DB row types: UserRow, TicketRow, AssetRow, etc.
│   │   └── express.d.ts             # Extends Express.Request with req.user
│   ├── utils/
│   │   ├── generateTicketId.ts      # UIIC-C/R/D-YYYY-XXXXXX with retry
│   │   ├── jwtUtils.ts
│   │   ├── sanitizeFilename.ts
│   │   └── ticketTransitions.ts     # Single source of truth for status transitions
│   ├── app.ts
│   ├── server.ts
│   ├── tsconfig.json
│   └── package.json
│
├── database/
│   ├── schema.sql                   # 8 tables, ENUMs, indexes
│   └── seed.sql                     # Ticket types, categories, users, sample assets
│
└── uploads/                         # Multer file storage (gitignored)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE uiicdb;"

# Apply schema
psql -U postgres -d uiicdb -f etms-mvp/database/schema.sql

# Seed initial data
psql -U postgres -d uiicdb -f etms-mvp/database/seed.sql
```

### 2. Backend

```bash
cd etms-mvp/server
npm install
```

Create `etms-mvp/server/.env`:

```env
PORT=5003
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=uiicdb
DB_USER=postgres
DB_PASSWORD=your_password_here

JWT_SECRET=replace_with_a_long_random_string

# Leave blank to use Ethereal (auto test account) for local dev
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="ETMS <noreply@uiic.co.in>"

UPLOAD_DIR=./uploads
RESPONSE_UPLOAD_DIR=./uploads/responses
SLA_CRON_SCHEDULE=0 0 * * *
```

```bash
npm run dev        # ts-node server.ts via nodemon → http://localhost:5003
```

Once running, access the **Swagger UI** at: **http://localhost:5003/api/docs**

### 3. Frontend

```bash
cd etms-mvp/client
npm install
npm run dev        # Vite dev server → http://localhost:5173
```

### 4. Run Both Together (from `etms-mvp/`)

```bash
npm run dev        # concurrently runs server + client
```

---

## Default Login

| Role     | Email                  | Password     |
| -------- | ---------------------- | ------------ |
| Admin    | admin@uiic.co.in       | Password@123 |
| Manager  | mgr.network@uiic.co.in | Password@123 |
| Employee | tech1@uiic.co.in       | Password@123 |

> All non-admin users are forced to change their password on first login.

---

## Roles & Permissions

| Feature                        | Employee      | Manager           | Admin          |
| ------------------------------ | ------------- | ----------------- | -------------- |
| Raise ticket                   | ✅            | ✅                | ❌             |
| View own tickets               | ✅            | ✅                | ❌             |
| View all tickets               | ❌            | ❌                | ✅ (read-only) |
| Approve / Reject tickets       | ❌            | ✅ (own category) | ❌             |
| Mark In Progress / Resolved    | ✅ (assigned) | ✅ (assigned)     | ❌             |
| Close / Report resolved ticket | ✅ (creator)  | ✅ (creator)      | ❌             |
| View assets                    | ✅ (own)      | ✅ (category)     | ✅ (all)       |
| Transfer assets                | ❌            | ✅ (category)     | ✅             |
| Manage users                   | ❌            | ❌                | ✅             |
| Employee lookup                | ❌            | ❌                | ✅             |
| Top failing devices report     | ❌            | ✅                | ✅             |

---

## API Reference

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

### Approvals

| Method | Endpoint                     | Access  |
| ------ | ---------------------------- | ------- |
| GET    | /api/approvals/pending       | Manager |
| POST   | /api/approvals/:id/approve   | Manager |
| POST   | /api/approvals/:id/reject    | Manager |
| POST   | /api/approvals/:id/reapprove | Manager |

### Assets

| Method | Endpoint                 | Access            |
| ------ | ------------------------ | ----------------- |
| GET    | /api/assets              | Admin, Manager    |
| GET    | /api/assets/my           | Employee, Manager |
| GET    | /api/assets/:id          | All (scoped)      |
| POST   | /api/assets              | Admin             |
| PATCH  | /api/assets/:id/status   | Admin, Manager    |
| POST   | /api/assets/:id/transfer | Admin, Manager    |
| GET    | /api/assets/:id/history  | Admin, Manager    |

### Users

| Method | Endpoint                      | Access |
| ------ | ----------------------------- | ------ |
| GET    | /api/users                    | Admin  |
| POST   | /api/users                    | Admin  |
| DELETE | /api/users/:id                | Admin  |
| POST   | /api/users/transfer-ownership | Admin  |
| PATCH  | /api/users/change-password    | All    |

### Categories

| Method | Endpoint                      | Access         |
| ------ | ----------------------------- | -------------- |
| GET    | /api/categories               | All            |
| GET    | /api/categories/:id/employees | Admin, Manager |

### Reports

| Method | Endpoint                         | Access         |
| ------ | -------------------------------- | -------------- |
| GET    | /api/reports/top-failing-devices | Admin, Manager |

### Lookup

| Method | Endpoint                | Access |
| ------ | ----------------------- | ------ |
| GET    | /api/lookup/employee?q= | Admin  |

---

## Ticket Lifecycle

```
Employee/Manager raises ticket
        │
        ▼
  pending_approval ──────────────────────────────► rejected (terminal)
        │                    Manager rejects
        │ Manager approves
        │ (or auto-approve for no-approval categories)
        ▼
     approved  ──► assigned (system auto round-robin)
                       │
                       ▼
                  in_progress
                  /          \
           resolved          reported ──► pending_approval (loops)
           /      \
        closed   reported ──► pending_approval (loops)
      (terminal)
```

**Ticket ID format:** `UIIC-C-2026-000001` (C=Complaint, R=Request, D=Data)

---

## Ticket Types & Categories

```
TICKET TYPE
├── 🔴 COMPLAINT   → Network Issue
│                    Software Issue
│                    Hardware Issue  (requires asset selection)
│
├── 🔵 REQUEST     → Gate Pass Request  (auto-approved, no manager queue)
│                    Credential Request
│                    Port Request
│                    New Hardware Requirement
│                    New Software Requirement
│
└── 🟡 DATA        → Paycheque Balance
                     Data Backup Request
```

---

## Key Features

### Ticket Management

- 3-step wizard: Type → Category → Details
- File attachment (PDF, DOC, DOCX, PNG, JPG — max 5 MB)
- Status-coloured ticket cards (8 distinct colours)
- Full activity log on every ticket

### Approval Workflow

- Category managers approve/reject tickets in their domain
- Round-robin auto-assignment to least-loaded employee
- Escalation path: employee reports → back to manager queue
- Manager re-approves with manual employee selection

### Asset Management

- Assets tracked per employee with full transfer history
- Admin: 3-tab panel (Users / Assets / All Tickets)
- Manager: category-scoped asset table with transfer + status actions
- Employee: read-only asset cards
- Assignment history drawer per asset

### Admin Panel

- **Users tab** — add/delete users, transfer ownership, employee lookup by Emp ID or serial number, Category Org Graph (SVG visualisation of manager → employee relationships)
- **Assets tab** — full asset table, add asset form, status change, transfer modal, history drawer
- **All Tickets tab** — read-only filtered table with pagination

### Employee Lookup

- Search by **Employee ID** or **Asset Serial Number**
- Returns: user profile, active/inactive status, open/total ticket counts, all assigned assets with specs

### Email Notifications (7 triggers)

1. Ticket raised → manager notified for approval
2. Ticket approved → raiser notified
3. Approval confirmed → manager confirmation
4. Ticket rejected → raiser notified with reason
5. Ticket assigned → assigned employee notified
6. Ticket resolved → raiser notified to review
7. Ticket escalated → manager notified for re-approval

> Local dev uses [Ethereal](https://ethereal.email/) — preview URL logged to console.

---

## TypeScript

Both frontend and backend are fully typed with `strict: true`.

- **Frontend** — `src/types/index.ts` defines `User`, `Ticket`, `Asset`, `Category`, `TicketLog`, `Attachment` and literal types `Role`, `TicketStatus`, `Priority`, `TypeKey`
- **Backend** — `server/types/index.ts` defines DB row types; `server/types/express.d.ts` extends `Express.Request` with typed `req.user`

```bash
# Type check frontend
cd client && npm run typecheck

# Type check backend
cd server && npm run typecheck
```

---

## Coding Rules

1. No ORM — raw SQL with `$1 $2` parameterised queries only
2. Never hardcode role/status/type strings — always import from `constants/`
3. Status transition logic lives **only** in `utils/ticketTransitions.ts`
4. Round-robin assignment logic lives **only** in `services/assignmentService.ts`
5. Admin can **never** approve, reject, assign, or update ticket status
6. All API responses use `{ success: true/false, ...data }` shape
7. File naming uses `sanitizeFilename.ts` — never raw `originalname`
8. Ticket number collision handled with retry loop (max 3 attempts → 409)

---

## Environment Variables

| Variable            | Description                  | Default                     |
| ------------------- | ---------------------------- | --------------------------- |
| PORT                | Server port                  | 5003                        |
| CLIENT_URL          | CORS allowed origin          | http://localhost:5173       |
| DB_HOST             | PostgreSQL host              | localhost                   |
| DB_PORT             | PostgreSQL port              | 5432                        |
| DB_NAME             | Database name                | uiicdb                      |
| DB_USER             | Database user                | postgres                    |
| DB_PASSWORD         | Database password            | —                           |
| JWT_SECRET          | JWT signing secret           | —                           |
| SMTP_HOST           | SMTP host (blank = Ethereal) | —                           |
| SMTP_PORT           | SMTP port                    | 587                         |
| SMTP_USER           | SMTP username                | —                           |
| SMTP_PASS           | SMTP password                | —                           |
| MAIL_FROM           | From address                 | ETMS \<noreply@uiic.co.in\> |
| UPLOAD_DIR          | Multer upload directory      | ./uploads                   |
| RESPONSE_UPLOAD_DIR | Response file storage        | ./uploads/responses         |
| SLA_CRON_SCHEDULE   | SLA escalation job schedule  | 0 0 \* \* \* (nightly)      |

---

---

## API Endpoints Quick Reference

For complete API documentation with request/response examples, visit **http://localhost:5003/api/docs** (Swagger UI).

**Key Endpoint Categories:**

- **Auth** — login, user profile
- **Tickets** — CRUD, status transitions, file management
- **Approvals** — pending queue, approve/reject/reapprove
- **Assets** — list, transfer, history, specification updates
- **Users** — admin user management, role assignments
- **Categories** — team structure, employee assignments
- **Reports** — top failing devices analytics
- **Lookup** — employee search by ID or asset serial
- **Import** — bulk asset import from Excel
- **Data Portal** — external team dashboards

---
