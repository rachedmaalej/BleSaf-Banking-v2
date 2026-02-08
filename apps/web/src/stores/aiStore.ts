import { create } from 'zustand';
import { aiApi } from '@/lib/api';
import type { CompositeMetrics, BranchForecast, Recommendation } from '@blesaf/shared';

interface AiState {
  compositeMetrics: CompositeMetrics | null;
  forecast: BranchForecast | null;
  recommendations: Recommendation[];
  isLoading: boolean;
  isExecuting: string | null; // recommendation ID being executed
  error: string | null;

  // Actions
  fetchCompositeMetrics: (branchId: string) => Promise<void>;
  fetchForecast: (branchId: string) => Promise<void>;
  fetchRecommendations: (branchId: string) => Promise<void>;
  fetchAll: (branchId: string) => Promise<void>;
  executeRecommendation: (branchId: string, recommendationId: string) => Promise<boolean>;
  reset: () => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  compositeMetrics: null,
  forecast: null,
  recommendations: [],
  isLoading: false,
  isExecuting: null,
  error: null,

  fetchCompositeMetrics: async (branchId: string) => {
    try {
      const response = await aiApi.getCompositeMetrics(branchId);
      set({ compositeMetrics: response.data.data });
    } catch {
      // Silently fail — composite metrics are non-critical
    }
  },

  fetchForecast: async (branchId: string) => {
    try {
      const response = await aiApi.getForecast(branchId);
      set({ forecast: response.data.data });
    } catch {
      // Silently fail — forecast is optional
    }
  },

  fetchRecommendations: async (branchId: string) => {
    try {
      const response = await aiApi.getRecommendations(branchId);
      set({ recommendations: response.data.data || [] });
    } catch {
      set({ recommendations: [] });
    }
  },

  fetchAll: async (branchId: string) => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchCompositeMetrics(branchId),
        get().fetchForecast(branchId),
        get().fetchRecommendations(branchId),
      ]);
    } catch {
      set({ error: 'Failed to fetch AI metrics' });
    } finally {
      set({ isLoading: false });
    }
  },

  executeRecommendation: async (branchId: string, recommendationId: string) => {
    set({ isExecuting: recommendationId });
    try {
      await aiApi.executeRecommendation(branchId, recommendationId);
      // Refresh all data after executing
      await get().fetchAll(branchId);
      return true;
    } catch {
      return false;
    } finally {
      set({ isExecuting: null });
    }
  },

  reset: () =>
    set({
      compositeMetrics: null,
      forecast: null,
      recommendations: [],
      isLoading: false,
      isExecuting: null,
      error: null,
    }),
}));
