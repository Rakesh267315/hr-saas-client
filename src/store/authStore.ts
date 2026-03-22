import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string;
  department: { _id: string; name: string };
  avatar?: string;
}

interface AuthState {
  user: User | null;
  employee: Employee | null;
  token: string | null;
  setAuth: (user: User, token: string, employee?: Employee) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isHR: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      employee: null,
      token: null,
      setAuth: (user, token, employee) => {
        localStorage.setItem('hr_token', token);
        set({ user, token, employee: employee || null });
      },
      logout: () => {
        localStorage.removeItem('hr_token');
        set({ user: null, token: null, employee: null });
      },
      isAdmin: () => ['admin', 'super_admin'].includes(get().user?.role || ''),
      isHR: () => ['admin', 'super_admin', 'hr'].includes(get().user?.role || ''),
    }),
    { name: 'hr_auth' }
  )
);
