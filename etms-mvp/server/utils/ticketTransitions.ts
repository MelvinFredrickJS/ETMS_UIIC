import type { TicketStatus, Role } from '../types'
import ROLES from '../constants/ROLES'

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  pending_approval: ['approved', 'rejected'],
  approved:         ['assigned'],
  assigned:         ['in_progress'],
  in_progress:      ['resolved', 'reported'],
  reported:         ['pending_approval'],
  resolved:         ['closed', 'reported'],
  rejected:         [],
  closed:           [],
}

interface TransitionResult {
  valid: boolean
  reason?: string
}

function validateTransition(fromStatus: TicketStatus, toStatus: TicketStatus, actorRole: Role): TransitionResult {
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

  if (actorRole === ROLES.EMPLOYEE) {
    if (!(['assigned', 'in_progress', 'resolved'] as TicketStatus[]).includes(fromStatus)) {
      return { valid: false, reason: 'Employees can only act on assigned, in_progress, or resolved tickets.' }
    }
    if (fromStatus === 'resolved' && !(['closed', 'reported'] as TicketStatus[]).includes(toStatus)) {
      return { valid: false, reason: 'Resolved tickets can only be closed or reported by the raiser.' }
    }
    if ((['assigned', 'in_progress'] as TicketStatus[]).includes(fromStatus) &&
        !(['in_progress', 'resolved', 'reported'] as TicketStatus[]).includes(toStatus)) {
      return { valid: false, reason: 'Employees can only set: in_progress, resolved, reported.' }
    }
  }

  if (actorRole === ROLES.ADMIN) {
    return { valid: false, reason: 'Admin cannot change ticket status.' }
  }

  return { valid: true }
}

function getAllowedNextStatuses(fromStatus: TicketStatus, actorRole: Role): TicketStatus[] {
  const all = ALLOWED_TRANSITIONS[fromStatus] ?? []

  if ((['approved', 'reported', 'closed', 'rejected'] as TicketStatus[]).includes(fromStatus)) {
    return []
  }

  if (actorRole === ROLES.MANAGER) {
    if (fromStatus === 'pending_approval') {
      return all.filter(s => (['approved', 'rejected'] as TicketStatus[]).includes(s))
    }
    if (fromStatus === 'resolved') {
      return all.filter(s => (['closed', 'reported'] as TicketStatus[]).includes(s))
    }
    return all.filter(s => (['in_progress', 'resolved', 'reported'] as TicketStatus[]).includes(s))
  }

  if (actorRole === ROLES.EMPLOYEE) {
    if (fromStatus === 'resolved') {
      return all.filter(s => (['closed', 'reported'] as TicketStatus[]).includes(s))
    }
    return all.filter(s => (['in_progress', 'resolved', 'reported'] as TicketStatus[]).includes(s))
  }

  return all
}

export { validateTransition, getAllowedNextStatuses }
