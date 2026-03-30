'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { settingsApi } from '@/lib/api';
import Sidebar from '@/components/ui/Sidebar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import NotificationBell from '@/components/ui/NotificationBell';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { companyName, setSettings } = useSettingsStore();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !user) router.replace('/login');
  }, [user, router, mounted]);

  // Fetch company settings once and store globally
  useEffect(() => {
    if (!user) return;
    settingsApi.get()
      .then((res) => {
        const d = res.data.data;
        setSettings({
          companyName: d.companyName,
          companyTagline: d.companyTagline || 'Management Platform',
        });
      })
      .catch(() => {});
  }, [user]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Top bar — mobile + desktop notification bell */}
        <header className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm md:px-6">
          {/* Left: hamburger (mobile) + logo */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0 md:hidden">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">
                  {companyName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')}
                </span>
              </div>
              <span className="font-semibold text-gray-900 text-sm truncate">{companyName}</span>
            </div>
          </div>
          {/* Right: notification bell */}
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white px-4 md:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 shrink-0">
          <p className="text-xs text-gray-500 font-medium">{companyName}</p>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} All rights reserved &nbsp;·&nbsp; Powered by{' '}
            <span className="text-blue-600 font-medium">HRFlow</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
