'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { cn, getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Clock, CalendarOff,
  IndianRupee, BarChart3, LogOut, Settings, ChevronRight, ScrollText, X, UserCircle, TrendingUp,
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard',    href: '/admin',                 icon: LayoutDashboard },
  { label: 'Employees',    href: '/admin/employees',       icon: Users },
  { label: 'Departments',  href: '/admin/departments',     icon: Building2 },
  { label: 'Attendance',   href: '/admin/attendance',      icon: Clock },
  { label: 'Leaves',       href: '/admin/leaves',          icon: CalendarOff },
  { label: 'Payroll',      href: '/admin/payroll',         icon: IndianRupee },
  { label: 'Performance',  href: '/admin/performance',     icon: TrendingUp },
  { label: 'Reports',      href: '/admin/reports',         icon: BarChart3 },
  { label: 'Settings',     href: '/admin/settings',        icon: Settings },
];

const employeeNav = [
  { label: 'Dashboard',        href: '/employee',               icon: LayoutDashboard },
  { label: 'My Attendance',    href: '/employee/attendance',    icon: Clock },
  { label: 'My Leaves',        href: '/employee/leaves',        icon: CalendarOff },
  { label: 'My Payslips',      href: '/employee/payslips',      icon: IndianRupee },
  { label: 'My Performance',   href: '/employee/performance',   icon: TrendingUp },
  { label: 'Company Policies', href: '/employee/policies',      icon: ScrollText },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, isHR } = useAuthStore();
  const { companyName } = useSettingsStore();
  const nav = isHR() ? adminNav : employeeNav;

  // Derive short initials from company name (max 2 chars)
  const initials = companyName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <aside
      className={cn(
        'w-64 bg-gray-900 text-white flex flex-col h-full fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out',
        'md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo / Company branding */}
      <div className="p-5 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight truncate" title={companyName}>
              {companyName}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">HR Management</p>
          </div>
        </div>
        {/* Close — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }: any) => {
          const active = pathname === href || (href !== '/admin' && href !== '/employee' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-4 h-4" />}
            </Link>
          );
        })}
      </nav>

      {/* User info + profile + sign out */}
      <div className="p-4 border-t border-gray-700">
        {/* Clickable user card → profile page */}
        <Link
          href={isHR() ? '/admin/profile' : '/employee/profile'}
          onClick={onClose}
          className="flex items-center gap-3 mb-2 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors group"
        >
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
            {getInitials(user?.name || 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <UserCircle className="w-4 h-4 text-gray-500 group-hover:text-gray-300 shrink-0 transition-colors" />
        </Link>

        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
