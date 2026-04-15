import type { TypeKey } from '../../types'
import { TICKET_TYPE_COLORS } from '../../constants/TICKET_TYPES'

interface TypeDef {
  key: TypeKey
  title: string
  subtitle: string
  examples: string
}

const TYPES: TypeDef[] = [
  {
    key:      'complaint',
    title:    'Complaint',
    subtitle: 'Report a problem that needs fixing',
    examples: 'Network down · Software crash · Hardware fault',
  },
  {
    key:      'request',
    title:    'Request',
    subtitle: 'Request something new or get access',
    examples: 'Gate pass · New hardware · Port access · Credentials',
  },
  {
    key:      'data',
    title:    'Data',
    subtitle: 'Request records, payslips or data backups',
    examples: 'Paycheque balance · Data backup',
  },
]

const SELECTED_STYLES: Record<TypeKey, string> = {
  complaint: 'border-red-500    ring-2 ring-red-200    bg-red-50',
  request:   'border-blue-500   ring-2 ring-blue-200   bg-blue-50',
  data:      'border-yellow-500 ring-2 ring-yellow-200 bg-yellow-50',
}

const HOVER_STYLES: Record<TypeKey, string> = {
  complaint: 'hover:border-red-300',
  request:   'hover:border-blue-300',
  data:      'hover:border-yellow-300',
}

interface Props {
  selectedType: TypeKey | ''
  onSelect: (key: TypeKey) => void
}

export default function TicketTypeSelector({ selectedType, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {TYPES.map(({ key, title, subtitle, examples }) => {
        const t          = TICKET_TYPE_COLORS[key]
        const isSelected = selectedType === key

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`relative text-left p-4 rounded-xl border-2 transition-all
              ${isSelected
                ? SELECTED_STYLES[key]
                : `border-gray-200 bg-white ${HOVER_STYLES[key]}`
              }`}
          >
            {/* Checkmark */}
            {isSelected && (
              <span className="absolute top-2 right-2 text-sm font-bold text-current">✓</span>
            )}

            <div className="text-2xl mb-2">{t.icon}</div>
            <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
            <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
            <p className="text-xs text-gray-400 italic">{examples}</p>
          </button>
        )
      })}
    </div>
  )
}
