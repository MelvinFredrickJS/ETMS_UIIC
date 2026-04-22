# Status Transition - Quick Reference

## 🚀 Quick Reference Guide

Fast lookup for ticket status transitions in ETMS.

---

## 📋 All Statuses

| Status | Description | Terminal? |
|--------|-------------|-----------|
| `pending_approval` | Awaiting manager approval | No |
| `approved` | Approved by manager | No |
| `assigned` | Assigned to employee | No |
| `in_progress` | Employee working | No |
| `resolved` | Work completed | No |
| `reported` | Issue reported | No |
| `closed` | Successfully completed | **Yes** |
| `rejected` | Rejected by manager | **Yes** |

---

## ⚡ Quick Transition Lookup

### From `pending_approval`
```
✅ approved (Manager)
✅ rejected (Manager) [TERMINAL]
```

### From `approved`
```
✅ assigned (System - Auto)
```

### From `assigned`
```
✅ in_progress (Employee - Assignee only)
```

### From `in_progress`
```
✅ resolved (Employee - Assignee only)
✅ reported (Employee - Assignee only)
```

### From `resolved`
```
✅ closed (Employee - Raiser only)
✅ reported (Employee - Raiser only, Request tickets only)
```

### From `reported`
```
✅ closed (Employee - Raiser only)
✅ pending_approval (Employee - Raiser only, Request tickets only)
```

### From `rejected`
```
❌ No transitions (TERMINAL)
```

### From `closed`
```
❌ No transitions (TERMINAL)
```

---

## 👥 Who Can Change Status?

### Admin
```
❌ Cannot change any status
```

### Manager
```
✅ pending_approval → approved/rejected
✅ resolved → closed (if raiser)
✅ reported → closed/pending_approval (if raiser)
```

### Employee
```
✅ assigned → in_progress (if assignee)
✅ in_progress → resolved/reported (if assignee)
✅ resolved → closed/reported (if raiser)
✅ reported → closed/pending_approval (if raiser)
```

### Data Team
```
✅ Same as Employee for assigned tickets
```

---

## 🎭 Ticket Type Rules

### Complaint Tickets
```
✅ Auto-approved
✅ Auto-assigned
❌ Cannot escalate
✅ Hardware complaints require asset
```

### Request Tickets
```
❌ Requires manager approval
✅ Auto-assigned after approval
✅ Can escalate (resolved → reported → pending_approval)
```

### Data Tickets
```
✅ Auto-approved
✅ Auto-assigned
❌ Cannot escalate
✅ Must upload file before resolving
```

---

## 🔒 Special Rules

### Escalation (Request Only)
```
resolved → reported → pending_approval
- Only for request tickets
- Requires reason (min 10 chars)
- Goes back to manager
```

### Report During Work
```
in_progress → reported → closed OR pending_approval
- Any ticket type
- Requires reason (min 10 chars)
- Notifies raiser
```

### Data File Upload
```
in_progress → (upload file) → resolved
- Data tickets only
- Must upload before resolving
- Endpoint: POST /api/tickets/:id/upload-response
```

### Hardware Complaint
```
CREATE → (must have valid asset)
- Asset must be assigned to raiser
- Asset must be active
- Asset must belong to infra team
```

---

## 🚫 Common Errors

### "Cannot move from X to Y"
```
Cause: Invalid transition
Fix: Check allowed transitions above
```

### "You do not have permission"
```
Cause: Wrong role or not assignee/raiser
Fix: Check role permissions above
```

### "Upload requested data file"
```
Cause: Data ticket missing file
Fix: Upload file first
```

### "Only request tickets can be escalated"
```
Cause: Trying to escalate non-request ticket
Fix: Only request tickets support escalation
```

### "Cannot move from terminal status"
```
Cause: Trying to change closed/rejected ticket
Fix: Terminal statuses cannot be changed
```

---

## 📊 Typical Flows

### Standard (Auto-Approved)
```
CREATE → pending_approval → approved → assigned → 
in_progress → resolved → closed
```

### With Approval
```
CREATE → pending_approval → (manager approves) → 
approved → assigned → in_progress → resolved → closed
```

### With Escalation
```
... → resolved → reported → pending_approval → 
approved → assigned → in_progress → resolved → closed
```

### Report During Work
```
... → in_progress → reported → closed
```

---

## 🔍 Quick Checks

### Can I change this status?
1. Check if status is terminal (closed/rejected) → ❌ No
2. Check if you're the assignee (for assigned/in_progress) → ✅ Yes
3. Check if you're the raiser (for resolved/reported) → ✅ Yes
4. Check if you're the approval owner (for pending_approval) → ✅ Yes
5. Otherwise → ❌ No

### Can I escalate this ticket?
1. Is it a request ticket? → If No, ❌ Cannot escalate
2. Is status resolved or reported? → If No, ❌ Cannot escalate
3. Are you the raiser? → If No, ❌ Cannot escalate
4. All Yes → ✅ Can escalate

### Can I resolve this data ticket?
1. Is it a data ticket? → If No, ✅ Can resolve normally
2. Have you uploaded response file? → If No, ❌ Must upload first
3. All Yes → ✅ Can resolve

---

## 📞 Need More Info?

- **Full Documentation:** `STATUS_TRANSITION_DOCUMENTATION.md`
- **Visual Diagrams:** `STATUS_TRANSITION_DIAGRAMS.md`
- **Code:** `etms-mvp/server/utils/ticketTransitions.ts`

---

**Last Updated:** April 22, 2026  
**Version:** 1.0.0
