import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const fmtDate = (d: string | Date, fmt = 'dd MMM yyyy') =>
  format(typeof d === 'string' ? parseISO(d) : d, fmt);

export const fmtCurrency = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

export const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-orange-100 text-orange-700',
  on_leave: 'bg-blue-100 text-blue-700',
  half_day: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
};
