import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('hr_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Auto-logout on 401
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hr_token');
      localStorage.removeItem('hr_user');
      window.location.href = '/login';
    }
    // Swallow network errors silently so they don't crash the app — callers handle them
    if (!err.response && err.code === 'ERR_NETWORK') {
      console.warn('API network error — server may be starting up:', err.config?.url);
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data: object) => api.patch('/auth/change-password', data),
};

// ── Employees ─────────────────────────────────────────────────────────────────
export const employeeApi = {
  getAll: (params?: object) => api.get('/employees', { params }),
  getOne: (id: string) => api.get(`/employees/${id}`),
  create: (data: object) => api.post('/employees', data),
  update: (id: string, data: object) => api.patch(`/employees/${id}`, data),
  remove: (id: string) => api.delete(`/employees/${id}`),
  getStats: () => api.get('/employees/stats'),
};

// ── Departments ───────────────────────────────────────────────────────────────
export const deptApi = {
  getAll: () => api.get('/departments'),
  create: (data: object) => api.post('/departments', data),
  update: (id: string, data: object) => api.patch(`/departments/${id}`, data),
  remove: (id: string) => api.delete(`/departments/${id}`),
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceApi = {
  checkIn: (data: object) => api.post('/attendance/check-in', data),
  checkOut: (data: object) => api.post('/attendance/check-out', data),
  getByEmployee: (id: string, params?: object) => api.get(`/attendance/employee/${id}`, { params }),
  getSummary: (id: string, params?: object) => api.get(`/attendance/employee/${id}/summary`, { params }),
  getToday: () => api.get('/attendance/today'),
  getAll: (params?: object) => api.get('/attendance/all', { params }),
  markAbsent: (data: object) => api.post('/attendance/mark-absent', data),
  correct: (id: string, data: object) => api.patch(`/attendance/${id}/correct`, data),
  unlock: (id: string, data: object) => api.patch(`/attendance/${id}/unlock`, data),
};

// ── Leaves ────────────────────────────────────────────────────────────────────
export const leaveApi = {
  apply: (data: object) => api.post('/leaves', data),
  getAll: (params?: object) => api.get('/leaves', { params }),
  getOne: (id: string) => api.get(`/leaves/${id}`),
  updateStatus: (id: string, data: object) => api.patch(`/leaves/${id}/status`, data),
  cancel: (id: string) => api.patch(`/leaves/${id}/cancel`),
  getBalance: (id: string) => api.get(`/leaves/balance/${id}`),
};

// ── Payroll ───────────────────────────────────────────────────────────────────
export const payrollApi = {
  preview: (params: object) => api.get('/payroll/preview', { params }),
  generate: (data: object) => api.post('/payroll/generate', data),
  getAll: (params?: object) => api.get('/payroll', { params }),
  getOne: (id: string) => api.get(`/payroll/${id}`),
  updateStatus: (id: string, data: object) => api.patch(`/payroll/${id}/status`, data),
  getSummary: (params?: object) => api.get('/payroll/summary', { params }),
};

// ── Company Settings ──────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: object) => api.patch('/settings', data),
};

// ── Breaks ────────────────────────────────────────────────────────────────────
export const breakApi = {
  startBreak: (data: object) => api.post('/breaks/start', data),
  endBreak: (data: object) => api.post('/breaks/end', data),
  getToday: () => api.get('/breaks/today'),
  getByEmployee: (id: string) => api.get(`/breaks/employee/${id}`),
};
