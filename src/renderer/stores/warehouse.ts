import { create } from 'zustand';
import type { Business, WarehouseStats } from '../types';

interface WarehouseState {
  businesses: Business[];
  total: number;
  stats: WarehouseStats | null;
  loading: boolean;
  error: string | null;
  filters: {
    niche: string;
    locality: string;
    verdict: string;
    page: number;
    pageSize: number;
  };

  fetchBusinesses: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilter: (key: string, value: string) => void;
  setPage: (page: number) => void;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  businesses: [],
  total: 0,
  stats: null,
  loading: false,
  error: null,
  filters: {
    niche: '',
    locality: '',
    verdict: '',
    page: 0,
    pageSize: 50,
  },

  fetchBusinesses: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const result = await window.bridge.warehouseList({
        niche: filters.niche || undefined,
        locality: filters.locality || undefined,
        verdict: filters.verdict || undefined,
        limit: filters.pageSize,
        offset: filters.page * filters.pageSize,
      });
      set({ businesses: result.businesses, total: result.total, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await window.bridge.warehouseStats();
      set({ stats });
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value, page: 0 },
    }));
  },

  setPage: (page) => {
    set((state) => ({
      filters: { ...state.filters, page },
    }));
  },
}));
