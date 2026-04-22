# Software Architecture Document (SAD)
Software Architecture Document (SAD)
Employee Ticket Management System with Asset Management (ETMS)
United India Insurance Co. Ltd.
Document Version: 1.0 Classification: Internal Technical Reference Scope: ETMS MVP — Local Development Build

Table of Contents
System Overview
Architecture Style
Core Entities and Data Model
Feature Breakdown
Workflow Diagrams
Authorization and Access Control
Business Rules and Constraints
Edge Case Handling
Scalability and Future Enhancements
Assumptions and Limitations
1. System Overview
1.1 Purpose
ETMS is an internal IT Service Management (ITSM) and IT Asset Management (ITAM) platform built for United India Insurance Co. Ltd. It provides a structured, auditable workflow for employees to raise IT-related tickets, for managers to approve and route them, and for technical staff to resolve them. It also tracks physical IT assets assigned to employees, including their lifecycle and transfer history.

1.2 Key Capabilities
Structured ticket creation with type, category, priority, and optional file attachment
Manager-gated approval workflow for request-type tickets
Automatic round-robin assignment to the least-loaded employee in a category
Full ticket lifecycle management with audit logging at every state transition
Role-based access control with three distinct roles: Employee, Manager, Admin
Asset tracking per employee with unique serial numbers and full transfer history
Hardware complaint tickets linked to specific assets
Reporting on top failing devices by ticket count
SLA tracking with configurable deadline per ticket and automatic escalation via scheduled job
Dedicated Data Team portal for data and audit requests
2. Architecture Style
2.1 Architecture Type
The system follows a Layered REST API Architecture with a clear separation between presentation, application logic, and data persistence.

Presentation Layer    React 18 + Vite + TypeScript + Tailwind CSS
                              |
API Layer             Express.js REST API (TypeScript, strict mode)
                              |
Business Logic Layer  Controllers + Services + Utils
                              |
Data Access Layer     Models (raw SQL, parameterised queries, no ORM)
                              |
Persistence Layer     PostgreSQL 14+
2.2 High-Level Components
Component	Technology	Responsibility
Frontend SPA	React 18 + Vite + TypeScript	User interface, routing, state management
REST API Server	Express.js + TypeScript	Request handling, validation, business logic orchestration
Authentication	JWT (1h expiry, sessionStorage)	Stateless auth, per-tab session isolation
Database	PostgreSQL	Persistent storage, relational integrity, ENUM enforcement
Email Service	Nodemailer (Ethereal for dev)	Asynchronous notification delivery
Scheduler	node-cron	Daily SLA escalation job
File Storage	Multer + local disk	Ticket attachment handling
2.3 Communication Pattern
All client-server communication is over HTTP/REST
Requests carry a Bearer JWT token in the Authorization header
All responses follow the shape { success: boolean, ...data } or { success: false, message: string }
Email delivery is fire-and-forget (non-blocking, errors logged but not surfaced to caller)
3. Core Entities and Data Model
3.1 Entity Summary
Entity	Table	Primary Key	Notes
User	users	id	Roles: employee, manager, admin, data_team
Ticket Type	ticket_types	id	complaint, request, data
Ticket Category	ticket_categories	id	Maps type to manager, team, approval flag
Ticket	tickets	id	Full lifecycle, SLA columns
Attachment	attachments	id	One per ticket, cascades on delete
Ticket Log	ticket_logs	id	Append-only audit trail
Asset	assets	id	Unique serial number, belongs to category
Asset Assignment	asset_assignments	id	Transfer history, one active row per asset
3.2 User
Column	Type	Constraints	Notes
id	SERIAL	PK	
emp_id	VARCHAR(20)	UNIQUE NOT NULL	Employee identifier
name	VARCHAR(100)	NOT NULL	Editable by admin
email	VARCHAR(150)	UNIQUE NOT NULL	Login credential
password_hash	TEXT	NOT NULL	bcrypt, 10 rounds
role	user_role_enum	NOT NULL	employee, manager, admin, data_team
category_id	INTEGER	FK ticket_categories	Team/category membership
department	VARCHAR(100)		Informational
is_active	BOOLEAN	DEFAULT TRUE	Deactivated users cannot log in
password_changed_at	TIMESTAMPTZ		NULL = forced change on first login
created_at	TIMESTAMPTZ	DEFAULT NOW()	
3.3 Ticket Category
Column	Type	Notes
id	SERIAL PK	
ticket_type_id	INTEGER FK	NULL for team rows
name	VARCHAR(100)	Display name
category_key	VARCHAR(50) UNIQUE	Machine-readable identifier
default_priority	priority_enum	low, medium, high, critical
manager_user_id	INTEGER FK users	NULL for auto-routed categories
assigned_team_key	VARCHAR(50)	References category_key of a team row
is_team	BOOLEAN	TRUE for the 8 team rows, FALSE for ticket categories
requires_approval	BOOLEAN	TRUE only for request-type categories
Design note: The ticket_categories table serves a dual purpose. Rows with is_team = TRUE represent the 8 handling teams (email_team, vc_team, infra_team, etc.) and are used as the assignment target. Rows with is_team = FALSE represent the ticket categories that employees select when raising a ticket. The assigned_team_key column on a ticket category row points to the category_key of the team row that handles it.

3.4 Ticket
Column	Type	Notes
id	SERIAL PK	
ticket_no	VARCHAR(25) UNIQUE	UIIC-C/R/D-YYYY-XXXXXX
title	VARCHAR(200)	5–200 chars
description	TEXT	Min 20 chars
ticket_type_id	INTEGER FK	complaint, request, data
category_id	INTEGER FK	Selected category
priority	priority_enum	low, medium, high, critical
status	VARCHAR(30)	8-state lifecycle
raised_by	INTEGER FK users	Creator
assigned_to	INTEGER FK users	Current assignee
approval_owner_id	INTEGER FK users	Manager responsible for approval; NULL for auto-routed
asset_id	INTEGER FK assets	Required for hardware_complaint
rejection_reason	TEXT	Set on rejection
report_reason	TEXT	Set on escalation
sla_days	INTEGER	1–30, set by raiser at creation
sla_due_date	TIMESTAMPTZ	created_at + sla_days, computed on insert
escalated	BOOLEAN	Set by cron when overdue
escalated_at	TIMESTAMPTZ	First escalation timestamp
created_at	TIMESTAMPTZ	
updated_at	TIMESTAMPTZ	
3.5 Asset
Column	Type	Notes
id	SERIAL PK	
name	VARCHAR(120)	Device name/model
serial_number	VARCHAR(80) UNIQUE	Physical identifier
category_id	INTEGER FK	Team category that manages this asset
assigned_to	INTEGER FK users NOT NULL	Current holder
status	VARCHAR(30)	active, under_repair, retired
created_at	TIMESTAMPTZ	
updated_at	TIMESTAMPTZ	
3.6 Asset Assignment (Transfer History)
Column	Type	Notes
id	SERIAL PK	
asset_id	INTEGER FK CASCADE	
from_user_id	INTEGER FK	NULL on initial assignment
to_user_id	INTEGER FK NOT NULL	New holder
transferred_by	INTEGER FK	Admin or manager who performed transfer
assigned_at	TIMESTAMPTZ NOT NULL	
returned_at	TIMESTAMPTZ	NULL = currently active
note	TEXT	Optional transfer note
Constraint: A partial unique index on (asset_id) WHERE returned_at IS NULL enforces exactly one active assignment per asset at all times.

3.7 Ticket Log (Audit Trail)
Column	Type	Notes
id	SERIAL PK	
ticket_id	INTEGER FK	
action	VARCHAR(100)	TICKET_CREATED, APPROVED, REJECTED, AUTO_ASSIGNED, MANUALLY_ASSIGNED, STATUS_CHANGED, WORK_STARTED, ESCALATED, BACK_TO_MANAGER, RE_APPROVED, SLA_ESCALATED
old_status	VARCHAR(30)	Previous status
new_status	VARCHAR(30)	New status
performed_by	INTEGER FK	NULL for system actions
note	TEXT	Reason or context
created_at	TIMESTAMPTZ	
Rule: This table is append-only. No application code updates or deletes rows.

3.8 Entity Relationships
users (1) ──────────────── (N) tickets [raised_by]
users (1) ──────────────── (N) tickets [assigned_to]
users (1) ──────────────── (N) tickets [approval_owner_id]
users (1) ──────────────── (N) assets [assigned_to]
users (N) ──────────────── (1) ticket_categories [category_id]

ticket_types (1) ─────────── (N) ticket_categories
ticket_categories (1) ─────── (N) tickets
ticket_categories (1) ─────── (N) assets

tickets (1) ──────────────── (N) attachments
tickets (1) ──────────────── (N) ticket_logs
tickets (N) ──────────────── (1) assets [asset_id]

assets (1) ───────────────── (N) asset_assignments
4. Feature Breakdown
4.1 Ticket Creation
Description: An employee or manager raises a ticket by selecting a type, category, and providing details. The system determines the approval path and either queues the ticket for manager review or auto-approves and assigns it.

Inputs:

title (5–200 chars)
description (min 20 chars)
ticket_type_id (complaint, request, data)
category_id (must belong to the selected type)
priority (low, medium, high, critical)
sla_days (1–30, default 3)
asset_id (required when category_key = hardware_complaint)
file attachment (optional, max 5 MB, allowed: pdf, doc, docx, png, jpg)
Outputs:

Ticket record with status pending_approval or assigned
Ticket log entry: TICKET_CREATED
Email notification to manager (if approval required) or to assignee and raiser (if auto-approved)
Business Rules:

Admin cannot raise tickets
data_team role can only raise data-type tickets via the dedicated data portal endpoint
category_id must belong to the selected ticket_type_id
For hardware_complaint: asset_id is mandatory, asset must be active, asset must be assigned to the raiser, asset.category_id must match the infra team
sla_due_date is computed at insert time as: created_at + sla_days
Ticket number format: UIIC-C-YYYY-XXXXXX (C=complaint, R=request, D=data), year-scoped, zero-padded to 6 digits
Ticket number collision is handled with up to 3 retry attempts; if all fail, return 409 with code TICKET_NO_CONFLICT
File is written to disk with a sanitised filename; if ticket creation fails after file write, the file is deleted
Routing Logic:

If category.requires_approval = FALSE: auto-approve and auto-assign (complaint and data types)
If category.requires_approval = TRUE: set status = pending_approval, set approval_owner_id via round-robin between available managers, send email to that manager
Edge Cases:

No active employees in the target team: return 400, ticket not created
No active managers available for approval: return 400, ticket not created
Ticket number collision after 3 retries: return 409
4.2 Approval Workflow
Description: Request-type tickets require manager approval before assignment. The manager assigned as approval_owner_id can approve, reject, or re-approve (after escalation).

Inputs (Approve): ticketId (path param) Inputs (Reject): ticketId, rejection_reason (min 10 chars) Inputs (Re-approve): ticketId, assigned_to (specific employee ID)

Outputs:

Ticket status updated
Ticket log entries written
Emails sent to raiser, assignee, and manager
Business Rules:

Only the manager whose id matches ticket.approval_owner_id can approve or reject
Ticket must be in pending_approval status to be approved or rejected
Rejection requires a reason of at least 10 characters
On approval: system performs round-robin assignment to the least-loaded employee in the target team
Re-approval is only valid if the ticket has a report_reason set (confirming it was escalated)
On re-approval: manager manually selects a specific employee; that employee must belong to the target team
Three emails are sent on approval: raiser (approved), assignee (new assignment), manager (confirmation)
Edge Cases:

Manager attempts to approve a ticket not assigned to them: 403
Manager attempts to approve a non-pending ticket: 400
No employees available in team at approval time: 400, approval blocked
Re-approve called on a non-escalated ticket: 400
4.3 Assignment Logic
Description: The system automatically assigns tickets to the least-loaded active employee in the target team using a round-robin algorithm.

Algorithm:

Query all active employees whose category_id matches the target team row
Left-join with open tickets (status NOT IN resolved, closed, rejected) to count workload
Order by open ticket count ascending, then by created_at ascending as a deterministic tie-breaker
Select the first result (least-loaded, earliest-created on tie)
Triggers:

Auto-approval path (complaint and data tickets on creation)
Manager approval (request tickets after manager approves)
Outputs:

ticket.assigned_to set to selected employee
ticket.status set to assigned
Ticket log entry: AUTO_ASSIGNED (performed_by = NULL, system action)
Edge Cases:

No active employees in team: exception thrown, caller returns 400 to client
All employees equally loaded: tie-breaker is earliest created_at, ensuring deterministic selection
4.4 Ticket Lifecycle Management
Description: A ticket moves through a defined set of statuses. Each transition is validated against allowed transitions, role permissions, and ownership rules before any database update is executed.

Status Definitions:

Status	Meaning
pending_approval	Awaiting manager review (request tickets only)
approved	Brief intermediate after manager approves, before assignment
assigned	Assigned to an employee, work not yet started
in_progress	Employee has started work
reported	Escalated back to manager queue
resolved	Employee marked complete, awaiting creator confirmation
closed	Creator confirmed resolution — terminal
rejected	Manager rejected — terminal
Allowed Transitions:

From	To	Actor
pending_approval	approved	Manager (approval endpoint) or System (auto-flow)
pending_approval	rejected	Manager (approval endpoint)
approved	assigned	System only
assigned	in_progress	Assigned employee only
in_progress	resolved	Assigned employee only
in_progress	reported	Assigned employee only
resolved	closed	Ticket creator only
resolved	reported	Ticket creator only (report_reason required, min 10 chars)
reported	pending_approval	System only (auto-transition after escalation)
Outputs per transition:

Ticket status updated
Ticket log entry written with old_status, new_status, performed_by, note
Email sent where applicable (resolved → raiser; reported → manager)
Edge Cases:

Attempt to transition from a terminal status (closed, rejected): 400
Attempt to transition to an invalid next status: 400
Assignee attempts to close a resolved ticket (creator-only action): 403
Non-assignee attempts to mark in_progress: 403
4.5 Role-Based Access Control
Description: Every API endpoint enforces role-based access. The system uses two middleware layers: authentication (JWT verification) and role authorisation (requireRole factory).

Authentication Flow:

Extract Bearer token from Authorization header
Verify JWT signature and expiry
Load user from database, verify is_active = TRUE
Attach user to req.user
Role Enforcement:

requireRole(...roles) middleware checks req.user.role against the allowed list
Returns 403 if role is not permitted
Endpoint-Level Permissions:

Endpoint Group	Allowed Roles
POST /api/tickets	employee, manager
GET /api/tickets	employee, manager, admin
PUT /api/tickets/:id/status	employee, manager
GET/POST/DELETE /api/approvals/*	manager
GET/POST/PATCH/DELETE /api/users/*	admin (except change-password: all)
GET /api/assets	admin, manager
GET /api/assets/my	employee, manager
POST /api/assets	admin
PATCH /api/assets/:id/status	admin, manager
POST /api/assets/:id/transfer	admin, manager
GET /api/reports/*	admin, manager
GET /api/lookup/employee	admin
POST/GET /api/data-portal/tickets	data_team
data_team Restrictions:

Cannot access /api/tickets (main ticket endpoints)
Cannot raise complaint or request tickets
Redirected to /data-portal on login
All other routes redirect data_team users away
4.6 Asset Management
Description: Physical IT assets are tracked per employee. Each asset has a unique serial number, belongs to a team category, and has a lifecycle status. Hardware complaint tickets must reference a specific asset.

Asset Lifecycle States:

Status	Meaning
active	In use, can be transferred, can be used in hardware tickets
under_repair	Being repaired, cannot be transferred
retired	Decommissioned, no further use
Operations:

Operation	Actor	Rules
Create asset	Admin	serial_number must be unique; category_id must exist; assigned_to must be active employee
View all assets	Admin, Manager	Manager sees only assets in their managed categories
View own assets	Employee, Manager	Returns assets where assigned_to = req.user.id
Change status	Admin, Manager	Manager restricted to assets in their category scope
Transfer asset	Admin, Manager	See Section 4.7
View history	Admin, Manager	Full transfer timeline per asset
Hardware Complaint Validation:

asset_id is required
Asset must be active
Asset must be assigned to the ticket raiser
Asset's category must match the infra team (the team that handles hardware complaints)
4.7 Asset Transfer
Description: An asset is transferred from one employee to another. The operation is transactional and maintains a complete history.

Inputs: asset_id (path), to_user_id, note (optional, max 500 chars)

Transaction Steps (atomic):

Lock the asset row (SELECT FOR UPDATE)
Close the current active assignment: UPDATE asset_assignments SET returned_at = NOW() WHERE asset_id = $1 AND returned_at IS NULL
Insert a new assignment record with from_user_id, to_user_id, transferred_by, assigned_at = NOW()
Update assets.assigned_to = to_user_id
Business Rules:

Asset status must not be under_repair
to_user_id must be an active employee
to_user_id cannot equal the current assigned_to
Manager can only transfer assets within their managed category scope
Admin can transfer any asset
Outputs:

Updated asset record
New asset_assignment row (active)
Previous asset_assignment row closed (returned_at set)
Edge Cases:

Transfer attempted on under_repair asset: 400
Transfer to same current owner: 400
Target user is not an active employee: 400
Manager attempts transfer outside their category scope: 403
4.8 Asset History
Description: Every transfer of an asset is recorded in asset_assignments. The history is retrievable per asset and shows the full chain of ownership.

Query: Returns all asset_assignment rows for a given asset_id, joined with from_user, to_user, and transferred_by user names, ordered by assigned_at DESC.

Access: Admin and Manager (manager restricted to their category scope)

Fields returned per history entry: from_name, to_name, by_name, assigned_at, returned_at, note, current/returned status

4.9 Reporting
Description: The top failing devices report identifies assets with the highest number of associated tickets, enabling proactive hardware replacement decisions.

Endpoint: GET /api/reports/top-failing-devices?limit=N

Query Logic:

SELECT a.id, a.name, a.serial_number, COUNT(t.id) AS total_issues
FROM assets a
JOIN tickets t ON t.asset_id = a.id
GROUP BY a.id, a.name, a.serial_number
ORDER BY total_issues DESC
LIMIT $1
Inputs: limit (1–50, default 10) Outputs: Ranked list of assets with total ticket count Access: Admin, Manager

4.10 SLA Escalation
Description: A scheduled job runs daily and identifies tickets that have exceeded their SLA deadline. It marks them as escalated, logs the event, and emails the responsible manager.

Trigger: node-cron, configurable via SLA_CRON_SCHEDULE env var (default: 0 0 * * * — midnight daily)

Detection Query:

SELECT ... FROM tickets t
WHERE t.status IN ('assigned', 'in_progress')
  AND t.escalated = FALSE
  AND t.sla_due_date < NOW()
Actions per overdue ticket:

Set escalated = TRUE, escalated_at = COALESCE(escalated_at, NOW())
Write ticket_log entry: action = SLA_ESCALATED, performed_by = NULL
Send SLA escalation email to category.manager_user_id (if present)
Re-escalation: The query condition escalated = FALSE means each ticket is escalated only once. The flag is cleared when the ticket moves to resolved or closed (not currently implemented — see Section 10).

Edge Cases:

Data tickets have no manager_user_id: escalation flag and log are still written; email is skipped
Cron job failure: error is logged to console; no retry mechanism in MVP
5. Workflow Diagrams
5.1 Ticket Lifecycle — Full Flow
EMPLOYEE / MANAGER raises ticket
            |
            |-- category.requires_approval = FALSE (complaint, data)
            |         |
            |         v
            |   [SYSTEM] pending_approval
            |         |
            |         v
            |   [SYSTEM] approved
            |         |
            |         v
            |   [SYSTEM] assigned (round-robin to team)
            |
            |-- category.requires_approval = TRUE (request)
                      |
                      v
                pending_approval
                      |
              +-------+-------+
              |               |
        MANAGER rejects   MANAGER approves
              |               |
              v               v
          rejected         approved
         (terminal)           |
                              v
                    [SYSTEM] assigned (round-robin)
                              |
                              v
                    EMPLOYEE clicks "Start Working"
                              |
                              v
                         in_progress
                         /         \
                        /           \
              EMPLOYEE resolves   EMPLOYEE reports (can't resolve)
                      |                   |
                      v                   v
                  resolved           reported
                  /      \               |
                 /        \              v
    CREATOR closes   CREATOR disputes  [SYSTEM] pending_approval
         |           (report_reason)   (back to manager queue)
         v                |
       closed          reported
     (terminal)            |
                           v
                    [SYSTEM] pending_approval
                    (manager re-approves with
                     manual employee selection)
5.2 Manager vs Employee Behavior
MANAGER raises ticket
    |
    +-- In own category?
    |       YES --> Auto-approved + auto-assigned (same as no-approval flow)
    |       NO  --> Routes to that category's manager for approval
    |               (manager has no special privilege outside own category)
    |
    +-- Approval queue (/approvals/pending)
            Shows only tickets where approval_owner_id = req.user.id
            Manager can: Approve (auto-assigns) | Reject (reason required)
            On escalation: Re-approve with manual employee selection

EMPLOYEE raises ticket
    |
    +-- Complaint/Data --> Auto-approved + auto-assigned
    +-- Request        --> Pending approval (manager notified)
    |
    +-- Assigned ticket actions:
            assigned    --> Mark In Progress
            in_progress --> Mark Resolved | Report Issue
            resolved    --> Close Ticket (creator only) | Report Back (creator only)
5.3 Asset Transfer Flow
Admin / Manager initiates transfer
            |
            v
    Validate: asset not under_repair
    Validate: to_user is active employee
    Validate: to_user != current assigned_to
    Validate: manager scope (if manager)
            |
            v
    BEGIN TRANSACTION
            |
            v
    Close current assignment (returned_at = NOW())
            |
            v
    Insert new assignment record
            |
            v
    Update assets.assigned_to
            |
            v
    COMMIT
            |
            v
    Return updated asset
6. Authorization and Access Control
6.1 Role Permission Matrix
Action	Employee	Manager	Admin	Data Team
Raise complaint/request ticket	Yes	Yes	No	No
Raise data ticket	No	No	No	Yes (portal only)
View own tickets	Yes	Yes	No	Yes (own only)
View category tickets	No	Yes	No	No
View all tickets	No	No	Yes (read-only)	No
Approve / reject request	No	Yes (own approval_owner_id)	No	No
Mark in_progress / resolved	Yes (assigned)	Yes (assigned)	No	No
Close / report resolved	Yes (creator)	Yes (creator)	No	Yes (creator)
Manage users	No	No	Yes	No
Create assets	No	No	Yes	No
Transfer assets	No	Yes (category scope)	Yes	No
View all assets	No	No	Yes	No
View category assets	No	Yes	No	No
View own assets	Yes	Yes	No	No
Top failing devices report	No	Yes	Yes	No
Employee lookup	No	No	Yes	No
Data portal	No	No	No	Yes
6.2 Category-Based Restrictions
A manager's category_id points to their team row
Approval ownership is enforced via ticket.approval_owner_id — a manager can only act on tickets where this field matches their user id
Asset mutations by managers are restricted to assets whose category_id matches a category managed by that manager
Re-approval employee selection is restricted to employees whose category_id matches the target team of the ticket's category
6.3 Creator Authority Rule
After a ticket reaches resolved status, only the ticket creator (raised_by) can:

Close the ticket (resolved → closed)
Report the ticket back (resolved → reported, with reason min 10 chars)
The assigned employee cannot perform either action on a resolved ticket. This is enforced at the controller level before any transition validation.

7. Business Rules and Constraints
7.1 User Rules
emp_id must be unique across all users
email must be unique across all users
password_changed_at = NULL triggers a forced password change on first login
Deactivated users (is_active = FALSE) are rejected at the authentication middleware level
Admin cannot delete their own account
Users with ticket references (raised_by, assigned_to, performed_by, uploaded_by) cannot be deleted until ownership is transferred to another user (transactional)
7.2 Ticket Rules
Title: 5–200 characters (trimmed)
Description: minimum 20 characters (trimmed)
Priority: must be one of low, medium, high, critical
sla_days: integer between 1 and 30 inclusive
sla_due_date: always computed at insert as created_at + sla_days (never user-supplied)
Ticket number is year-scoped and type-prefixed; gaps are acceptable (retries may create gaps)
All status transitions must be validated before any database write
Terminal statuses (closed, rejected) have no outbound transitions
7.3 Asset Rules
serial_number must be unique across all assets
assigned_to is NOT NULL — every asset must have a current holder
Exactly one active assignment per asset at all times (enforced by partial unique index)
Transfer is blocked when status = under_repair
Hardware complaint tickets require an active asset assigned to the raiser
7.4 Status Transition Rules
Transitions are validated in ticketTransitions.ts — this is the single source of truth
No transition logic is permitted in controllers directly
Admin role always returns invalid for any status update attempt
data_team role cannot update ticket status via the main ticket endpoint
7.5 Password Rules
Minimum 8 characters
Must include at least one uppercase letter
Must include at least one lowercase letter
Must include at least one digit
Must include at least one special character
New password must differ from current password
Confirmation must match new password
7.6 File Upload Rules
Maximum file size: 5 MB
Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, image/png, image/jpeg
Filename is sanitised before storage: lowercase, unsafe characters replaced with hyphens, truncated to 40 chars, prefixed with ticket ID and timestamp
Temporary file is deleted if ticket creation fails after the file has been written to disk
8. Edge Case Handling
8.1 No Active Employees in Target Team
Scenario: A ticket is created or approved, but the target team has no active employees.

Handling: The assignment service throws an error. The calling controller catches it and returns HTTP 400 with message "No active employees are available in the mapped team." The ticket is not created or approved.

8.2 Manager Cross-Category Behavior
Scenario: A manager raises a ticket in a category outside their own team.

Handling: The ticket routes to the approval_owner_id determined by round-robin manager selection. The raising manager has no special privilege and cannot approve their own ticket. The ticket appears in the queue of whichever manager was assigned as approval_owner_id.

8.3 Asset Under Repair
Scenario: A transfer is attempted on an asset with status = under_repair.

Handling: The asset controller returns HTTP 400 with message "Cannot transfer an asset that is under repair." No database changes are made.

8.4 Invalid Status Transition
Scenario: A user attempts to move a ticket to a status not permitted from the current state.

Handling: validateTransition() returns { valid: false, reason: string }. The controller returns HTTP 400 with the reason. No database changes are made.

8.5 Ticket Number Collision
Scenario: Two concurrent ticket creations generate the same ticket_no.

Handling: The insert fails with PostgreSQL error code 23505 on the ticket_no unique constraint. The controller retries up to 3 times with a freshly generated number. If all 3 attempts fail, HTTP 409 is returned with code TICKET_NO_CONFLICT.

8.6 Non-Creator Attempting to Close Resolved Ticket
Scenario: The assigned employee (not the creator) attempts to close