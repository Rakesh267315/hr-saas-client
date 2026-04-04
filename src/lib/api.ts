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
    if (typeof window !== 'undefined') {
      // Auto-logout on 401 (expired/invalid token)
      if (err.response?.status === 401) {
        // Don't redirect if already on login page
        if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('hr_token');
          // Use replace to avoid adding login to browser history
          window.location.replace('/login');
        }
      }
      // Show user-friendly message on network errors
      if (!err.response && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED')) {
        // Dynamically import toast to avoid SSR issues
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error('Connection lost. Please check your internet connection.', { id: 'network-error' });
        });
      }
      // Rate limit feedback
      if (err.response?.status === 429) {
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error(err.response.data?.message || 'Too many requests. Please slow down.', { id: 'rate-limit' });
        });
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile:  (data: object) => api.patch('/auth/update-profile', data),
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
  updateCredentials: (id: string, data: object) => api.patch(`/employees/${id}/credentials`, data),
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
  reset:  (id: string) => api.delete(`/attendance/${id}/reset`),
  recalculate: (date?: string) => api.post('/attendance/recalculate', { date }),
  backfill: (data: object) => api.post('/attendance/backfill', data),
  bulkEntry: (data: object) => api.post('/attendance/bulk-entry', data),
};

// ── Leaves ────────────────────────────────────────────────────────────────────
export const leaveApi = {
  apply: (data: object) => api.post('/leaves', data),
  getAll: (params?: object) => api.get('/leaves', { params }),
  getOne: (id: string) => api.get(`/leaves/${id}`),
  updateStatus: (id: string, data: object) => api.patch(`/leaves/${id}/status`, data),
  cancel: (id: string) => api.patch(`/leaves/${id}/cancel`),
  getBalance: (id: string) => api.get(`/leaves/balance/${id}`),
  getMonthlyBalance: (id: string, month: string) =>
    api.get(`/leaves/monthly-balance/${id}`, { params: { month } }),
  adminManualAdd: (data: object) => api.post('/leaves/admin/manual', data),
  // Leave overrides (manager/admin custom quota)
  setOverride: (data: object) => api.post('/leaves/override', data),
  getOverrides: (params?: object) => api.get('/leaves/overrides', { params }),
  deleteOverride: (id: string) => api.delete(`/leaves/override/${id}`),
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

// ── Face Recognition ──────────────────────────────────────────────────────────
export const faceApi = {
  register:   (id: string, descriptor: number[]) => api.post(`/face/${id}/register`, { descriptor }),
  deleteFace: (id: string)                        => api.delete(`/face/${id}`),
  status:     (id: string)                        => api.get(`/face/${id}/status`),
  checkin:    (employeeId: string, descriptor: number[]) => api.post('/face/checkin',  { employeeId, descriptor }),
  checkout:   (employeeId: string, descriptor: number[]) => api.post('/face/checkout', { employeeId, descriptor }),
  getLogs:    (params?: object)                   => api.get('/face/logs', { params }),
};

// ── Breaks ────────────────────────────────────────────────────────────────────
export const breakApi = {
  startBreak: (data: object) => api.post('/breaks/start', data),
  endBreak: (data: object) => api.post('/breaks/end', data),
  getToday: () => api.get('/breaks/today'),
  getByEmployee: (id: string) => api.get(`/breaks/employee/${id}`),
};

// ── Notifications ──────────────────────────────────────────────────────────────
export const notifApi = {
  getAll:           (params?: object)                    => api.get('/notifications', { params }),
  markRead:         (id: string)                         => api.patch(`/notifications/${id}/read`),
  markAllRead:      ()                                   => api.patch('/notifications/read-all'),
  clearAll:         ()                                   => api.delete('/notifications/clear'),
  // Voice messages
  sendVoice:        (employeeId: string, message: string) => api.post('/notifications/send-voice', { employeeId, message }),
  getVoiceMessages: ()                                   => api.get('/notifications/voice-messages'),
};

// ── Performance ───────────────────────────────────────────────────────────────
export const performanceApi = {
  // Goals
  getGoals:    (params?: object)              => api.get('/performance/goals', { params }),
  createGoal:  (data: object)                 => api.post('/performance/goals', data),
  updateGoal:  (id: string, data: object)     => api.patch(`/performance/goals/${id}`, data),
  deleteGoal:  (id: string)                   => api.delete(`/performance/goals/${id}`),
  // Reviews
  getReviews:  (params?: object)              => api.get('/performance/reviews', { params }),
  createReview:(data: object)                 => api.post('/performance/reviews', data),
  updateReview:(id: string, data: object)     => api.patch(`/performance/reviews/${id}`, data),
  // Summary
  getSummary:  (employeeId: string)           => api.get(`/performance/summary/${employeeId}`),
};
