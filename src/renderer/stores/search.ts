import { create } from 'zustand';
import type { Business, SearchResult, SearchOptions, SearchProgress } from '../types';

const DEFAULT_OPTIONS: SearchOptions = {
  phrase: '',
  enrich: false,
  qualify: false,
  verify: false,
  no_franchises: true,
  min_reviews: 0,
  min_rating: 0,
  min_score: 0,
  max_per_query: 20,
  validate_websites: true,
  depth: 'full',
};

interface SearchState {
  // State
  options: SearchOptions;
  running: boolean;
  progress: SearchProgress | null;
  result: SearchResult | null;
  error: string | null;
  selectedLeadId: string | null;
  history: Array<{ phrase: string; timestamp: number }>;

  // Actions
  setPhrase: (phrase: string) => void;
  setOptions: (partial: Partial<SearchOptions>) => void;
  toggleOption: (key: keyof SearchOptions) => void;
  runSearch: () => Promise<void>;
  clearResult: () => void;
  handleProgress: (method: string, params: any) => void;
  selectLead: (id: string) => void;
  clearSelectedLead: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  options: { ...DEFAULT_OPTIONS },
  running: false,
  progress: null,
  result: null,
  error: null,
  selectedLeadId: null,
  history: [],

  setPhrase: (phrase) => {
    set((s) => ({ options: { ...s.options, phrase } }));
  },

  setOptions: (partial) => {
    set((s) => ({ options: { ...s.options, ...partial } }));
  },

  toggleOption: (key) => {
    set((s) => ({
      options: { ...s.options, [key]: !s.options[key] },
    }));
  },

  runSearch: async () => {
    const { options } = get();
    if (!options.phrase.trim()) return;

    set({ running: true, progress: null, result: null, error: null });

    // Add to history
    set((s) => ({
      history: [
        { phrase: options.phrase, timestamp: Date.now() },
        ...s.history.filter((h) => h.phrase !== options.phrase),
      ].slice(0, 50),
    }));

    try {
      const result = await window.bridge.searchRun(options);
      set({ result, running: false });
    } catch (err: any) {
      set({ error: err.message, running: false });
    }
  },

  clearResult: () => {
    set({ result: null, progress: null, error: null });
  },

  handleProgress: (method, params) => {
    if (method === 'search.progress') {
      set({ progress: params as SearchProgress });
    }
  },

  selectLead: (id) => {
    set({ selectedLeadId: id });
  },

  clearSelectedLead: () => {
    set({ selectedLeadId: null });
  },
}));
