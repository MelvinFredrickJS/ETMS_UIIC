import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTopFailingDevices, type TopFailingDevice } from '../api/ticketApi'

export default function ReportsPage() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<TopFailingDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  async function load(isInitialLoad = false) {
    if (isInitialLoad) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    setError('')
    try {
      const { data } = await getTopFailingDevices(10)
      setDevices(data.devices)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setError(msg ?? 'Failed to load reports.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load(true)

    const intervalId = window.setInterval(() => {
      load(false)
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [])

  const topDevices = devices.slice(0, 5)
  const maxIssues = Math.max(...topDevices.map(device => Number(device.total_issues)), 1)
  const totalIssues = topDevices.reduce((sum, device) => sum + Number(device.total_issues), 0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live issue load for the top failing assets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 shadow-sm">
            {refreshing ? 'Refreshing...' : 'Live refresh every 30s'}
          </div>
          {lastUpdated && (
            <div className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200">
              Updated {lastUpdated}
            </div>
          )}
          <button
            onClick={() => load(false)}
            className="text-sm text-[#1B3A6B] font-semibold hover:underline"
          >
            Refresh now
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 font-semibold hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">No report data available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Tracked assets</p>
              <p className="text-2xl font-bold text-[#1B3A6B]">{devices.length}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Top five issues</p>
              <p className="text-2xl font-bold text-amber-600">{totalIssues}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Most affected asset</p>
              <p className="text-sm font-semibold text-gray-800 truncate">
                {topDevices[0]?.name ?? '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {topDevices[0] ? `${Number(topDevices[0].total_issues)} tickets` : 'No data'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-700">Issue Trend</h2>
              <span className="text-xs text-gray-400">Relative ticket volume by asset</span>
            </div>

            <div className="space-y-4">
              {topDevices.map((device, index) => {
                const count = Number(device.total_issues)
                const width = `${Math.max((count / maxIssues) * 100, count > 0 ? 10 : 0)}%`
                const palette = ['bg-[#1B3A6B]', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']

                return (
                  <div key={device.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                            {index + 1}
                          </span>
                          {device.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono ml-8">{device.serial_number}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 shrink-0">
                        {count} tickets
                      </span>
                    </div>

                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${palette[index % palette.length]} transition-all duration-500 ease-out`}
                        style={{ width }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}