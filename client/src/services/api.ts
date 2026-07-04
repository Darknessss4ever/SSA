import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: any) =>
    api.post('/auth/register', data),
  login: (data: any) =>
    api.post('/auth/login', data),
  googleLogin: (data: { credential?: string; mockProfile?: any }) =>
    api.post('/auth/google', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) =>
    api.put('/auth/profile', data),
};

// ─── Sports ─────────────────────────────────────────────────────────────────
export const sportsAPI = {
  getAll: () => api.get('/sports'),
  create: (data: any) => api.post('/sports', data),
  update: (id: string, data: any) => api.put(`/sports/${id}`, data),
  delete: (id: string) => api.delete(`/sports/${id}`),
};

// ─── Slots ──────────────────────────────────────────────────────────────────
export const slotsAPI = {
  getByDate: (sportId: string, date: string) =>
    api.get(`/slots?sportId=${sportId}&date=${date}`),
  getAll: (params?: any) => api.get('/slots/all', { params }),
  create: (data: any) => api.post('/slots', data),
  generate: (data: any) => api.post('/slots/generate', data),
  update: (id: string, data: any) => api.put(`/slots/${id}`, data),
  bulkUpdate: (data: { ids: string[]; updates: any }) => api.put('/slots/bulk', data),
  bulkDelete: (data: { ids: string[] }) => api.post('/slots/bulk-delete', data),
  block: (id: string, data: { isBlocked: boolean; blockReason?: string }) =>
    api.put(`/slots/${id}/block`, data),
  delete: (id: string) => api.delete(`/slots/${id}`),
};

// ─── Bookings ────────────────────────────────────────────────────────────────
export const bookingsAPI = {
  create: (data: any) => api.post('/bookings', data),
  getMyBookings: (params?: any) => api.get('/bookings', { params }),
  cancel: (id: string) => api.put(`/bookings/${id}/cancel`),
  adminGetAll: (params?: any) => api.get('/bookings/admin/all', { params }),
  adminUpdate: (id: string, data: { status?: string; action?: string }) => api.put(`/bookings/admin/${id}`, data),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  assignSubscription: (data: any) => api.post('/admin/subscriptions', data),
};

// ─── Coaching ────────────────────────────────────────────────────────────────
export const coachingAPI = {
  // User
  getAll: () => api.get('/coaching'),
  enroll: (id: string) => api.post(`/coaching/${id}/enroll`),
  unenroll: (id: string) => api.delete(`/coaching/${id}/unenroll`),
  // Admin
  adminGetAll: () => api.get('/coaching/admin/all'),
  create: (data: any) => api.post('/coaching', data),
  update: (id: string, data: any) => api.put(`/coaching/${id}`, data),
  delete: (id: string) => api.delete(`/coaching/${id}`),
  removeParticipant: (programId: string, userId: string) =>
    api.delete(`/coaching/${programId}/participants/${userId}`),
  approveParticipant: (programId: string, userId: string, data?: { amount?: number; paymentMethod?: string }) =>
    api.post(`/coaching/${programId}/approve/${userId}`, data),
  rejectParticipant: (programId: string, userId: string) =>
    api.post(`/coaching/${programId}/reject/${userId}`),
};

// ─── Tournaments ─────────────────────────────────────────────────────────────
export const tournamentsAPI = {
  getAll: () => api.get('/tournaments'),
  create: (data: any) => api.post('/tournaments', data),
  update: (id: string, data: any) => api.put(`/tournaments/${id}`, data),
  register: (id: string) => api.post(`/tournaments/${id}/register`),
};

// ─── Announcements ───────────────────────────────────────────────────────────
export const announcementsAPI = {
  getAll: () => api.get('/announcements'),
  create: (data: any) => api.post('/announcements', data),
  delete: (id: string) => api.delete(`/announcements/${id}`),
};

// ─── Subscription Plans ───────────────────────────────────────────────────────
export const subscriptionPlansAPI = {
  getAll: () => api.get('/subscription-plans'),
  getMySubscription: () => api.get('/subscription-plans/my-subscription'),
  getMyStatus: () => api.get('/subscription-plans/my-status'),
  setPreferredTimes: (times: { sportId: string; startTime: string; endTime: string }[]) =>
    api.put('/subscription-plans/my-preferred-times', { preferredSlotTimes: times }),
  // admin
  create: (data: any) => api.post('/subscription-plans', data),
  update: (id: string, data: any) => api.put(`/subscription-plans/${id}`, data),
  delete: (id: string) => api.delete(`/subscription-plans/${id}`),
  getAllSubscriptions: (params?: any) => api.get('/subscription-plans/all-subscriptions', { params }),
  assignToUser: (data: {
    userId: string;
    planId: string;
    durationIndex: number;
    customValidFrom?: string;
    adminAllottedTimes?: { sportId: string; startTime: string; endTime: string }[];
  }) => api.post('/subscription-plans/assign', data),
  cancelUserSubscription: (subId: string) =>
    api.put(`/subscription-plans/subscriptions/${subId}/cancel`),
};

// ─── Employees ───────────────────────────────────────────────────────────────
export const employeesAPI = {
  getAll: () => api.get('/employees'),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

// ─── Financials ──────────────────────────────────────────────────────────────
export const financialsAPI = {
  getOverview: () => api.get('/financials/overview'),
  getTransactions: (params?: any) => api.get('/financials/transactions', { params }),
  getSubcategories: () => api.get('/financials/subcategories'),
  createTransaction: (data: any) => api.post('/financials/transactions', data),
  updateTransaction: (id: string, data: any) => api.put(`/financials/transactions/${id}`, data),
  deleteTransaction: (id: string) => api.delete(`/financials/transactions/${id}`),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsAPI = {
  getSalesReport: () => api.get('/reports/sales'),
  getDuesReport: () => api.get('/reports/dues'),
  getMembershipsReport: () => api.get('/reports/memberships'),
};

export default api;
