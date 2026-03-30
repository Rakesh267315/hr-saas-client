import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  companyName: string;
  companyTagline: string;
  setSettings: (s: Partial<{ companyName: string; companyTagline: string }>) => void;
  clearSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      companyName: 'HR SaaS',
      companyTagline: 'Management Platform',
      setSettings: (s) =>
        set((prev) => ({
          companyName: s.companyName ?? prev.companyName,
          companyTagline: s.companyTagline ?? prev.companyTagline,
        })),
      clearSettings: () =>
        set({ companyName: 'HR SaaS', companyTagline: 'Management Platform' }),
    }),
    {
      name: 'hr_settings',          // localStorage key
      partialize: (s) => ({         // only persist display values, not functions
        companyName: s.companyName,
        companyTagline: s.companyTagline,
      }),
    }
  )
);
