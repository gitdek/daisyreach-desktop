import React, { useState, useEffect, useCallback } from 'react';
import { useSearchStore } from '../stores/search';
import type { Business } from '../types';

// --- Pipeline Progress Bar ---
function PipelineProgress() {
  const { progress, running } = useSearchStore();

  if (!running && !progress) return null;

  const stages = [
    { key: 'discover', label: 'Discover' },
    { key: 'enrich', label: 'Enrich' },
    { key: 'qualify', label: 'Qualify' },
    { key: 'verify', label: 'Verify' },
  ];

  const currentPhase = progress?.phase || 'discover';
  const isComplete = currentPhase === 'complete';
  const isError = currentPhase === 'error';

  const currentIndex = stages.findIndex((s) => s.key === currentPhase);

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-1 mb-2">
        {stages.map((stage, i) => {
          const isDone = isComplete || i < currentIndex;
          const isCurrent = stage.key === currentPhase && !isComplete && !isError;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span
                  className={`text-sm ${
                    isDone
                      ? 'text-emerald-400'
                      : isCurrent
                        ? 'text-blue-400 font-medium'
                        : 'text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    isComplete || i < currentIndex ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {isError && progress?.status && (
        <p className="text-sm text-red-400 mt-1">Error: {progress.status}</p>
      )}
      {!isComplete && !isError && progress?.status && (
        <p className="text-sm text-slate-400 mt-1">{progress.status}</p>
      )}
    </div>
  );
}

// --- Options Panel ---
function OptionsPanel() {
  const { options, setOptions, toggleOption } = useSearchStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="px-6">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-2"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        Options
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 bg-slate-900/80 rounded-lg border border-slate-800 mb-3">
          {/* Checkboxes */}
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.enrich}
              onChange={() => toggleOption('enrich')}
              className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            Enrich after search
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.qualify}
              onChange={() => toggleOption('qualify')}
              className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            Qualify after enrich
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.verify}
              onChange={() => toggleOption('verify')}
              className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            Verify before saving
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.no_franchises}
              onChange={() => toggleOption('no_franchises')}
              className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            No franchises
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.validate_websites}
              onChange={() => toggleOption('validate_websites')}
              className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            Validate websites
          </label>

          {/* Number inputs */}
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="whitespace-nowrap">Min reviews:</span>
            <input
              type="number"
              min={0}
              value={options.min_reviews}
              onChange={(e) => setOptions({ min_reviews: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="whitespace-nowrap">Min rating:</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={options.min_rating}
              onChange={(e) => setOptions({ min_rating: parseFloat(e.target.value) || 0 })}
              className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="whitespace-nowrap">Max per query:</span>
            <input
              type="number"
              min={1}
              max={50}
              value={options.max_per_query}
              onChange={(e) => setOptions({ max_per_query: parseInt(e.target.value) || 20 })}
              className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Verdict Badge ---
function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
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

// --- Results Table ---
function ResultsTable({ leads, onSelect }: { leads: Business[]; onSelect: (lead: Business) => void }) {
  if (!leads.length) return null;

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-900">
          <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
            <th className="px-6 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Website</th>
            <th className="px-4 py-3 font-medium text-center">Rating</th>
            <th className="px-4 py-3 font-medium text-center">Score</th>
            <th className="px-4 py-3 font-medium">Verdict</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {leads.map((lead, i) => (
            <tr
              key={lead.id || i}
              onClick={() => onSelect(lead)}
              className="hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-3 font-medium text-white">{lead.name}</td>
              <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">
                {lead.website || lead.website_url || '—'}
              </td>
              <td className="px-4 py-3 text-center text-slate-300">
                {lead.rating ? (
                  <span>
                    ★ {typeof lead.rating === 'string' ? lead.rating : lead.rating}
                    {lead.review_count && (
                      <span className="text-slate-500 ml-1">({lead.review_count})</span>
                    )}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-center">
                {lead.score != null ? (
                  <span
                    className={`font-mono font-medium ${
                      lead.score >= 75 ? 'text-emerald-400' : lead.score >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}
                  >
                    {lead.score}
                  </span>
                ) : lead.activity_score != null ? (
                  <span
                    className={`font-mono font-medium ${
                      lead.activity_score >= 75 ? 'text-emerald-400' : lead.activity_score >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}
                  >
                    {lead.activity_score}
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <VerdictBadge verdict={lead.verdict ?? lead.sourcing_model?.verdict ?? null} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SearchProps {
  onLeadSelected?: (id: string) => void;
}

// --- Main Search Screen ---
export default function Search({ onLeadSelected }: SearchProps) {
  const { options, running, result, error, setPhrase, runSearch } = useSearchStore();
  const [inputValue, setInputValue] = useState(options.phrase);

  // Subscribe to progress events
  useEffect(() => {
    const unsub = window.bridge.onProgress((method, params) => {
      useSearchStore.getState().handleProgress(method, params);
    });
    return unsub;
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPhrase(inputValue);
      // Small delay to let state update
      setTimeout(() => {
        useSearchStore.getState().setPhrase(inputValue);
        useSearchStore.getState().runSearch();
      }, 0);
    },
    [inputValue, setPhrase],
  );

  const handleSelectLead = useCallback((lead: Business) => {
    if (onLeadSelected) {
      onLeadSelected(String(lead.id || lead.name));
    }
  }, [onLeadSelected]);

  const leads = result?.leads || [];
  const summary = result?.summary || {};

  return (
    <div className="flex flex-col h-full">
      {/* Header + Input */}
      <div className="px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold text-white mb-3">Search</h1>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            placeholder='e.g. "plumbers in Chicago"'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={running}
            className="flex-1 px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={running || !inputValue.trim()}
            className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span> Searching...
              </span>
            ) : (
              '→'
            )}
          </button>
        </form>
      </div>

      {/* Options */}
      <OptionsPanel />

      {/* Progress */}
      <PipelineProgress />

      {/* Error */}
      {error && (
        <div className="mx-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {leads.length > 0 && (
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between px-6 py-3 bg-slate-900/50 border-b border-slate-800">
            <span className="text-sm text-slate-300">
              {leads.length} leads found
              {summary.total_greenlight != null && (
                <span className="text-slate-500 ml-2">
                  ({summary.total_greenlight} greenlight · {summary.total_conditional ?? 0} conditional · {summary.total_skip ?? 0} skip)
                </span>
              )}
            </span>
          </div>
          <ResultsTable leads={leads} onSelect={handleSelectLead} />
        </div>
      )}

      {/* Empty state */}
      {!running && !leads.length && !error && !result && (
        <div className="flex items-center justify-center flex-1 text-slate-500">
          <div className="text-center">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm">Search for businesses to get started</p>
            <p className="text-xs text-slate-600 mt-1">Try: "plumbers in Chicago"</p>
          </div>
        </div>
      )}

      {/* No results */}
      {!running && result && leads.length === 0 && !error && (
        <div className="flex items-center justify-center flex-1 text-slate-500">
          <div className="text-center">
            <div className="text-4xl mb-2">🤷</div>
            <p className="text-sm">No results found</p>
          </div>
        </div>
      )}
    </div>
  );
}
