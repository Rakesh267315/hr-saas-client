'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { cn, getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Clock, CalendarOff,
  DollarSign, BarChart3, LogOut, Settings, ChevronRight,
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Employees', href: '/admin/employees', icon: Users },
  { label: 'Departments', href: '/admin/departments', icon: Building2 },
  { label: 'Attendance', href: '/admin/attendance', icon: Clock },
  { label: 'Leaves', href: '/admin/leaves', icon: CalendarOff },
  { label: 'Payroll', href: '/admin/payroll', icon: DollarSign },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
];

const employeeNav = [
  { label: 'Dashboard', href: '/employee', icon: LayoutDashboard },
  { label: 'My Attendance', href: '/employee/attendance', icon: Clock },
  { label: 'My Leaves', href: '/employee/leaves', icon: CalendarOff },
  { label: 'My Payslips', href: '/employee/payslips', icon: DollarSign },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isHR } = useAuthStore();
  const nav = isHR() ? adminNav : employeeNav;

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">HR SaaS</p>
            <p className="text-gray-400 text-xs">Management Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && href !== '/employee' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                active ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-4 h-4" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
            {getInitials(user?.name || 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
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
