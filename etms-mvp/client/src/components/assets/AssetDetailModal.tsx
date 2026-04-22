import { useState } from 'react'
import { updateAssetSpec } from '../../api/ticketApi'
import type { Asset } from '../../types'

interface Props {
  asset: Asset
  canEdit: boolean          // true for admin and infra manager
  onClose: () => void
  onUpdated: (updated: Asset) => void
}

const SPEC_FIELDS: { key: keyof Asset; label: string; placeholder?: string }[] = [
  { key: 'machine_type',  label: 'Machine Type',       placeholder: 'e.g. DESKTOP' },
  { key: 'model',         label: 'Model',              placeholder: 'e.g. DELL OPTIPLEX3070' },
  { key: 'ram',           label: 'RAM',                placeholder: 'e.g. 16GB' },
  { key: 'hdd',           label: 'HDD / Storage',      placeholder: 'e.g. 500GB' },
  { key: 'os',            label: 'Operating System',   placeholder: 'e.g. WIN 11 23H2' },
  { key: 'ms_office_ver', label: 'MS Office Version',  placeholder: 'e.g. 2016' },
  { key: 'system_ip',     label: 'System IP',          placeholder: 'e.g. 10.100.22.13' },
  { key: 'port',          label: 'Port',               placeholder: 'e.g. D1' },
  { key: 'host_id',       label: 'Host ID',            placeholder: 'e.g. HO-D-HP25-088' },
  { key: 'monitor_serial',label: 'Monitor Serial No',  placeholder: 'e.g. MMLY6S00...' },
  { key: 'monitor_make',  label: 'Monitor Make',       placeholder: 'e.g. HP' },
  { key: 'floor',         label: 'Floor',              placeholder: 'e.g. 12TH' },
  { key: 'branch',        label: 'Branch',             placeholder: 'e.g. HO' },
]

const STATUS_BADGE: Record<string, string> = {
  active:       'bg-green-100 text-green-700',
  under_repair: 'bg-yellow-100 text-yellow-700',
  retired:      'bg-gray-100 text-gray-500',
}

export default function AssetDetailModal({ asset, canEdit, onClose, onUpdated }: Props) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState('')
  const [form,    setForm]      = useState<Partial<Asset>>({
    machine_type:  asset.machine_type  ?? '',
    model:         asset.model         ?? '',
    ram:           asset.ram           ?? '',
    hdd:           asset.hdd           ?? '',
    os:            asset.os            ?? '',
    ms_office_ver: asset.ms_office_ver ?? '',
    system_ip:     asset.system_ip     ?? '',
    port:          asset.port          ?? '',
    host_id:       asset.host_id       ?? '',
    monitor_serial:asset.monitor_serial ?? '',
    monitor_make:  asset.monitor_make  ?? '',
    floor:         asset.floor         ?? '',
    branch:        asset.branch        ?? '',
  })

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const { data } = await updateAssetSpec(asset.id, form)
      onUpdated(data.asset)
      setEditing(false)
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined
      setError(msg ?? 'Failed to save.')
    } finally { setSaving(false) }
  }

  const hasAnySpec = SPEC_FIELDS.some(f => asset[f.key])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">
                {asset.name.toLowerCase().includes('monitor') ? '🖥️' : '💻'}
              </span>
              <h2 className="text-lg font-bold text-gray-800">{asset.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[asset.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {asset.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs font-mono text-gray-400">{asset.serial_number}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {asset.category_name}
              {asset.assigned_user_name && ` · Assigned to ${asset.assigned_user_name}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">System Configuration</p>
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-[#1B3A6B] hover:underline font-semibold"
              >
                ✏️ Edit
              </button>
            )}
            {canEdit && editing && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setError('') }}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs bg-[#1B3A6B] text-white px-3 py-1 rounded-lg font-semibold disabled:opacity-50 hover:bg-[#15305a]"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

          {!hasAnySpec && !editing && (
            <p className="text-sm text-gray-400 italic text-center py-6">
              No system configuration recorded yet.
              {canEdit && ' Click Edit to add details.'}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPEC_FIELDS.map(({ key, label, placeholder }) => {
              const value = asset[key] as string | null | undefined
              if (!editing && !value) return null
              return (
                <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  {editing ? (
                    <input
                      value={(form[key] as string) ?? ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
