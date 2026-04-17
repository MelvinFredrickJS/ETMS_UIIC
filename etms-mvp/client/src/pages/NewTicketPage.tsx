import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getCategories, getMyAssets, createTicket } from '../api/ticketApi'
import TicketTypeSelector from '../components/tickets/TicketTypeSelector'
import CategorySelector   from '../components/tickets/CategorySelector'
import TypeBadge          from '../components/common/TypeBadge'
import { CATEGORY_ICONS } from '../constants/TICKET_TYPES'
import type { Category, TicketTypeGroup, Asset, TypeKey } from '../types'

const STEPS = ['Type', 'Category', 'Details']

const TYPE_KEY_TO_ID: Record<TypeKey, number> = { complaint: 1, request: 2, data: 3 }

// State passed via navigate() from AssetsPage
interface ReportIssueState {
  prefill?: {
    typeKey: TypeKey
    categoryKey: string
    asset: Asset
  }
}

export default function NewTicketPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as ReportIssueState)?.prefill ?? null

  const [step,             setStep]             = useState(prefill ? 3 : 1)
  const [allTypes,         setAllTypes]         = useState<TicketTypeGroup[]>([])
  const [selectedType,     setSelectedType]     = useState<TypeKey | ''>(prefill?.typeKey ?? '')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [myAssets,         setMyAssets]         = useState<Asset[]>([])
  const [selectedAsset,    setSelectedAsset]    = useState<Asset | null>(prefill?.asset ?? null)

  // Step 3 fields
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [priority,    setPriority]    = useState('medium')
  const [slaDays,     setSlaDays]     = useState(3)
  const [file,        setFile]        = useState<File | null>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  // Load categories once — and resolve pre-filled category if coming from AssetsPage
  useEffect(() => {
    getCategories().then(({ data }) => {
      const typesWithIds: TicketTypeGroup[] = data.types.map(t => ({
        ...t,
        categories: t.categories.map(c => ({
          ...c,
          ticket_type_id: TYPE_KEY_TO_ID[t.type_key],
        })),
      }))
      setAllTypes(typesWithIds)

      // If pre-filling from asset report, find and set the hardware_complaint category
      if (prefill) {
        const type = typesWithIds.find(t => t.type_key === prefill.typeKey)
        const cat  = type?.categories.find(c => c.category_key === prefill.categoryKey)
        if (cat) setSelectedCategory(cat)
      }
    }).catch(() => {})
  }, [])

  // Load assets when hardware_complaint selected (or pre-filled)
  useEffect(() => {
    if (selectedCategory?.category_key === 'hardware_complaint' || prefill?.categoryKey === 'hardware_complaint') {
      getMyAssets().then(({ data }) => setMyAssets(data.assets)).catch(() => {})
    } else {
      setSelectedAsset(null)
    }
  }, [selectedCategory])

  // Set default priority from category
  useEffect(() => {
    if (selectedCategory?.default_priority) {
      setPriority(selectedCategory.default_priority)
    }
  }, [selectedCategory])

  const filteredCategories = allTypes.find(t => t.type_key === selectedType)?.categories ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (selectedCategory?.category_key === 'hardware_complaint' && !selectedAsset) {
      setError('Please select an asset for hardware issue tickets.')
      return
    }
    if (!selectedCategory) return

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title',          title)
      fd.append('description',    description)
      fd.append('ticket_type_id', String(selectedCategory.ticket_type_id ?? TYPE_KEY_TO_ID[selectedType as TypeKey]))
      fd.append('category_id',    String(selectedCategory.id))
      fd.append('priority',       priority)
      fd.append('sla_days',       String(slaDays))
      if (selectedCategory.category_key === 'hardware_complaint' && selectedAsset) {
        fd.append('asset_id', String(selectedAsset.id))
      }
      if (file) fd.append('file', file)

      const { data } = await createTicket(fd)
      navigate(`/tickets/${data.ticket.id}`)
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setError(msg ?? 'Failed to raise ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-wrap max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Raise a New Ticket</h1>
          <p className="page-subtitle">Follow the guided flow to submit complete details in one go.</p>
        </div>
      </div>

      {/* Pre-fill banner — shown when coming from AssetsPage */}
      {prefill && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-xl">🖥️</span>
          <div>
            <p className="text-sm font-semibold text-orange-800">Reporting issue for: {prefill.asset.name}</p>
            <p className="text-xs text-orange-600 font-mono">{prefill.asset.serial_number}</p>
          </div>
          <button
            onClick={() => navigate('/assets')}
            className="ml-auto text-xs text-orange-500 hover:text-orange-700 font-medium"
          >
            ← Back to Assets
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-3">
        {STEPS.map((s, i) => {
          const n = i + 1
          const done    = step > n
          const current = step === n
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${done    ? 'bg-green-500 text-white'
                : current ? 'bg-[#1B3A6B] text-white'
                :           'bg-gray-200 text-gray-500'}`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-sm font-medium ${current ? 'text-[#1B3A6B]' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <span className="text-gray-300 mx-1">→</span>}
            </div>
          )
        })}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <p className="text-sm text-gray-500 mb-4">What kind of ticket do you want to raise?</p>
          <TicketTypeSelector selectedType={selectedType} onSelect={key => { setSelectedType(key); setSelectedCategory(null); setStep(2) }} />
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Select a category for your ticket.</p>
          <CategorySelector
            categories={filteredCategories}
            selectedCategoryId={selectedCategory?.id ?? null}
            onSelect={category => { setSelectedCategory(category); setStep(3) }}
          />
          <div className="mt-6 flex justify-start">
            <button onClick={() => setStep(1)}
              className="border border-gray-300 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="flex gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-5">
            {/* Title */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <span className="text-xs text-gray-400">{title.length}/200</span>
              </div>
              <input
                type="text" required maxLength={200}
                value={title} onChange={e => setTitle(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* SLA Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SLA Days *
                <span className="ml-2 text-xs font-normal text-gray-400">(1–30 days — ticket escalates if not resolved by then)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1} max={30} step={1}
                  value={slaDays}
                  onChange={e => setSlaDays(Number(e.target.value))}
                  className="flex-1 accent-[#1B3A6B]"
                />
                <span className="w-16 text-center text-sm font-semibold text-[#1B3A6B] bg-blue-50 border border-blue-200 rounded-lg py-1">
                  {slaDays} {slaDays === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                <span>1 day</span>
                <span>15 days</span>
                <span>30 days</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description * (min 20 chars)</label>
              <textarea
                required minLength={20} rows={5}
                value={description} onChange={e => setDescription(e.target.value)}
                className="input-field resize-none"
              />
            </div>

            {/* Asset — hardware_complaint only */}
            {selectedCategory?.category_key === 'hardware_complaint' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset * (required for hardware issue)</label>
                <select
                  required
                  value={selectedAsset?.id ?? ''}
                  onChange={e => {
                    const a = myAssets.find(a => String(a.id) === e.target.value)
                    setSelectedAsset(a ?? null)
                  }}
                  className="input-field"
                >
                  <option value="">Select an asset…</option>
                  {myAssets.map(a => (
                    <option key={a.id} value={a.id} disabled={a.status !== 'active'}>
                      {a.name} ({a.serial_number}) — {a.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attach File (optional)</label>
              {file ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700 flex-1 truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  <button type="button" onClick={() => setFile(null)}
                    className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              ) : (
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1B3A6B] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#15305a]"
                />
              )}
            </div>

            {error && <p className="status-message-error" role="alert">{error}</p>}

            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep(2)}
                className="btn-secondary">
                ← Back
              </button>
              <button type="submit" disabled={submitting}
                className="btn-primary disabled:opacity-60">
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {submitting ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </div>
          </form>

          {/* Summary card */}
          <div className="w-52 flex-shrink-0">
            <div className="surface-card sticky top-4 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Summary</p>
              {selectedType && (
                <div className="mb-2">
                  <TypeBadge typeKey={selectedType} />
                </div>
              )}
              {selectedCategory && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xl">{CATEGORY_ICONS[selectedCategory.category_key] ?? '📁'}</span>
                  <span className="text-sm font-medium text-gray-700">{selectedCategory.name}</span>
                </div>
              )}
              {slaDays > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-0.5">SLA deadline</p>
                  <p className="text-xs font-semibold text-orange-600">
                    {new Date(Date.now() + slaDays * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-400">{slaDays} {slaDays === 1 ? 'day' : 'days'} from today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
