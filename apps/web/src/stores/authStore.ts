import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserRole } from '@blesaf/shared';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  branchId: string | null;
}

interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface BranchInfo {
  id: string;
  name: string;
  code: string;
}

interface AuthState {
  user: User | null;
  tenant: TenantInfo | null;
  branch: BranchInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (data: {
    user: User;
    tenant?: TenantInfo;
    branch?: BranchInfo;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      branch: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: ({ user, tenant, branch, accessToken, refreshToken }) => {
        set({
          user,
          tenant: tenant || null,
          branch: branch || null,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      setUser: (user) => {
        set({ user });
      },

      logout: () => {
        set({
          user: null,
          tenant: null,
          branch: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      hasRole: (...roles) => {
        const { user } = get();
        if (!user) return false;

        // Role hierarchy
        const roleHierarchy: Record<UserRole, number> = {
          super_admin: 4,
          bank_admin: 3,
          branch_manager: 2,
          teller: 1,
        };

        const userLevel = roleHierarchy[user.role] || 0;

        return roles.some((role) => {
          const requiredLevel = roleHierarchy[role] || 0;
          return userLevel >= requiredLevel;
        });
      },
    }),
    {
      name: 'blesaf-auth',
      // Use sessionStorage instead of localStorage to isolate sessions per browser tab/window
      // This allows different users to be logged in on different tabs simultaneously
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        branch: state.branch,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
