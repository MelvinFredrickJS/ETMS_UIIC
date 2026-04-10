# 🚀 ETMS — FULLY UPDATED COPILOT PROMPT (FINAL)

## 🔷 BASE WORKFLOW (UPDATED)

# 🤖 COPILOT BUILD PROMPT — ETMS MVP

## Employee Ticket Management System — United India Insurance Co. Ltd.

## Local Development Build

---

> ### HOW TO USE THIS FILE
>
> 1. Open GitHub Copilot Chat in VS Code (`Ctrl+Shift+I`)
> 2. Paste **Section 0** first — do this at the start of EVERY new chat session
> 3. Work through sections **one at a time, top to bottom**
> 4. After each section, test it works before moving to the next
> 5. Each section tells you exactly which files to create and what they must do

---

## ══════════════════════════════════════════════════════

## SECTION 0.5 ❯ BUILD CONTRACT (IMPLEMENTATION-READY)

## ══════════════════════════════════════════════════════

```
This section is authoritative for implementation detail.
If any summary text conflicts with this section, follow this section.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API ROUTE CONTRACT (EXACT ENDPOINTS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTH
  POST   /api/auth/login                   public
  GET    /api/auth/me                      protect

CATEGORIES
  GET    /api/categories                   protect
  GET    /api/categories/:categoryId/employees   protect + requireRole(ADMIN, MANAGER)

ASSETS
  GET    /api/assets/my                    protect + requireRole(EMPLOYEE, MANAGER)
  GET    /api/assets/:id                   protect
  POST   /api/assets                       protect + requireRole(ADMIN)
  PATCH  /api/assets/:id/status            protect + requireRole(ADMIN, MANAGER)
  POST   /api/assets/:id/transfer          protect + requireRole(ADMIN, MANAGER)

REPORTS
  GET    /api/reports/top-failing-devices  protect + requireRole(ADMIN, MANAGER)

TICKETS
  POST   /api/tickets                      protect + requireRole(EMPLOYEE, MANAGER) + upload.single('file')
  GET    /api/tickets                      protect
  GET    /api/tickets/:id                  protect
  GET    /api/tickets/:id/allowed-statuses protect
  PUT    /api/tickets/:id/status           protect + requireRole(EMPLOYEE, MANAGER)
  GET    /api/tickets/:id/file             protect

APPROVALS
  GET    /api/approvals/pending            protect + requireRole(MANAGER)
  POST   /api/approvals/:ticketId/approve  protect + requireRole(MANAGER)
  POST   /api/approvals/:ticketId/reject   protect + requireRole(MANAGER)
  POST   /api/approvals/:ticketId/reapprove protect + requireRole(MANAGER)

USERS
  GET    /api/users                        protect + requireRole(ADMIN)
  POST   /api/users                        protect + requireRole(ADMIN)
  DELETE /api/users/:id                    protect + requireRole(ADMIN)
  POST   /api/users/transfer-ownership     protect + requireRole(ADMIN)
  PATCH  /api/users/change-password        protect

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTROLLER CONTRACT (REQUIRED METHODS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

authController.js
  login(req,res)
  me(req,res)

ticketController.js
  createTicket(req,res)
  listTickets(req,res)
  getTicketById(req,res)
  getAllowedStatuses(req,res)
  updateTicketStatus(req,res)
  downloadTicketFile(req,res)

approvalController.js
  getPendingApprovals(req,res)
  approveTicket(req,res)
  rejectTicket(req,res)
  reapproveTicket(req,res)

categoryController.js
  getCategories(req,res)
  getEmployeesByCategory(req,res)

assetController.js
  getMyAssets(req,res)
  getAssetById(req,res)
  createAsset(req,res)
  updateAssetStatus(req,res)
  transferAsset(req,res)

userController.js
  listUsers(req,res)
  createUser(req,res)
  deleteUser(req,res)
  transferOwnership(req,res)
  changePassword(req,res)

reportController.js
  getTopFailingDevices(req,res)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE SCHEMA CONTRACT (REQUIRED TABLES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source of truth DDL: Section 1 -> database/schema.sql

1) users
  required columns:
    id (PK), emp_id (UNIQUE), name, email (UNIQUE), password_hash,
    role ENUM user_role_enum ('employee','manager','admin'),
    category_id (FK ticket_categories.id),
    department, is_active, password_changed_at, created_at

2) ticket_types
  required columns:
    id (PK), name, type_key (UNIQUE)
  required seeded values:
    complaint, request, data

3) ticket_categories
  required columns:
    id (PK), ticket_type_id (FK ticket_types.id),
    name, category_key (UNIQUE), default_priority,
    manager_user_id (FK users.id),
    requires_approval (BOOLEAN, default TRUE)
    -- FALSE for categories that auto-approve (e.g., gate_pass)

4) assets
  required columns:
    id (PK), name, serial_number (UNIQUE), category_id (FK ticket_categories.id),
    assigned_to (FK users.id), status,
    created_at, updated_at
  status values:
    active, under_repair, retired

5) asset_assignments (asset transfer history)
  required columns:
    id (PK), asset_id (FK assets.id), from_user_id (FK users.id),
    to_user_id (FK users.id), transferred_by (FK users.id),
    assigned_at, returned_at, note, created_at
  rules:
    exactly one active row per asset (returned_at IS NULL)
    each transfer closes prior active row and inserts a new active row
    enforce with partial unique index on (asset_id) WHERE returned_at IS NULL

  CORE FEATURE (minimum shape):
    CREATE TABLE asset_assignments (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER REFERENCES assets(id),
      user_id INTEGER REFERENCES users(id),
      assigned_at TIMESTAMP DEFAULT NOW(),
      returned_at TIMESTAMP
    );

  Mapping note:
    this spec uses an extended production-ready shape where:
    - user_id maps to to_user_id (current owner in each assignment row)
    - extra fields (from_user_id, transferred_by, note) preserve transfer provenance

  What this gives you:
    - Who used this laptop before?
    - When was it reassigned?
    - How many users faced issues with this device?
    - High-value traceability for real systems

6) tickets
  required columns:
    id (PK), ticket_no (UNIQUE), title, description,
    ticket_type_id (FK), category_id (FK), priority ENUM priority_enum,
    status CHECK ('pending_approval','approved','assigned','in_progress','reported','resolved','closed','rejected'),
    raised_by (FK users.id), assigned_to (FK users.id),
    approval_owner_id (FK users.id, nullable),
    asset_id (FK assets.id),
    rejection_reason, report_reason,
    created_at, updated_at

7) attachments
  required columns:
    id (PK), ticket_id (FK ON DELETE CASCADE),
    filename, original_name, file_path, file_size, mime_type,
    uploaded_by (FK users.id), uploaded_at

8) ticket_logs (ticket_history)
  note:
    This project uses ticket_logs as the ticket history table.
  required columns:
    id (PK), ticket_id (FK), action, old_status, new_status,
    performed_by (FK users.id), note, created_at
  rule:
    append-only audit trail (insert only; no update/delete in app logic)

Required indexes (minimum):
  tickets(raised_by), tickets(assigned_to), tickets(status),
  tickets(approval_owner_id),
  tickets(ticket_type_id), tickets(category_id), tickets(asset_id),
  assets(serial_number), assets(category_id), assets(assigned_to), assets(status),
  asset_assignments(asset_id), asset_assignments(asset_id, returned_at),
  ticket_logs(ticket_id), ticket_categories(manager_user_id)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUDIT / HISTORY CONTRACT (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Minimal implementation note (small but high-value):
  maintain ticket_history for every ticket lifecycle action.

Required minimum fields:
  ticket_id
  action        -- e.g. created, approved, assigned, in_progress, resolved, closed, rejected, reported
  performed_by  -- user id; null allowed only for system-only actions
  timestamp     -- when action happened (created_at)

Audit table:
  ticket_logs is mandatory and acts as ticket_history.

Write rule:
  every ticket state change must write one audit row.

Minimum action events to log:
  TICKET_CREATED
  APPROVED
  REJECTED
  AUTO_ASSIGNED
  MANUALLY_ASSIGNED
  STATUS_CHANGED
  ESCALATED
  BACK_TO_MANAGER
  RE_APPROVED

Minimum fields per audit row:
  ticket_id, action, old_status, new_status, performed_by, note, created_at

History retrieval contract:
  GET /api/tickets/:id must include logs sorted by created_at ASC
  source query uses ticketModel.getLogs(ticket_id)

Integrity requirements:
  append-only (no update/delete in app logic)
  performed_by may be null only for system-only actions
  old_status/new_status must reflect actual transition applied
  if action includes user-provided reason (reject/report), persist in note

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION RULES (MINIMUM ENFORCED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/auth/login
  email: required, valid email format
  password: required, min 8

POST /api/tickets
  title: required, string, 5..200
  description: required, string, min 20
  ticket_type_id: required, integer
  category_id: required, integer and must belong to ticket_type_id
  priority: required, ENUM (priority_enum) — 'low' | 'medium' | 'high' | 'critical'
  asset_id: optional integer
    - required when category_key = 'hardware_issue'
    - must belong to req.user.id (assigned_to)
    - must match selected ticket category (asset.category_id === category_id)
    - asset.status must be 'active' when used in a new ticket
    - this check applies only to hardware_issue flow; it does NOT restrict users to hardware-only tickets
    - users.category_id (work queue domain) and assets.category_id (asset classification) are intentionally different concerns
  file: optional, max 5MB, mime in allowed list

PUT /api/tickets/:id/status
  status: required, enum pending_approval|approved|assigned|in_progress|reported|resolved|closed|rejected
  note: optional for in_progress->reported (employee escalation);
        required (min 10) for resolved->reported (raiser dispute)
  report_reason: persisted field for status='reported'
                (optional for in_progress->reported,
                 required min 10 for resolved->reported)
  actor ownership checks:
    assigned/in_progress transitions require assigned_to = req.user.id
    resolved->closed/resolved->reported require raised_by = req.user.id

POST /api/approvals/:ticketId/reject
  rejection_reason: required, min 10

POST /api/approvals/:ticketId/reapprove
  assigned_to: required, valid employee in same category as ticket

POST /api/assets/:id/transfer
  to_user_id: required, integer
  note: optional, string, max 500
  guards:
    allowed roles: admin, manager
    asset.status must not be 'under_repair'
    to_user_id must be active employee
    to_user_id cannot equal current assigned_to

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS REASON FIELDS (CLARITY FEATURE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Optional fields:
  - rejection_reason
  - report_reason

Why this matters:
  - Manager knows WHY a ticket was reported
  - Better audit clarity
  - Better debugging during escalations
  - Better UI messages in ticket detail and approval queue

Behavior contract:
  - rejection_reason is required for reject action
  - report_reason is optional for in_progress->reported
  - report_reason is required (min 10) for resolved->reported

Asset-ticket linkage contract:
  - Hardware issue tickets must include asset_id
  - Non-hardware categories may keep asset_id as null
  - Serial number remains unique and tied to one asset record
  - Ticket detail should show asset name + serial when asset_id is present

Asset transfer contract:
  - Admin and manager can transfer assets between employees
  - Transfer is blocked when asset.status = 'under_repair'
  - Every transfer must be recorded in asset_assignments history
  - Active owner remains source of truth in assets.assigned_to

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSET API QUICK EXAMPLES (COPY-READY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/assets/my
  Response 200:
  {
    "success": true,
    "assets": [
      {
        "id": 1,
        "name": "Dell Laptop",
        "serial_number": "DL12345",
        "category_id": 3,
        "category_name": "Hardware Issue",
        "status": "active"
      },
      {
        "id": 2,
        "name": "Monitor",
        "serial_number": "MN56789",
        "category_id": 3,
        "category_name": "Hardware Issue",
        "status": "active"
      }
    ]
  }

POST /api/tickets  (hardware_issue sample)
  Request body (multipart fields):
    title=System hangs on boot
    description=Dell laptop freezes during startup and needs hard reboot.
    ticket_type_id=1
    category_id=3
    priority=high
    asset_id=1

  Success 201:
  {
    "success": true,
    "ticket": {
      "id": 101,
      "ticket_no": "UIIC-C-2026-000101",
      "status": "pending_approval",
      "asset_id": 1,
      "asset_name": "Dell Laptop",
      "asset_serial_number": "DL12345"
    }
  }

  Validation errors:
    400 if category_key='hardware_issue' and asset_id is missing
    403 if selected asset is not assigned to req.user.id
    400 if selected asset status is not 'active'

POST /api/assets/1/transfer
  Request body:
  {
    "to_user_id": 3,
    "note": "Transferred for project handover"
  }

  Success 200:
  {
    "success": true,
    "message": "Asset transferred successfully",
    "asset": {
      "id": 1,
      "assigned_to": 3,
      "status": "active"
    }
  }

  Validation errors:
    400 if asset.status = 'under_repair'
    400 if to_user_id equals current assigned_to
    400 if target user is not an active employee

GET /api/reports/top-failing-devices?limit=10
  Response 200:
  {
    "success": true,
    "devices": [
      { "id": 1, "name": "Dell Laptop", "serial_number": "DL12345", "total_issues": 12 },
      { "id": 2, "name": "Monitor", "serial_number": "MN56789", "total_issues": 9 },
      { "id": 3, "name": "Keyboard", "serial_number": "KB99887", "total_issues": 7 }
    ]
  }

  Report query:
    SELECT
      a.id,
      a.name,
      a.serial_number,
      COUNT(t.id) AS total_issues
    FROM assets a
    JOIN tickets t ON t.asset_id = a.id
    GROUP BY a.id, a.name, a.serial_number
    ORDER BY total_issues DESC
    LIMIT $1;

  Use cases:
    - Replace bad devices
    - Identify faulty batches
    - Budget planning

  How everything connects:
    ASSETS
      -> ASSET_ASSIGNMENTS (history)
      -> TICKETS (linked via asset_id)
      -> REPORTS + ALERTS

  Important rules (must remain enforced):
    - Asset must belong to user when raising ticket
    - Cannot transfer asset under repair
    - asset_id required for hardware tickets

POST /api/users
  emp_id: required, unique
  name: required
  email: required, valid, unique
  password: required, min 8
  role: required, ENUM (user_role_enum) — 'employee' | 'manager' | 'admin'
  category_id: required for employee and manager roles

PATCH /api/users/change-password
  currentPassword: required
  newPassword: required, min 8, must include upper/lower/number/special
  confirmPassword: required and must match newPassword

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEFAULT STATUS ON TICKET CREATION (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On ticket creation:
  If requires_approval = TRUE and raiser is not the category manager:
    status = pending_approval

  If requires_approval = TRUE and raiser is the category manager:
    status = assigned (after auto approval + auto assignment)
    -- internal path: pending_approval -> approved -> assigned

  If requires_approval = FALSE:
    status = assigned (after auto assignment)
    -- internal system path is: pending_approval -> approved -> assigned

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS TRANSITION RULES (ENFORCEABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Allowed transitions only:
  pending_approval -> approved         actor: manager
  pending_approval -> rejected         actor: manager (rejection_reason required)
  approved -> assigned                 actor: system only
  assigned -> in_progress              actor: assigned owner only (employee or manager)
  in_progress -> resolved              actor: assigned owner only (employee or manager)
  in_progress -> reported              actor: assigned owner only (employee or manager, note optional)
  resolved -> closed                   actor: ticket creator only
  resolved -> reported                 actor: ticket creator only (note required, min 10)
  reported -> pending_approval         actor: system only

HARD VALIDATION FOR ILLEGAL TRANSITIONS (MANDATORY ENFORCEMENT):
  System must reject any invalid transition at controller level.
  Validation is mandatory on every status update call.

  Required checks (all must pass):
    1) Transition validity check: current_status -> target_status must exist in ALLOWED_TRANSITIONS
    2) Role validation: actor role must be permitted for that transition
    3) Ownership validation: actor must be the required ticket owner (assigned_to or raised_by)
    4) Approval owner validation: manager transitions require ticket.approval_owner_id === req.user.id

  Illegal transition examples (must be explicitly rejected):
    - Employee cannot move pending_approval -> approved
    - Creator cannot move any ticket to resolved
    - Assignee cannot move resolved -> closed
    - Random user (not assignee, not creator, not approval owner) cannot update ticket status

  Response contract for violations:
    - 400 Bad Request: invalid state transition (not allowed by workflow)
    - 403 Forbidden: role/ownership/category permission violation

  Rule:
    All transitions must be role-validated before any DB update is executed.
    Never update tickets.status first and validate later.

═══════════════════════════════════════════════════════════════════════════════
⚠️ STATUS PERMISSIONS MATRIX (ENFORCEMENT — CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

This matrix defines WHO can move to each status and what checks the backend MUST
enforce. Violations return 400 Bad Request or 403 Forbidden.

FROM pending_approval → TO approved:
  ✅ WHO:           MANAGER via approval endpoint OR SYSTEM via ticket create flow (no-approval category or manager in own category)
  ✅ ENDPOINT PATH: manual path uses approvalController.approveTicket; system path uses ticketController.createTicket
  ✅ OWNERSHIP:     manual path requires req.user.role === ROLES.MANAGER
  ✅ APPROVAL OWNER: manual path requires ticket.approval_owner_id === req.user.id
  ❌ IF violated:   403 { success: false, message: 'You do not have permission to approve this ticket.' }

FROM pending_approval → TO rejected:
  ✅ WHO:           MANAGER only (via approvalController.rejectTicket)
  ✅ ROUTING:       restricted to ticket.approval_owner_id
  ✅ OWNERSHIP:     req.user.role === ROLES.MANAGER
  ✅ APPROVAL OWNER: ticket.approval_owner_id === req.user.id
  ✅ REASON:        rejection_reason must be provided (min 10 chars)
  ❌ IF violated:   403 or 400 with appropriate message

FROM approved → TO assigned:
  ✅ WHO:           SYSTEM ONLY (automatic)
  ✅ TRIGGER:       Happens inside approvalController.approveTicket after getNextEmployeeInCategory()
  ✅ PERFORMED_BY:  null (system action, no user)
  ❌ NOT callable by any user — internal only

FROM assigned → TO in_progress:
  ✅ WHO:           Assigned owner ONLY (employee or manager) via ticketController.updateTicketStatus
  ✅ OWNERSHIP:     req.user.id === ticket.assigned_to
  ✅ PERMISSION:    req.user.role IN (ROLES.EMPLOYEE, ROLES.MANAGER)
  ❌ IF violated:   403 { success: false, message: 'You do not have permission to update this ticket.' }

FROM in_progress → TO resolved:
  ✅ WHO:           Assigned owner ONLY (employee or manager) via ticketController.updateTicketStatus
  ✅ OWNERSHIP:     req.user.id === ticket.assigned_to
  ✅ PERMISSION:    req.user.role IN (ROLES.EMPLOYEE, ROLES.MANAGER)
  ❌ IF violated:   403

FROM in_progress → TO reported:
  ✅ WHO:           Assigned owner ONLY (employee or manager escalation)
  ✅ OWNERSHIP:     req.user.id === ticket.assigned_to
  ✅ PERMISSION:    req.user.role IN (ROLES.EMPLOYEE, ROLES.MANAGER)
  ✅ AUTO-TRIGGER:  reported → pending_approval (system, after this transition)
  ❌ IF violated:   403

FROM resolved → TO closed:
  ✅ WHO:           Ticket CREATOR ONLY (final acceptance)
  ✅ OWNERSHIP:     req.user.id === ticket.raised_by
  ✅ PERMISSION:    req.user.role IN (ROLES.EMPLOYEE, ROLES.MANAGER)
  ✅ NOTE:          note field is optional
  ❌ IF violated:   403 { success: false, message: 'Only the ticket creator can close or report a resolved ticket.' }

FROM resolved → TO reported:
  ✅ WHO:           Ticket CREATOR ONLY (resolution dispute)
  ✅ OWNERSHIP:     req.user.id === ticket.raised_by
  ✅ PERMISSION:    req.user.role IN (ROLES.EMPLOYEE, ROLES.MANAGER)
  ✅ REASON:        report_reason must be provided (min 10 chars)
  ✅ AUTO-TRIGGER:  reported → pending_approval (system, after this transition)
  ❌ IF violated:   403 { success: false, message: 'Only the ticket creator can close or report a resolved ticket.' }

FROM reported → TO pending_approval:
  ✅ WHO:           SYSTEM ONLY (automatic)
  ✅ TRIGGER:       Happens inside ticketController.updateTicketStatus after status='reported'
  ✅ PERFORMED_BY:  null (system action, no user)
  ✅ SIDE EFFECT:   Email sent to category manager about escalation
  ❌ NOT callable by any user — internal only

TERMINAL STATUSES (NO TRANSITIONS OUT):
  ✅ rejected:      Terminal — no further transitions allowed
  ✅ closed:        Terminal — no further transitions allowed
  ❌ Any attempt:   400 { success: false, message: 'Cannot move from terminal status...' }

═══════════════════════════════════════════════════════════════════════════════

Terminal statuses:
  rejected, closed
  no transitions allowed out of terminal statuses

Forbidden transitions (must return 400/403):
  manager -> close ticket (forbidden)
  manager -> in_progress/resolved/reported/closed (forbidden unless manager is ticket creator on resolved)
  non-assigned employee -> assigned/in_progress/resolved/reported (forbidden)
  non-creator on resolved ticket -> closed/reported (forbidden)
  any role -> reopen closed ticket (forbidden in MVP)

⚠️ CREATOR CONTROL RULE (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After ticket reaches RESOLVED status:
  ✅ ONLY ticket creator (raised_by, employee or manager) can:
     - CLOSE the ticket          (resolved → closed)
     - REPORT the ticket         (resolved → reported with reason)
  ❌ Assigned employee CANNOT:
     - Close the ticket (403 Forbidden)
     - Report the ticket (403 Forbidden)
  ❌ Even assigned employee cannot reopen a closed ticket (MVP: no reopening)
  ➡️ If assigned employee disputes resolution, they must escalate
     (mark in_progress → reported), which auto-transitions to pending_approval
     for manager re-review.

Controller enforcement requirement:
  For PUT /api/tickets/:id/status when status=resolved:
    → 403 if req.user.id !== ticket.raised_by
    → Message: "Only the ticket creator can close or report a resolved ticket."

========════════════════════════════════════════════════════════════════════════
⚠️ STATUS PERMISSION ENFORCEMENT CHECKLIST (IMPLEMENT IN CONTROLLERS)
========════════════════════════════════════════════════════════════════════════

PUT /api/tickets/:id/status (Creator/Assignee endpoint)
  1. Role check: requireRole(ROLES.EMPLOYEE, ROLES.MANAGER) middleware — ADMIN blocked
  2. Load ticket by id
  3. Ownership check based on CURRENT status:
     ✅ IF ticket.status IN ['assigned', 'in_progress']:
        → 403 if req.user.id !== ticket.assigned_to
        → Message: "You do not have permission to update this ticket."
      ✅ IF ticket.status === 'resolved':
        → 403 if req.user.id !== ticket.raised_by
          → Message: "Only the ticket creator can close or report a resolved ticket."
      ✅ IF ticket.status IN ['pending_approval', 'approved', 'reported', 'closed', 'rejected']:
        → 403 (not user-updatable from this endpoint)
  4. Call validateTransition(ticket.status, newStatus, req.user.role):
     → Returns { valid: true/false, reason: string }
     → 400 if not valid
  5. Prevent terminal status re-entry:
     → 400 if ticket.status IN ['closed', 'rejected'] (terminal — no way out)

POST /api/approvals/:ticketId/approve (Manager endpoint)
  1. Role check: requireRole(ROLES.MANAGER) middleware
  2. Load ticket by id
  3. Verify ticket.status === 'pending_approval':
     → 400 if not: { success: false, message: 'Can only approve pending tickets.' }
  4. Approval owner check:
     → 403 if ticket.approval_owner_id !== req.user.id
     → Message: "You do not have permission to manage this approval."
    5. Proceed with approval (auto-assign happens internally)

POST /api/approvals/:ticketId/reject (Manager endpoint)
  1. Role check: requireRole(ROLES.MANAGER) middleware
  2. Load ticket by id
  3. Verify ticket.status === 'pending_approval':
     → 400 if not
  4. Approval owner check (same as approve)
      5. Require rejection_reason:
     → 400 if missing or empty: { success: false, message: 'Rejection reason is required.' }
      6. Proceed with rejection

POST /api/approvals/:ticketId/reapprove (Manager endpoint — Re-approval after escalation)
  1. Role check: requireRole(ROLES.MANAGER) middleware
  2. Load ticket by id
  3. Verify ticket.status === 'pending_approval':
     → 400 if not
  4. Verify ticket has report_reason set (confirms it's a re-approval):
     → 400 if not: { success: false, message: 'This is not an escalated ticket.' }
  5. Approval owner check (same as approve)
  6. Validate assigned_to employee:
     → employee must exist
     → employee.role === ROLES.EMPLOYEE
     → employee in same category as ticket
     → 400 if any check fails
  7. Proceed with re-approval and re-assignment

========════════════════════════════════════════════════════════════════════════

⚠️ ASSIGNMENT TRIGGER AND MECHANISM (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assignment ALWAYS happens via the same round-robin mechanism across all triggers.

WHEN ASSIGNMENT IS TRIGGERED (3 Scenarios):
  ✅ SCENARIO 1: Manager approves ticket in requires_approval=TRUE categories
     Endpoint:  POST /api/approvals/:ticketId/approve
     Transition: pending_approval → approved → assigned
     Trigger:   Manager clicks approve button
    Caller:    approvalController.approveTicket()

  ✅ SCENARIO 2: Ticket created in requires_approval=FALSE categories
     Endpoint:  POST /api/tickets (auto-approval flow)
     Transition: pending_approval → approved → assigned
     Trigger:   System automatically on ticket creation
    Caller:    ticketController.createTicket() → auto-approval logic

    ✅ SCENARIO 3: Manager raises ticket in own category
      Endpoint:  POST /api/tickets (manager domain flow)
      Transition: pending_approval → approved → assigned
      Trigger:   Manager raises ticket where category.manager_user_id = req.user.id
      Caller:    ticketController.createTicket() → manager own-category auto-approval logic

HOW ASSIGNMENT WORKS (All Scenarios Use Identical Mechanism):
  ✅ SERVICE:       assignmentService.getNextEmployeeInCategory(category_id)
  ✅ ALGORITHM:     Round-robin by least-loaded employee in category
     - Count open (non-terminal) tickets assigned to each employee in category
     - Select employee with lowest count (least-loaded first)
     - Tie-breaker: earliest created employee (by created_at) wins
  ✅ RESULT:        assigned_to = employee.user_id
  ✅ STATUS:        ticket.status = 'assigned'
  ✅ LOG ACTION:    ticket_logs → 'AUTO_ASSIGNED' (performed_by = null)
  ✅ SYSTEM:        System action, performed_by = null (no user triggered it)

IMPORTANT DISTINCTIONS:
  ❌ REASSIGNMENT (POST /api/approvals/:ticketId/reapprove):
     - NOT round-robin (manual employee selection by manager)
     - Manager explicitly chooses which employee to reassign to
     - Used after escalation (reported tickets) when manager wants to retry
     - Still validates category constraint (employee must be in same category)

  ❌ RE-APPROVAL vs. re-assignment:
     - re-approval = second chance after ticket was escalated (reported)
     - re-assignment = manager manually picks a different (or same) employee
     - Both happen in same endpoint but are conceptually different
     - re-assignment does NOT use round-robin

CONTROLLER IMPLEMENTATION REQUIREMENT:
  approvalController.approveTicket() must:
    1. After status update to 'approved':
    2. Call: const employee = await assignmentService.getNextEmployeeInCategory(ticket.category_id)
    3. Update ticket: assigned_to = employee.user_id, status = 'assigned'
    4. Log: ticket_logs → { action: 'AUTO_ASSIGNED', performed_by: null, new_status: 'assigned' }
    5. Send email: assigned employee gets notification

  ticketController.createTicket() → auto-approval flow must:
    1. After status update to 'approved':
    2. Call: const employee = await assignmentService.getNextEmployeeInCategory(ticket.category_id)
    3. Update ticket: assigned_to = employee.user_id, status = 'assigned'
    4. Log: ticket_logs → { action: 'AUTO_ASSIGNED', performed_by: null, new_status: 'assigned' }
    5. Send email: assigned employee + ticket creator notifications

========════════════════════════════════════════════════════════════════════════

⚠️ WORK START TRIGGER (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT: Assignment ≠ Work Start

  Assignment (SYSTEM):
    - status = 'assigned'
    - Ticket is placed in employee's queue
    - Employee is notified but work has NOT started yet
    - This is an automatic system action

  Work Start (EMPLOYEE):
    - Employee explicitly transitions: assigned → in_progress
    - Endpoint: PUT /api/tickets/:id/status
    - Body: { status: 'in_progress' }
    - Transition triggered by: "Start Working" button on UI / Employee action
    - This is when the employee actually BEGINS work
    - Log action: 'WORK_STARTED' (or timestamp change if using SLA tracking)

  Timeline:
    1. Ticket created in requires_approval=FALSE → status: assigned (system)
    2. Employee receives email: "Ticket XYZ assigned to you"
    3. Employee logs in, sees assigned ticket
    4. Employee clicks "Start Working" → transitions to in_progress
    5. ONLY NOW does work actually start

  BUSINESS IMPACT:
    - assigned = waiting in queue (can be reassigned)
    - in_progress = actively being worked (tracked for SLA)
    - UI should distinguish: "Awaiting your action" vs "Active ticket"

Controller enforcement (PUT /api/tickets/:id/status → assigned to in_progress):
  ✅ WHO:        Only assigned employee (req.user.id === ticket.assigned_to)
  ✅ TRANSITION: assigned → in_progress (ONE STEP ONLY, no skipping)
  ✅ LOG:        ticket_logs → action: 'WORK_STARTED', performed_by: req.user.id
  ✅ TIMESTAMP:  Set started_at = NOW() if tracking SLA
  ❌ IF DENIED:  403 { success: false, message: 'You do not have permission to update this ticket.' }

========════════════════════════════════════════════════════════════════════════

Controller enforcement requirement:

⚠️ AUTO ASSIGNMENT FOR NO-APPROVAL CATEGORIES (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When ticket is created in a category where requires_approval = FALSE:

  ✅ SKIP manager approval queue entirely
  ✅ IMMEDIATELY auto-approve on ticket creation
     status: pending_approval → approved (system action, performed_by=null)
  ✅ IMMEDIATELY auto-assign using round-robin within category
     status: approved → assigned (system action, performed_by=null)
     assigned_to = least-loaded employee in that category
     Use: getNextEmployeeInCategory(category_id)
  ✅ NO manager notification email (manager is bypassed)
  ✅ SEND 2 emails:
     1) assigned employee: "Your ticket assignment"
     2) raiser: "Your ticket was approved and assigned"

  Examples:
    - Gate Pass Request (requires_approval=FALSE)
      Employee raises → system auto-approves → system auto-assigns → 2 emails sent
      Manager never sees it in /approvals queue

    - Complaint (requires_approval=TRUE)
      Employee raises → status = pending_approval → manager sees in /approvals
      Manager approves → system auto-assigns → 3 emails sent

  Controller implementation (POST /api/tickets):
    1. Raise ticket → status = 'pending_approval'
    2. Check: if category.requires_approval === FALSE:
       a. updateStatus(id, 'approved') — log action
       b. employee = getNextEmployeeInCategory(category_id)
       c. assign(id, employee.id) — log action
       d. Send 2 emails (employee + raiser)
    3. Else (requires_approval === TRUE):
       a. Send email to category manager
       b. Ticket waits in pending_approval status
       c. Manager decides via /approvals endpoint

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Controller enforcement requirements:
  1) check route-level role
  2) load ticket by id
  3) enforce ownership (assigned_to or raised_by depending on current status)
  4) validate transition against ALLOWED_TRANSITIONS
  5) persist status and log action in ticket_logs
  6) run automatic reported -> pending_approval and trigger escalation email

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR HANDLING CONTRACT (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All responses use:
  { success: false, message: string, code?: string, details?: any }
  { success: true, ...data }

Status codes:
  400 validation or bad state transition
  401 unauthenticated / invalid token
  403 authenticated but not authorized
  404 entity not found
  409 duplicate conflict (email/emp_id/ticket_no)
  413 file too large
  415 invalid file type
  422 semantic validation failure (optional, if used consistently)
  500 unexpected server error

Global error middleware must:
  map multer file size to 413
  map multer invalid mime to 415
  never leak stack traces in API response
  log stack traces on server side only

DB queries:
  always parameterized with $1..$n
  no dynamic SQL fragments from user input except whitelisted field names

Ticket number collision handling (MANDATORY):
  - If tickets insert fails with PostgreSQL 23505 on ticket_no unique constraint,
    regenerate ticket_no and retry insert (max 3 attempts)
  - If retries exhausted, return 409 with code: 'TICKET_NO_CONFLICT'
  - Do not expose raw SQL error text or constraint names in API response
```

---

## ══════════════════════════════════════════════════════

## SECTION 0 ❯ PROJECT CONTEXT (paste this first, always)

## ══════════════════════════════════════════════════════

```
Build the MVP of ETMS (Employee Ticket Management System)
for United India Insurance Co. Ltd. — local development only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MVP SCOPE — ONLY THESE FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Auth               — login with JWT, admin creates users (no self-register)
✅ Forced PW Change  — all users change password on first login
✅ Ticket Creation   — employee or manager raises ticket with type + category + file
✅ Asset Management  — assets assigned per employee with unique serial numbers
✅ Approval workflow — requires_approval categories use category-manager approval unless manager raises in own category (auto-approved)
✅ Round-robin assign — approved tickets auto-assigned to least-loaded employee
✅ Manager re-assign  — on reported tickets, manager picks a specific employee
✅ Ticket Listing    — view tickets scoped by role
✅ Status Update     — assigned employee updates work status; raiser closes or re-reports after resolution
✅ Role Access       — 3 roles: employee | manager | admin
✅ File Upload       — one file per ticket, basic type check
✅ Email             — 7 triggers (ticket raised, approved, manager confirmation, rejected, assigned, resolved, reported)

❌ NOT IN MVP: SLA timers, Redis, notification bell, comments, audit log UI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TICKET CLASSIFICATION  ← READ THIS CAREFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
There are THREE ticket types. Every ticket has a TYPE and
a CATEGORY under it.

TYPE 1: complaint  🔴  (employee reporting a broken thing)
  Sub-categories:
    - Network Issue           (category_key = 'network_issue')
    - Software Issue          (category_key = 'software_issue')
    - Hardware Issue          (category_key = 'hardware_issue')

TYPE 2: request    🔵  (employee requesting something new or access)
  Sub-categories:
    - Gate Pass Request       (category_key = 'gate_pass')
    - Credential Request      (category_key = 'credential_request')
    - Port Request            (category_key = 'port_request')
    - New Hardware Requirement(category_key = 'new_hardware')
    - New Software Requirement(category_key = 'new_software')

TYPE 3: data       🟡  (employee requesting data or financial records)
  Sub-categories:
    - Paycheque Balance       (category_key = 'paycheque_balance')
    - Data Backup Request     (category_key = 'data_backup')

IMPORTANT:
  - Data Backup Request belongs under TYPE 3 (data), NOT under request.
  - Paycheque Balance is new and belongs only under TYPE 3 (data).
  - Request type has exactly 5 sub-categories (NOT 6).
  - Data type has exactly 2 sub-categories.

Default status at creation depends on category approval setting:
  - requires_approval = TRUE  -> pending_approval
  - requires_approval = FALSE -> assigned (after auto assignment)
There is NO 'raised' status — approval is built into the MVP.

TICKET FLOW:
  Employee or Manager raises ticket
    → if requires_approval = TRUE:
      if raiser is MANAGER and category.manager_user_id = raiser.id:
        status auto-transitions: pending_approval → approved → assigned
        manager acts with domain privilege in own category
      else:
        status = 'pending_approval'
        system looks up ticket_categories.manager_user_id for this category
        email sent to that category manager
    → if requires_approval = FALSE:
      system auto-transitions pending_approval → approved → assigned
      manager queue is bypassed

  Hardware issue ticket (category_key='hardware_issue'):
    → employee must pick one of their assigned assets
    → asset serial number is stored via asset_id linkage
    → technician sees exact device + device history context

  Manager REJECTS:
    → status = 'rejected'  (terminal — ticket is closed)
    → manager must enter rejection_reason
    → email sent to employee with reason

  Manager APPROVES (first time) — if approval required:
    → system finds least-loaded active employee (round-robin by open ticket count)
    → status = 'assigned'
    → 3 emails: raiser (approved), assigned employee (new assignment), manager (confirmation)

  GATE PASS SPECIAL CASE — if category.requires_approval = FALSE:
    → status auto-transitions: pending_approval → approved → assigned (no manager review)
    → system auto-assigns using round-robin within category
    → only 2 emails: employee (assigned), raiser (notification)
    → manager DOES NOT see this in their queue

  assigned employee marks 'resolved':
    → status = 'resolved'
    → ticket goes back to the creator for final review

  creator reviews the resolved ticket:
    → if it is really resolved: status = 'closed'
    → if it is not resolved: status = 'reported' with a reason
    → reported tickets go to 'pending_approval' again for manager re-approval

  Manager Raising Ticket — Special Handling:
    → managers can raise tickets in ANY category
    → managers can approve/manage ONLY their own category
    → if manager raises ticket in own category:
      auto-approved and auto-assigned
    → if manager raises ticket in different category:
      behaves like normal user and routes to that category's manager for approval
    → outside own category, manager has no special approval privilege

  employee marks 'reported' (escalation while working on the ticket):
    → status = 'pending_approval' again
    → email sent back to the category manager
    → manager sees it in their queue WITH a note that it was escalated

  Manager RE-APPROVES after 'reported':
    → manager picks a SPECIFIC employee from a dropdown (not round-robin)
    → status = 'assigned' to that specific employee
    → 3 emails same as first approval

Ticket ID format:
  UIIC-C-YYYY-000001  (complaint)
  UIIC-R-YYYY-000001  (request)
  UIIC-D-YYYY-000001  (data)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLES:
- employee
- manager
- admin

IMPORTANT:
  - Admin CANNOT approve, reject, or assign any ticket
  - Admin CANNOT change any ticket status
  - Only managers approve/reject/reassign
  - Assigned employees can ONLY set: in_progress, resolved, reported
  - Ticket creator (employee or manager) can ONLY set: closed or reported after the ticket is resolved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TICKET STATUSES (8 statuses — no 'raised')
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pending_approval → approved* → assigned → in_progress → resolved → closed
     ↓ (manager)                              ↓ (assigned employee)
   rejected (terminal)                    reported → pending_approval (loops back)

resolved → reported → pending_approval (loops back when the creator disputes the resolution)

* 'approved' is a brief intermediate status set before 'assigned'.
  The system auto-moves from 'approved' to 'assigned' immediately after
  round-robin assignment. It exists in the DB so the log records it.

TRANSITIONS (who can do what):
  pending_approval → approved    : MANAGER approve action OR SYSTEM auto on create flow (no-approval category or manager-own-category)
  pending_approval → rejected    : MANAGER only (reject action, reason required)
  approved         → assigned    : SYSTEM only  (auto, immediately after approval)
  assigned         → in_progress : assigned owner only (employee or manager)
  in_progress      → resolved    : assigned owner only (employee or manager)
  in_progress      → reported    : assigned owner only (employee or manager escalation)
  resolved         → reported    : ticket creator only (resolution dispute / re-approval)
  reported         → pending_approval : SYSTEM only (auto, back to manager queue)
  resolved         → closed      : ticket creator only
  rejected         → (none)      : terminal
  closed           → (none)      : terminal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend : React 18 + Vite + Tailwind CSS
Backend  : Node.js 18 + Express.js
Database : PostgreSQL   (pg library, NO ORM, plain SQL only)
Auth     : JWT access token (1h) stored in sessionStorage (per-tab isolation)
Password : bcrypt (rounds = 10)
Forced PW Change : First login requires password change via ChangePasswordPage
Files    : Multer — single file, max 5MB, allowed: pdf/doc/docx/png/jpg
Email    : Nodemailer — use Ethereal for local dev (auto test account)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE CODING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. No ORM — raw SQL with $1 $2 parameterised queries only
2. Never hardcode role/status/type strings — always import from constants/
3. Never commit .env files
4. All routes except POST /auth/login need JWT protect middleware
5. Role checks use requireRole() middleware factory
6. generateTicketId() must use 'C' for complaint, 'R' for request, 'D' for data
7. Status transition logic lives ONLY in utils/ticketTransitions.js — never inline in controller
8. All API responses use { success: true/false, ...data } shape — no bare { message } responses
9. Never use role strings directly in SQL — use ROLES constant from server/constants/ROLES.js
10. File naming uses sanitized safe filename — never raw originalname directly
11. Round-robin assignment logic lives ONLY in services/assignmentService.js
12. Admin role can NEVER call approve, reject, assign, or updateStatus endpoints

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
etms-mvp/
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.js
│   │   │   ├── authApi.js
│   │   │   └── ticketApi.js
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── StatusBadge.jsx
│   │   │   │   ├── PriorityBadge.jsx
│   │   │   │   └── TypeBadge.jsx
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── AppLayout.jsx
│   │   │   └── tickets/
│   │   │       ├── TicketTypeSelector.jsx
│   │   │       ├── CategorySelector.jsx
│   │   │       └── TicketCard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ChangePasswordPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── NewTicketPage.jsx
│   │   │   ├── TicketsPage.jsx
│   │   │   ├── TicketDetailPage.jsx
│   │   │   ├── PendingApprovalsPage.jsx    ← NEW (manager approval queue)
│   │   │   └── AdminPage.jsx
│   │   ├── constants/
│   │   │   ├── ROLES.js
│   │   │   ├── TICKET_STATUS.js
│   │   │   ├── PRIORITY.js
│   │   │   └── TICKET_TYPES.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── server/
│   ├── config/
│   │   ├── db.js
│   │   └── mailer.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── ticketModel.js
│   │   ├── categoryModel.js
│   │   ├── assetModel.js          ← NEW
│   │   └── reportModel.js         ← NEW
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── ticketRoutes.js
│   │   ├── approvalRoutes.js       ← NEW
│   │   ├── categoryRoutes.js
│   │   ├── assetRoutes.js          ← NEW
│   │   ├── userRoutes.js
│   │   └── reportRoutes.js         ← NEW
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── ticketController.js
│   │   ├── approvalController.js   ← NEW (manager approve/reject/reapprove)
│   │   ├── categoryController.js
│   │   ├── assetController.js      ← NEW
│   │   ├── userController.js
│   │   └── reportController.js     ← NEW
│   ├── services/
│   │   ├── emailService.js
│   │   └── assignmentService.js    ← NEW (round-robin employee assignment)
│   ├── utils/
│   │   ├── generateTicketId.js
│   │   ├── jwtUtils.js
│   │   ├── ticketTransitions.js
│   │   └── sanitizeFilename.js
│   ├── constants/
│   │   └── ROLES.js
│   ├── app.js
│   └── server.js
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── uploads/
├── .env.example
└── README.md
```

---

## ══════════════════════════════════════════════════════

## SECTION 1 ❯ DATABASE

## ══════════════════════════════════════════════════════

```
Create two files: database/schema.sql  and  database/seed.sql

━━━ schema.sql ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ✅ ENUM TYPE DEFINITIONS (PostgreSQL best practice)
DROP TYPE IF EXISTS priority_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;

CREATE TYPE user_role_enum AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'critical');

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
  id                    SERIAL PRIMARY KEY,
  emp_id                VARCHAR(20)  UNIQUE NOT NULL,
  name                  VARCHAR(100) NOT NULL,
  email                 VARCHAR(150) UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  role                  user_role_enum NOT NULL,
  category_id           INTEGER,
  department            VARCHAR(100),
  is_active             BOOLEAN DEFAULT TRUE,
  password_changed_at   TIMESTAMPTZ,  -- NULL = requires forced password change on first login
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ticket_types  (3 rows: complaint, request, data)
CREATE TABLE ticket_types (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,
  type_key    VARCHAR(20) UNIQUE NOT NULL
  -- type_key values: 'complaint' | 'request' | 'data'
);

-- 3. ticket_categories
CREATE TABLE ticket_categories (
  id                SERIAL PRIMARY KEY,
  ticket_type_id    INTEGER NOT NULL REFERENCES ticket_types(id),
  name              VARCHAR(100) NOT NULL,
  category_key      VARCHAR(50)  UNIQUE NOT NULL,
  default_priority  priority_enum DEFAULT 'medium',
  manager_user_id   INTEGER REFERENCES users(id),
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
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  serial_number  VARCHAR(80) UNIQUE NOT NULL,
  category_id    INTEGER NOT NULL REFERENCES ticket_categories(id),
  -- DB safety: NOT NULL + FK prevents orphan assets and invalid category linkage
  assigned_to    INTEGER NOT NULL REFERENCES users(id),
  status         VARCHAR(30) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','under_repair','retired')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 5. asset_assignments (ownership history)
CREATE TABLE asset_assignments (
  id             SERIAL PRIMARY KEY,
  asset_id        INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_user_id    INTEGER REFERENCES users(id),
  to_user_id      INTEGER NOT NULL REFERENCES users(id),
  transferred_by  INTEGER REFERENCES users(id),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at     TIMESTAMPTZ,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CHECK (returned_at IS NULL OR returned_at >= assigned_at)
);

-- 6. tickets
CREATE TABLE tickets (
  id             SERIAL PRIMARY KEY,
  ticket_no      VARCHAR(25) UNIQUE NOT NULL,
  -- ticket_no format:
  --   UIIC-C-YYYY-XXXXXX  for complaint
  --   UIIC-R-YYYY-XXXXXX  for request
  --   UIIC-D-YYYY-XXXXXX  for data
  title          VARCHAR(200) NOT NULL,
  description    TEXT NOT NULL,
  ticket_type_id INTEGER NOT NULL REFERENCES ticket_types(id),
  category_id    INTEGER NOT NULL REFERENCES ticket_categories(id),
  priority       priority_enum NOT NULL,
  status         VARCHAR(30) NOT NULL DEFAULT 'pending_approval'
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
CREATE INDEX idx_tickets_raised_by    ON tickets(raised_by);
CREATE INDEX idx_tickets_assigned_to  ON tickets(assigned_to);
CREATE INDEX idx_tickets_approval_owner ON tickets(approval_owner_id);
CREATE INDEX idx_tickets_status       ON tickets(status);
CREATE INDEX idx_tickets_type         ON tickets(ticket_type_id);
CREATE INDEX idx_tickets_category     ON tickets(category_id);
CREATE INDEX idx_tickets_asset        ON tickets(asset_id);
CREATE INDEX idx_assets_serial        ON assets(serial_number);
CREATE INDEX idx_assets_category      ON assets(category_id);
CREATE INDEX idx_assets_assigned_to   ON assets(assigned_to);
CREATE INDEX idx_assets_status        ON assets(status);
CREATE INDEX idx_asset_assign_asset   ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assign_active  ON asset_assignments(asset_id, returned_at);
CREATE UNIQUE INDEX uq_asset_assign_one_active
  ON asset_assignments(asset_id)
  WHERE returned_at IS NULL;
CREATE INDEX idx_logs_ticket          ON ticket_logs(ticket_id);
CREATE INDEX idx_categories_manager   ON ticket_categories(manager_user_id);

━━━ seed.sql ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Hash for Password@123: $2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi
-- Admin gets password_changed_at = NOW() (pre-exempt from forced change)
-- All others get password_changed_at = NULL (must change on first login)
-- Every employee and manager should have category_id populated.
-- Because categories are inserted after users in this seed order,
-- category_id is populated in UPDATE statements after category inserts.

-- ── Ticket Types ──────────────────────────────────────
INSERT INTO ticket_types (name, type_key) VALUES
  ('Complaint', 'complaint'),
  ('Request',   'request'),
  ('Data',      'data');

-- ── Users ─────────────────────────────────────────────
-- Insert users BEFORE categories so manager_user_id FKs resolve.
-- 1 admin, 5 employees, 10 managers (one per category)
INSERT INTO users (emp_id, name, email, password_hash, role, department, password_changed_at) VALUES
  ('EMP001','Admin User',       'admin@uiic.co.in',        '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','admin',      'IT',         NOW()),
  ('EMP002','employee One',   'tech1@uiic.co.in',        '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee', 'IT',         NULL),
  ('EMP003','employee Two',   'tech2@uiic.co.in',        '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee', 'IT',         NULL),
  ('EMP004','Ravi Kumar',       'ravi@uiic.co.in',         '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee',   'Finance',    NULL),
  ('EMP005','Priya Sharma',     'priya@uiic.co.in',        '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee',   'Operations', NULL),
  ('EMP006','Hardware Tech',    'hw.tech@uiic.co.in',      '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','employee',   'IT',         NULL),
  -- 10 managers — one will be assigned per category below
  ('MGR001','Network Manager',  'mgr.network@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'IT',         NULL),
  ('MGR002','Software Manager', 'mgr.software@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'IT',         NULL),
  ('MGR003','Hardware Manager', 'mgr.hardware@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'IT',         NULL),
  ('MGR004','GatePass Manager', 'mgr.gatepass@uiic.co.in', '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'Security',   NULL),
  ('MGR005','Cred Manager',     'mgr.cred@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'IT',         NULL),
  ('MGR006','Port Manager',     'mgr.port@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'IT',         NULL),
  ('MGR007','Hardware Req Mgr', 'mgr.hwreq@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'IT',         NULL),
  ('MGR008','Software Req Mgr', 'mgr.swreq@uiic.co.in',   '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'IT',         NULL),
  ('MGR009','Payroll Manager',  'mgr.payroll@uiic.co.in',  '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'HR',         NULL),
  ('MGR010','Data Mgr',         'mgr.data@uiic.co.in',     '$2b$10$NW3HlIvAopV24VW.BRDZ9.Vgg1CG1.vlJDk9Mtq.iMoHkmkCLVKZi','manager',    'IT',         NULL);

-- ── Ticket Categories (with manager_user_id + requires_approval) ──
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (1,'Network Issue',   'network_issue',  'high',   (SELECT id FROM users WHERE emp_id='MGR001'), TRUE),
  (1,'Software Issue',  'software_issue', 'low',    (SELECT id FROM users WHERE emp_id='MGR002'), TRUE),
  (1,'Hardware Issue',  'hardware_issue', 'high',   (SELECT id FROM users WHERE emp_id='MGR003'), TRUE);

-- Request (ticket_type_id = 2)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (2,'Gate Pass Request',        'gate_pass',          'low',    (SELECT id FROM users WHERE emp_id='MGR004'), FALSE),
  (2,'Credential Request',       'credential_request', 'medium', (SELECT id FROM users WHERE emp_id='MGR005'), TRUE),
  (2,'Port Request',             'port_request',       'high',   (SELECT id FROM users WHERE emp_id='MGR006'), TRUE),
  (2,'New Hardware Requirement', 'new_hardware',       'low',    (SELECT id FROM users WHERE emp_id='MGR007'), TRUE),
  (2,'New Software Requirement', 'new_software',       'low',    (SELECT id FROM users WHERE emp_id='MGR008'), TRUE);

-- Data (ticket_type_id = 3)
INSERT INTO ticket_categories (ticket_type_id, name, category_key, default_priority, manager_user_id, requires_approval)
VALUES
  (3,'Paycheque Balance',   'paycheque_balance', 'medium', (SELECT id FROM users WHERE emp_id='MGR009'), TRUE),
  (3,'Data Backup Request', 'data_backup',       'medium', (SELECT id FROM users WHERE emp_id='MGR010'), TRUE);

-- ── Populate users.category_id (required for employee and manager) ──
UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR001' AND tc.category_key = 'network_issue';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR002' AND tc.category_key = 'software_issue';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR003' AND tc.category_key = 'hardware_issue';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR004' AND tc.category_key = 'gate_pass';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR005' AND tc.category_key = 'credential_request';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR006' AND tc.category_key = 'port_request';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR007' AND tc.category_key = 'new_hardware';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR008' AND tc.category_key = 'new_software';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR009' AND tc.category_key = 'paycheque_balance';

UPDATE users
SET category_id = tc.id
FROM ticket_categories tc
WHERE users.emp_id = 'MGR010' AND tc.category_key = 'data_backup';

UPDATE users
SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'network_issue')
WHERE emp_id = 'EMP002';

UPDATE users
SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'software_issue')
WHERE emp_id = 'EMP003';

UPDATE users
SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'paycheque_balance')
WHERE emp_id = 'EMP004';

UPDATE users
SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'gate_pass')
WHERE emp_id = 'EMP005';

UPDATE users
SET category_id = (SELECT id FROM ticket_categories WHERE category_key = 'hardware_issue')
WHERE emp_id = 'EMP006';

-- ── Assets assigned to employees (sample) ──
INSERT INTO assets (name, serial_number, category_id, assigned_to, status) VALUES
  ('Dell Laptop', 'DL12345', (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='EMP002'), 'active'),
  ('Monitor',     'MN56789', (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='EMP002'), 'active'),
  ('Keyboard',    'KB99887', (SELECT id FROM ticket_categories WHERE category_key='hardware_issue'), (SELECT id FROM users WHERE emp_id='EMP003'), 'active');

-- Initialize ownership history for current assignments
INSERT INTO asset_assignments (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)
SELECT a.id, NULL, a.assigned_to, NULL, NOW(), 'Seed initial assignment'
FROM assets a;
```

---

## ══════════════════════════════════════════════════════

## SECTION 2 ❯ BACKEND — CONFIG, UTILS & MIDDLEWARE

## ══════════════════════════════════════════════════════

```
━━━ server/constants/ROLES.js  ← NEW (Change 2) ━━━━━━━
// Single source of truth for role strings on the backend.
// Import this everywhere a role string is needed — never write 'admin' raw.
const ROLES = {
  EMPLOYEE:   'employee',
  MANAGER:    'manager',
  ADMIN:      'admin',
}
module.exports = ROLES

━━━ server/utils/ticketTransitions.js ━━━━━━━━━━━━━━━━━
// Single source of truth for ALL status transition rules.
// Controllers import this — never define transition logic elsewhere.

const ROLES = require('../constants/ROLES')

// Who can trigger each transition:
//   pending_approval → approved    : MANAGER (approvalController.approveTicket) OR SYSTEM (ticketController.createTicket for no-approval or manager-own-category)
//   pending_approval → rejected    : MANAGER only (via approvalController.rejectTicket)
//   approved         → assigned    : SYSTEM auto  (triggered inside approvalController after round-robin)
//   assigned         → in_progress : assigned owner only (employee or manager)
//   in_progress      → resolved    : assigned owner only (employee or manager)
//   in_progress      → reported    : assigned owner only (employee or manager escalation)
//   resolved         → reported    : ticket creator only (resolution dispute)
//   reported         → pending_approval : SYSTEM auto (triggered inside ticketController.report)
//   resolved         → closed      : ticket creator only
//   rejected         → (none)      : terminal
//   closed           → (none)      : terminal

const ALLOWED_TRANSITIONS = {
  pending_approval: ['approved', 'rejected'],
  approved:         ['assigned'],          // system only
  assigned:         ['in_progress'],
  in_progress:      ['resolved', 'reported'],
  reported:         ['pending_approval'],  // system only — back to manager queue
  resolved:         ['closed', 'reported'],
  rejected:         [],
  closed:           [],
}

function validateTransition(fromStatus, toStatus, actorRole) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus]
  if (!allowed) {
    return { valid: false, reason: `Unknown status: '${fromStatus}'` }
  }
  if (!allowed.includes(toStatus)) {
    return {
      valid: false,
      reason: `Cannot move from '${fromStatus}' to '${toStatus}'. ` +
              `Allowed: [${allowed.join(', ') || 'none'}]`
    }
  }

  // MANAGER transitions are ownership-driven in controllers.
  // Do not hard-block manager assignee/creator transitions by role here.
  // Note: resolved -> closed/reported ownership is checked in controller before
  // validateTransition is called, so utility-level role checks there are intentionally redundant.

  // EMPLOYEE: can only act on their assigned tickets
  if (actorRole === ROLES.EMPLOYEE) {
    if (!['assigned', 'in_progress', 'resolved'].includes(fromStatus)) {
      return { valid: false, reason: 'Employees can only act on assigned, in_progress, or resolved tickets.' }
    }
    if (fromStatus === 'resolved' && !['closed', 'reported'].includes(toStatus)) {
      return { valid: false, reason: 'Resolved tickets can only be closed or reported by the raiser.' }
    }
    if (['assigned', 'in_progress'].includes(fromStatus) && !['in_progress', 'resolved', 'reported'].includes(toStatus)) {
      return { valid: false, reason: 'Employees can only set: in_progress, resolved, reported.' }
    }
  }

  // ADMIN: cannot change any ticket status
  if (actorRole === ROLES.ADMIN) {
    return { valid: false, reason: 'Admin cannot change ticket status.' }
  }

  return { valid: true }
}

function getAllowedNextStatuses(fromStatus, actorRole) {
  const all = ALLOWED_TRANSITIONS[fromStatus] || []
  // Design note:
  // This helper is intentionally context-free (status + role only).
  // Ownership checks (assigned_to / raised_by) are enforced by controller-level post-filters.
  // Do not treat this utility as a standalone authorization decision.
  // Hide system-only transitions from user action lists.
  if (['approved', 'reported', 'closed', 'rejected'].includes(fromStatus)) {
    return []
  }
  if (actorRole === ROLES.MANAGER) {
    if (fromStatus === 'pending_approval') {
      return all.filter(s => ['approved','rejected'].includes(s))
    }
    if (fromStatus === 'resolved') {
      return all.filter(s => ['closed', 'reported'].includes(s))
    }
    return all.filter(s => ['in_progress','resolved','reported'].includes(s))
  }
  if (actorRole === ROLES.EMPLOYEE) {
    if (fromStatus === 'resolved') {
      return all.filter(s => ['closed', 'reported'].includes(s))
    }
    return all.filter(s => ['in_progress','resolved','reported'].includes(s))
  }
  return all
}

module.exports = { validateTransition, getAllowedNextStatuses }

━━━ server/utils/sanitizeFilename.js  ← NEW (Change 3) ━━━
// Produces a safe, predictable filename for uploaded files.
// Prevents path traversal, spaces, unicode, and collision issues.

const path = require('path')

/**
 * Build a secure storage filename.
 * @param {number|string} ticketId   — ticket DB id (added after ticket creation)
 * @param {string}        originalName — file.originalname from Multer
 * @returns {string}  e.g. "42-1712345678901-invoice.pdf"
 *
 * Steps:
 *  1. Extract extension from original name (lowercase, max 6 chars including leading dot)
 *  2. Strip the extension from the base name
 *  3. Replace any character that is NOT a-z, 0-9, hyphen, or dot with '-'
 *  4. Trim leading/trailing hyphens, collapse multiple hyphens
 *  5. Truncate base to 40 chars to keep paths short
 *  6. Reassemble: {ticketId}-{Date.now()}-{safeName}.{ext}
 */
function buildSafeFilename(ticketId, originalName) {
  const ext  = path.extname(originalName).toLowerCase().slice(0, 6) // e.g. ".pdf"
  const base = path.basename(originalName, ext)                      // strip ext

  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '-')   // replace unsafe chars
    .replace(/-{2,}/g, '-')          // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
    .slice(0, 40)                    // max 40 chars

  return `${ticketId}-${Date.now()}-${safeBase || 'file'}${ext}`
  // Examples:
  //   42-1712345678901-invoice.pdf
  //   42-1712345678902-screenshot.png
  //   42-1712345678903-file.docx   (when base was empty or all unsafe chars)
}

module.exports = { buildSafeFilename }

━━━ server/services/assignmentService.js  ← NEW ━━━━━━━
// Round-robin employee assignment within a category.
// Finds the active employee with the FEWEST currently open tickets.
// "Open" = any status that is not resolved, closed, or rejected.
// Used by approvalController on first approval.
// NOT used on re-approval after reported — manager picks manually.

const pool = require('../config/db')
const ROLES = require('../constants/ROLES')

async function getNextEmployeeInCategory(categoryId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email,
            COUNT(t.id) AS open_count
     FROM users u
     LEFT JOIN tickets t
       ON t.assigned_to = u.id
       AND t.status NOT IN ('resolved','closed','rejected')
     WHERE u.category_id = $1
       AND u.role = $2
       AND u.is_active = true
     GROUP BY u.id
     ORDER BY COUNT(t.id) ASC, u.created_at ASC
     LIMIT 1`,
    [categoryId, ROLES.EMPLOYEE]
  )
  if (!rows.length) {
    throw new Error('No active employees available for assignment in this category.')
  }
  return rows[0]  // { id, name, email, open_count }
}

module.exports = { getNextEmployeeInCategory }

━━━ server/config/db.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Import Pool from 'pg'.
Create pool from env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
Export pool.
Export async testConnection() → pool.query('SELECT NOW()')
  → logs "✅ PostgreSQL connected" on success or the error on fail.

━━━ server/config/mailer.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━
Import nodemailer.
If SMTP_HOST env var is set → create real SMTP transporter.
Else → create Ethereal test account (nodemailer.createTestAccount) and
  log "📬 Ethereal test account created: {user}" on startup.
Export transporter.
Export async sendMail(to, subject, html):
  calls transporter.sendMail({ from: MAIL_FROM || 'ETMS <noreply@uiic.co.in>', to, subject, html })
  logs "📧 Email sent to {to} — {subject}"
  if Ethereal: logs nodemailer.getTestMessageUrl(info) so dev can preview

━━━ server/utils/jwtUtils.js ━━━━━━━━━━━━━━━━━━━━━━━━━━
Import jsonwebtoken.
Export:
  generateToken(user):
    jwt.sign({ id: user.id, role: user.role, emp_id: user.emp_id },
              process.env.JWT_SECRET, { expiresIn: '1h' })
  verifyToken(token):
    jwt.verify(token, process.env.JWT_SECRET)  — returns payload or throws

━━━ server/utils/generateTicketId.js ━━━━━━━━━━━━━━━━━━
Import pool from ../config/db.
Export default async function generateTicketId(typeKey):

  // Concurrency contract:
  // This function returns a candidate ID from a live DB snapshot.
  // Under concurrent inserts, candidates can collide.
  // Caller MUST handle 23505 (ticket_no unique violation) with retry.

  Determine prefix from typeKey:
    'complaint' → 'C'
    'request'   → 'R'
    'data'      → 'D'
    anything else → throw new Error(`Unknown ticket type: ${typeKey}`)

  year    = new Date().getFullYear()
  pattern = `UIIC-${prefix}-${year}-%`

  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_no, '-', 4) AS INTEGER)), 0) AS last_seq
     FROM tickets
     WHERE ticket_no LIKE $1`,
    [pattern]
  )
  lastSeq = parseInt(rows[0].last_seq, 10)
  return `UIIC-${prefix}-${year}-${String(lastSeq + 1).padStart(6, '0')}`

  Examples:
    generateTicketId('complaint') → 'UIIC-C-YYYY-000003'
    generateTicketId('request')   → 'UIIC-R-YYYY-000001'
    generateTicketId('data')      → 'UIIC-D-YYYY-000002'

  Caller retry contract (MANDATORY):
    - Generate candidate ticket_no
    - Attempt insert
    - If err.code === '23505' on ticket_no unique key: regenerate and retry (max 3)
    - If still colliding after max retries: return 409 duplicate conflict

  Numbering note:
    - Sequence is year-scoped by pattern UIIC-{prefix}-{year}-%
    - Seed has no tickets, so first ticket in a year/type starts at 000001
    - IDs are monotonic but not guaranteed gapless (retries/rollbacks can create gaps)

━━━ server/middleware/authMiddleware.js ━━━━━━━━━━━━━━━
Export protect middleware:
  1. Read Authorization header → extract Bearer token
  2. No token → 401 { success: false, message: 'No token. Please log in.' }
  3. verifyToken(token) → 401 { success: false, message: 'Invalid or expired token.' } on error
  4. Query: SELECT id,emp_id,name,email,role,is_active FROM users WHERE id=$1
  5. Not found or is_active=false → 401 { success: false, message: 'Account not found or deactivated.' }
  6. req.user = user row → call next()

━━━ server/middleware/roleMiddleware.js ━━━━━━━━━━━━━━━
Export requireRole(...roles):
  Returns middleware (req, res, next):
    req.user.role in roles → next()
    else → 403 { success: false, message: 'Access denied.' }

━━━ server/middleware/uploadMiddleware.js ━━━━━━━━━━━━━
Import multer and { buildSafeFilename } from ../utils/sanitizeFilename.

diskStorage:
  destination: (req, file, cb) =>
    cb(null, process.env.UPLOAD_DIR || './uploads')

  filename: (req, file, cb) => {
    // ticketId is not yet known at upload time (ticket created first, then file saved).
    // Use 'pending' as a safe placeholder — the controller renames it after ticket creation
    // OR pass ticketId via req.ticketId (set by controller before calling upload middleware).
    // Simple approach for MVP: controller saves ticket first, then calls saveAttachment
    // with the filename already on disk. Use 'tmp' prefix here, rename in controller.
    // ─── SIMPLEST MVP APPROACH ───────────────────────────────────────────────
    // Controller creates ticket → gets ticketId → THEN processes file.
    // So here we build the name with a 'tmp' prefix; controller replaces it:
    const safeName = buildSafeFilename('tmp', file.originalname)
    cb(null, safeName)
    // After ticket is created, controller calls:
    //   const finalName = buildSafeFilename(ticket.id, file.originalname)
    //   fs.rename(tmpPath, finalPath)   ← see ticketController POST /api/tickets
    // Cleanup requirement:
    //   If ticket creation, rename, or attachment DB insert fails after tmp file write,
    //   controller must delete the tmp file with fs.unlink in a finally/catch path.
    //   This prevents orphaned files in uploads/.
  }

fileFilter: allow ONLY these mime types:
  application/pdf
  application/msword
  application/vnd.openxmlformats-officedocument.wordprocessingml.document
  image/png
  image/jpeg
  → reject all others:
    cb(new Error('Invalid file type. Allowed: pdf, doc, docx, png, jpg'))

limits: fileSize = 5 * 1024 * 1024   (5 MB hard cap)

Export: upload = multer({ storage, fileFilter, limits })
Use in routes as: upload.single('file')
```

---

## ══════════════════════════════════════════════════════

## SECTION 3 ❯ BACKEND — MODELS

## ══════════════════════════════════════════════════════

```
All models import pool from ../config/db.
All SQL uses $1 $2 placeholders — never string interpolation.

━━━ server/models/userModel.js ━━━━━━━━━━━━━━━━━━━━━━━━
findByEmail(email)
  SELECT * FROM users WHERE email = $1

findByEmpId(emp_id)
  SELECT id, emp_id, name, email, role, category_id, department, is_active
  FROM users
  WHERE emp_id = $1

findById(id)
  SELECT id,emp_id,name,email,role,category_id,department,is_active FROM users WHERE id=$1

findAll()
  SELECT id,emp_id,name,email,role,category_id,department,is_active,created_at
  FROM users ORDER BY created_at DESC

create({ emp_id, name, email, password_hash, role, category_id, department })
  INSERT INTO users (emp_id,name,email,password_hash,role,category_id,department)
  VALUES ($1,$2,$3,$4,$5,$6,$7)
  RETURNING id,emp_id,name,email,role,category_id,department

findByIdWithPassword(id)
  SELECT id, emp_id, name, email, role, category_id, department,
         is_active, password_hash, password_changed_at
  FROM users
  WHERE id = $1

updatePassword(id, password_hash)
  UPDATE users
  SET password_hash = $2,
      password_changed_at = NOW()
  WHERE id = $1
  RETURNING id, emp_id, name, email, role, category_id, department,
            is_active, password_changed_at

findEmployeesByCategory(category_id)
  SELECT id,name,emp_id,email FROM users
  WHERE category_id=$1 AND role=$2 AND is_active=true ORDER BY name
  -- Pass the category id as $1 and ROLES.EMPLOYEE as $2

findManagers()
  SELECT id,name,emp_id,email FROM users
  WHERE role=$1 AND is_active=true ORDER BY name
  -- Pass ROLES.MANAGER as $1

findAnotherActiveManager(exclude_user_id)
  SELECT id,name,emp_id,email FROM users
  WHERE role=$1 AND is_active=true AND id <> $2
  ORDER BY created_at ASC
  LIMIT 1
  -- Pass ROLES.MANAGER as $1 and creator user id as $2

getReferenceCounts(user_id)
  SELECT
    (SELECT COUNT(*) FROM tickets WHERE raised_by = $1 OR assigned_to = $1) AS ticket_references_count,
    (SELECT COUNT(*) FROM tickets WHERE raised_by = $1 OR assigned_to = $1)
    + (SELECT COUNT(*) FROM ticket_logs WHERE performed_by = $1)
    + (SELECT COUNT(*) FROM attachments WHERE uploaded_by = $1) AS references_count

deleteById(id)
  DELETE FROM users WHERE id = $1 RETURNING id, emp_id, name, email

transferOwnershipReferences(from_user_id, to_user_id)
  TRANSACTION (BEGIN/COMMIT, ROLLBACK on any error):
   1) UPDATE tickets
     SET raised_by = $2
     WHERE raised_by = $1
     RETURNING id
   2) UPDATE tickets
     SET assigned_to = $2
     WHERE assigned_to = $1
     RETURNING id
   3) UPDATE ticket_logs
     SET performed_by = $2
     WHERE performed_by = $1
     RETURNING id
   4) UPDATE attachments
     SET uploaded_by = $2
     WHERE uploaded_by = $1
     RETURNING id
  Return counts:
   {
    tickets_raised: <count1>,
    tickets_assigned: <count2>,
    logs: <count3>,
    attachments: <count4>
   }

━━━ server/models/categoryModel.js ━━━━━━━━━━━━━━━━━━━━
findAll()
  SELECT tc.*, tt.name AS type_name, tt.type_key
  FROM ticket_categories tc
  JOIN ticket_types tt ON tc.ticket_type_id = tt.id
  ORDER BY tt.id, tc.id

findById(id)
  SELECT tc.*,
         tt.type_key,
         tt.name AS type_name,
         mgr.id    AS manager_id,
         mgr.name  AS manager_name,
         mgr.email AS manager_email
  FROM ticket_categories tc
  JOIN ticket_types tt ON tc.ticket_type_id = tt.id
  LEFT JOIN users mgr  ON tc.manager_user_id = mgr.id
  WHERE tc.id = $1

findByManagerId(manager_user_id)
  SELECT tc.*, tt.type_key, tt.name AS type_name
  FROM ticket_categories tc
  JOIN ticket_types tt ON tc.ticket_type_id = tt.id
  WHERE tc.manager_user_id = $1
  -- Used to scope pending tickets for a manager's approval queue

━━━ server/models/assetModel.js ━━━━━━━━━━━━━━━━━━━━━━━
findById(id)
  SELECT a.*, u.emp_id AS assigned_emp_id, u.name AS assigned_user_name,
         tc.name AS category_name, tc.category_key
  FROM assets a
  JOIN users u ON a.assigned_to = u.id
  JOIN ticket_categories tc ON a.category_id = tc.id
  WHERE a.id = $1

findBySerial(serial_number)
  SELECT * FROM assets WHERE serial_number = $1

findByAssignedUser(user_id)
  SELECT a.id, a.name, a.serial_number, a.category_id, tc.name AS category_name, a.status
  FROM assets a
  JOIN ticket_categories tc ON a.category_id = tc.id
  WHERE assigned_to = $1
  ORDER BY name ASC

create({ name, serial_number, category_id, assigned_to, status='active' })
  INSERT INTO assets (name, serial_number, category_id, assigned_to, status)
  VALUES ($1,$2,$3,$4,$5)
  RETURNING *

updateStatus(id, status)
  UPDATE assets SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *

transferOwnership({ asset_id, from_user_id, to_user_id, transferred_by, note })
  TRANSACTION:
   1) SELECT * FROM assets WHERE id=$1 FOR UPDATE
   2) UPDATE asset_assignments
     SET returned_at = NOW()
     WHERE asset_id=$1 AND returned_at IS NULL
   3) INSERT INTO asset_assignments
     (asset_id, from_user_id, to_user_id, transferred_by, assigned_at, note)
     VALUES ($1,$2,$3,$4,NOW(),$5)
   4) UPDATE assets
     SET assigned_to=$3, updated_at=NOW()
     WHERE id=$1
   5) RETURN updated asset row

━━━ server/models/ticketModel.js ━━━━━━━━━━━━━━━━━━━━━━
create({ ticket_no, title, description, ticket_type_id,
         category_id, priority, raised_by, approval_owner_id, asset_id })
  INSERT INTO tickets
    (ticket_no,title,description,ticket_type_id,category_id,
     priority,status,raised_by,approval_owner_id,asset_id,created_at,updated_at)
  VALUES ($1,$2,$3,$4,$5,$6,'pending_approval',$7,$8,$9,NOW(),NOW())
  -- Insert baseline as 'pending_approval'.
  -- If category.requires_approval = FALSE, controller immediately auto-transitions
  -- pending_approval -> approved -> assigned, so effective created status is 'assigned'.
  RETURNING *

findById(id)
  SELECT
    t.*,
    tt.name      AS type_name,
    tt.type_key,
    tc.name      AS category_name,
    tc.category_key,
    a.id         AS asset_id,
    a.name       AS asset_name,
    a.serial_number AS asset_serial_number,
    raiser.name  AS raised_by_name,
    raiser.emp_id AS raised_by_emp_id,
    raiser.email  AS raised_by_email,
    tech.name    AS assigned_to_name
  FROM tickets t
  JOIN ticket_types tt       ON t.ticket_type_id = tt.id
  JOIN ticket_categories tc  ON t.category_id    = tc.id
  LEFT JOIN assets a         ON t.asset_id       = a.id
  JOIN users raiser          ON t.raised_by       = raiser.id
  LEFT JOIN users tech       ON t.assigned_to     = tech.id
  WHERE t.id = $1

findAll({ raised_by, assigned_to, status, ticket_type_id,
           category_id, priority, page=1, limit=15 })
  Build dynamic WHERE clause — skip undefined/null values.
  Also support: category_ids (array) — for manager's multi-category queue.
  Join ticket_types and ticket_categories for name fields.
  Join users (raiser + LEFT JOIN employee).
  Admin-all contract:
    - If no scope filters are provided (no raised_by, assigned_to, category_id, category_ids),
      query returns ALL tickets (read-only admin listing) with optional status/type/priority filters.
    - WHERE clause in this case contains only optional filter predicates that were explicitly provided.
    - Never force manager/employee scoping inside model; scoping is decided in controller.
  SQL template (admin-all path, no role scope constraints):
    SELECT t.*, tt.name AS type_name, tt.type_key,
           tc.name AS category_name, tc.category_key,
           raiser.name AS raised_by_name,
           tech.name AS assigned_to_name
    FROM tickets t
    JOIN ticket_types tt      ON t.ticket_type_id = tt.id
    JOIN ticket_categories tc ON t.category_id = tc.id
    JOIN users raiser         ON t.raised_by = raiser.id
    LEFT JOIN users tech      ON t.assigned_to = tech.id
    WHERE ($1::text IS NULL OR t.status = $1)
      AND ($2::int  IS NULL OR t.ticket_type_id = $2)
      AND ($3::text IS NULL OR t.priority = $3)
    ORDER BY t.created_at DESC
    LIMIT $4 OFFSET $5;
  SQL template (scoped path):
    - Build WHERE additions only when scope values are present:
      t.raised_by = $n, t.assigned_to = $n,
      t.category_id = $n OR t.category_id = ANY($n::int[])
    - Keep optional status/type/priority predicates in both paths.
  COUNT query contract:
    - Use same WHERE predicates as data query (without ORDER/LIMIT/OFFSET)
    - Return total for pagination math.
  ORDER BY t.created_at DESC
  LIMIT $n OFFSET $m
  Also run COUNT(*) with same WHERE for pagination.
  Return { rows, total }

findPendingForManager(approval_owner_id)
  SELECT t.*,
         tt.name AS type_name, tt.type_key,
         tc.name AS category_name, tc.category_key,
         raiser.name AS raised_by_name
  FROM tickets t
  JOIN ticket_categories tc ON t.category_id = tc.id
  JOIN ticket_types tt      ON t.ticket_type_id = tt.id
  JOIN users raiser         ON t.raised_by = raiser.id
  WHERE t.approval_owner_id = $1
    AND t.status = 'pending_approval'
  ORDER BY t.created_at ASC
  -- Used for manager's approval queue dashboard

updateStatus(id, status)
  UPDATE tickets SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *

updateStatusWithNote(id, status, field, value)
  -- field is either 'rejection_reason' or 'report_reason'
  -- Builds: UPDATE tickets SET status=$2, {field}=$3, updated_at=NOW() WHERE id=$1
  -- Use parameterised query — field name is validated in controller before calling
  RETURNING *

assign(id, assigned_to)
  UPDATE tickets
  SET assigned_to=$2, status='assigned', updated_at=NOW()
  WHERE id=$1 RETURNING *

logAction({ ticket_id, action, old_status, new_status, performed_by, note })
  INSERT INTO ticket_logs
    (ticket_id,action,old_status,new_status,performed_by,note,created_at)
  VALUES ($1,$2,$3,$4,$5,$6,NOW())
  RETURNING *

saveAttachment({ ticket_id, filename, original_name, file_path,
                 file_size, mime_type, uploaded_by })
  INSERT INTO attachments
    (ticket_id,filename,original_name,file_path,file_size,mime_type,uploaded_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7)
  RETURNING *

getAttachments(ticket_id)
  SELECT * FROM attachments WHERE ticket_id=$1

getLogs(ticket_id)
  SELECT tl.*, u.name AS actor_name
  FROM ticket_logs tl
  LEFT JOIN users u ON tl.performed_by = u.id
  WHERE tl.ticket_id=$1 ORDER BY tl.created_at ASC

━━━ server/models/reportModel.js ━━━━━━━━━━━━━━━━━━━━━━
getTopFailingDevices(limit=10)
  SELECT
    a.id,
    a.name,
    a.serial_number,
    COUNT(t.id) AS total_issues
  FROM assets a
  JOIN tickets t ON t.asset_id = a.id
  GROUP BY a.id, a.name, a.serial_number
  ORDER BY total_issues DESC
  LIMIT $1
```

---

## ══════════════════════════════════════════════════════

## SECTION 4 ❯ BACKEND — EMAIL SERVICE

## ══════════════════════════════════════════════════════

```
Create server/services/emailService.js
Import sendMail from ../config/mailer.
All functions are fire-and-forget — callers use .catch() to suppress errors.
All emails use inline styles only. Navy header (#1B3A6B), white card, #f5f5f5 bg.

Required module contract:
  async function sendPendingApprovalEmail(ticket, managerEmail)
  async function sendTicketApprovedEmail(ticket, employeeEmail)
  async function sendApprovalConfirmationToManager(ticket, managerEmail)
  async function sendTicketRejectedEmail(ticket, employeeEmail)
  async function sendTicketAssignedToEmployeeEmail(ticket, employeeEmail)
  async function sendTicketResolvedEmail(ticket, employeeEmail)
  async function sendEscalationEmail(ticket, managerEmail)

Required exports:
  module.exports = {
    sendPendingApprovalEmail,
    sendTicketApprovedEmail,
    sendApprovalConfirmationToManager,
    sendTicketRejectedEmail,
    sendTicketAssignedToEmployeeEmail,
    sendTicketResolvedEmail,
    sendEscalationEmail,
  }

Required ticket payload fields (minimum):
  ticket.ticket_no, ticket.title, ticket.category_name,
  ticket.type_name or ticket.type_key,
  ticket.priority, ticket.raised_by_name,
  ticket.assigned_to_name, ticket.rejection_reason,
  ticket.report_reason, ticket.updated_at/created_at

Template/build rules:
  - Implement one shared helper: buildEmailLayout({ heading, rows, footer })
  - rows is an array of [label, value] pairs rendered in a simple table
  - All trigger functions must call sendMail(to, subject, html)
  - Fallback text for nullable values: 'N/A'
  - Dates formatted consistently (locale string or ISO, choose one and use everywhere)
  - Never throw custom formatting errors for missing optional fields; degrade gracefully

━━━ TRIGGER 1: sendPendingApprovalEmail(ticket, managerEmail) ━
subject: `[ETMS] Approval Required: ${ticket.ticket_no}`
To: category manager
Table rows: Ticket No | Type | Category | Title | Priority | Raised By | Date
Footer: "Log in to ETMS to approve or reject this ticket."

━━━ TRIGGER 2: sendTicketApprovedEmail(ticket, employeeEmail) ━
subject: `[ETMS] Your Ticket ${ticket.ticket_no} Has Been Approved`
To: employee who raised the ticket
Table rows: Ticket No | Category | Title | Assigned To | Date Approved
Footer: "Your ticket has been assigned to our team and is being worked on."

━━━ TRIGGER 3: sendApprovalConfirmationToManager(ticket, managerEmail) ━
subject: `[ETMS] Approval Confirmed: ${ticket.ticket_no}`
To: approving manager
Table rows: Ticket No | Category | Title | Assigned To | Date Approved
Footer: "The ticket has been approved and assigned successfully."

━━━ TRIGGER 4: sendTicketRejectedEmail(ticket, employeeEmail) ━
subject: `[ETMS] Your Ticket ${ticket.ticket_no} Was Rejected`
To: employee who raised the ticket
Table rows: Ticket No | Category | Title | Rejection Reason | Date
Footer: "Please contact your manager if you have questions."

━━━ TRIGGER 5: sendTicketAssignedToEmployeeEmail(ticket, employeeEmail) ━
subject: `[ETMS] New Ticket Assigned to You: ${ticket.ticket_no}`
To: employee who was assigned
Table rows: Ticket No | Type | Category | Title | Priority | Raised By
Footer: "Log in to ETMS to work on this ticket."

━━━ TRIGGER 6: sendTicketResolvedEmail(ticket, employeeEmail) ━
subject: `[ETMS] Your Ticket ${ticket.ticket_no} Has Been Resolved`
To: employee who raised the ticket
Table rows: Ticket No | Title | Resolved By | Date
Footer: "Please log in to confirm the resolution and close the ticket."

━━━ TRIGGER 7: sendEscalationEmail(ticket, managerEmail) ━━━━━━
subject: `[ETMS] Escalation — Ticket ${ticket.ticket_no} Reported`
To: category manager
Table rows: Ticket No | Category | Title | employee | Report Reason | Date
Footer: "This ticket has been escalated and is back in your approval queue."
```

---

## ══════════════════════════════════════════════════════

## SECTION 5 ❯ BACKEND — CONTROLLERS & ROUTES

## ══════════════════════════════════════════════════════

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTH
Files: server/controllers/authController.js
       server/routes/authRoutes.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/auth/login   (public — no middleware)
  1. Read email + password from req.body
  2. Missing → 400 { success: false, message: 'Email and password are required.' }
  3. userModel.findByEmail(email) → 401 { success: false, message: 'Invalid credentials.' } if not found
  4. !user.is_active → 401 { success: false, message: 'Account is deactivated.' }
  5. bcrypt.compare(password, user.password_hash) → 401 { success: false, message: 'Invalid credentials.' } if false
  6. token = generateToken(user)
  7. Return 200 {
       success: true,
       token,
       user: { id, emp_id, name, email, role, department }
     }

GET /api/auth/me   (protect middleware)
  Return 200 { success: true, user: req.user }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORIES
Files: server/controllers/categoryController.js
       server/routes/categoryRoutes.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/categories   (protect)
  rows = await categoryModel.findAll()

  Group by type_key before returning:
  const grouped = {}
  rows.forEach(row => {
    if (!grouped[row.type_key]) {
      grouped[row.type_key] = {
        type_key:  row.type_key,
        type_name: row.type_name,
        categories: []
      }
    }
    grouped[row.type_key].categories.push({
      id:               row.id,
      name:             row.name,
      category_key:     row.category_key,
      default_priority: row.default_priority
    })
  })

  Return 200 { types: Object.values(grouped) }

  Expected response shape:
  {
    types: [
      {
        type_key: 'complaint', type_name: 'Complaint',
        categories: [
          { id:1, name:'Network Issue',  category_key:'network_issue',  default_priority:'high' },
          { id:2, name:'Software Issue', category_key:'software_issue', default_priority:'low' },
          { id:3, name:'Hardware Issue', category_key:'hardware_issue', default_priority:'high' }
        ]
      },
      {
        type_key: 'request', type_name: 'Request',
        categories: [
          { id:4, name:'Gate Pass Request',         category_key:'gate_pass',          default_priority:'low' },
          { id:5, name:'Credential Request',        category_key:'credential_request', default_priority:'medium' },
          { id:6, name:'Port Request',              category_key:'port_request',       default_priority:'high' },
          { id:7, name:'New Hardware Requirement',  category_key:'new_hardware',       default_priority:'low' },
          { id:8, name:'New Software Requirement',  category_key:'new_software',       default_priority:'medium' }
        ]
      },
      {
        type_key: 'data', type_name: 'Data',
        categories: [
          { id:9,  name:'Paycheque Balance',   category_key:'paycheque_balance', default_priority:'medium' },
          { id:10, name:'Data Backup Request', category_key:'data_backup',       default_priority:'medium' }
        ]
      }
    ]
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSETS
Files: server/controllers/assetController.js
       server/routes/assetRoutes.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/assets/my   (protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER))
  Returns assets assigned to the logged-in user only.
  Response rows include: id, name, serial_number, category_id, category_name, status.

GET /api/assets/:id   (protect)
  1. Load asset by id
  2. Access rules:
     - ADMIN can view any asset
     - MANAGER can view assets where asset.category_id belongs to categories they manage
       (ticket_categories.manager_user_id = req.user.id) or assets assigned_to = req.user.id
     - EMPLOYEE can view only assets assigned_to = req.user.id
  3. Return 200 { success: true, asset }

POST /api/assets   (protect, requireRole(ROLES.ADMIN))
  1. Validate: name, serial_number, category_id, assigned_to
  2. serial_number must be unique
  3. category_id must exist in ticket_categories
  4. status defaults to 'active'
  5. Return 201 { success: true, asset }

PATCH /api/assets/:id/status   (protect, requireRole(ROLES.ADMIN, ROLES.MANAGER))
  1. Validate status IN ('active','under_repair','retired')
  2. If role=MANAGER, allow only when asset.category_id is managed by req.user.id
     OR asset.assigned_to = req.user.id
     → 403 if outside manager scope
  2. Update status
  3. Return 200 { success: true, asset }

POST /api/assets/:id/transfer   (protect, requireRole(ROLES.ADMIN, ROLES.MANAGER))
  1. Validate body: to_user_id required; note optional
  2. Load asset by id
    → 404 if not found
  3. Guard checks:
    - 400 if asset.status = 'under_repair'
    - 400 if to_user_id equals current assigned_to
    - 400 if target user is not an active employee
    - 403 if role=MANAGER and asset is outside manager scope
      (asset.category_id not managed by req.user.id and asset.assigned_to != req.user.id)
  4. Run transferOwnership transaction in assetModel:
    - close current active assignment row (returned_at = NOW())
    - insert new assignment row in asset_assignments
    - update assets.assigned_to = to_user_id
  5. Return 200 { success: true, asset, message: 'Asset transferred successfully' }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TICKETS
Files: server/controllers/ticketController.js
       server/routes/ticketRoutes.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All ticket routes: apply protect middleware.

Asset routes:
  GET /api/assets/my          protect + requireRole(ROLES.EMPLOYEE, ROLES.MANAGER)
  GET /api/assets/:id         protect
  POST /api/assets            protect + requireRole(ROLES.ADMIN)
  PATCH /api/assets/:id/status protect + requireRole(ROLES.ADMIN, ROLES.MANAGER)
  POST /api/assets/:id/transfer protect + requireRole(ROLES.ADMIN, ROLES.MANAGER)

Imports at top of ticketController.js:
  const ROLES                                     = require('../constants/ROLES')
  const { validateTransition,
          getAllowedNextStatuses }                 = require('../utils/ticketTransitions')
  const { buildSafeFilename }                     = require('../utils/sanitizeFilename')
  const emailService                              = require('../services/emailService')
  const fs   = require('fs')
  const path = require('path')

── POST /api/tickets
   Middleware: protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER),
               upload.single('file')
   NOTE: ROLES.ADMIN is excluded — admin cannot raise tickets
  1. Destructure: title, description, ticket_type_id, category_id, priority, asset_id
   2. Missing → 400 { success: false, message: 'All fields are required.' }
   3. category = await categoryModel.findById(category_id)
      → 400 if not found
      → 400 if Number(category.ticket_type_id) !== Number(ticket_type_id)
     3.1 Asset validation rules:
      - if category.category_key === 'hardware_issue':
        → 400 if asset_id missing
        → asset = await assetModel.findById(asset_id)
        → 400 if asset not found
        → 403 if asset.assigned_to !== req.user.id
        → 400 if Number(asset.category_id) !== Number(category_id)
        → 400 if asset.status !== 'active'
      - else:
        → asset_id = null (optional)
   4. Determine approval owner and manager-domain behavior:
      let approvalOwnerId = null
      let approvalManagerEmail = null
      const isManagerInOwnCategory =
        req.user.role === ROLES.MANAGER && Number(category.manager_id) === Number(req.user.id)
      if (category.requires_approval === TRUE) {
        approvalOwnerId = category.manager_id
        approvalManagerEmail = category.manager_email
      }
   5. Create ticket with collision-safe retry loop:
      let newTicket = null
      const MAX_TICKET_ID_RETRIES = 3
      for (let attempt = 1; attempt <= MAX_TICKET_ID_RETRIES; attempt++) {
        const ticket_no = await generateTicketId(category.type_key)
        try {
          newTicket = await ticketModel.create({
            ticket_no, title, description,
            ticket_type_id: Number(ticket_type_id),
            category_id:    Number(category_id),
            priority,
            raised_by: req.user.id,
            approval_owner_id: approvalOwnerId,
            asset_id: asset_id ? Number(asset_id) : null
            -- baseline insert status is 'pending_approval';
            -- controller auto-assigns and final status becomes 'assigned' when:
            -- (a) requires_approval=FALSE OR (b) raiser is manager of this category
          })
          break
        } catch (err) {
          const ticketNoCollision =
            err.code === '23505' && String(err.constraint || '').includes('ticket_no')
          if (ticketNoCollision && attempt < MAX_TICKET_ID_RETRIES) continue
          if (ticketNoCollision) {
            return res.status(409).json({
              success: false,
              message: 'Could not allocate unique ticket number. Please retry.',
              code: 'TICKET_NO_CONFLICT'
            })
          }
          throw err
        }
      }
  7. If req.file — rename tmp → safe name, save attachment.
    Failure handling (MANDATORY):
    - if rename or saveAttachment fails, delete tmp/final file (whichever exists)
    - if ticket creation fails after upload write, delete tmp file
    - never leave orphan upload files on disk
   8. await ticketModel.logAction({
        ticket_id: newTicket.id, action: 'TICKET_CREATED',
        new_status: 'pending_approval', performed_by: req.user.id
      })
  8.1 fullTicket = await ticketModel.findById(newTicket.id)
     raiser = await userModel.findById(newTicket.raised_by)
  9. If category.requires_approval === FALSE OR isManagerInOwnCategory:
        a. Auto-approve:
           await ticketModel.updateStatus(newTicket.id, 'approved')
           await ticketModel.logAction({ action:'APPROVED', old_status:'pending_approval',
                                         new_status:'approved', performed_by:null })
        b. Auto-assign via round-robin:
           employee = await getNextEmployeeInCategory(category_id)
           await ticketModel.assign(newTicket.id, employee.id)
           await ticketModel.logAction({ action:'AUTO_ASSIGNED', old_status:'approved',
                                         new_status:'assigned', performed_by:null,
                                         note:`Auto-assigned to ${employee.name}` })
        c. fullTicket = await ticketModel.findById(newTicket.id)  // refresh latest status/assignee
        d. Fire-and-forget 2 emails:
           emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email).catch(...)
           emailService.sendTicketApprovedEmail(fullTicket, raiser.email).catch(...)
      Else (category.requires_approval === TRUE):
        Fire-and-forget: email approval manager
          emailService
            .sendPendingApprovalEmail(fullTicket, approvalManagerEmail)
            .catch(err => console.error('Email error:', err.message))
   10. Return 201 { success: true, ticket: await ticketModel.findById(newTicket.id) }

── GET /api/tickets
   Middleware: protect
   Query params: type, status, priority, page (default 1), limit (default 15)
   Role-based scoping:
      ROLES.EMPLOYEE   → support raised-by and assigned-to views based on query params
     ROLES.MANAGER    → use ticketModel.findPendingForManager(req.user.id)
                        OR findAll with category_ids from categoryModel.findByManagerId
     ROLES.ADMIN      → no filter (read-only, sees all)
   Controller branch contract (explicit):
   - if req.user.role === ROLES.ADMIN:
     call ticketModel.findAll({ status, ticket_type_id, priority, page, limit })
     // no raised_by/assigned_to/category scope constraints
   - if req.user.role === ROLES.MANAGER:
     resolve managed category_ids via categoryModel.findByManagerId(req.user.id)
     call ticketModel.findAll({ category_ids, status, ticket_type_id, priority, page, limit })
     or ticketModel.findPendingForManager(req.user.id) for approval queue view
   - if req.user.role === ROLES.EMPLOYEE:
     call ticketModel.findAll with employee-scope filters only (raised_by / assigned_to views)
   Return 200 { success: true, tickets, total, page, totalPages }

── GET /api/tickets/:id
   Middleware: protect
   1. ticket = await ticketModel.findById(id)
      → 404 if not found: { success: false, message: 'Ticket not found.' }
   2. Permissions check:
      a. If req.user.role === ROLES.ADMIN → full access (allow)
      b. Else if ticket.raised_by === req.user.id → raiser always sees their ticket (allow)
      c. Else if ticket.assigned_to === req.user.id → assignee always sees ticket (allow)
      d. Else if req.user.role === ROLES.MANAGER → check category manager permission:
           category = await categoryModel.findById(ticket.category_id)
           → 403 if category.manager_id !== req.user.id: { success: false,
             message: 'You do not have permission to view this ticket.' }
           → Allow if manager_id matches
      e. Else → 403 (employee cannot view others' tickets)
   3. Return 200 { success: true, ticket, attachments, logs }

── GET /api/tickets/:id/allowed-statuses
   Middleware: protect
   1. ticket = await ticketModel.findById(id)
      → 404 if not found: { success: false, message: 'Ticket not found.' }
   2. Permissions check (same as GET /api/tickets/:id):
      - ADMIN: allowed
      - ticket.raised_by: allowed
      - ticket.assigned_to: allowed
      - MANAGER (category manager): allowed
      - Else: 403
  3. allowedStatuses = getAllowedNextStatuses(ticket.status, req.user.role)
    -- MUST call utils/ticketTransitions.getAllowedNextStatuses(...)
  4. Apply ownership post-filters (controller-authoritative):
    - If ticket.status IN ['assigned','in_progress'] and req.user.id !== ticket.assigned_to:
      allowedStatuses = []
    - If ticket.status === 'resolved' and req.user.id !== ticket.raised_by:
      allowedStatuses = []
    - If ticket.status IN ['approved','reported','closed','rejected']:
      allowedStatuses = []
  5. Return 200 { success: true, allowedStatuses }

── PUT /api/tickets/:id/status
  Middleware: protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER)
  NOTE: ROLES.ADMIN is excluded
   1. Destructure { status, note } from req.body
   2. ticket = await ticketModel.findById(id)
      → 404 if not found: { success: false, message: 'Ticket not found.' }
   3. Access guard and state validation:
      a. If ticket.status is 'assigned' or 'in_progress':
         → 403 if req.user.id !== ticket.assigned_to: { success: false,
           message: 'You do not have permission to update this ticket.' }
      b. If ticket.status is 'resolved':
         → 403 if req.user.id !== ticket.raised_by: { success: false,
           message: 'Only the ticket creator can close or report a resolved ticket.' }
  4. const { valid, reason } = validateTransition(ticket.status, status, req.user.role)
     Note: for resolved-status updates, ownership guard above is authoritative;
     validateTransition is a second-line transition integrity check.
    → 400 if not valid: { success: false, message: reason }
  5. If status === 'reported':
      a. If ticket.status === 'resolved' and (!note || note.trim().length < 10):
         return 400 { success: false, message: 'report_reason must be at least 10 characters.' }
      b. await ticketModel.updateStatusWithNote(id, 'reported', 'report_reason', note||'')
      c. await ticketModel.logAction({ action:'ESCALATED', old_status:ticket.status,
                           new_status:'reported', performed_by:req.user.id, note })
      d. Auto transition: reported → pending_approval
        await ticketModel.updateStatus(id, 'pending_approval')
        await ticketModel.logAction({ action:'BACK_TO_MANAGER', old_status:'reported',
                            new_status:'pending_approval', performed_by:null })
      e. Fire-and-forget: email category manager
        category = await categoryModel.findById(ticket.category_id)
        fullTicket = await ticketModel.findById(id)
        emailService.sendEscalationEmail(fullTicket, category.manager_email).catch(...)
      Else (other statuses like in_progress, resolved):
        a. await ticketModel.updateStatus(id, status)
        b. await ticketModel.logAction({ action:'STATUS_CHANGED', old_status:ticket.status,
                                        new_status:status, performed_by:req.user.id, note })
        c. If status === 'resolved':
             raiser = await userModel.findById(ticket.raised_by)
             fullTicket = await ticketModel.findById(id)
             emailService.sendTicketResolvedEmail(fullTicket, raiser.email).catch(...)
   6. Return 200 { success: true, ticket: await ticketModel.findById(id) }

── GET /api/tickets/:id/file
   Middleware: protect
   1. ticket = await ticketModel.findById(id)
      → 404 if not found: { success: false, message: 'Ticket not found.' }
   2. Permissions check (same as GET /api/tickets/:id):
      - ADMIN: allowed
      - ticket.raised_by: allowed
      - ticket.assigned_to: allowed
      - MANAGER (category manager): allowed
      - Else: 403
   3. attachments = await ticketModel.getAttachments(id)
      → 404 if empty: { success: false, message: 'No attachments found.' }
   4. Pick the first/requested attachment
   5. res.download(attachment.file_path, attachment.original_name)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APPROVALS  ← NEW
Files: server/controllers/approvalController.js
       server/routes/approvalRoutes.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All approval routes: protect + requireRole(ROLES.MANAGER)

Imports:
  const { getNextEmployeeInCategory } = require('../services/assignmentService')

── GET /api/approvals/pending
   Returns all tickets in 'pending_approval' status where the ticket's
  approval_owner_id = req.user.id
   Uses ticketModel.findPendingForManager(req.user.id)
   Return 200 { success: true, tickets, total }

── POST /api/approvals/:ticketId/approve
   Middleware: protect, requireRole(ROLES.MANAGER)
  1. ticket = await ticketModel.findById(ticketId) → 404 if not found
   2. Verify ticket.status === 'pending_approval' → 400 if not
  3. Verify ticket.approval_owner_id === req.user.id → 403 if not
   4. Move to 'approved':
        await ticketModel.updateStatus(ticketId, 'approved')
        await ticketModel.logAction({ action:'APPROVED', old_status:'pending_approval',
                                      new_status:'approved', performed_by:req.user.id })
   5. Round-robin assign:
     employee = await getNextEmployeeInCategory(ticket.category_id)
     → 503 { success:false, message:'No employees available in this category.' } if null
        await ticketModel.assign(ticketId, employee.id)
        await ticketModel.logAction({ action:'AUTO_ASSIGNED', old_status:'approved',
                                      new_status:'assigned', performed_by:null, note:`Auto-assigned to ${employee.name}` })
  6. fullTicket = await ticketModel.findById(ticketId)
    raiser = await userModel.findById(ticket.raised_by)
      Fire-and-forget 3 emails:
        emailService.sendTicketApprovedEmail(fullTicket, raiser.email).catch(...)
     emailService.sendTicketAssignedToEmployeeEmail(fullTicket, employee.email).catch(...)
     emailService.sendApprovalConfirmationToManager(fullTicket, req.user.email).catch(...)
   7. Return 200 { success: true, ticket: fullTicket }

── POST /api/approvals/:ticketId/reject
   Middleware: protect, requireRole(ROLES.MANAGER)
  1. ticket = await ticketModel.findById(ticketId) → 404 if not found
   2. Verify ticket.status === 'pending_approval' → 400 if not
  3. Verify ticket.approval_owner_id === req.user.id → 403 if not
   4. { rejection_reason } from req.body
      → 400 { success: false, message: 'Rejection reason is required.' } if missing or empty
   5. await ticketModel.updateStatusWithNote(ticketId,'rejected','rejection_reason',rejection_reason)
   6. await ticketModel.logAction({ action:'REJECTED', old_status:'pending_approval',
                                    new_status:'rejected', performed_by:req.user.id,
                                    note:rejection_reason })
  7. fullTicket = await ticketModel.findById(ticketId)
    raiser = await userModel.findById(ticket.raised_by)
      emailService.sendTicketRejectedEmail(fullTicket, raiser.email).catch(...)
  8. Return 200 { success: true, ticket: fullTicket }

⚠️ REASSIGNMENT ON REPORTED TICKETS (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When a ticket is REPORTED (escalated by employee or disputed by raiser):
  → status immediately transitions to pending_approval (auto)
  → report_reason is set
  → ticket appears in manager's /approvals queue

On RE-APPROVAL (POST /api/approvals/:ticketId/reapprove):
  ✅ Manager MUST specify a target employee (assigned_to)
  ✅ Manager CAN reassign to the SAME employee
     (useful if employee needed guidance but is still capable)
  ✅ Manager CAN assign to a DIFFERENT employee in same category
     (useful if first employee still struggling)
  ✅ Employee must be in the same category as the ticket
  ❌ Manager CANNOT reassign to employee in different category
     (ticket is locked to its original category)

  Examples:
    - Ticket in Gate Pass (category_id=4) assigned to Emp001
      - If Emp001 reported it: manager can reassign to Emp001 again (same)
      - Or reassign to Emp002 (different, but only if Emp002 in Gate Pass category)
      - Manager CANNOT reassign to Emp003 if Emp003 only handles Complaints

  Validation in backend:
    Use userModel.findEmployeesByCategory(ticket.category_id)
    and verify assigned_to exists in that returned employee list
    → 400 if not a member of that category employee list

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── POST /api/approvals/:ticketId/reapprove
   Middleware: protect, requireRole(ROLES.MANAGER)
   -- Used when a ticket was escalated (reported) and is back as pending_approval
  1. ticket = await ticketModel.findById(ticketId) → 404 if not found
   2. Verify ticket.status === 'pending_approval' → 400 if not
  3. Verify ticket has report_reason set (confirms it's a re-approval, not first) → 400 if not
  4. Verify ticket.approval_owner_id === req.user.id → 403 if not
   5. { assigned_to } from req.body  ← manager picks a SPECIFIC employee
      → 400 if missing
      employee = userModel.findById(assigned_to)
      → 400 if not found or employee.role !== ROLES.EMPLOYEE
      categoryEmployees = await userModel.findEmployeesByCategory(ticket.category_id)
      isEligible = categoryEmployees.some(e => Number(e.id) === Number(assigned_to))
      → 400 if !isEligible: { success:false, message:'Employee is not assigned to this category' }
      (Do not rely only on direct employee.category_id comparison in this flow)
   6. Move to approved then assigned with the chosen employee:
        await ticketModel.updateStatus(ticketId, 'approved')
        await ticketModel.logAction({ action:'RE_APPROVED', ... })
        await ticketModel.assign(ticketId, assigned_to)
        await ticketModel.logAction({ action:'MANUALLY_ASSIGNED', new_status:'assigned',
                                      note:`Re-assigned to ${employee.name} by manager` })
   7. Fire-and-forget 3 emails (same as first approval)
   8. Return 200 { success: true, ticket: fullTicket }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USERS
Files: server/controllers/userController.js
       server/routes/userRoutes.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin management routes use protect + requireRole(ROLES.ADMIN).
Password change uses protect only.
Import ROLES from '../constants/ROLES' at top of both files.

GET /api/users
  users = await userModel.findAll()
  For each user, compute ownership counters:
    ticket_references_count = raisedTickets + assignedTickets
    references_count = raisedTickets + assignedTickets + ticketLogs + attachments
  Return 200 { success: true, users }

GET /api/categories/:categoryId/employees
  employees = await userModel.findEmployeesByCategory(categoryId)
  Return 200 { success: true, employees }

POST /api/users
  1. { emp_id, name, email, password, role, category_id, department } from req.body
    2. Validate required fields: emp_id, name, email, password, role
      department is optional
      role must be one of Object.values(ROLES)  ← use ROLES constant (Change 2)
      category_id is required when role is employee or manager
     → 400 { success: false, message: 'Invalid role.' } if not
    3. existingEmp = await userModel.findByEmpId(emp_id)
      → 409 { success: false, message: 'Employee ID already in use.' } if found
    4. existingEmail = await userModel.findByEmail(email)
      → 409 { success: false, message: 'Email already in use.' } if found
    5. password_hash = await bcrypt.hash(password, 10)
    6. user = await userModel.create({ emp_id,name,email,password_hash,role,category_id,department })
    7. Return 201 { success: true, user }
    8. Fallback duplicate handling (race-safe):
      if DB returns 23505 on users_emp_id_key/users_email_key,
      map to 409 with user-friendly message (no raw SQL error text)

  DELETE /api/users/:id
    Middleware: protect, requireRole(ROLES.ADMIN)
    1. userId = Number(req.params.id)
      → 400 if invalid id
    2. target = await userModel.findById(userId)
      → 404 if not found
    3. Block self-delete:
      → 400 if userId === req.user.id: { success:false, message:'You cannot delete your own account.' }
    4. refs = await userModel.getReferenceCounts(userId)
      If refs.references_count > 0:
       → 409 { success:false,
            message:'User has ownership references. Transfer ownership before deletion.',
            code:'USER_HAS_REFERENCES',
            details: refs }
    5. deleted = await userModel.deleteById(userId)
    6. Return 200 { success:true, message:'User deleted permanently.', user: deleted }

POST /api/users/transfer-ownership
  Middleware: protect, requireRole(ROLES.ADMIN)
  1. { from_user_id, to_user_id } from req.body
  2. Validate required and integer ids
     → 400 if invalid payload
  3. fromUser = await userModel.findById(from_user_id)
     toUser   = await userModel.findById(to_user_id)
     → 404 if either not found
     → 400 if from_user_id === to_user_id:
       { success:false, message:'from and to users must be different' }
  4. reassigned = await userModel.transferOwnershipReferences(from_user_id, to_user_id)
     -- MUST be atomic transaction across tickets, ticket_logs, attachments
     -- If any update fails, rollback entire operation
  5. Return 200 {
       success: true,
       reassigned: {
         tickets_raised: reassigned.tickets_raised,
         tickets_assigned: reassigned.tickets_assigned,
         logs: reassigned.logs,
         attachments: reassigned.attachments
       }
     }

PATCH /api/users/change-password
  Middleware: protect
  1. Read { currentPassword, newPassword, confirmPassword } from req.body
  2. Validate required fields
    → 400 if any missing: { success:false, message:'All password fields are required.' }
  3. Validate new password rules:
    - min 8 chars
    - includes upper, lower, number, special char
    - confirmPassword must match newPassword
    - newPassword must differ from currentPassword
    → 400 on rule violation with clear message
  4. user = await userModel.findByIdWithPassword(req.user.id)
    → 404 if not found
    → 401 if user.is_active = false
  5. match = await bcrypt.compare(currentPassword, user.password_hash)
    → 401 if false: { success:false, message:'Current password is incorrect.' }
  6. hashed = await bcrypt.hash(newPassword, 10)
  7. updatedUser = await userModel.updatePassword(req.user.id, hashed)
    -- MUST set password_changed_at = NOW() here to satisfy forced-password-change flow
  8. Return 200 {
     success: true,
     message: 'Password changed successfully.',
     user: updatedUser
    }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPORTS
Files: server/controllers/reportController.js
       server/routes/reportRoutes.js
       server/models/reportModel.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/reports/top-failing-devices
  Middleware: protect, requireRole(ROLES.ADMIN, ROLES.MANAGER)
  1. limit = Number(req.query.limit || 10)
  2. Validate range: 1..50
     → 400 { success: false, message: 'limit must be between 1 and 50.' }
  3. devices = await reportModel.getTopFailingDevices(limit)
  4. Return 200 { success: true, devices }
```

---

## ══════════════════════════════════════════════════════

## SECTION 6 ❯ BACKEND — APP WIRING

## ══════════════════════════════════════════════════════

```
━━━ server/app.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const morgan  = require('morgan')
const path    = require('path')

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Routes
app.use('/api/auth',       require('./routes/authRoutes'))
app.use('/api/categories', require('./routes/categoryRoutes'))
app.use('/api/assets',     require('./routes/assetRoutes'))
app.use('/api/tickets',    require('./routes/ticketRoutes'))
app.use('/api/approvals',  require('./routes/approvalRoutes'))
app.use('/api/users',      require('./routes/userRoutes'))
app.use('/api/reports',    require('./routes/reportRoutes'))

// Serve uploads folder in dev
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' }))

// Global error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large (max 5MB).' })
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(415).json({ success: false, message: err.message })
  }

  console.error(err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.status && err.status < 500
      ? (err.message || 'Request failed')
      : 'Internal server error'
  })
})

module.exports = app

━━━ server/server.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
require('dotenv').config()
const app = require('./app')
const { testConnection } = require('./config/db')

const PORT = process.env.PORT || 5000

testConnection().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running → http://localhost:${PORT}`)
  )
})

━━━ .env.example ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORT=5000
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ETMS
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

━━━ server/package.json ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
dependencies:
  express, cors, helmet, morgan, pg,
  bcrypt, jsonwebtoken, nodemailer, multer, dotenv
devDependencies:
  nodemon
scripts:
  "dev":   "nodemon server.js"
  "start": "node server.js"
```

---

## ══════════════════════════════════════════════════════

## SECTION 7 ❯ FRONTEND — CONSTANTS & API

## ══════════════════════════════════════════════════════

```
━━━ client/src/constants/ROLES.js ━━━━━━━━━━━━━━━━━━━━
export const ROLES = {
  EMPLOYEE:   'employee',
  MANAGER:    'manager',   // ← NEW
  ADMIN:      'admin',
}

━━━ client/src/constants/TICKET_STATUS.js ━━━━━━━━━━━━
// NOTE: There is NO 'raised' status. All tickets begin as 'pending_approval'.
export const TICKET_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED:         'approved',
  ASSIGNED:         'assigned',
  IN_PROGRESS:      'in_progress',
  REPORTED:         'reported',
  RESOLVED:         'resolved',
  CLOSED:           'closed',
  REJECTED:         'rejected',
}

export const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved:         'Approved',
  assigned:         'Assigned',
  in_progress:      'In Progress',
  reported:         'Reported',
  resolved:         'Resolved',
  closed:           'Closed',
  rejected:         'Rejected',
}

export const STATUS_COLORS = {
  pending_approval: 'bg-orange-100 text-orange-700',
  approved:         'bg-teal-100 text-teal-700',
  assigned:         'bg-indigo-100 text-indigo-700',
  in_progress:      'bg-yellow-100 text-yellow-700',
  reported:         'bg-rose-100 text-rose-700',
  resolved:         'bg-green-100 text-green-700',
  closed:           'bg-gray-100 text-gray-500',
  rejected:         'bg-red-100 text-red-700',
}

━━━ client/src/constants/PRIORITY.js ━━━━━━━━━━━━━━━━━
export const PRIORITY_COLORS = {
  low:      'bg-green-100 text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}
export const PRIORITY_ICONS = {
  low:'🟢', medium:'🟡', high:'🟠', critical:'🔴',
}

━━━ client/src/constants/TICKET_TYPES.js ━━━━━━━━━━━━━
// THREE ticket types — complaint, request, data
export const TICKET_TYPE_COLORS = {
  complaint: {
    border: 'border-l-red-500',
    badge:  'bg-red-100 text-red-700',
    ring:   'ring-red-300',
    icon:   '🔴',
    label:  'Complaint',
  },
  request: {
    border: 'border-l-blue-500',
    badge:  'bg-blue-100 text-blue-700',
    ring:   'ring-blue-300',
    icon:   '🔵',
    label:  'Request',
  },
  data: {
    border: 'border-l-yellow-500',
    badge:  'bg-yellow-100 text-yellow-700',
    ring:   'ring-yellow-300',
    icon:   '🟡',
    label:  'Data',
  },
}

// Icon map for every category_key across all 3 types
export const CATEGORY_ICONS = {
  network_issue:       '🌐',
  software_issue:      '💻',
  hardware_issue:      '🖥️',
  gate_pass:           '🪪',
  credential_request:  '🔑',
  port_request:        '🔌',
  new_hardware:        '🖨️',
  new_software:        '📦',
  paycheque_balance:   '💰',
  data_backup:         '💾',
}

━━━ client/src/api/axiosInstance.js ━━━━━━━━━━━━━━━━━━
Axios instance:
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
Request interceptor:
  token = sessionStorage.getItem('token')  ← per-tab isolation
  if token: config.headers.Authorization = `Bearer ${token}`
Response interceptor:
  if error.response?.status === 401:
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('requiresPasswordChange')
    window.location.href = '/login'
Export as default.

━━━ client/src/api/authApi.js ━━━━━━━━━━━━━━━━━━━━━━━━
import api from './axiosInstance'
export const login = (email, password) =>
  api.post('/auth/login', { email, password })
export const getMe = () => api.get('/auth/me')
export const changePassword = (currentPassword, newPassword, confirmPassword) =>
  api.patch('/users/change-password', { currentPassword, newPassword, confirmPassword })

━━━ client/src/api/ticketApi.js ━━━━━━━━━━━━━━━━━━━━━━
import api from './axiosInstance'
export const getCategories     = ()         => api.get('/categories')
export const getTickets        = (params)   => api.get('/tickets', { params })
export const getTicketById     = (id)       => api.get(`/tickets/${id}`)
export const getAllowedStatuses = (id)      => api.get(`/tickets/${id}/allowed-statuses`)
export const createTicket      = (data)    =>
  api.post('/tickets', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateStatus      = (id, status, note) =>
  api.put(`/tickets/${id}/status`, { status, note })
export const getAllUsers        = ()        => api.get('/users')
export const createUser        = (data)    => api.post('/users', data)
export const getEmployeesByCategory = (categoryId) => api.get(`/categories/${categoryId}/employees`)
export const getMyAssets       = ()         => api.get('/assets/my')
export const transferAsset     = (assetId, payload) =>
  api.post(`/assets/${assetId}/transfer`, payload)

// Approval API — manager only
export const getPendingApprovals = ()               => api.get('/approvals/pending')
export const approveTicket       = (ticketId)       => api.post(`/approvals/${ticketId}/approve`)
export const rejectTicket        = (ticketId, rejection_reason) =>
  api.post(`/approvals/${ticketId}/reject`, { rejection_reason })
export const reapproveTicket     = (ticketId, assigned_to) =>
  api.post(`/approvals/${ticketId}/reapprove`, { assigned_to })

// NOTE: assignTicket (admin direct assign) is REMOVED — assignment is only
// done automatically on approval or manually by manager on re-approval.
```

---

## ══════════════════════════════════════════════════════

## SECTION 8 ❯ FRONTEND — AUTH CONTEXT & LAYOUT

## ══════════════════════════════════════════════════════

```
━━━ client/src/context/AuthContext.jsx ━━━━━━━━━━━━━━━
Create AuthContext with React Context + useState.
AuthProvider:
  On mount: read token + user string from sessionStorage (per-tab isolation)
  If both exist: parse user, set { token, user, isAuthenticated: true }
  Else: { token: null, user: null, isAuthenticated: false }

Expose via context:
  user, token, isAuthenticated, isLoading
  login(token, user, requiresPasswordChange):
    sessionStorage.setItem('token', token)
    sessionStorage.setItem('user', JSON.stringify(user))
    sessionStorage.setItem('requiresPasswordChange', requiresPasswordChange ? 'true' : 'false')
    update state
  logout():
    sessionStorage.clear()
    update state to empty
    navigate('/login')

Export useAuth() = useContext(AuthContext)
Export AuthProvider

━━━ client/src/components/layout/AppLayout.jsx ━━━━━━━
Props: children
Tailwind: flex h-screen overflow-hidden bg-gray-50
Left:  <Sidebar />  fixed w-60 h-full bg-white shadow-md
Right: flex-1 overflow-y-auto p-6

━━━ client/src/components/layout/Sidebar.jsx ━━━━━━━━━
Import useAuth, useNavigate, NavLink, ROLES.
Sections:
  TOP:
    "ETMS"  — bold large navy text
    "United India Insurance" — small grey

  NAV LINKS (NavLink with active highlight):
    /dashboard     "🏠 Dashboard"            — all roles
    /tickets       "🎫 My Tickets"           — employee
             "🗂 Managed Tickets"      — manager
             "📋 All Tickets"          — admin (read-only)
    /tickets/new   "➕ Raise Ticket"         — employee and manager
                          (NOT shown to admin)
    /approvals     "✅ Pending Approvals"    — ROLES.MANAGER only
    /assets        "🖥️ My Assets"           — ROLES.EMPLOYEE only
    /assets        "🖥️ Manage Assets"       — ROLES.MANAGER only
    /admin         "⚙️  Admin Panel"         — ROLES.ADMIN only
                   (Assets management for admin is inside Admin Panel → Assets tab)

  BOTTOM:
    User name bold, role badge pill
    "Logout" button → calls logout()

Never hardcode any role string — always use ROLES.X constants.

━━━ client/src/App.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
React Router v6.
Wrap entire app in <AuthProvider>.
Routes:
  /login           → <LoginPage>               public
  /change-password → <ChangePasswordPage>      authenticated only (before pw change)
  /                → <Navigate to="/dashboard" />
  /dashboard       → protected → <DashboardPage>
  /tickets         → protected → <TicketsPage>
  /tickets/new     → protected, roleRequired=[ROLES.EMPLOYEE, ROLES.MANAGER] → <NewTicketPage>
  /tickets/:id     → protected → <TicketDetailPage>
  /approvals       → protected, ROLES.MANAGER only → <PendingApprovalsPage>
  /assets          → protected, roleRequired=[ROLES.EMPLOYEE, ROLES.MANAGER] → <AssetsPage>
  /admin           → protected, ROLES.ADMIN only → <AdminPage>

ProtectedRoute component:
  if isLoading → spinner
  if !isAuthenticated → <Navigate to="/login" replace />
  if requiresPasswordChange && path !== '/change-password' → <Navigate to="/change-password" />
  if roleRequired:
    allowedRoles = Array.isArray(roleRequired) ? roleRequired : [roleRequired]
    if !allowedRoles.includes(user.role) → <Navigate to="/dashboard" replace />
  else → render children inside <AppLayout>
```

---

## ══════════════════════════════════════════════════════

## SECTION 9 ❯ FRONTEND — SHARED COMPONENTS

## ══════════════════════════════════════════════════════

```
━━━ StatusBadge.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Props: status
Import STATUS_LABELS, STATUS_COLORS from constants.
<span className={`px-2 py-0.5 rounded-full text-xs font-semibold
  ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
  {STATUS_LABELS[status] || status}
</span>

━━━ PriorityBadge.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Props: priority
Import PRIORITY_COLORS, PRIORITY_ICONS.
<span className={`px-2 py-0.5 rounded-full text-xs font-semibold
  ${PRIORITY_COLORS[priority]}`}>
  {PRIORITY_ICONS[priority]} {priority.charAt(0).toUpperCase() + priority.slice(1)}
</span>

━━━ TypeBadge.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Props: typeKey ('complaint' | 'request' | 'data')
Import TICKET_TYPE_COLORS.
const t = TICKET_TYPE_COLORS[typeKey] || TICKET_TYPE_COLORS.complaint
<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.badge}`}>
  {t.icon} {t.label}
</span>

━━━ TicketCard.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Props: ticket { id, ticket_no, title, type_key, category_name,
                priority, status, raised_by_name, created_at }
Import TICKET_TYPE_COLORS, useNavigate, formatDistanceToNow from date-fns.

Render white rounded card:
  border-l-4 — use TICKET_TYPE_COLORS[type_key].border
    complaint → red left border
    request   → blue left border
    data      → yellow left border

  Row 1: <TypeBadge typeKey={type_key} />
         <StatusBadge status={status} />
         <PriorityBadge priority={priority} />  (right-aligned)

  ticket_no  — text-xs text-gray-400 font-mono
  title      — font-semibold text-gray-800 line-clamp-2
  category_name — text-xs text-gray-500

  Bottom row:
    "Raised by {raised_by_name}"  text-xs text-gray-400
    "{formatDistanceToNow(created_at)} ago"  text-xs text-gray-400 right-aligned

hover: shadow-md cursor-pointer
onClick: navigate(`/tickets/${id}`)

━━━ TicketTypeSelector.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━
Props: selectedType, onSelect
Import TICKET_TYPE_COLORS.

Render THREE clickable cards in a row (or grid on mobile):

  Card: Complaint 🔴
    On selected: border-2 border-red-500 ring-2 ring-red-200 bg-red-50
    Unselected:  border-2 border-gray-200 bg-white hover:border-red-300
    Content:
      Top-right ✓ checkmark (visible only when selected)
      Icon 🔴  Title "Complaint"  (font-semibold)
      Subtitle: "Report a problem that needs fixing"
      Examples: "Network down · Software crash · Hardware fault"

  Card: Request 🔵
    Selected: border-blue-500 ring-blue-200 bg-blue-50
    Content:
      Icon 🔵  Title "Request"
      Subtitle: "Request something new or get access"
      Examples: "Gate pass · New hardware · Port access · Credentials"

  Card: Data 🟡  ← NEW
    Selected: border-yellow-500 ring-yellow-200 bg-yellow-50
    Content:
      Icon 🟡  Title "Data"
      Subtitle: "Request records, payslips or data backups"
      Examples: "Paycheque balance · Data backup"

On click: onSelect(type_key)   (type_key = 'complaint'|'request'|'data')

━━━ CategorySelector.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Props: categories (array for selected type), selectedCategoryId, onSelect
Import CATEGORY_ICONS from TICKET_TYPES.js

Render a 3-column grid of radio-style cards.
Each card:
  CATEGORY_ICONS[category.category_key]  (large emoji)
  category.name  (text-sm font-medium)
Selected card: border-indigo-500 bg-indigo-50
Unselected:    border-gray-200 bg-white hover:border-indigo-300

For 'data' type: only 2 cards render (Paycheque Balance + Data Backup Request)
For 'request' type: exactly 5 cards render (not 6)
For 'complaint' type: 3 cards render

On click: onSelect(category)  — pass full category object
```

---

## ══════════════════════════════════════════════════════

## SECTION 10 ❯ FRONTEND — PAGES

## ══════════════════════════════════════════════════════

```
━━━ LoginPage.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full-screen navy (#1B3A6B) background.
Centered white card (max-w-md, rounded-xl, shadow-xl).
Inside card:
  Header: "ETMS" large bold navy + "United India Insurance Co. Ltd." small grey
  Email input (type=email, required)
  Password input (type=password with show/hide toggle button)
  Login button full-width navy bg, white text, spinner while loading
  Error message in red below button if login fails
On submit:
  authApi.login(email, password)
  success → useAuth().login(data.token, data.user) → navigate('/dashboard')
  error   → show error message
If already authenticated → <Navigate to="/dashboard" />

━━━ DashboardPage.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Page header: "Dashboard"  +  user name greeting

Fetch behavior by role:
  EMPLOYEE   → GET /api/tickets (supports raised-by view and assigned-to view)
  MANAGER    → GET /api/approvals/pending (their queue)
  ADMIN      → GET /api/tickets (all tickets, read-only)

KPI cards by role:
  EMPLOYEE:   Pending Approval | Assigned | In Progress | Resolved | Closed | Reported
  MANAGER:    Pending Approval count (big number) + recent 5 pending tickets
  ADMIN:      Total | Pending Approval | Assigned | In Progress | Reported

Below KPI: "Recent Tickets" heading + last 5 <TicketCard>s

Conditional CTAs:
  employee  → "➕ Raise New Ticket" button → /tickets/new
  manager  → "✅ Review Pending Approvals" button → /approvals
  admin    → "⚙️ Manage Users" button → /admin

━━━ NewTicketPage.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Page header: "Raise a New Ticket"
Step indicator: 3 steps shown at top — "1 Type" → "2 Category" → "3 Details"

STATE: selectedType, selectedCategory, selectedAsset, myAssets, step (1|2|3)

STEP 1 — Choose Ticket Type
  Render <TicketTypeSelector selectedType={selectedType} onSelect={...} />
  "Next →" button — disabled until type selected
  On next: setStep(2)

STEP 2 — Choose Category
  Fetch GET /api/categories once on mount — cache in state.
  Filter: types.find(t => t.type_key === selectedType).categories
  Render <CategorySelector categories={filteredCategories} ... />
  "← Back" → setStep(1)
  "Next →" — disabled until category selected → setStep(3)

STEP 3 — Ticket Details
  Fields:
    Title*       text input, required, maxLength=200, live char counter (X/200)
    Priority*    select dropdown, defaultValue=selectedCategory.default_priority
                 Options: Low | Medium | High | Critical
    Description* textarea, required, minLength=20, rows=5
    Asset (hardware issue only)*
                 Show only when selectedCategory.category_key === 'hardware_issue'
                 Source: GET /api/assets/my
                 Dropdown label format: "{name} ({serial_number}) — {status}"
                 Validation:
                   - required for hardware_issue
                   - selectable only when status = 'active'
                 For non-hardware categories: hidden and sent as null
    Attach File  file input (accept=".pdf,.doc,.docx,.png,.jpg,.jpeg")
                 Show filename + size once selected. "Remove" button to clear.
  Right summary card:
    Shows selected Type badge + Category icon + category name

  On submit:
    Build FormData:
      formData.append('title', title)
      formData.append('description', description)
      formData.append('ticket_type_id', selectedType lookup → id from fetched types)
      formData.append('category_id', selectedCategory.id)
      formData.append('priority', priority)
      if (selectedCategory.category_key === 'hardware_issue') {
        formData.append('asset_id', selectedAsset.id)
      }
      if file: formData.append('file', file)
    await createTicket(formData)
    success → navigate(`/tickets/${ticket.id}`)
              toast "✅ Ticket {ticket.ticket_no} raised successfully!"
    error   → show error below submit button

━━━ TicketsPage.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Header: "My Tickets" / "Assigned Tickets" (employee) | "Managed Tickets" (manager) | "All Tickets" (admin)
Top-right: "➕ Raise Ticket" button (employee and manager — NOT shown for admin)

Filter bar — horizontal, 4 dropdowns:
  Type:     All Types | 🔴 Complaint | 🔵 Request | 🟡 Data
  Status:   All | Pending Approval | Approved | Assigned | In Progress | Reported | Resolved | Closed | Rejected
  Priority: All Priority | Low | Medium | High | Critical
  (page resets to 1 on any filter change)

On filter change: re-fetch tickets with updated params.
  For type filter: send param as type_key string
    (backend resolves to ticket_type_id internally)

Ticket list: <TicketCard> for each result
Empty state: centred "No tickets found 📭" message

Pagination row: "Page {page} of {totalPages}" + Prev / Next buttons

━━━ TicketDetailPage.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fetch on mount:
  GET /api/tickets/:id
  GET /api/tickets/:id/allowed-statuses
Show loading spinner while fetching. 404 message if not found.

Layout: 2 columns on md+ (main left 2/3, sidebar right 1/3)

LEFT — Main panel:

  Breadcrumb: "← Back to Tickets"

  Header:
    ticket_no — font-mono text-sm text-gray-400
    title     — text-2xl font-bold
    Badges row: <TypeBadge> <StatusBadge> <PriorityBadge>

  Meta table (2-col grid, labelled rows):
    Category       | {category_name}
    Type           | {type_name}
    Raised By      | {raised_by_name} ({raised_by_emp_id})
    Date Raised    | formatted date + time
    Assigned To    | {assigned_to_name} or "Unassigned"

  Description card: labelled "Description" with grey bg

  Attachment card:
    If attachment: "{original_name} ({file_size} bytes)"
                   "⬇ Download" button → GET /api/tickets/:id/file
    Else: "No file attached" in grey italic

  Activity Log (collapsible, default collapsed):
    "📋 Activity Log ({logs.length} events)"
    On expand: list of logs with actor name + action + timestamp

RIGHT — Action sidebar (white card, sticky):

  Use allowedStatuses from GET /api/tickets/:id/allowed-statuses to drive
  what buttons are shown. Never hardcode transition logic in the frontend.

  ┌─ role=manager, status='pending_approval' ──────────
  │ Ticket info: category name + raised by + description summary
  │ "✅ Approve" button (green, full-width)
  │   → approveTicket(id) → round-robin auto-assign by backend
  │ "❌ Reject" button (red, full-width)
  │   → opens a modal with required textarea "Reason for rejection"
  │   → on submit: rejectTicket(id, rejection_reason)
  │ Both buttons: refetch + show success message + navigate to /approvals
  └────────────────────────────────────────────────────

  ┌─ role=manager, status='pending_approval' + report_reason set ──
  │ (This is a re-approval after employee reported)
  │ Show report reason in a yellow warning card at the top:
  │   "⚠️ Escalated by employee: {report_reason}"
  │ "Re-Approve & Assign" section:
  │   employee dropdown → fetch /api/categories/:categoryId/employees
  │   "Assign to this employee" button (green)
  │   → reapproveTicket(id, selected_employee_id)
  │ "❌ Reject" button still available
  └────────────────────────────────────────────────────

  ┌─ role=employee, status='assigned' ───────────────
  │ "▶ Mark In Progress" button (indigo)
  │   → updateStatus(id, 'in_progress')
  └────────────────────────────────────────────────────

  ┌─ role=employee, status='in_progress' ────────────
  │ "✅ Mark Resolved" button (green)
  │   → updateStatus(id, 'resolved')
  │ "🚩 Report Issue" button (rose)
  │   → opens modal with optional textarea "Report reason"
  │   → updateStatus(id, 'reported', note)
  │   → backend auto-moves to pending_approval + emails manager
  └────────────────────────────────────────────────────

  ┌─ role=employee, status='resolved' ─────────────────
  │ If current user is the creator:
  │   "✅ Close Ticket" button (green)
  │     → updateStatus(id, 'closed')
  │   "🚩 Report Back to Manager" button (rose)
  │     → opens modal with required textarea "Reason"
  │     → updateStatus(id, 'reported', note)
  │     → backend auto-moves to pending_approval + emails manager for re-approval
  │ If current user is not the creator:
  │   no action buttons
  └────────────────────────────────────────────────────

  ┌─ role=manager, status='resolved' ─────────────────
  │ If current user is the creator:
  │   "✅ Close Ticket" button (green)
  │   "🚩 Report Back to Manager" button (rose, reason required)
  │ If current user is not the creator:
  │   no action buttons
  └────────────────────────────────────────────────────

  ┌─ role=admin — no action buttons ───────────────────
  │ Admin is READ-ONLY. Show a grey info card:
  │   "You have view-only access to this ticket."
  │ No buttons, no dropdowns.
  └────────────────────────────────────────────────────

  After any action: refetch ticket + show inline success toast.

━━━ PendingApprovalsPage.jsx  ← NEW (manager only) ━━
Route: /approvals
Access: ROLES.MANAGER only — redirect to /dashboard if not manager

Page header: "Pending Approvals"
Sub-heading: "Tickets awaiting your review"

Fetch: GET /api/approvals/pending
Shows all tickets with status='pending_approval' where the
ticket's category manager is the logged-in user.

Display as a list of approval cards. Each card shows:
  - TypeBadge + PriorityBadge (top row)
  - ticket_no in monospace grey
  - title in bold
  - category_name + raised_by_name + time ago
  - If report_reason is set: yellow banner "⚠️ Escalated — {note}"
  - Two action buttons inline on the card:
      "✅ Approve" (green) → approveTicket(id) → refetch list
      "❌ Reject"  (red)  → opens rejection modal

Rejection modal:
  Title: "Reject Ticket {ticket_no}"
  Textarea: "Reason for rejection" (required, min 10 chars)
  Buttons: "Cancel" + "Reject Ticket" (red)
  On confirm: rejectTicket(id, reason) → close modal → refetch list → show toast

Empty state: "✅ No pending approvals — you're all caught up!"

━━━ Asset Transfer UI Contract  ← NEW ━━━━━━━━━━━━━━━
Placement:
  - Show transfer action in admin asset view (AdminPage asset row action)
  - Optional reuse in AssetDetailPage action panel (admin/manager only)

Transfer action visibility:
  - visible only for ROLES.ADMIN and ROLES.MANAGER
  - hidden for ROLES.EMPLOYEE

Transfer modal behavior:
  Trigger: "Transfer Asset" button on selected asset
  Title: "Transfer {asset_name} ({serial_number})"
  Fields:
    to_user_id*  dropdown of active employees only
    note         optional textarea (max 500)
  Inline guards before submit:
    - block submit if asset.status === 'under_repair'
      message: "Asset under repair cannot be transferred."
    - block submit if selected employee equals current owner
      message: "Please select a different employee."
  Submit flow:
    transferAsset(asset.id, { to_user_id, note })
    success → close modal, toast "Asset transferred successfully", refetch assets list/detail
    error   → show backend message inline

Post-transfer UI expectations:
  - Owner label updates immediately from response/refetch
  - Old owner no longer sees asset in `/api/assets/my`
  - New owner sees asset in `/api/assets/my`

━━━ AdminPage.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Page header: "Admin Panel"
Two tabs: "👥 Users" | "📋 All Tickets"

USERS TAB:
  Table: Emp ID | Name | Email | Role | Department | Status
  Fetch getAllUsers() on mount.
  "Add User" button (top-right) → toggles inline form below header:
    Fields: Emp ID*, Name*, Email*, Password*, Role (select)*,
            Category (select; required when role is employee/manager), Department (optional)
    Role options: employee | manager | admin
    Submit → createUser(data) → refresh list → show success toast
  Delete flow:
    Clicking Delete opens a dedicated "Permanent Delete User" modal.
    If user has ticket ownership references, modal requires transfer first.
    Permanent delete button enabled only after typing the exact user name.

  ━━━ Category Org Graph (Manage Users — Admin only) ━━━━━━━━━
  Place this section BELOW the users table and ABOVE the Add User form,
  inside the USERS TAB of AdminPage. It is visible to ADMIN only.

  SECTION HEADER:
    Title: "Category Structure"
    Subtitle: "Managers and their assigned employees per category"
    Right-aligned filter pill group (same row as title):
      Buttons: "All" | "Complaints" | "Requests" | "Data"
      Active button: bg-navy text-white rounded-full px-3 py-1 text-xs
      Inactive button: border border-gray-200 text-gray-500 rounded-full px-3 py-1 text-xs

  DATA SOURCES (re-use existing API calls already available in AdminPage):
    managers  → getAllUsers() filtered by role === 'manager'
    employees → getAllUsers() filtered by role === 'employee'
    categories → GET /api/categories  (already fetched for other flows)
    Each category has: id, name, category_key, ticket_type_key,
                       manager_user_id, requires_approval

  GRAPH LAYOUT RULES:
    - Render an SVG graph (width: 100%, viewBox scales to content)
    - Group categories by ticket_type_key:
        complaint → coral/red tone nodes
        request   → blue tone nodes
        data      → amber tone nodes
    - Each category renders as a column with:
        TOP:    Type label pill (complaint | request | data) — coloured per type
        MIDDLE: Manager circle node — purple fill, shows emp_id (e.g. MGR001)
                Below manager: category name label (text-xs text-gray-500)
                Below name: approval badge pill:
                  requires_approval=TRUE  → "needs approval" (purple bg)
                  requires_approval=FALSE → "auto-approve"   (green bg)
        BOTTOM: Employee circle nodes — teal/green fill, shows emp_id
                Edge lines from manager to each employee (teal stroke, arrow tip)

    - Node sizes:
        Manager circle: r=26px
        Employee circle: r=18px
    - Layout: up to 5 columns per row; wrap to new row if more than 5 categories visible
    - Column spacing: distribute evenly across full width
    - Edge lines: straight lines from bottom of manager circle to top of employee circle
        stroke: #9FE1CB, stroke-width: 1.2, marker-end: arrow

  INTERACTIVITY:
    - Filter buttons control which categories are visible (all / by type)
      On filter change: re-render graph for matching categories only
    - Hover on any node: show a tooltip card with:
        Manager node → emp_id, full name, category name
        Employee node → emp_id, full name, category name
      Tooltip: absolute positioned div, white bg, border, rounded-lg, text-xs
               appears near cursor, disappears on mouseleave
    - Clicking a manager or employee node:
        Highlights all nodes and edges connected to that category (opacity 1.0)
        Dims all other nodes and edges (opacity 0.25)
        Clicking the same node again resets to normal (all opacity 1.0)

  LEGEND ROW (below graph):
    ● Purple circle  = Manager
    ● Green circle   = Employee
    ─ Teal line      = Assignment edge
    | Complaint (coral pill) | Request (blue pill) | Data (amber pill) |

  COMPONENT FILE:
    client/src/components/admin/CategoryOrgGraph.jsx

  PROPS:
    categories: array from GET /api/categories
    users:      array from getAllUsers()

  USAGE IN AdminPage.jsx (inside USERS TAB, below the users table):
    import CategoryOrgGraph from '../components/admin/CategoryOrgGraph'
    ...
    <CategoryOrgGraph categories={categories} users={users} />

  IMPLEMENTATION NOTES:
    - Build as a pure React functional component using useState (activeFilter,
      hoveredNode, selectedNode) and useRef for SVG container.
    - Derive manager/employee mapping from props — do NOT make extra API calls.
    - Map each category to its manager via category.manager_user_id === user.id
    - Map each employee to a category via user.category_id === category.id
    - All coordinates computed in JS before render; no d3 or external graph lib.
    - Use inline SVG (not canvas). SVG viewBox height auto-adjusts to content.
    - Dark mode: use Tailwind dark: variants for wrapper div; SVG colors use
      hardcoded hex that work on both white and dark-gray card backgrounds.
    - The graph must render correctly even when some categories have no
      employees assigned yet (show manager node with no edges — label "No staff").

ASSETS TAB (admin only — third tab):
  Tab label: "🖥️ Assets"
  Fetch: GET /api/assets  (admin sees all assets)
  "Add Asset" button (top-right) → inline form:
    Fields:
      Name*          text input
      Serial Number* text input (unique)
      Category*      select dropdown from GET /api/categories
                     (only hardware-related categories relevant, but allow all)
      Assigned To*   select dropdown of active employees from getAllUsers()
    Submit → POST /api/assets → refresh list → toast "Asset created"

  Table columns:
    Serial No | Name | Category | Assigned To | Status | Actions

  Status badge per row:
    active       → green pill
    under_repair → orange pill
    retired      → gray pill

  Actions per row:
    "Change Status" button → inline dropdown (active | under_repair | retired)
                           → PATCH /api/assets/:id/status → refresh
    "Transfer"      button → opens Transfer Asset modal (see Asset Transfer UI Contract above)

  Filter bar (above table):
    Status: All | Active | Under Repair | Retired
    Category: All | <each category name>

  Empty state: "No assets found 🖥️"
  Pagination at bottom

ALL TICKETS TAB (read-only for admin):
  Same 4-filter bar as TicketsPage but includes ALL statuses.
  Table view:
    Ticket No | Type | Category | Title | Priority | Status | Raised By | Date
  Clicking a row navigates to /tickets/:id
  Admin sees the ticket detail but NO action buttons (view-only).
  Pagination at bottom

━━━ AssetsPage.jsx  (employee + manager route: /assets) ━━━━━━━━
Route: /assets
Access: ROLES.EMPLOYEE and ROLES.MANAGER only (admin uses Admin Panel → Assets tab)

Page header:
  EMPLOYEE: "My Assets"
  MANAGER:  "Manage Assets"

EMPLOYEE view:
  Fetch: GET /api/assets/my
  Show assets assigned to the logged-in employee as cards.
  Each asset card:
    Icon: 🖥️ (large)
    Name (font-semibold)
    Serial number (font-mono text-xs text-gray-400)
    Category name (text-xs text-gray-500)
    Status badge: active (green) | under_repair (orange) | retired (gray)
  Empty state: "You have no assets assigned 🖥️"
  NOTE: Employee is read-only — no transfer or status change buttons.

MANAGER view:
  Fetch: GET /api/assets  (manager sees all assets, scoped to their categories)
  Two sections:
    Section 1 — "Assets in My Categories"
      Table: Serial No | Name | Category | Assigned To | Status | Actions
      Actions:
        "Change Status" → PATCH /api/assets/:id/status (active | under_repair | retired)
        "Transfer"      → Transfer Asset modal (same modal as admin)
          - manager can only transfer assets in their managed categories
          - backend enforces this; frontend shows the button for all assets in view

    Section 2 — "Asset Transfer History"
      Table: Asset Name | Serial | From | To | Transferred By | Date | Note
      Fetch: derive from asset detail or add GET /api/assets/:id/history if available
      If no history endpoint exists yet: show inline note "Transfer history available per asset"

  Filter bar: Status (All | Active | Under Repair | Retired)
  Empty state: "No assets in your categories 🖥️"
```

---

## ══════════════════════════════════════════════════════

## SECTION 11 ❯ PROJECT SETUP FILES

## ══════════════════════════════════════════════════════

```
━━━ client/package.json ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
dependencies:    react, react-dom, react-router-dom, axios, date-fns
devDependencies: vite, @vitejs/plugin-react, tailwindcss, autoprefixer, postcss

scripts:
  "dev":     "vite"
  "build":   "vite build"
  "preview": "vite preview"

━━━ client/vite.config.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:5000' }
  }
})

━━━ client/tailwind.config.js ━━━━━━━━━━━━━━━━━━━━━━━━
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1B3A6B',
        gold:  '#C8860A',
      }
    }
  },
  plugins: []
}

━━━ client/src/index.css ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@tailwind base;
@tailwind components;
@tailwind utilities;

━━━ client/.env.example ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_API_URL=http://localhost:5000/api

━━━ .gitignore (root) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
node_modules/
.env
uploads/
dist/
.DS_Store

━━━ root package.json ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "scripts": {
    "dev:server":  "cd server && npm run dev",
    "dev:client":  "cd client && npm run dev",
    "dev":         "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "setup:db":    "psql -U postgres -d ETMS -f database/schema.sql",
    "seed:db":     "psql -U postgres -d ETMS -f database/seed.sql"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

---

## SECTION 12 ❯ FINAL CHECKLIST

## ══════════════════════════════════════════════════════

Status legend: [x] verified in code, [~] needs runtime verification, [ ] pending

Audit updated: 2026-04-06 (workflow redesign — manager approval + round-robin)

### 🗄️ Database

- [ ] `schema.sql` defines all 8 tables: users, ticket_types, ticket_categories, assets, asset_assignments, tickets, attachments, ticket_logs
- [ ] ✅ ENUM TYPES created: `user_role_enum` ('employee', 'manager', 'admin')
- [ ] ✅ ENUM TYPES created: `priority_enum` ('low', 'medium', 'high', 'critical')
- [ ] `users.role` uses user_role_enum type (NOT VARCHAR CHECK)
- [ ] `tickets.priority` uses priority_enum type (NOT VARCHAR CHECK)
- [ ] `ticket_categories.default_priority` uses priority_enum type with DEFAULT 'medium'
- [ ] `ticket_categories` has `manager_user_id` column (FK to users)
- [ ] `tickets` has `approval_owner_id` column (FK to users, nullable)
- [ ] `tickets.status` CHECK includes: pending_approval, approved, assigned, in_progress, reported, resolved, closed, rejected
- [ ] `tickets.status` DEFAULT is 'pending_approval' (NOT 'raised' — 'raised' does not exist)
- [ ] `tickets` table has `rejection_reason` and `report_reason` TEXT columns
- [ ] `assets` table exists with unique `serial_number` and status enum (active|under_repair|retired)
- [ ] `assets.category_id` FK exists and references ticket_categories(id)
- [ ] `asset_assignments` table exists and tracks transfer history with assigned_at/returned_at
- [ ] `tickets` table has nullable `asset_id` FK to assets(id)
- [ ] `ticket_types` has exactly 3 rows: complaint, request, data
- [ ] `ticket_categories` has exactly 10 rows with manager_user_id populated
- [ ] Seed inserts 10 manager users (MGR001–MGR010), each assigned to one category
- [ ] Seed users have real bcrypt hashes
- [ ] Seed inserts assets with valid category_id values (e.g., hardware_issue exists before asset inserts)
- [ ] `schema.sql` and `seed.sql` run clean on local DB

### 🔧 Backend

- [ ] `server/constants/ROLES.js` exports { EMPLOYEE, MANAGER, ADMIN }
- [ ] `server/utils/ticketTransitions.js` ALLOWED_TRANSITIONS has NO 'raised' key
- [ ] `ticketTransitions.js` ADMIN role always returns { valid: false } for updateStatus
- [ ] `ticketTransitions.js` MANAGER transitions are ownership-driven by controller checks; validateTransition does not block manager assignee/creator transitions by role alone
- [ ] `ticketTransitions.js` employee role only allows assigned/in_progress → in_progress/resolved/reported
- [ ] `ticketTransitions.js` EMPLOYEE role allows resolved → closed or reported for the creator
- [ ] `server/services/assignmentService.js` exists and exports `getNextEmployeeInCategory()`
- [ ] `getNextEmployeeInCategory()` queries least-loaded employee by open ticket count within the category, with deterministic tie-breaker `u.created_at ASC`
- [ ] `server/controllers/approvalController.js` exists with approve, reject, reapprove endpoints
- [ ] `DELETE /api/users/:id` exists (ADMIN only) and blocks delete when ownership references exist until transfer-ownership is completed
- [ ] `POST /api/approvals/:id/approve` runs round-robin via getNextEmployeeInCategory()
- [ ] `POST /api/approvals/:id/approve` sends 3 emails: raiser + employee + manager confirmation
- [ ] `POST /api/approvals/:id/reject` requires rejection_reason, sends email to raiser
- [ ] `POST /api/approvals/:id/reapprove` requires assigned_to (specific employee ID)
- [ ] ⚠️ REASSIGNMENT: Manager can assign to SAME employee on re-approval
- [ ] ⚠️ REASSIGNMENT: Manager can assign to DIFFERENT employee (same category only)
- [ ] ⚠️ REASSIGNMENT: Backend validates employee belongs to ticket's category (400 if not)
- [ ] ⚠️ REASSIGNMENT: Cannot reassign to employee in different category (400 error)
- [ ] `GET /api/approvals/pending` returns only tickets where approval_owner_id = req.user.id
- [ ] `POST /api/tickets` status behavior is correct:
      requires_approval=TRUE -> pending_approval (except manager in own category: auto-approved + assigned)
      requires_approval=FALSE -> assigned (pending_approval -> approved -> assigned)
- [ ] `POST /api/tickets` emails approval owner only when requires_approval=TRUE and raiser is not manager of that category (not admin)
- [ ] `POST /api/tickets` accessible to EMPLOYEE and MANAGER only (not ADMIN)
- [ ] `POST /api/tickets` enforces hardware asset rule: category_key='hardware_issue' requires valid active asset_id
- [ ] `POST /api/tickets` enforces asset ownership: selected asset must be assigned_to req.user.id
- [ ] `POST /api/tickets` enforces asset category match: asset.category_id must equal ticket.category_id
- [ ] `POST /api/assets/:id/transfer` restricted to ADMIN and MANAGER only
- [ ] Manager asset mutations are scope-limited to managed categories (or own assigned assets)
- [ ] `POST /api/assets/:id/transfer` blocks transfer when asset.status='under_repair'
- [ ] `POST /api/assets/:id/transfer` updates assets.assigned_to and writes asset_assignments history in one transaction
- [ ] `GET /api/reports/top-failing-devices` exists and is restricted to ADMIN and MANAGER
- [ ] Top failing report returns id, name, serial_number, total_issues sorted desc with limit
- [ ] Employee calling `GET /api/reports/top-failing-devices` gets 403 (authorization enforced)
- [ ] ⚠️ AUTO-ASSIGN NO-APPROVAL: If category.requires_approval=FALSE, skip manager and auto-approve
- [ ] ⚠️ AUTO-ASSIGN NO-APPROVAL: Immediately auto-assign via round-robin within category (not at approval)
- [ ] ⚠️ AUTO-ASSIGN NO-APPROVAL: Set status = assigned (pending_approval → approved → assigned)
- [ ] ⚠️ AUTO-ASSIGN NO-APPROVAL: Send only 2 emails (employee + raiser, NOT manager)
- [ ] `PUT /api/tickets/:id/status` accessible to EMPLOYEE and MANAGER (not ADMIN)
- [ ] ⚠️ CREATOR CONTROL: After resolved, only ticket.raised_by can close or report (403 for others)
- [ ] ⚠️ CREATOR CONTROL: Assigned employee trying to close resolved ticket gets 403 with message
- [ ] When assigned employee reports a ticket: status moves in_progress → reported → pending_approval (auto)
- [ ] When the creator disputes a resolved ticket: status moves resolved → reported → pending_approval (auto)
- [ ] ⚠️ STATUS PERMISSION: user-initiated pending_approval → approved requires MANAGER role + approval_owner ownership (403); system auto-approval on create is allowed for no-approval categories and manager own-category flow
- [ ] ⚠️ STATUS PERMISSION: pending_approval → rejected requires MANAGER role + approval_owner ownership (403)
- [ ] ⚠️ DOMAIN RULE: Manager can approve/manage only tickets in their own category (approval_owner_id enforcement)
- [ ] ⚠️ STATUS PERMISSION: assigned/in_progress → \* requires req.user.id === ticket.assigned_to (403)
- [ ] ⚠️ STATUS PERMISSION: resolved → closed requires req.user.id === ticket.raised_by (employee or manager creator) (403)
- [ ] ⚠️ STATUS PERMISSION: resolved → reported requires req.user.id === ticket.raised_by (employee or manager creator) (403)
- [ ] ⚠️ STATUS PERMISSION: Terminal statuses (rejected, closed) cannot transition (400)
- [ ] ⚠️ STATUS PERMISSION: validateTransition() called on all user-initiated transitions
- [ ] `categoryModel.findById()` returns manager_id, manager_name, manager_email
- [ ] `ticketModel.findPendingForManager()` filters by approval_owner_id
- [ ] `GET /api/tickets` scoping: employee supports raised and assigned views, manager=category queue, admin=all
- [ ] `GET /api/tickets/:id/allowed-statuses` returns correct options per role
- [ ] Admin cannot call approve, reject, reapprove, or updateStatus endpoints (403)
- [ ] All 7 email triggers implemented in emailService.js
- [ ] API responses consistently use { success: true/false } shape

### 🎨 Frontend

- [ ] Sidebar shows "My Assets" link for EMPLOYEE role
- [ ] Sidebar shows "Manage Assets" link for MANAGER role
- [ ] `/assets` route exists and is protected to EMPLOYEE and MANAGER only (admin uses Admin Panel)
- [ ] `AssetsPage.jsx` exists at `client/src/pages/AssetsPage.jsx`
- [ ] Employee view of AssetsPage fetches `GET /api/assets/my` and renders asset cards (read-only)
- [ ] Manager view of AssetsPage fetches all assets scoped to their categories
- [ ] Manager asset table shows Change Status and Transfer actions
- [ ] AdminPage has THREE tabs: "👥 Users" | "🖥️ Assets" | "📋 All Tickets"
- [ ] Admin Assets tab fetches all assets (GET /api/assets) with Add Asset form
- [ ] Admin Assets tab table shows: Serial No | Name | Category | Assigned To | Status | Actions
- [ ] Admin Assets tab has status filter and category filter
- [ ] Admin can create asset via POST /api/assets (admin only)
- [ ] Admin and manager can change asset status via PATCH /api/assets/:id/status
- [ ] Transfer Asset modal accessible from Admin Assets tab and Manager AssetsPage
- [ ] `ROLES.js` has MANAGER constant
- [ ] `TICKET_STATUS.js` has PENDING_APPROVAL, APPROVED, REJECTED — no RAISED
- [ ] `STATUS_COLORS` has entries for all 8 statuses
- [ ] `ticketApi.js` has getPendingApprovals, approveTicket, rejectTicket, reapproveTicket
- [ ] `ticketApi.js` includes getMyAssets() for asset dropdown in ticket form
- [ ] `ticketApi.js` includes transferAsset(assetId, { to_user_id, note }) for admin/manager transfer flow
- [ ] `ticketApi.js` does NOT export assignTicket (removed) — CODE REVIEW GATE: fail review if `assignTicket` appears in exports/imports/call sites
- [ ] Verification step: repo search for `assignTicket` returns zero project matches (excluding historical docs)
- [ ] Sidebar shows "Pending Approvals" link only for MANAGER role
- [ ] Sidebar shows "Raise Ticket" for EMPLOYEE and MANAGER only (not ADMIN)
- [ ] /approvals route exists and is protected to MANAGER only
- [ ] PendingApprovalsPage fetches GET /api/approvals/pending
- [ ] PendingApprovalsPage shows report reason banner for reported tickets
- [ ] PendingApprovalsPage approve flow: approveTicket() → success toast → refetch
- [ ] PendingApprovalsPage reject flow: modal with required textarea → rejectTicket()
- [ ] TicketDetailPage manager block: Approve + Reject buttons when pending_approval (first time)
- [ ] TicketDetailPage manager block: Re-approve with employee dropdown when report_reason set
- [ ] TicketDetailPage admin block: grey "view-only" card — no action buttons
- [ ] TicketDetailPage employee block: "Report Issue" opens modal with reason textarea for assigned tickets and resolved-ticket disputes
- [ ] NewTicketPage shows asset selector for hardware_issue category only
- [ ] Asset dropdown shows only logged-in user's assets with serial number labels
- [ ] Asset detail/admin view provides transfer action for admin/manager roles
- [ ] Transfer modal enforces client-side guards (under_repair blocked, same-owner blocked) before API call
- [ ] DashboardPage: manager sees pending approval count + queue
- [ ] DashboardPage: admin sees all tickets read-only
- [ ] TicketsPage status filter includes all 8 statuses including pending_approval and rejected

### 🔁 End-to-End Smoke Tests

- [ ] Employee raises Network Issue → status = pending_approval → UIIC-C-YYYY-000001
- [ ] Hardware issue ticket requires selecting an active assigned asset
- [ ] Ticket detail shows linked asset name + serial for hardware ticket
- [ ] Admin/manager transfers asset from Employee001 to Employee002 → assets.assigned_to updated + history row inserted
- [ ] Transfer is rejected when asset status is under_repair
- [ ] After transfer, old owner cannot use that asset_id in new hardware ticket (403), new owner can
- [ ] Top failing devices report returns seeded ordering by issue counts (desc) with default limit=10
- [ ] Employee cannot access top failing devices report endpoint (403)
- [ ] Category manager (MGR001) receives email + sees ticket in /approvals
- [ ] Manager rejects → rejection_reason required → employee emailed with reason → status = rejected
- [ ] ⚠️ AUTO-ASSIGN TEST: Employee raises Gate Pass (requires_approval=FALSE)
      → status = assigned (NOT pending_approval)
      → auto-assigned to least-loaded employee (round-robin)
      → manager NEVER sees in /approvals queue
      → only 2 emails sent (employee + raiser)
- [ ] ⚠️ MANAGER OWN-CATEGORY TEST: Manager raises ticket in own category
      → status = assigned (pending_approval -> approved -> assigned)
      → no pending approval queue step
      → round-robin assignment still applies
- [ ] ⚠️ MANAGER CROSS-CATEGORY TEST: Manager raises ticket in different category
      → status = pending_approval
      → appears in that category manager's /approvals queue
      → raiser manager cannot approve unless they are approval owner
- [ ] ⚠️ AUTO-ASSIGN TEST: Verify no manager approval email sent for Gate Pass
- [ ] Regular (requires_approval=TRUE): Employee raises Complaint → manager approves → round-robin assigns
- [ ] Raiser, manager, and assigned employee all receive emails on approval
- [ ] assigned employee marks in_progress → resolved → raiser closes
- [ ] ⚠️ CREATOR CONTROL TEST: assigned employee tries to close resolved ticket → 403 Forbidden
      "Only the ticket creator can close or report a resolved ticket."
- [ ] ⚠️ CREATOR CONTROL TEST: assigned employee tries to report resolved ticket → 403 Forbidden
      (same message)
- [ ] assigned employee marks reported → report_reason saved → back to pending_approval → manager sees it
- [ ] raiser disputes resolved ticket → reported with reason → back to pending_approval → manager sees it
- [ ] ⚠️ REASSIGNMENT TEST (SAME EMPLOYEE): Escalated ticket, manager reassigns to same employee
      → Employee001 reports ticket while working
      → Manager sees in /approvals with report_reason
      → Manager picks Employee001 again → status = assigned
      → Ticket works second time successfully → closed
- [ ] ⚠️ REASSIGNMENT TEST (DIFFERENT EMPLOYEE): Escalated ticket, manager picks different employee
      → Employee001 reports ticket (can't resolve)
      → Manager reassigns to Employee002 (same category)
      → Employee002 takes over, resolves, raiser closes
- [ ] ⚠️ REASSIGNMENT TEST (CATEGORY CONSTRAINT): Manager tries to reassign outside category
      → Employee001 has Gate Pass ticket
      → Manager attempts to pick Employee999 (who only handles Complaints)
      → 400 Error: "Employee is not assigned to this category"
- [ ] Manager re-approves escalated ticket → picks specific employee → 3 emails sent
- [ ] Admin logs in → can view all tickets → CANNOT see approve/assign buttons → 403 on API if tried
- [ ] New employee user creation → forced password change on first login

### ⚠️ Known Follow-ups

- [ ] Add `database/migration_full_workflow_assets_reports.sql` for existing local DB
      (adds manager_user_id to ticket_categories, category_id to users,
      rejection_reason + report_reason to tickets, updates status CHECK,
      adds asset_assignments table,
      converts assets.category -> assets.category_id FK,
      backfills assets.category_id to hardware_issue where needed,
      adds idx_assets_category and asset_assignments indexes,
      validates/backs up existing data before applying NOT NULL + FK constraints)
- [ ] Add `database/migration_reports_endpoints_notes.md`
      (documents report route/controller/model rollout and auth expectations:
      ADMIN/MANAGER allowed, EMPLOYEE forbidden)
- [ ] Update Stitch UI prompts (STITCH_UI_PROMPTS.md) to reflect manager approval screens
- [ ] Add explicit orphan-upload cleanup utility and periodic sweeper notes
      (tmp upload files can remain if createTicket fails after multer write;
      document fs.unlink cleanup path in controller and optional scheduled cleanup for stale tmp-\* files)

---

> 🔒 United India Insurance Co. Ltd. — ETMS MVP — Local Development Only
