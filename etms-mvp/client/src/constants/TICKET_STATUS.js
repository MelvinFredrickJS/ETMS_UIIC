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
