import React, { useState, useEffect, useCallback } from 'react';
import { useWarehouseStore } from '../stores/warehouse';
import type { Business } from '../types';

interface LeadsProps {
  onSelectLead?: (id: string) => void;
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="text-slate-500">—</span>;

  const colors: Record<string, string> = {
    GREENLIGHT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    CONDITIONAL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    BACKLOG: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    SKIP: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const cls = colors[verdict] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${cls}`}>
      {verdict}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-slate-500">—</span>;

  const color = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

  return <span className={`font-mono font-medium ${color}`}>{score}</span>;
}

export default function Leads({ onSelectLead }: LeadsProps) {
  const {
    businesses, total, stats, loading, error,
    filters, fetchBusinesses, fetchStats, setFilter, setPage,
  } = useWarehouseStore();

  const [bridgeReady, setBridgeReady] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const toggleSelect = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === businesses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(businesses.map((b) => String(b.id))));
    }
  }, [selected.size, businesses]);

  const handleBulkEnrich = useCallback(async () => {
    if (selected.size === 0) return;
    setBulkEnriching(true);
    setBulkResult(null);
    try {
      let enriched = 0;
      for (const id of selected) {
        await window.bridge.enrichSingle({ business_id: parseInt(id), depth: 'fast' });
        enriched++;
        setBulkResult(`Enriching... ${enriched}/${selected.size}`);
      }
      setBulkResult(`Done: ${enriched} leads enriched`);
      fetchBusinesses();
    } catch (err: any) {
      setBulkResult(`Error: ${err.message}`);
    } finally {
      setBulkEnriching(false);
    }
  }, [selected, fetchBusinesses]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setBulkResult(null);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchBusinesses();
  }, [filters.page, filters.niche, filters.locality, filters.verdict, fetchBusinesses]);

  useEffect(() => {
    const checkBridge = async () => {
      try {
        const status = await window.bridge.bridgeStatus();
        setBridgeReady(status.ready);
      } catch {
        setBridgeReady(false);
      }
    };
    checkBridge();
    const interval = setInterval(checkBridge, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPages = Math.ceil(total / filters.pageSize);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-white">Leads</h1>
          {stats && (
            <p className="text-sm text-slate-400 mt-0.5">
              {stats.total_leads ?? total} leads{' '}
              {stats.by_verdict && Object.entries(stats.by_verdict).map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {bridgeReady === false && (
            <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Bridge offline</span>
          )}
          {bridgeReady === true && (
            <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded">Connected</span>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <span className="text-sm text-blue-300">{selected.size} selected</span>
          <button
            onClick={selectAll}
            className="px-2 py-1 text-xs text-slate-300 bg-slate-800 rounded hover:bg-slate-700"
          >
            {selected.size === businesses.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={handleBulkEnrich}
            disabled={bulkEnriching}
            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-40"
          >
            {bulkEnriching ? '⟳ Enriching...' : 'Enrich Selected (Fast)'}
          </button>
          <button onClick={clearSelection} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200">
            ✕
          </button>
          {bulkResult && <span className="text-xs text-slate-400">{bulkResult}</span>}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-800 bg-slate-900/50">
        <input
          type="text"
          placeholder="Niche..."
          value={filters.niche}
          onChange={(e) => setFilter('niche', e.target.value)}
          className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-40"
        />
        <input
          type="text"
          placeholder="Locality..."
          value={filters.locality}
          onChange={(e) => setFilter('locality', e.target.value)}
          className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-40"
        />
        <select
          value={filters.verdict}
          onChange={(e) => setFilter('verdict', e.target.value)}
          className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All verdicts</option>
          <option value="GREENLIGHT">Greenlight</option>
          <option value="CONDITIONAL">Conditional</option>
          <option value="BACKLOG">Backlog</option>
          <option value="SKIP">Skip</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={businesses.length > 0 && selected.size === businesses.length}
                  onChange={selectAll}
                  className="rounded border-slate-600 bg-slate-800"
                />
              </th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium text-center">Rating</th>
              <th className="px-4 py-3 font-medium text-center">Score</th>
              <th className="px-4 py-3 font-medium">Verdict</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading && businesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : businesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No leads found
                </td>
              </tr>
            ) : (
              businesses.map((b: Business) => (
                <tr
                  key={b.id}
                  onClick={() => onSelectLead?.(String(b.id))}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3 w-8" onClick={(e) => toggleSelect(String(b.id), e)}>
                    <input
                      type="checkbox"
                      checked={selected.has(String(b.id))}
                      onChange={() => toggleSelect(String(b.id))}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-600 bg-slate-800"
                    />
                  </td>
                  <td className="px-6 py-3 font-medium text-white">{b.name}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">
                    {b.website_url || '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300">
                    {b.rating ? (
                      <span>
                        ★ {b.rating}
                        <span className="text-slate-500 ml-1">({b.review_count ?? 0})</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={b.activity_score} />
                  </td>
                  <td className="px-4 py-3">
                    <VerdictBadge verdict={b.sourcing_model?.verdict ?? null} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {b.outreach_status || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/50">
          <span className="text-sm text-slate-400">
            Showing {filters.page * filters.pageSize + 1}–{Math.min((filters.page + 1) * filters.pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, filters.page - 1))}
              disabled={filters.page === 0}
              className="px-3 py-1 text-sm bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm text-slate-400">
              {filters.page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, filters.page + 1))}
              disabled={filters.page >= totalPages - 1}
              className="px-3 py-1 text-sm bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
