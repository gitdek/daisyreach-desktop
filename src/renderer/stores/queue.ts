import { create } from 'zustand';
import type { RunInfo } from '../types';

interface QueueState {
  runs: RunInfo[];
  loading: boolean;

  // Actions
  fetchRuns: () => Promise<void>;
  cancelRun: (runId: number) => Promise<void>;
  updateRunFromProgress: (params: any) => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  runs: [],
  loading: false,

  fetchRuns: async () => {
    set({ loading: true });
    try {
      const result = await window.bridge.runList();
      set({ runs: result.runs, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  cancelRun: async (runId) => {
    try {
      await window.bridge.runCancel(runId);
      // Optimistic update
      set((s) => ({
        runs: s.runs.map((r) =>
          r.run_id === runId ? { ...r, status: 'cancelling' as const } : r,
        ),
      }));
    } catch { /* ignore */ }
  },

  updateRunFromProgress: (params) => {
    const runId = params.run_id;
    if (!runId) return;

    set((s) => {
      const existing = s.runs.find((r) => r.run_id === runId);
      if (!existing) {
        // New run from progress event
        return {
          runs: [
            {
              run_id: runId,
              type: params.type || 'search',
              status: params.phase === 'complete' || params.phase === 'done' ? 'completed' :
                     params.phase === 'cancelled' ? 'cancelled' :
                     params.phase === 'error' ? 'error' : 'running',
              phase: params.phase || params.step || '',
              current: params.current || 0,
              total: params.total || existing?.total || 0,
              error: params.error || null,
              started_at: existing?.started_at || Date.now() / 1000,
            },
            ...s.runs,
          ],
        };
      }

      return {
        runs: s.runs.map((r) => {
          if (r.run_id !== runId) return r;
          return {
            ...r,
            phase: params.phase || params.step || r.phase,
            current: params.current ?? r.current,
            total: params.total ?? r.total,
            status: params.phase === 'complete' || params.phase === 'done' ? 'completed' :
                    params.phase === 'cancelled' ? 'cancelled' :
                    params.phase === 'error' ? 'error' : r.status,
            error: params.error || r.error,
          };
        }),
      };
    });
  },
}));
