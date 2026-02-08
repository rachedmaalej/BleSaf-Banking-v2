import { create } from 'zustand';
import { hqApi } from '@/lib/api';
import type { TenantCompositeMetrics, BranchHealthRow, Recommendation } from '@blesaf/shared';

interface HqState {
  tenantMetrics: TenantCompositeMetrics | null;
  branchHealthRows: BranchHealthRow[] | null;
  recommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTenantMetrics: () => Promise<void>;
  fetchBranchHealth: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  fetchAll: () => Promise<void>;
  reset: () => void;
}

export const useHqStore = create<HqState>((set, get) => ({
  tenantMetrics: null,
  branchHealthRows: null,
  recommendations: [],
  isLoading: false,
  error: null,

  fetchTenantMetrics: async () => {
    try {
      const response = await hqApi.getMetrics();
      set({ tenantMetrics: response.data.data });
    } catch {
      // Silently fail — metrics are non-critical
    }
  },

  fetchBranchHealth: async () => {
    try {
      const response = await hqApi.getBranches();
      set({ branchHealthRows: response.data.data });
    } catch {
      // Silently fail
    }
  },

  fetchRecommendations: async () => {
    try {
      const response = await hqApi.getRecommendations();
      set({ recommendations: response.data.data || [] });
    } catch {
      set({ recommendations: [] });
    }
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchTenantMetrics(),
        get().fetchBranchHealth(),
        get().fetchRecommendations(),
      ]);
    } catch {
      set({ error: 'Failed to fetch HQ metrics' });
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () =>
    set({
      tenantMetrics: null,
      branchHealthRows: null,
      recommendations: [],
      isLoading: false,
      error: null,
    }),
}));
