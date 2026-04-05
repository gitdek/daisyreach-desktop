import { useState, useEffect, useCallback } from 'react'

interface Business {
  id: string
  name: string
  address: string
  phone: string | null
  email: string | null
  website: string | null
  website_class: string | null
  niche: string | null
  locality: string | null
  outreach_status: string | null
  last_verdict: string | null
  last_score: number | null
  first_seen: string
  last_checked: string
  sourcing_model: Record<string, unknown> | null
}

interface WarehouseStats {
  total_businesses: number
  searches_run: number
  greenlight: number
  conditional: number
  backlog: number
  rejected: number
  emailed: number
  replied: number
  quoted: number
  won: number
  pending_suggestions: number
  query_types_used: number
  query_types_total: number
  neighborhoods_covered: number
  neighborhoods_total: number
  website_classes: Record<string, number>
}

export default function Leads() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<WarehouseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  const loadData = useCallback(async (offset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const [listResult, statsResult] = await Promise.all([
        window.bridge.warehouseList({ limit: pageSize, offset }),
        window.bridge.warehouseStats(),
      ])

      const list = listResult as { businesses: Business[]; total: number }
      const st = statsResult as WarehouseStats

      setBusinesses(list.businesses || [])
      setTotalCount(list.total || 0)
      setStats(st)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(page * pageSize)
  }, [page, loadData])

  const totalPages = Math.ceil(totalCount / pageSize)

  const getVerdictBadge = (biz: Business) => {
    const verdict = biz.last_verdict
    if (!verdict) return null

    const colors: Record<string, string> = {
      GREENLIGHT: 'bg-green-900/50 text-green-400 border-green-800',
      CONDITIONAL: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
      BACKLOG: 'bg-blue-900/50 text-blue-400 border-blue-800',
      REJECT: 'bg-red-900/50 text-red-400 border-red-800',
    }
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${colors[verdict] || 'bg-neutral-800 text-neutral-400'}`}>
        {verdict}
      </span>
    )
  }

  const getScore = (biz: Business) => {
    return biz.last_score ?? null
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Leads</h2>
        <button
          onClick={() => loadData(page * pageSize)}
          className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <StatCard label="Total" value={stats.total_businesses} />
          <StatCard label="Greenlight" value={stats.greenlight} color="text-green-400" />
          <StatCard label="Conditional" value={stats.conditional} color="text-yellow-400" />
          <StatCard label="Emailed" value={stats.emailed} color="text-blue-400" />
          <StatCard label="Searches" value={stats.searches_run} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-900 rounded text-red-400 text-sm">
          {error}
          <button onClick={() => loadData(page * pageSize)} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-neutral-500 text-sm">Loading...</div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-20 text-neutral-500 text-sm">
          No leads in warehouse. Run a search to get started.
        </div>
      ) : (
        <>
          <div className="border border-neutral-800 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Location</th>
                  <th className="text-center px-4 py-3 font-medium">Score</th>
                  <th className="text-center px-4 py-3 font-medium">Verdict</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Found</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {businesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-neutral-900/50 transition-colors cursor-pointer">
                    <td className="px-4 py-2.5">
                      <span className="text-neutral-200 font-medium">{biz.name || 'Unknown'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-neutral-500 text-xs truncate block max-w-[200px]">
                        {biz.locality || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {getScore(biz) !== null ? (
                        <span className="text-neutral-300 font-mono text-xs">
                          {getScore(biz)}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {getVerdictBadge(biz) || <span className="text-neutral-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={biz.outreach_status} enriched={!!biz.last_enrichment_at} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-neutral-600 text-xs">
                        {biz.first_seen ? new Date(biz.first_seen).toLocaleDateString() : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-neutral-500">
              <span>
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="px-2 py-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700 transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-2 py-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700 transition-colors"
                >
                  Prev
                </button>
                <span className="px-2 py-1">{page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700 transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700 transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color = 'text-neutral-200' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded px-4 py-3">
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'new') {
    return <span className="px-1.5 py-0.5 text-[10px] bg-neutral-800 text-neutral-600 border border-neutral-700 rounded">new</span>
  }
  if (status === 'emailed' || status === 'sent') {
    return <span className="px-1.5 py-0.5 text-[10px] bg-blue-900/50 text-blue-400 border border-blue-800 rounded">{status}</span>
  }
  if (status === 'replied') {
    return <span className="px-1.5 py-0.5 text-[10px] bg-green-900/50 text-green-400 border border-green-800 rounded">{status}</span>
  }
  if (status === 'draft') {
    return <span className="px-1.5 py-0.5 text-[10px] bg-purple-900/50 text-purple-400 border border-purple-800 rounded">{status}</span>
  }
  if (status === 'won') {
    return <span className="px-1.5 py-0.5 text-[10px] bg-emerald-900/50 text-emerald-400 border border-emerald-800 rounded">{status}</span>
  }
  return <span className="px-1.5 py-0.5 text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700 rounded">{status}</span>
}
