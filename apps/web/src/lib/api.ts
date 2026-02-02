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

// Response interceptor - handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          // Attempt to refresh the token
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          useAuthStore.getState().setAccessToken(accessToken);

          // Retry the original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
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

  getBranchStatus: (branchId: string) =>
    api.get(`/queue/branch/${branchId}/status`),

  getTicketStatus: (ticketId: string) =>
    api.get(`/queue/ticket/${ticketId}/status`),

  getTellerQueue: (branchId: string) =>
    api.get(`/queue/branch/${branchId}/teller`),
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

  // Counters
  listCounters: (branchId?: string) =>
    api.get('/admin/counters', { params: { branchId } }),

  createCounter: (data: any) =>
    api.post('/admin/counters', data),

  updateCounter: (counterId: string, data: any) =>
    api.patch(`/admin/counters/${counterId}`, data),

  deleteCounter: (counterId: string) =>
    api.delete(`/admin/counters/${counterId}`),

  // Services
  listServices: (branchId?: string) =>
    api.get('/admin/services', { params: { branchId } }),

  createService: (data: any) =>
    api.post('/admin/services', data),

  updateService: (serviceId: string, data: any) =>
    api.patch(`/admin/services/${serviceId}`, data),

  deleteService: (serviceId: string) =>
    api.delete(`/admin/services/${serviceId}`),

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

  getTenantOverview: () =>
    api.get('/analytics/tenant/overview'),

  compareBranches: (startDate: string, endDate: string) =>
    api.get('/analytics/tenant/compare', { params: { startDate, endDate } }),

  getServiceBreakdown: (startDate: string, endDate: string) =>
    api.get('/analytics/tenant/services', { params: { startDate, endDate } }),
};

export default api;
