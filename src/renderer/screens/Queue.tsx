import React, { useEffect, useState } from 'react';
import { useQueueStore } from '../stores/queue';
import type { RunInfo } from '../types';

function StatusBadge({ status }: { status: RunInfo['status'] }) {
  const colors: Record<string, string> = {
    running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    cancelling: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const cls = colors[status] || colors.running;
  return <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${cls}`}>{status}</span>;
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-12 text-right">{pct}%</span>
    </div>
  );
}

function RunRow({ run, onCancel, onViewLog }: { run: RunInfo; onCancel: (id: number) => void; onViewLog: (id: number) => void }) {
  const isRunning = run.status === 'running' || run.status === 'cancelling';
  const elapsed = Math.round(Date.now() / 1000 - run.started_at);
  const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">#{run.run_id}</span>
          <span className="text-xs text-slate-500 uppercase">{run.type}</span>
          <StatusBadge status={run.status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{elapsedStr}</span>
          {run.total > 0 && <span>{run.current}/{run.total}</span>}
        </div>
      </div>

      {isRunning && run.total > 0 && (
        <ProgressBar current={run.current} total={run.total} />
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">{run.phase}</span>
        <div className="flex gap-2">
          <button
            onClick={() => onViewLog(run.run_id)}
            className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300 hover:bg-slate-700"
          >
            Log
          </button>
          {isRunning && (
            <button
              onClick={() => onCancel(run.run_id)}
              className="px-2 py-1 text-xs bg-red-500/10 border border-red-500/30 rounded text-red-400 hover:bg-red-500/20"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {run.error && (
        <p className="mt-2 text-xs text-red-400">{run.error}</p>
      )}
    </div>
  );
}

function LogViewer({ runId, onClose }: { runId: number; onClose: () => void }) {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.bridge
      .runLog(runId)
      .then((result: any) => {
        if ('error' in result) {
          setLog([`Error: ${result.error}`]);
        } else {
          setLog(result.log || ['No log entries']);
        }
        setLoading(false);
      })
      .catch((err: any) => {
        setLog([`Failed to fetch log: ${err.message}`]);
        setLoading(false);
      });
  }, [runId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-medium text-white">Run #{runId} — Log</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
        </div>
        <div className="p-4 overflow-auto max-h-[60vh]">
          {loading ? (
            <span className="text-slate-500 text-sm">Loading...</span>
          ) : (
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
              {log.join('\n')}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Queue() {
  const { runs, loading, fetchRuns, cancelRun } = useQueueStore();
  const [logRunId, setLogRunId] = useState<number | null>(null);

  // Subscribe to progress events
  useEffect(() => {
    const unsub = window.bridge.onProgress((method, params) => {
      useQueueStore.getState().updateRunFromProgress(params);
    });
    return unsub;
  }, []);

  // Poll runs list
  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const activeRuns = runs.filter((r) => r.status === 'running' || r.status === 'cancelling');
  const completedRuns = runs.filter((r) => r.status !== 'running' && r.status !== 'cancelling');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-white">Queue</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeRuns.length} active · {completedRuns.length} completed
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Active runs */}
        {activeRuns.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Active ({activeRuns.length})
            </h2>
            <div className="space-y-2">
              {activeRuns.map((run) => (
                <RunRow key={run.run_id} run={run} onCancel={cancelRun} onViewLog={setLogRunId} />
              ))}
            </div>
          </div>
        )}

        {/* Completed runs */}
        {completedRuns.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Completed ({completedRuns.length})
            </h2>
            <div className="space-y-2">
              {completedRuns.map((run) => (
                <RunRow key={run.run_id} run={run} onCancel={cancelRun} onViewLog={setLogRunId} />
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!runs.length && (
          <div className="flex items-center justify-center flex-1 text-slate-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">No runs yet</p>
              <p className="text-xs text-slate-600 mt-1">Searches and batch jobs will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Log viewer modal */}
      {logRunId !== null && <LogViewer runId={logRunId} onClose={() => setLogRunId(null)} />}
    </div>
  );
}
