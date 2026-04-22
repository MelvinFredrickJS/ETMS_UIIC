/**
 * Ticket Status Transition Logic
 * 
 * This module defines and validates all valid ticket status transitions in the ETMS system.
 * 
 * Status Flow Overview:
 * 1. pending_approval → approved/rejected (Manager)
 * 2. approved → assigned (System - Auto)
 * 3. assigned → in_progress (Employee - Assignee)
 * 4. in_progress → resolved/reported (Employee - Assignee)
 * 5. resolved → closed/reported (Employee - Raiser)
 * 6. reported → closed/pending_approval (Employee - Raiser)
 * 
 * Terminal Statuses (no further transitions):
 * - closed: Ticket successfully completed
 * - rejected: Ticket rejected by manager
 * 
 * Special Cases:
 * - Escalation: Only request tickets can go from reported → pending_approval
 * - Report During Work: Assignee can report issues from in_progress → reported
 * - Data Tickets: Must upload response file before resolving
 * 
 * Documentation:
 * - Full Docs: STATUS_TRANSITION_DOCUMENTATION.md
 * - Visual Diagrams: STATUS_TRANSITION_DIAGRAMS.md
 * - Quick Reference: STATUS_TRANSITION_QUICK_REFERENCE.md
 */

import type { TicketStatus, Role } from '../types'
import ROLES from '../constants/ROLES'

/**
 * Allowed Status Transitions Matrix
 * 
 * Defines all valid state transitions for tickets.
 * Empty array means terminal status (no transitions allowed).
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  pending_approval: ['approved', 'rejected'],  // Manager approves or rejects
  approved:         ['assigned'],              // System auto-assigns
  assigned:         ['in_progress'],           // Assignee starts work
  in_progress:      ['resolved', 'reported'],  // Assignee completes or reports issue
  reported:         ['closed', 'pending_approval'], // Raiser closes or escalates (request only)
  resolved:         ['closed', 'reported'],    // Raiser confirms or escalates (request only)
  rejected:         [],                        // Terminal status
  closed:           [],                        // Terminal status
}

interface TransitionResult {
  valid: boolean
  reason?: string
}

/**
 * Validate Ticket Status Transition
 * 
 * Checks if a status transition is valid based on:
 * 1. Transition matrix (is the transition allowed?)
 * 2. Role permissions (can this role perform this transition?)
 * 3. Special business rules (escalation, etc.)
 * 
 * @param fromStatus - Current ticket status
 * @param toStatus - Desired new status
 * @param actorRole - Role of the user attempting the transition
 * @returns Object with valid flag and optional reason for rejection
 * 
 * @example
 * const { valid, reason } = validateTransition('assigned', 'in_progress', 'employee')
 * if (!valid) {
 *   return res.status(400).json({ success: false, message: reason })
 * }
 */
function validateTransition(fromStatus: TicketStatus, toStatus: TicketStatus, actorRole: Role): TransitionResult {
  // Check if transition exists in matrix
  const allowed = ALLOWED_TRANSITIONS[fromStatus]
  if (!allowed) {
    return { valid: false, reason: `Unknown status: '${fromStatus}'` }
  }

  // Check if target status is in allowed list
  if (!allowed.includes(toStatus)) {
    return {
      valid: false,
      reason: `Cannot move from '${fromStatus}' to '${toStatus}'. ` +
              `Allowed: [${allowed.join(', ') || 'none'}]`
    }
  }

  // Employee-specific restrictions
  if (actorRole === ROLES.EMPLOYEE) {
    // Employees can only act on assigned, in_progress, resolved, or reported tickets
    if (!(['assigned', 'in_progress', 'resolved', 'reported'] as TicketStatus[]).includes(fromStatus)) {
      return { valid: false, reason: 'Employees can only act on assigned, in_progress, resolved, or reported tickets.' }
    }
    
    // From resolved: can only close or report (escalate)
    if (fromStatus === 'resolved' && !(['closed', 'reported'] as TicketStatus[]).includes(toStatus)) {
      return { valid: false, reason: 'Resolved tickets can only be closed or reported by the raiser.' }
    }
    
    // From reported: can only close or escalate to manager
    if (fromStatus === 'reported' && !(['closed', 'pending_approval'] as TicketStatus[]).includes(toStatus)) {
      return { valid: false, reason: 'Reported tickets can only be closed or sent back for manager approval.' }
    }
    
    // From assigned/in_progress: can only progress forward
    if ((['assigned', 'in_progress'] as TicketStatus[]).includes(fromStatus) &&
        !(['in_progress', 'resolved', 'reported'] as TicketStatus[]).includes(toStatus)) {
      return { valid: false, reason: 'Employees can only set: in_progress, resolved, reported.' }
    }
  }

  // Admin cannot change ticket status (they're system administrators, not part of workflow)
  if (actorRole === ROLES.ADMIN) {
    return { valid: false, reason: 'Admin cannot change ticket status.' }
  }

  return { valid: true }
}

/**
 * Get Allowed Next Statuses
 * 
 * Returns a list of valid next statuses for a ticket based on:
 * 1. Current status
 * 2. Actor's role
 * 3. Terminal status rules
 * 
 * This is used to populate status dropdown menus in the UI.
 * 
 * @param fromStatus - Current ticket status
 * @param actorRole - Role of the user viewing the ticket
 * @returns Array of allowed next statuses
 * 
 * @example
 * const allowedStatuses = getAllowedNextStatuses('in_progress', 'employee')
 * // Returns: ['resolved', 'reported']
 */
function getAllowedNextStatuses(fromStatus: TicketStatus, actorRole: Role): TicketStatus[] {
  const all = ALLOWED_TRANSITIONS[fromStatus] ?? []

  // Terminal and system-managed statuses have no allowed transitions
  if ((['approved', 'closed', 'rejected'] as TicketStatus[]).includes(fromStatus)) {
    return []
  }

  // Manager permissions
  if (actorRole === ROLES.MANAGER) {
    if (fromStatus === 'pending_approval') {
      return all.filter(s => (['approved', 'rejected'] as TicketStatus[]).includes(s))
    }
    if (fromStatus === 'resolved') {
      return all.filter(s => (['closed', 'reported'] as TicketStatus[]).includes(s))
    }
    if (fromStatus === 'reported') {
      return all.filter(s => (['closed', 'pending_approval'] as TicketStatus[]).includes(s))
    }
    return all.filter(s => (['in_progress', 'resolved', 'reported'] as TicketStatus[]).includes(s))
  }

  // Employee permissions
  if (actorRole === ROLES.EMPLOYEE) {
    if (fromStatus === 'resolved') {
      return all.filter(s => (['closed', 'reported'] as TicketStatus[]).includes(s))
    }
    if (fromStatus === 'reported') {
      return all.filter(s => (['closed', 'pending_approval'] as TicketStatus[]).includes(s))
    }
    return all.filter(s => (['in_progress', 'resolved', 'reported'] as TicketStatus[]).includes(s))
  }

  return all
}

export { validateTransition, getAllowedNextStatuses }
