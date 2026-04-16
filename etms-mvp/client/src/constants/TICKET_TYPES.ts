import type { TypeKey } from '../types'

export interface TicketTypeConfig {
  border: string
  badge:  string
  ring:   string
  icon:   string
  label:  string
}

// THREE ticket types — complaint, request, data
export const TICKET_TYPE_COLORS: Record<TypeKey, TicketTypeConfig> = {
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
export const CATEGORY_ICONS: Record<string, string> = {
  network_issue:      '🌐',
  software_issue:     '💻',
  hardware_complaint: '🖥️',
  hardware_issue:     '🖥️',
  gate_pass:          '🪪',
  credential_request: '🔑',
  port_request:       '🔌',
  new_hardware:       '🖨️',
  new_software:       '📦',
  paycheque_balance:  '💰',
  data_backup:        '💾',
}
