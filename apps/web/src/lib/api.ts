import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant header if available
    const tenantId = useAuthStore.getState().user?.tenantId;
    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Token refresh queue to handle parallel 401s
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const onRefreshFailed = () => {
  refreshSubscribers = [];
};

// Response interceptor - handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          // Attempt to refresh the token
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          useAuthStore.getState().setAccessToken(accessToken);

          isRefreshing = false;
          onTokenRefreshed(accessToken);

          // Retry the original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshFailed();
        // Refresh failed - logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Type-safe API methods
export const authApi = {
  login: (email: string, password: string, deviceInfo?: string) =>
    api.post('/auth/login', { email, password, deviceInfo }),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  logoutAll: () =>
    api.post('/auth/logout-all'),

  me: () =>
    api.get('/auth/me'),
};

export const queueApi = {
  checkin: (data: {
    branchId: string;
    serviceCategoryId: string;
    customerPhone?: string;
    notificationChannel?: string;
    priority?: string;
    checkinMethod?: string;
  }) => api.post('/queue/checkin', data),

  callNext: (counterId: string) =>
    api.post('/queue/call-next', { counterId }),

  callNextByService: (counterId: string, serviceId: string) =>
    api.post(`/queue/counter/${counterId}/call-next-service/${serviceId}`),

  startServing: (ticketId: string) =>
    api.post(`/queue/${ticketId}/serve`),

  completeTicket: (ticketId: string, notes?: string) =>
    api.post(`/queue/${ticketId}/complete`, { notes }),

  markNoShow: (ticketId: string) =>
    api.post(`/queue/${ticketId}/no-show`),

  transferTicket: (ticketId: string, targetServiceCategoryId: string, notes?: string) =>
    api.post(`/queue/${ticketId}/transfer`, { targetServiceCategoryId, notes }),

  cancelTicket: (ticketId: string) =>
    api.post(`/queue/${ticketId}/cancel`),

  /** Bump ticket priority to VIP (move to front of queue) */
  bumpTicketPriority: (ticketId: string, reason?: string) =>
    api.post(`/queue/${ticketId}/bump-priority`, { reason }),

  /** Pause queue for a branch (stops ticket creation) */
  pauseQueue: (branchId: string) =>
    api.post(`/queue/branch/${branchId}/pause`),

  /** Resume queue for a branch (re-enables ticket creation) */
  resumeQueue: (branchId: string) =>
    api.post(`/queue/branch/${branchId}/resume`),

  /** Reset queue for a branch (cancels all waiting tickets, resets counters) */
  resetQueue: (branchId: string) =>
    api.post(`/queue/branch/${branchId}/reset`),

  /** Close queue for a branch (end of day - auto-completes serving, cancels waiting) */
  closeQueue: (branchId: string) =>
    api.post(`/queue/branch/${branchId}/close`),

  getBranchStatus: (branchId: string) =>
    api.get(`/queue/branch/${branchId}/status`),

  getTicketStatus: (ticketId: string) =>
    api.get(`/queue/ticket/${ticketId}/status`),

  getTellerQueue: (branchId: string) =>
    api.get(`/queue/branch/${branchId}/teller`),

  /** List branches for display/kiosk selection (public - no auth required) */
  listBranches: () =>
    api.get('/queue/branches'),

  /** Get staff (tellers + manager) for a branch (public - for demo login page) */
  getBranchStaff: (branchId: string) =>
    api.get(`/queue/branch/${branchId}/staff`),
};

export const adminApi = {
  // Branches
  listBranches: (page = 1, pageSize = 20) =>
    api.get('/admin/branches', { params: { page, pageSize } }),

  createBranch: (data: any) =>
    api.post('/admin/branches', data),

  getBranch: (branchId: string) =>
    api.get(`/admin/branches/${branchId}`),

  updateBranch: (branchId: string, data: any) =>
    api.patch(`/admin/branches/${branchId}`, data),

  deleteBranch: (branchId: string) =>
    api.delete(`/admin/branches/${branchId}`),

  /** Create a complete branch with services and counters in one atomic operation */
  createBranchComplete: (data: {
    name: string;
    code: string;
    address?: string | null;
    region?: string | null;
    timezone?: string;
    notifyAtPosition?: number;
    templateIds: string[];
    counterCount: number;
  }) => api.post('/admin/branches/complete', data),

  /** Suggest a unique branch code based on name */
  suggestBranchCode: (name: string) =>
    api.post<{ success: boolean; data: { suggestedCode: string } }>('/admin/branches/suggest-code', { name }),

  /** Check if a branch code is available */
  checkBranchCode: (code: string) =>
    api.post<{ success: boolean; data: { available: boolean; code: string } }>('/admin/branches/check-code', { code }),

  // Batch Import
  /** Download CSV template for batch import */
  downloadBatchTemplate: () =>
    api.get('/admin/branches/batch/template', { responseType: 'blob' }),

  /** Validate batch import data without creating branches */
  validateBatchImport: (rows: Array<{
    name: string;
    code: string;
    address?: string;
    region?: string;
    profile?: string;
    counterCount?: number;
    services?: string;
  }>) => api.post('/admin/branches/batch/validate', { rows }),

  /** Import validated branches */
  importBranches: (rows: Array<{
    name: string;
    code: string;
    address?: string;
    region?: string;
    profile?: string;
    counterCount?: number;
    services?: string;
  }>, skipErrors = true) => api.post('/admin/branches/batch/import', { rows, skipErrors }),

  // Counters
  listCounters: (branchId?: string) =>
    api.get('/admin/counters', { params: { branchId } }),

  createCounter: (data: any) =>
    api.post('/admin/counters', data),

  updateCounter: (counterId: string, data: any) =>
    api.patch(`/admin/counters/${counterId}`, data),

  deleteCounter: (counterId: string) =>
    api.delete(`/admin/counters/${counterId}`),

  // Batch Counter Operations
  openAllCounters: (branchId: string) =>
    api.post('/admin/counters/batch/open', { branchId }),

  closeAllCounters: (branchId: string) =>
    api.post('/admin/counters/batch/close', { branchId }),

  // Counter Configuration
  configureCounters: (branchId: string, targetCount: number) =>
    api.patch(`/admin/branches/${branchId}/counters/config`, { targetCount }),

  // Services
  listServices: (branchId?: string) =>
    api.get('/admin/services', { params: { branchId } }),

  createService: (data: any) =>
    api.post('/admin/services', data),

  updateService: (serviceId: string, data: any) =>
    api.patch(`/admin/services/${serviceId}`, data),

  deleteService: (serviceId: string) =>
    api.delete(`/admin/services/${serviceId}`),

  /** Get change history for a service */
  getServiceHistory: (serviceId: string, page = 1, pageSize = 20) =>
    api.get(`/admin/services/${serviceId}/history`, { params: { page, pageSize } }),

  /** Reset an overridden field to template value */
  resetServiceField: (serviceId: string, field: string) =>
    api.post(`/admin/services/${serviceId}/reset-field`, { field }),

  // Users
  listUsers: (page = 1, pageSize = 20, branchId?: string, role?: string) =>
    api.get('/admin/users', { params: { page, pageSize, branchId, role } }),

  createUser: (data: any) =>
    api.post('/admin/users', data),

  getUser: (userId: string) =>
    api.get(`/admin/users/${userId}`),

  updateUser: (userId: string, data: any) =>
    api.patch(`/admin/users/${userId}`, data),

  deleteUser: (userId: string) =>
    api.delete(`/admin/users/${userId}`),

  // Teller Management (convenience wrappers for branch managers)
  listTellers: (branchId: string, page = 1, pageSize = 50) =>
    api.get('/admin/users', { params: { page, pageSize, branchId, role: 'teller' } }),

  createTeller: (data: { name: string; email: string; password: string; branchId: string }) =>
    api.post('/admin/users', { ...data, role: 'teller' }),

  updateTeller: (userId: string, data: { name?: string; email?: string; password?: string; status?: string }) =>
    api.patch(`/admin/users/${userId}`, data),

  deactivateTeller: (userId: string) =>
    api.delete(`/admin/users/${userId}`),

  reactivateTeller: (userId: string) =>
    api.patch(`/admin/users/${userId}`, { status: 'active' }),

  // Branch Targets
  /** Get daily target for a branch (defaults to today) */
  getBranchTarget: (branchId: string, date?: string) =>
    api.get(`/admin/branches/${branchId}/targets`, { params: { date } }),

  /** Update daily target for a branch */
  updateBranchTarget: (branchId: string, data: {
    date?: string;
    servedTarget?: number;
    avgWaitTarget?: number;
    slaTarget?: number;
    slaThreshold?: number;
  }) => api.patch(`/admin/branches/${branchId}/targets`, data),

  // Operating Hours (Auto Queue Management)
  /** Get operating hours for a branch */
  getOperatingHours: (branchId: string) =>
    api.get(`/admin/branches/${branchId}/operating-hours`),

  /** Update operating hours for a branch */
  updateOperatingHours: (branchId: string, data: {
    autoQueueEnabled: boolean;
    openingTime?: string | null;
    closingTime?: string | null;
    closedOnWeekends?: boolean;
  }) => api.patch(`/admin/branches/${branchId}/operating-hours`, data),

  /** Get tenant default operating hours */
  getTenantDefaultHours: () =>
    api.get('/admin/tenant/default-hours'),

  /** Update tenant default operating hours */
  updateTenantDefaultHours: (data: {
    defaultOpeningTime?: string | null;
    defaultClosingTime?: string | null;
  }) => api.patch('/admin/tenant/default-hours', data),
};

export const breaksApi = {
  /** Start a teller break */
  startBreak: (data: {
    counterId: string;
    reason: 'lunch' | 'prayer' | 'personal' | 'urgent';
    durationMins: number;
  }) => api.post('/breaks/start', data),

  /** End a teller break */
  endBreak: (breakId: string) =>
    api.post(`/breaks/${breakId}/end`),

  /** Extend an active break */
  extendBreak: (breakId: string, additionalMins: number) =>
    api.patch(`/breaks/${breakId}/extend`, { additionalMins }),

  /** Get all breaks for a branch (today by default) */
  getBranchBreaks: (branchId: string, date?: string) =>
    api.get(`/breaks/branch/${branchId}`, { params: { date } }),

  /** Get active break for a specific counter */
  getCounterBreak: (counterId: string) =>
    api.get(`/breaks/counter/${counterId}`),

  /** Get available break reasons */
  getReasons: () =>
    api.get('/breaks/reasons'),
};

export const analyticsApi = {
  getTodayStats: (branchId: string) =>
    api.get(`/analytics/branch/${branchId}/today`),

  getHistoricalStats: (branchId: string, startDate: string, endDate: string, groupBy = 'day') =>
    api.get(`/analytics/branch/${branchId}/history`, { params: { startDate, endDate, groupBy } }),

  getAgentStats: (branchId: string, startDate: string, endDate: string) =>
    api.get(`/analytics/branch/${branchId}/agents`, { params: { startDate, endDate } }),

  getHourlyBreakdown: (branchId: string, date?: string) =>
    api.get(`/analytics/branch/${branchId}/hourly`, { params: { date } }),

  /** Get today vs yesterday comparison for branch manager dashboard */
  getBranchComparison: (branchId: string) =>
    api.get(`/analytics/branch/${branchId}/comparison`),

  /** Get SLA metrics and daily target progress for branch manager dashboard */
  getSlaMetrics: (branchId: string, options?: { slaTargetMins?: number; dailyTarget?: number }) =>
    api.get(`/analytics/branch/${branchId}/sla`, { params: options }),

  /** Get branch ranking across tenant (for competitive awareness) */
  getBranchRanking: () =>
    api.get('/analytics/tenant/ranking'),

  getTenantOverview: () =>
    api.get('/analytics/tenant/overview'),

  compareBranches: (startDate: string, endDate: string) =>
    api.get('/analytics/tenant/compare', { params: { startDate, endDate } }),

  getServiceBreakdown: (startDate: string, endDate: string) =>
    api.get('/analytics/tenant/services', { params: { startDate, endDate } }),

  /** Get chart data for historical trends visualization */
  getChartData: (
    branchId: string,
    period: 'week' | 'month',
    metrics: ('served' | 'avgWait' | 'slaPercent' | 'noShows')[]
  ) =>
    api.get(`/analytics/branch/${branchId}/charts`, {
      params: { period, metrics: metrics.join(',') },
    }),

  /** Get detailed teller activity timeline for a specific day */
  getTellerTimeline: (branchId: string, tellerId: string, date?: string) =>
    api.get(`/analytics/branch/${branchId}/teller/${tellerId}/timeline`, {
      params: { date },
    }),

  /** Get top services for today (for branch objectives card) */
  getTopServices: (branchId: string) =>
    api.get(`/analytics/branch/${branchId}/top-services`),
};

// ============================================================
// AI / COMPOSITE METRICS API
// ============================================================

export const aiApi = {
  /** Get composite metrics (Queue Health Score, Capacity, SLA Trajectory) */
  getCompositeMetrics: (branchId: string) =>
    api.get(`/ai/branch/${branchId}/composite`),

  /** Get hourly demand forecast for next 4 hours */
  getForecast: (branchId: string) =>
    api.get(`/ai/branch/${branchId}/forecast`),

  /** Get rule-based recommendations */
  getRecommendations: (branchId: string) =>
    api.get(`/ai/branch/${branchId}/recommendations`),

  /** Execute a recommendation action */
  executeRecommendation: (branchId: string, recommendationId: string) =>
    api.post(`/ai/branch/${branchId}/recommendations/${recommendationId}/execute`),
};

// ============================================================
// HQ DASHBOARD API
// ============================================================

export const hqApi = {
  /** Get tenant-level composite metrics (network health, capacity, SLA) */
  getMetrics: () =>
    api.get('/hq/metrics'),

  /** Get per-branch health scores for the performance matrix */
  getBranches: () =>
    api.get('/hq/branches'),

  /** Get tenant-level recommendations */
  getRecommendations: () =>
    api.get('/hq/recommendations'),
};

// ============================================================
// ANNOUNCEMENTS API
// ============================================================

export const announcementApi = {
  /** Create a new announcement (broadcasts to TV displays) */
  create: (data: {
    branchId: string;
    message: string;
    messageAr?: string;
    priority?: 'normal' | 'urgent';
    enableTts?: boolean;
    displayDuration?: number;
  }) => api.post('/announcements', data),

  /** Get active announcements for a branch (public for displays) */
  getActive: (branchId: string) =>
    api.get(`/announcements/branch/${branchId}/active`),

  /** Get announcement history for a branch */
  getHistory: (branchId: string, limit?: number) =>
    api.get(`/announcements/branch/${branchId}`, { params: { limit } }),

  /** Dismiss an announcement */
  dismiss: (announcementId: string) =>
    api.delete(`/announcements/${announcementId}`),
};

// ============================================================
// SERVICE TEMPLATES API (Bank-level reusable service definitions)
// ============================================================

export const templateApi = {
  /** List all service templates for the tenant */
  list: (page = 1, pageSize = 50, activeOnly = true) =>
    api.get('/templates', { params: { page, pageSize, activeOnly } }),

  /** Create a new service template */
  create: (data: {
    nameFr: string;
    nameAr: string;
    prefix: string;
    icon?: string | null;
    priorityWeight?: number;
    avgServiceTime?: number;
    descriptionFr?: string | null;
    descriptionAr?: string | null;
    serviceGroup?: string | null;
    displayOrder?: number;
    showOnKiosk?: boolean;
  }) => api.post('/templates', data),

  /** Get template by ID */
  get: (templateId: string) =>
    api.get(`/templates/${templateId}`),

  /** Update a service template */
  update: (templateId: string, data: {
    nameFr?: string;
    nameAr?: string;
    prefix?: string;
    icon?: string | null;
    priorityWeight?: number;
    avgServiceTime?: number;
    descriptionFr?: string | null;
    descriptionAr?: string | null;
    serviceGroup?: string | null;
    displayOrder?: number;
    showOnKiosk?: boolean;
  }) => api.patch(`/templates/${templateId}`, data),

  /** Delete (deactivate) a service template */
  delete: (templateId: string) =>
    api.delete(`/templates/${templateId}`),

  /** Copy selected templates to a branch as actual services */
  copyToBranch: (branchId: string, templateIds: string[]) =>
    api.post('/templates/copy-to-branch', { branchId, templateIds }),

  /** Bulk deploy templates to multiple branches/groups */
  bulkDeploy: (templateIds: string[], branchIds?: string[], groupIds?: string[]) =>
    api.post('/templates/bulk-deploy', { templateIds, branchIds, groupIds }),

  /** Get deployment status for a template across branches */
  getDeploymentStatus: (templateId: string) =>
    api.get(`/templates/${templateId}/deployment-status`),

  /** Get drift report for a template */
  getDriftReport: (templateId: string) =>
    api.get(`/templates/${templateId}/drift-report`),

  /** Get tenant-wide drift report */
  getDriftReportAll: () =>
    api.get('/templates/drift-report/all'),

  /** Push template changes to all linked services */
  syncTemplate: (templateId: string, force = false) =>
    api.post(`/templates/${templateId}/sync`, { force }),

  /** Get change history for a template */
  getHistory: (templateId: string, page = 1, pageSize = 20) =>
    api.get(`/templates/${templateId}/history`, { params: { page, pageSize } }),
};

// ============================================================
// BRANCH GROUP API
// ============================================================

export const branchGroupApi = {
  /** List all branch groups */
  list: () => api.get('/branch-groups'),

  /** Create a new branch group */
  create: (name: string, description?: string | null) =>
    api.post('/branch-groups', { name, description }),

  /** Update a branch group */
  update: (groupId: string, data: { name?: string; description?: string | null }) =>
    api.patch(`/branch-groups/${groupId}`, data),

  /** Delete a branch group */
  delete: (groupId: string) =>
    api.delete(`/branch-groups/${groupId}`),

  /** Add branches to a group */
  addBranches: (groupId: string, branchIds: string[]) =>
    api.post(`/branch-groups/${groupId}/branches`, { branchIds }),

  /** Remove a branch from a group */
  removeBranch: (groupId: string, branchId: string) =>
    api.delete(`/branch-groups/${groupId}/branches/${branchId}`),
};

export default api;
