import React, { useEffect, useState } from 'react';
import { useQueueStore } from '../stores/queue';
import type { RunInfo } from '../types';

export default function Runs() {
  const { runs, fetchRuns } = useQueueStore();
  const [logRunId, setLogRunId] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const handleViewLog = async (runId: number) => {
    setLogRunId(runId);
    try {
      const result = await window.bridge.runLog(runId);
      if ('error' in result) {
        setLog([`Error: ${result.error}`]);
      } else {
        setLog(result.log || ['No log entries']);
      }
    } catch (err: any) {
      setLog([`Failed: ${err.message}`]);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleString();
  };

  const statusColors: Record<string, string> = {
    running: 'text-blue-400',
    completed: 'text-emerald-400',
    cancelled: 'text-slate-400',
    error: 'text-red-400',
    cancelling: 'text-amber-400',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold text-white">Runs</h1>
        <p className="text-sm text-slate-400 mt-0.5">Search history and run telemetry</p>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-950">
            <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Phase</th>
              <th className="px-4 py-3 font-medium text-center">Progress</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {!runs.length && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No runs yet</td>
              </tr>
            )}
            {runs.map((run) => (
              <tr key={run.run_id} className="hover:bg-slate-800/50">
                <td className="px-6 py-3 font-mono text-slate-300">#{run.run_id}</td>
                <td className="px-4 py-3 text-slate-400">{run.type}</td>
                <td className="px-4 py-3">
                  <span className={statusColors[run.status] || 'text-slate-400'}>{run.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-400">{run.phase}</td>
                <td className="px-4 py-3 text-center text-slate-400">
                  {run.total > 0 ? `${run.current}/${run.total}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">{formatTime(run.started_at)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleViewLog(run.run_id)}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Log
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log viewer modal */}
      {logRunId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setLogRunId(null)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-medium text-white">Run #{logRunId} — Log</h3>
              <button onClick={() => setLogRunId(null)} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{log.join('\n')}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
