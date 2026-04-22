# Ticket Status Transition - Visual Diagrams

## 🎨 Visual Flow Diagrams

This document provides visual representations of all ticket status transition flows in the ETMS system.

---

## 📊 Complete Status Transition Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE TICKET STATUS FLOW                               │
│                                                                              │
│                                                                              │
│                          ┌─────────────────┐                                │
│                          │     CREATE      │                                │
│                          │   (Employee)    │                                │
│                          └────────┬────────┘                                │
│                                   │                                          │
│                                   ▼                                          │
│                       ┌──────────────────────┐                              │
│                       │  pending_approval    │                              │
│                       │  (Awaiting Manager)  │                              │
│                       └──────────┬───────────┘                              │
│                                  │                                           │
│                    ┌─────────────┴─────────────┐                           │
│                    │                           │                            │
│                    ▼                           ▼                            │
│            ┌──────────────┐           ┌──────────────┐                     │
│            │   approved   │           │   rejected   │                     │
│            │  (Manager)   │           │  (Manager)   │                     │
│            └──────┬───────┘           └──────────────┘                     │
│                   │                          │                              │
│                   │                          ▼                              │
│                   │                    [TERMINAL]                           │
│                   │                                                         │
│                   ▼                                                         │
│            ┌──────────────┐                                                │
│            │   assigned   │                                                │
│            │   (System)   │                                                │
│            └──────┬───────┘                                                │
│                   │                                                         │
│                   ▼                                                         │
│            ┌──────────────┐                                                │
│            │ in_progress  │◄──────────┐                                    │
│            │  (Employee)  │           │                                    │
│            └──────┬───────┘           │                                    │
│                   │                   │                                    │
│         ┌─────────┴─────────┐         │                                    │
│         │                   │         │                                    │
│         ▼                   ▼         │                                    │
│  ┌──────────────┐    ┌──────────────┐│                                    │
│  │   resolved   │    │   reported   ││                                    │
│  │  (Employee)  │    │  (Employee)  ││                                    │
│  └──────┬───────┘    └──────┬───────┘│                                    │
│         │                   │        │                                    │
│         │         ┌─────────┴────┐   │                                    │
│         │         │              │   │                                    │
│         │         ▼              ▼   │                                    │
│         │   ┌──────────┐  ┌──────────────────┐                           │
│         │   │  closed  │  │ pending_approval │                           │
│         │   │ (Raiser) │  │    (Escalate)    │                           │
│         │   └──────────┘  └────────┬─────────┘                           │
│         │        │                 │                                      │
│         │        ▼                 └──────────────────┘                   │
│         │   [TERMINAL]                                                    │
│         │                                                                 │
│         └──────┬──────────┐                                               │
│                │          │                                               │
│                ▼          ▼                                               │
│          ┌──────────┐  ┌──────────┐                                      │
│          │  closed  │  │ reported │                                      │
│          │ (Raiser) │  │ (Raiser) │                                      │
│          └──────────┘  └────┬─────┘                                      │
│               │             │                                             │
│               ▼             └──────────┐                                  │
│          [TERMINAL]                    │                                  │
│                                        ▼                                  │
│                              ┌──────────────────┐                         │
│                              │ pending_approval │                         │
│                              │   OR closed      │                         │
│                              └──────────────────┘                         │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔵 Flow 1: Standard Ticket (Auto-Approved)

**Applies to:** Complaint tickets, Data tickets

```
┌─────────────────────────────────────────────────────────────┐
│                    STANDARD FLOW                             │
│              (No Manager Approval Required)                  │
└─────────────────────────────────────────────────────────────┘

    Employee Creates Ticket
            │
            ▼
    ┌───────────────────┐
    │ pending_approval  │  ← Brief moment
    └─────────┬─────────┘
              │ (Auto)
              ▼
    ┌───────────────────┐
    │     approved      │  ← System approves
    └─────────┬─────────┘
              │ (Auto)
              ▼
    ┌───────────────────┐
    │     assigned      │  ← System assigns to employee
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │   in_progress     │  ← Employee starts work
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │     resolved      │  ← Employee completes
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │      closed       │  ← Raiser confirms
    └───────────────────┘
         [TERMINAL]

Timeline: Minutes to Days
```

---

## 🟢 Flow 2: Request Ticket (Manager Approval)

**Applies to:** Request tickets

```
┌─────────────────────────────────────────────────────────────┐
│                   APPROVAL FLOW                              │
│              (Manager Approval Required)                     │
└─────────────────────────────────────────────────────────────┘

    Employee Creates Request
            │
            ▼
    ┌───────────────────┐
    │ pending_approval  │  ← Waits for manager
    └─────────┬─────────┘
              │
              ▼
         Manager Reviews
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────┐    ┌──────────┐
│ approved │    │ rejected │
└────┬─────┘    └──────────┘
     │               │
     │               ▼
     │          [TERMINAL]
     │
     ▼ (Auto)
┌──────────┐
│ assigned │
└────┬─────┘
     │
     ▼
┌──────────────┐
│ in_progress  │
└──────┬───────┘
       │
       ▼
┌──────────┐
│ resolved │
└────┬─────┘
     │
     ▼
┌──────────┐
│  closed  │
└──────────┘
 [TERMINAL]

Timeline: Hours to Days (depends on manager availability)
```

---

## 🟡 Flow 3: Escalation Flow (Request Only)

**Applies to:** Request tickets only  
**Trigger:** Raiser not satisfied with resolution

```
┌─────────────────────────────────────────────────────────────┐
│                  ESCALATION FLOW                             │
│         (Raiser Not Satisfied - Request Only)                │
└─────────────────────────────────────────────────────────────┘

    ... (ticket resolved) ...
            │
            ▼
    ┌───────────────────┐
    │     resolved      │  ← Employee completed work
    └─────────┬─────────┘
              │
              ▼
    Raiser Reviews Solution
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────┐    ┌──────────┐
│  closed  │    │ reported │  ← Raiser escalates
└──────────┘    └────┬─────┘    (min 10 char reason)
 [TERMINAL]          │
                     ▼
            ┌───────────────────┐
            │ pending_approval  │  ← Back to manager
            └─────────┬─────────┘
                      │
                      ▼
              Manager Re-Reviews
                      │
              ┌───────┴────────┐
              │                │
              ▼                ▼
        ┌──────────┐    ┌──────────┐
        │ approved │    │ rejected │
        └────┬─────┘    └──────────┘
             │               │
             │               ▼
             │          [TERMINAL]
             │
             ▼ (Auto)
        ┌──────────┐
        │ assigned │  ← May assign to different employee
        └────┬─────┘
             │
             ▼
        ┌──────────────┐
        │ in_progress  │
        └──────┬───────┘
               │
               ▼
        ┌──────────┐
        │ resolved │
        └────┬─────┘
               │
               ▼
        ┌──────────┐
        │  closed  │
        └──────────┘
         [TERMINAL]

Note: Can be escalated multiple times
```

---

## 🔴 Flow 4: Report During Work

**Applies to:** All ticket types  
**Trigger:** Assignee encounters issue during work

```
┌─────────────────────────────────────────────────────────────┐
│              REPORT DURING WORK FLOW                         │
│         (Assignee Reports Issue to Raiser)                   │
└─────────────────────────────────────────────────────────────┘

    ... (ticket in progress) ...
            │
            ▼
    ┌───────────────────┐
    │   in_progress     │  ← Employee working
    └─────────┬─────────┘
              │
              ▼
    Assignee Encounters Issue
    (e.g., missing info, unclear requirements)
              │
              ▼
    ┌───────────────────┐
    │     reported      │  ← Assignee reports to raiser
    └─────────┬─────────┘    (min 10 char reason)
              │
              ▼
    Raiser Receives Notification
              │
      ┌───────┴────────────────┐
      │                        │
      ▼                        ▼
┌──────────┐         ┌──────────────────┐
│  closed  │         │ pending_approval │  ← Escalate to manager
└──────────┘         └────────┬─────────┘    (Request only)
 [TERMINAL]                   │
                              ▼
                      (Follows approval flow)

Key Difference from Escalation:
- Escalation: After work completed (resolved)
- Report: During work (in_progress)
```

---

## 🟣 Flow 5: Data Ticket with File Upload

**Applies to:** Data tickets only  
**Special Rule:** Must upload response file before resolving

```
┌─────────────────────────────────────────────────────────────┐
│              DATA TICKET FLOW                                │
│         (Requires Response File Upload)                      │
└─────────────────────────────────────────────────────────────┘

    ... (ticket assigned) ...
            │
            ▼
    ┌───────────────────┐
    │   in_progress     │  ← Employee starts work
    └─────────┬─────────┘
              │
              ▼
    Employee Prepares Data
              │
              ▼
    ┌───────────────────────────┐
    │ Upload Response File      │  ← Required step
    │ POST /api/tickets/:id/    │
    │      upload-response      │
    └─────────┬─────────────────┘
              │
              ▼
    ┌───────────────────┐
    │     resolved      │  ← Can only resolve after upload
    └─────────┬─────────┘
              │
              ▼
    Raiser Downloads File
              │
              ▼
    ┌───────────────────┐
    │      closed       │  ← Raiser confirms
    └───────────────────┘
         [TERMINAL]

Validation:
❌ Cannot resolve without file upload
✅ Must upload file first
```

---

## 📋 Role-Based Transition Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WHO CAN CHANGE STATUS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Status              │  Admin  │  Manager  │  Employee  │  Data Team   │
│  ───────────────────────────────────────────────────────────────────── │
│  pending_approval    │    ❌   │    ✅     │     ❌     │      ❌      │
│  approved            │    ❌   │    ❌     │     ❌     │      ❌      │
│  assigned            │    ❌   │    ❌     │  ✅ (self) │   ✅ (self)  │
│  in_progress         │    ❌   │    ❌     │  ✅ (self) │   ✅ (self)  │
│  resolved            │    ❌   │ ✅ (raiser)│ ✅ (raiser)│   ✅ (raiser)│
│  reported            │    ❌   │ ✅ (raiser)│ ✅ (raiser)│   ✅ (raiser)│
│  rejected            │    ❌   │    ❌     │     ❌     │      ❌      │
│  closed              │    ❌   │    ❌     │     ❌     │      ❌      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Legend:
✅ Can change status
❌ Cannot change status
✅ (self) - Only if assigned to them
✅ (raiser) - Only if they raised the ticket
```

---

## 🎯 Ticket Type Behavior Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  TICKET TYPE BEHAVIORS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Feature              │ Complaint │  Request  │   Data    │            │
│  ──────────────────────────────────────────────────────────────────     │
│  Auto-Approval        │    ✅     │     ❌    │    ✅     │            │
│  Manager Approval     │    ❌     │     ✅    │    ❌     │            │
│  Can Escalate         │    ❌     │     ✅    │    ❌     │            │
│  Requires Asset       │ ✅ (hw)   │     ❌    │    ❌     │            │
│  Requires File Upload │    ❌     │     ❌    │    ✅     │            │
│  Auto-Assignment      │    ✅     │     ✅    │    ✅     │            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Notes:
- hw = hardware_complaint category only
- Escalation = raiser can send back to manager
- Auto-Assignment = system assigns to next available employee
```

---

## 🔄 State Transition Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TYPICAL TIMELINE                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CREATE                                                                  │
│    │                                                                     │
│    ▼ (instant)                                                          │
│  pending_approval                                                        │
│    │                                                                     │
│    ├─ Auto-Approved: < 1 second                                         │
│    └─ Manager Approval: 1 hour - 2 days                                 │
│    │                                                                     │
│    ▼                                                                     │
│  approved                                                                │
│    │                                                                     │
│    ▼ (instant)                                                          │
│  assigned                                                                │
│    │                                                                     │
│    └─ Wait for employee: 0 - 24 hours                                   │
│    │                                                                     │
│    ▼                                                                     │
│  in_progress                                                             │
│    │                                                                     │
│    └─ Work duration: 1 hour - 7 days                                    │
│    │                                                                     │
│    ▼                                                                     │
│  resolved                                                                │
│    │                                                                     │
│    └─ Raiser review: 1 hour - 3 days                                    │
│    │                                                                     │
│    ▼                                                                     │
│  closed                                                                  │
│                                                                          │
│  Total Time: 2 hours - 14 days (typical)                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🚨 Error Scenarios

### Scenario 1: Invalid Transition

```
Current: assigned
Attempt: resolved (skip in_progress)

    ┌──────────┐
    │ assigned │
    └────┬─────┘
         │
         ├─ ❌ resolved (INVALID)
         │
         └─ ✅ in_progress (VALID)
              └─ ✅ resolved

Error: "Cannot move from 'assigned' to 'resolved'. 
        Allowed: [in_progress]"
```

### Scenario 2: Terminal Status

```
Current: closed
Attempt: in_progress

    ┌──────────┐
    │  closed  │  [TERMINAL]
    └────┬─────┘
         │
         └─ ❌ Any status (INVALID)

Error: "Cannot move from terminal status 'closed'."
```

### Scenario 3: Permission Denied

```
Current: assigned
User: Manager (not assignee)
Attempt: in_progress

    ┌──────────┐
    │ assigned │
    └────┬─────┘
         │
         └─ ❌ in_progress (PERMISSION DENIED)

Error: "You do not have permission to update this ticket."
```

### Scenario 4: Missing File Upload

```
Current: in_progress (data ticket)
Attempt: resolved (no file uploaded)

    ┌──────────────┐
    │ in_progress  │
    └──────┬───────┘
           │
           ├─ ❌ resolved (MISSING FILE)
           │
           └─ ✅ Upload file first
                └─ ✅ resolved

Error: "Upload requested data file before marking resolved."
```

---

## 📊 Status Distribution (Typical)

```
┌─────────────────────────────────────────────────────────────┐
│              TYPICAL STATUS DISTRIBUTION                     │
│                  (Active Tickets)                            │
└─────────────────────────────────────────────────────────────┘

pending_approval  ████░░░░░░  10%
approved          ██░░░░░░░░   5%
assigned          ████████░░  20%
in_progress       ████████████████████  50%
resolved          ████░░░░░░  10%
reported          ██░░░░░░░░   5%

closed (terminal) ████████████████████████████████  70% of all tickets
rejected (terminal) ██░░░░░░░░   5% of all tickets
```

---

**Last Updated:** April 22, 2026  
**Version:** 1.0.0  
**Status:** ✅ Complete Visual Documentation
