# Ticket Status Transition Logic - Complete Documentation

## 📋 Overview

This document provides comprehensive documentation for the ETMS ticket status transition system, including all valid transitions, role-based permissions, business rules, and special cases.

---

## 🎯 Ticket Statuses

### Status Definitions

| Status | Description | Terminal? | Who Can Set |
|--------|-------------|-----------|-------------|
| **pending_approval** | Ticket awaiting manager approval | No | System (auto) |
| **approved** | Ticket approved by manager | No | Manager |
| **assigned** | Ticket assigned to employee | No | System (auto) |
| **in_progress** | Employee actively working on ticket | No | Employee |
| **resolved** | Employee completed work | No | Employee |
| **reported** | Issue reported by raiser or assignee | No | Employee (raiser/assignee) |
| **closed** | Ticket successfully completed | Yes ✅ | Employee (raiser) |
| **rejected** | Ticket rejected by manager | Yes ✅ | Manager |

### Terminal Statuses

**Terminal statuses cannot be changed:**
- `closed` - Ticket successfully completed
- `rejected` - Ticket rejected by manager

Once a ticket reaches a terminal status, no further transitions are allowed.

---

## 🔄 Status Transition Flow

### Standard Flow (No Approval Required)

```
┌─────────────────────────────────────────────────────────────┐
│                    STANDARD FLOW                             │
│          (Complaint & Data tickets - auto-approved)          │
└─────────────────────────────────────────────────────────────┘

    CREATE
      ↓
pending_approval (brief)
      ↓
   approved (auto)
      ↓
   assigned (auto)
      ↓
  in_progress (employee starts work)
      ↓
   resolved (employee completes)
      ↓
    closed (raiser confirms)
```

### Approval Flow (Request Tickets)

```
┌─────────────────────────────────────────────────────────────┐
│                     APPROVAL FLOW                            │
│              (Request tickets - needs approval)              │
└─────────────────────────────────────────────────────────────┘

    CREATE
      ↓
pending_approval ──────────┐
      ↓                     │
   approved              rejected (terminal)
      ↓
   assigned
      ↓
  in_progress
      ↓
   resolved
      ↓
    closed
```

### Escalation Flow (Request Tickets Only)

```
┌─────────────────────────────────────────────────────────────┐
│                   ESCALATION FLOW                            │
│         (Request tickets - raiser not satisfied)             │
└─────────────────────────────────────────────────────────────┘

   resolved
      ↓
   reported (raiser escalates)
      ↓
pending_approval (back to manager)
      ↓
   approved
      ↓
   assigned (reassigned)
      ↓
  in_progress
      ↓
   resolved
      ↓
    closed
```

### Report During Work Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 REPORT DURING WORK FLOW                      │
│          (Assignee reports issue to raiser)                  │
└─────────────────────────────────────────────────────────────┘

  in_progress
      ↓
   reported (assignee reports to raiser)
      ↓
    closed (raiser closes)
      OR
pending_approval (raiser escalates - request only)
```

---

## 📊 Complete Transition Matrix

### All Valid Transitions

| From Status | To Status(es) | Who Can Perform | Notes |
|-------------|---------------|-----------------|-------|
| **pending_approval** | approved | Manager | Approve ticket |
| **pending_approval** | rejected | Manager | Reject ticket (terminal) |
| **approved** | assigned | System (auto) | Auto-assigned to employee |
| **assigned** | in_progress | Employee (assignee) | Start work |
| **in_progress** | resolved | Employee (assignee) | Complete work |
| **in_progress** | reported | Employee (assignee) | Report issue to raiser |
| **resolved** | closed | Employee (raiser) | Confirm completion |
| **resolved** | reported | Employee (raiser) | Escalate (request only) |
| **reported** | closed | Employee (raiser) | Close ticket |
| **reported** | pending_approval | Employee (raiser) | Escalate to manager (request only) |
| **rejected** | - | - | Terminal status |
| **closed** | - | - | Terminal status |

---

## 👥 Role-Based Permissions

### Admin
```
❌ Cannot change ticket status
✅ Can view all tickets
✅ Can view status history
```

**Reason:** Admins are system administrators, not part of the ticket workflow.

### Manager
```
✅ pending_approval → approved
✅ pending_approval → rejected
✅ resolved → closed (if raiser)
✅ reported → closed (if raiser)
✅ reported → pending_approval (if raiser, request only)
```

**Key Rules:**
- Can approve/reject tickets in `pending_approval`
- Can act as raiser if they created the ticket
- Cannot change status of `assigned` or `in_progress` tickets

### Employee
```
✅ assigned → in_progress (if assignee)
✅ in_progress → resolved (if assignee)
✅ in_progress → reported (if assignee)
✅ resolved → closed (if raiser)
✅ resolved → reported (if raiser, request only)
✅ reported → closed (if raiser)
✅ reported → pending_approval (if raiser, request only)
```

**Key Rules:**
- Can only change status of tickets they're assigned to or raised
- Cannot approve/reject tickets
- Cannot change status of other employees' tickets

### Data Team
```
✅ assigned → in_progress (if assignee)
✅ in_progress → resolved (if assignee)
✅ in_progress → reported (if assignee)
```

**Key Rules:**
- Same as employee for assigned tickets
- Cannot raise tickets (typically)
- Limited to data ticket workflow

---

## 🎭 Special Cases & Business Rules

### 1. Auto-Approval (Complaint & Data Tickets)

**Ticket Types:** `complaint`, `data`

**Flow:**
```
CREATE → pending_approval → approved → assigned
         (instant)         (instant)  (instant)
```

**Rules:**
- No manager approval required
- Automatically approved upon creation
- Automatically assigned to next available employee
- Raiser receives approval email
- Assignee receives assignment email

**Code Location:** `ticketController.ts` - `createTicket()`

### 2. Manager Approval (Request Tickets)

**Ticket Type:** `request`

**Flow:**
```
CREATE → pending_approval → (waits for manager)
                          ↓
                       approved/rejected
```

**Rules:**
- Requires explicit manager approval
- Manager receives pending approval email
- Ticket stays in `pending_approval` until manager acts
- If rejected, ticket becomes terminal
- If approved, auto-assigned to employee

**Code Location:** `ticketController.ts` - `createTicket()`

### 3. Escalation (Request Tickets Only)

**Ticket Type:** `request` only

**Trigger:** Raiser not satisfied with resolution

**Flow:**
```
resolved → reported → pending_approval → approved → assigned
```

**Rules:**
- Only `request` tickets can be escalated
- Raiser must provide escalation reason (min 10 characters)
- Ticket goes back to manager for re-approval
- Manager receives escalation email
- Can be escalated multiple times

**Validation:**
```typescript
if (ticket.type_key !== 'request') {
  return error('Only request tickets can be escalated to manager.')
}
```

**Code Location:** `ticketController.ts` - `updateTicketStatus()`

### 4. Report During Work

**Trigger:** Assignee encounters issue during work

**Flow:**
```
in_progress → reported → closed (by raiser)
                      OR
                      → pending_approval (escalate, request only)
```

**Rules:**
- Assignee must provide report reason (min 10 characters)
- Ticket goes to `reported` status
- Raiser receives notification
- Raiser can close or escalate (request only)
- Does NOT trigger re-approval automatically

**Difference from Escalation:**
- Escalation: Raiser not satisfied with completed work
- Report: Assignee reports issue before completion

**Code Location:** `ticketController.ts` - `updateTicketStatus()`

### 5. Data Ticket Response File

**Ticket Type:** `data` only

**Rule:** Cannot mark as `resolved` without uploading response file

**Validation:**
```typescript
if (status === 'resolved' && ticket.type_key === 'data') {
  const responseAttachment = getLatestResponseAttachment(attachments, ticket.assigned_to)
  if (!responseAttachment) {
    return error('Upload requested data file before marking resolved.')
  }
}
```

**Flow:**
```
in_progress → (upload response file) → resolved
```

**Code Location:** `ticketController.ts` - `updateTicketStatus()`

### 6. Hardware Complaint Asset Validation

**Ticket Type:** `complaint` with category `hardware_complaint`

**Rule:** Must have valid asset assigned to raiser

**Validation at Creation:**
```typescript
- Asset must exist
- Asset must be assigned to raiser
- Asset must belong to infra team
- Asset must be active
```

**Code Location:** `ticketController.ts` - `createTicket()`

---

## 🔒 Access Control Rules

### Who Can Update Status?

#### For `assigned` and `in_progress` tickets:
```typescript
✅ Only the assigned employee can update
❌ Raiser cannot update
❌ Manager cannot update
❌ Other employees cannot update
```

#### For `resolved` and `reported` tickets:
```typescript
✅ Only the raiser can update
❌ Assignee cannot update
❌ Manager cannot update (unless they are the raiser)
❌ Other employees cannot update
```

#### For `pending_approval` tickets:
```typescript
✅ Only the approval owner (manager) can update
❌ Raiser cannot update
❌ Assignee cannot update
❌ Other managers cannot update
```

#### For `approved`, `closed`, `rejected` tickets:
```typescript
❌ No one can update (terminal or system-managed)
```

---

## 📝 Validation Rules

### 1. Status Transition Validation

**Function:** `validateTransition(fromStatus, toStatus, actorRole)`

**Checks:**
1. Is the transition allowed in the transition matrix?
2. Does the actor's role permit this transition?
3. Are there any special conditions?

**Example:**
```typescript
const { valid, reason } = validateTransition('assigned', 'in_progress', 'employee')
if (!valid) {
  return error(reason)
}
```

### 2. Report Reason Validation

**Required for:**
- `in_progress` → `reported`
- `resolved` → `reported`

**Rule:** Minimum 10 characters

```typescript
if (reason.length < 10) {
  return error('report_reason must be at least 10 characters.')
}
```

### 3. Escalation Validation

**Required for:**
- `reported` → `pending_approval`

**Rules:**
1. Only `request` tickets can be escalated
2. Escalation reason required (min 10 characters)

```typescript
if (ticket.type_key !== 'request') {
  return error('Only request tickets can be escalated to manager.')
}
```

### 4. Data Response File Validation

**Required for:**
- `in_progress` → `resolved` (data tickets only)

**Rule:** Response file must be uploaded by assignee

```typescript
if (ticket.type_key === 'data' && !responseAttachment) {
  return error('Upload requested data file before marking resolved.')
}
```

---

## 🔔 Email Notifications

### Notification Triggers

| Status Change | Recipient | Email Type |
|---------------|-----------|------------|
| CREATE → pending_approval | Manager | Pending Approval |
| pending_approval → approved | Raiser | Ticket Approved |
| approved → assigned | Assignee | Ticket Assigned |
| in_progress → resolved | Raiser | Ticket Resolved |
| resolved → reported | Manager | Escalation |
| reported → pending_approval | Manager | Escalation |
| in_progress → reported | Raiser | Ticket Resolved (notification) |

---

## 📊 Status Transition Examples

### Example 1: Standard Complaint Ticket

```
1. Employee creates complaint ticket
   Status: pending_approval

2. System auto-approves
   Status: approved
   Email: Raiser receives approval

3. System auto-assigns to employee
   Status: assigned
   Email: Assignee receives assignment

4. Assignee starts work
   Status: in_progress
   Action: Employee clicks "Start Work"

5. Assignee completes work
   Status: resolved
   Email: Raiser receives resolution

6. Raiser confirms completion
   Status: closed (terminal)
   Action: Raiser clicks "Close"
```

### Example 2: Request Ticket with Approval

```
1. Employee creates request ticket
   Status: pending_approval
   Email: Manager receives approval request

2. Manager approves
   Status: approved
   Action: Manager clicks "Approve"
   Email: Raiser receives approval

3. System auto-assigns
   Status: assigned
   Email: Assignee receives assignment

4. Assignee starts work
   Status: in_progress

5. Assignee completes work
   Status: resolved
   Email: Raiser receives resolution

6. Raiser confirms
   Status: closed (terminal)
```

### Example 3: Request Ticket with Escalation

```
1. Employee creates request ticket
   Status: pending_approval

2. Manager approves
   Status: approved → assigned

3. Assignee works and resolves
   Status: in_progress → resolved

4. Raiser not satisfied, escalates
   Status: reported
   Action: Raiser clicks "Report Issue"
   Reason: "Solution doesn't address the problem"

5. System sends back to manager
   Status: pending_approval
   Email: Manager receives escalation

6. Manager re-approves
   Status: approved → assigned (possibly different employee)

7. New assignee resolves
   Status: in_progress → resolved

8. Raiser confirms
   Status: closed (terminal)
```

### Example 4: Assignee Reports Issue

```
1. Ticket assigned and in progress
   Status: in_progress

2. Assignee encounters issue
   Status: reported
   Action: Assignee clicks "Report Issue"
   Reason: "Missing information from raiser"
   Email: Raiser receives notification

3. Raiser closes ticket
   Status: closed (terminal)
   Action: Raiser provides info and closes

   OR

3. Raiser escalates (request only)
   Status: pending_approval
   Action: Raiser escalates to manager
```

### Example 5: Data Ticket with File Upload

```
1. Employee creates data request
   Status: pending_approval → approved → assigned

2. Assignee starts work
   Status: in_progress

3. Assignee tries to resolve without file
   Status: in_progress
   Error: "Upload requested data file before marking resolved"

4. Assignee uploads response file
   Action: Upload via /api/tickets/:id/upload-response

5. Assignee marks resolved
   Status: resolved
   Email: Raiser receives resolution

6. Raiser downloads file and confirms
   Status: closed (terminal)
```

---

## 🛠️ Implementation Details

### Code Structure

```
etms-mvp/server/
├── utils/
│   └── ticketTransitions.ts          # Transition logic
├── controllers/
│   └── ticketController.ts           # Status update handling
└── models/
    └── ticketModel.ts                # Database operations
```

### Key Functions

#### 1. `validateTransition(fromStatus, toStatus, actorRole)`

**Purpose:** Validate if a status transition is allowed

**Returns:**
```typescript
{
  valid: boolean
  reason?: string
}
```

**Example:**
```typescript
const { valid, reason } = validateTransition('assigned', 'in_progress', 'employee')
if (!valid) {
  res.status(400).json({ success: false, message: reason })
}
```

#### 2. `getAllowedNextStatuses(fromStatus, actorRole)`

**Purpose:** Get list of allowed next statuses for a ticket

**Returns:** `TicketStatus[]`

**Example:**
```typescript
const allowedStatuses = getAllowedNextStatuses('in_progress', 'employee')
// Returns: ['resolved', 'reported']
```

#### 3. `updateTicketStatus(req, res)`

**Purpose:** Handle status update requests

**Validations:**
1. Ticket exists
2. Not a terminal status
3. User has permission
4. Transition is valid
5. Special conditions met

---

## 🧪 Testing Status Transitions

### Test Cases

#### Test 1: Valid Transitions
```typescript
✅ pending_approval → approved (manager)
✅ approved → assigned (system)
✅ assigned → in_progress (assignee)
✅ in_progress → resolved (assignee)
✅ resolved → closed (raiser)
```

#### Test 2: Invalid Transitions
```typescript
❌ assigned → resolved (skip in_progress)
❌ in_progress → closed (skip resolved)
❌ closed → in_progress (terminal status)
❌ rejected → approved (terminal status)
```

#### Test 3: Permission Checks
```typescript
❌ Employee tries to approve ticket
❌ Manager tries to resolve ticket
❌ Admin tries to change status
❌ Non-assignee tries to update assigned ticket
```

#### Test 4: Special Cases
```typescript
✅ Data ticket requires file upload before resolved
✅ Request ticket can be escalated
✅ Complaint ticket cannot be escalated
✅ Report during work doesn't trigger re-approval
```

---

## 📚 Related Documentation

- **Access Control:** `ACCESS_CONTROL_QUICK_REFERENCE.md`
- **Ticket API:** See API documentation
- **Email Notifications:** `emailService.ts`
- **Ticket Types:** `TICKET_TYPES.ts`

---

## 🔍 Troubleshooting

### Issue: "Cannot move from X to Y"

**Cause:** Invalid transition in transition matrix

**Solution:** Check `ALLOWED_TRANSITIONS` in `ticketTransitions.ts`

### Issue: "You do not have permission to update this ticket"

**Cause:** User doesn't have permission for this status

**Solution:** Check access control rules above

### Issue: "Upload requested data file before marking resolved"

**Cause:** Data ticket missing response file

**Solution:** Upload file via `/api/tickets/:id/upload-response` first

### Issue: "Only request tickets can be escalated to manager"

**Cause:** Trying to escalate non-request ticket

**Solution:** Only `request` tickets support escalation

---

**Last Updated:** April 22, 2026  
**Version:** 1.0.0  
**Status:** ✅ Complete Documentation
