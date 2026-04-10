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
  approved:         ['assigned'],           // system only
  assigned:         ['in_progress'],
  in_progress:      ['resolved', 'reported'],
  reported:         ['pending_approval'],   // system only — back to manager queue
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
      return all.filter(s => ['approved', 'rejected'].includes(s))
    }
    if (fromStatus === 'resolved') {
      return all.filter(s => ['closed', 'reported'].includes(s))
    }
    return all.filter(s => ['in_progress', 'resolved', 'reported'].includes(s))
  }

  if (actorRole === ROLES.EMPLOYEE) {
    if (fromStatus === 'resolved') {
      return all.filter(s => ['closed', 'reported'].includes(s))
    }
    return all.filter(s => ['in_progress', 'resolved', 'reported'].includes(s))
  }

  return all
}

module.exports = { validateTransition, getAllowedNextStatuses }
