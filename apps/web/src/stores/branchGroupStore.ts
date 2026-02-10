import { create } from 'zustand';
import { branchGroupApi } from '../lib/api';

interface BranchGroupBranch {
  id: string;
  name: string;
  code: string;
  region: string | null;
  status: string;
}

interface BranchGroup {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  memberCount: number;
  branches: BranchGroupBranch[];
  createdAt: string;
  updatedAt: string;
}

interface BranchGroupState {
  groups: BranchGroup[];
  isLoading: boolean;
  error: string | null;

  fetchGroups: () => Promise<void>;
  createGroup: (name: string, description?: string | null) => Promise<BranchGroup>;
  updateGroup: (groupId: string, data: { name?: string; description?: string | null }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addBranches: (groupId: string, branchIds: string[]) => Promise<void>;
  removeBranch: (groupId: string, branchId: string) => Promise<void>;
}

export const useBranchGroupStore = create<BranchGroupState>((set, get) => ({
  groups: [],
  isLoading: false,
  error: null,

  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await branchGroupApi.list();
      set({ groups: res.data.data, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load branch groups';
      set({ error: message, isLoading: false });
    }
  },

  createGroup: async (name, description) => {
    const res = await branchGroupApi.create(name, description);
    const newGroup = res.data.data;
    await get().fetchGroups();
    return newGroup;
  },

  updateGroup: async (groupId, data) => {
    await branchGroupApi.update(groupId, data);
    await get().fetchGroups();
  },

  deleteGroup: async (groupId) => {
    await branchGroupApi.delete(groupId);
    set({ groups: get().groups.filter((g) => g.id !== groupId) });
  },

  addBranches: async (groupId, branchIds) => {
    await branchGroupApi.addBranches(groupId, branchIds);
    await get().fetchGroups();
  },

  removeBranch: async (groupId, branchId) => {
    await branchGroupApi.removeBranch(groupId, branchId);
    await get().fetchGroups();
  },
}));
