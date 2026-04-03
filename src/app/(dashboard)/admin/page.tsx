'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { employeeApi, attendanceApi, leaveApi, payrollApi, settingsApi, breakApi } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import { useAuthStore } from '@/store/authStore';
import { fmtCurrency, fmtDate, cn } from '@/lib/utils';
import {
  Users, CalendarOff, IndianRupee,
  UserCheck, UserX, Coffee, Building2,
  ChevronDown, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// ── Date preset types ─────────────────────────────────────────────────────────
type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom';

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today',      label: 'Today' },
  { key: 'yesterday',  label: 'Yesterday' },
  { key: 'week',       label: 'This Week' },
  { key: 'month',      label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom',     label: 'Custom' },
];

function getDateRange(preset: DatePreset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (preset) {
    case 'today':      return { from: fmt(today), to: fmt(today) };
    case 'yesterday':  { const d = subDays(today, 1); return { from: fmt(d), to: fmt(d) }; }
    case 'week':       return { from: fmt(startOfWeek(today, { weekStartsOn: 1 })), to: fmt(today) };
    case 'month':      return { from: fmt(startOfMonth(today)), to: fmt(today) };
    case 'last_month': {
      const lm = subMonths(today, 1);
      return { from: fmt(startOfMonth(lm)), to: fmt(endOfMonth(lm)) };
    }
    case 'custom':     return { from: customFrom, to: customTo || customFrom };
  }
}

function computeAttStats(records: any[]) {
  return {
    present: records.filter(r => ['present', 'late'].includes(r.status)).length,
    absent:  records.filter(r => r.status === 'absent').length,
    // Use status field as single source of truth — 'present' means within grace period, not late
    late:    records.filter(r => r.status === 'late').length,
    onLeave: records.filter(r => r.status === 'on_leave').length,
  };
}

// ── Date Filter Bar ───────────────────────────────────────────────────────────
function DateFilterBar({
  preset, onPreset, customFrom, customTo, onCustomFrom, onCustomTo,
}: {
  preset: DatePreset;
  onPreset: (p: DatePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (d: string) => void;
  onCustomTo: (d: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onPreset(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
              preset === key
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="date"
            value={customFrom}
            onChange={e => onCustomFrom(e.target.value)}
            className="text-sm text-gray-700 outline-none w-36 cursor-pointer"
          />
          <span className="text-gray-400 font-medium">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={e => onCustomTo(e.target.value)}
            className="text-sm text-gray-700 outline-none w-36 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore();

  // Data
  const [stats, setStats]               = useState<any>({});
  const [attRecords, setAttRecords]     = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>({});
  const [settings, setSettings]         = useState<any>(null);
  const [breakData, setBreakData]       = useState<{ data: any[]; onBreakCount: number }>({ data: [], onBreakCount: 0 });
  const [loading, setLoading]           = useState(false);

  // Date filter state
  const [preset, setPreset]         = useState<DatePreset>('today');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo,   setCustomTo]   = useState(format(new Date(), 'yyyy-MM-dd'));

  const now = new Date();
  const dateRange = useMemo(() => getDateRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const isToday = preset === 'today';

  // Label for the header
  const dateLabel = useMemo(() => {
    if (preset === 'today')      return "Today's Overview";
    if (preset === 'yesterday')  return "Yesterday's Overview";
    if (preset === 'week')       return 'This Week';
    if (preset === 'month')      return 'This Month';
    if (preset === 'last_month') return 'Last Month';
    if (customFrom === customTo) return fmtDate(customFrom);
    return `${fmtDate(customFrom)} – ${fmtDate(customTo)}`;
  }, [preset, customFrom, customTo]);

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadStatic = useCallback(async () => {
    try {
      const [empStats, leaves, payroll, cfg] = await Promise.all([
        employeeApi.getStats(),
        leaveApi.getAll({ status: 'pending', limit: 5 }),
        payrollApi.getSummary({ month: now.getMonth() + 1, year: now.getFullYear() }),
        settingsApi.get(),
      ]);
      setStats(empStats.data.data);
      setPendingLeaves(leaves.data.data);
      setPayrollSummary(payroll.data.data);
      setSettings(cfg.data.data);
    } catch {}
  }, []);

  const loadDateData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes] = await Promise.all([
        attendanceApi.getAll({ from: dateRange.from, to: dateRange.to }),
      ]);
      setAttRecords(attRes.data.data || []);

      // Break tracker: only fetch for today
      if (isToday) {
        const brk = await breakApi.getToday();
        setBreakData({ data: brk.data.data, onBreakCount: brk.data.onBreakCount });
      } else {
        setBreakData({ data: [], onBreakCount: 0 });
      }
    } catch {
      setAttRecords([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, isToday]);

  useEffect(() => { loadStatic(); }, [loadStatic]);
  useEffect(() => { loadDateData(); }, [loadDateData]);

  // Auto-refresh break data every 30s (today only)
  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() =>
      breakApi.getToday().then(r =>
        setBreakData({ data: r.data.data, onBreakCount: r.data.onBreakCount })
      ).catch(() => {}), 30000
    );
    return () => clearInterval(interval);
  }, [isToday]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const todayAtt = useMemo(() => computeAttStats(attRecords), [attRecords]);

  const deptData = stats.byDepartment?.map((d: any) => ({ name: d.name, count: d.count })) || [];

  const attChartData = [
    { name: 'Present', value: todayAtt.present, color: '#10b981' },
    { name: 'Absent',  value: todayAtt.absent,  color: '#ef4444' },
    { name: 'Late',    value: todayAtt.late,     color: '#f59e0b' },
    { name: 'On Leave',value: todayAtt.onLeave,  color: '#3b82f6' },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name} 👋</h1>
          <p className="text-gray-500 mt-0.5 text-sm">{fmtDate(new Date())} — {dateLabel}</p>
        </div>
        <DateFilterBar
          preset={preset}
          onPreset={(p) => setPreset(p)}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFrom={(d) => setCustomFrom(d)}
          onCustomTo={(d) => setCustomTo(d)}
        />
      </div>

      {/* Office Timing Banner */}
      {settings && (
        <div className="flex items-center gap-6 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 mb-6">
          <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex flex-wrap gap-6 text-sm">
            <span className="text-gray-600">
              <span className="font-medium text-blue-700">Office Hours:</span>{' '}
              {settings.officeStartTime} – {settings.officeEndTime}
            </span>
            <span className="text-gray-600">
              <span className="font-medium text-blue-700">Weekly Off:</span>{' '}
              {settings.weeklyOffDay}
            </span>
            {settings.companyName && (
              <span className="text-gray-600">
                <span className="font-medium text-blue-700">Company:</span>{' '}
                {settings.companyName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Top Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Employees"  value={stats.total || 0}                     icon={Users}      color="blue" />
        <StatCard title="Active Employees" value={stats.active || 0}                    icon={UserCheck}  color="green" />
        <StatCard title="On Leave"         value={stats.onLeave || 0}                   icon={UserX}      color="orange" />
        <StatCard title="Monthly Payroll"  value={fmtCurrency(payrollSummary.totalNet || 0)} icon={IndianRupee} color="purple" />
      </div>

      {/* ── Attendance Summary for selected date ── */}
      <div className={cn(
        'grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 transition-opacity duration-200',
        loading && 'opacity-50 pointer-events-none'
      )}>
        {[
          { label: isToday ? 'Present Today' : 'Present', val: todayAtt.present, color: 'text-green-600', bg: 'bg-green-50' },
          { label: isToday ? 'Absent Today'  : 'Absent',  val: todayAtt.absent,  color: 'text-red-600',   bg: 'bg-red-50' },
          { label: isToday ? 'Late Today'    : 'Late',    val: todayAtt.late,    color: 'text-orange-600',bg: 'bg-orange-50' },
          { label: 'On Leave',                            val: todayAtt.onLeave, color: 'text-blue-600',  bg: 'bg-blue-50' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`card text-center ${bg}`}>
            {loading
              ? <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin mx-auto my-1" />
              : <p className={`text-3xl font-bold ${color}`}>{val}</p>
            }
            <p className="text-sm text-gray-600 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Employees by Department</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-1">
            Attendance — {dateLabel}
          </h3>
          {attChartData.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-56 text-gray-400 text-sm">
              No attendance data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={attChartData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3} dataKey="value"
                >
                  {attChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Break Tracker (today only) ── */}
      {isToday && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-600" /> Break Tracker — Today
            </h3>
            <span className="badge bg-amber-100 text-amber-700">{breakData.onBreakCount} on break</span>
          </div>
          {breakData.data.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No break activity today</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Designation</th>
                    <th className="pb-3 font-medium">Breaks</th>
                    <th className="pb-3 font-medium">Total Break Time</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {breakData.data.map((b: any) => (
                    <tr key={b.employee?._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-medium">
                        {b.employee?.firstName} {b.employee?.lastName}
                        <span className="ml-2 text-xs text-gray-400">{b.employee?.employeeCode}</span>
                      </td>
                      <td className="py-3 text-gray-600">{b.employee?.designation || '—'}</td>
                      <td className="py-3">{b.breakCount}</td>
                      <td className="py-3">
                        {b.totalMinutes >= 60
                          ? `${Math.floor(b.totalMinutes / 60)}h ${b.totalMinutes % 60}m`
                          : `${b.totalMinutes}m`}
                      </td>
                      <td className="py-3">
                        {b.isOnBreak ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> On Break
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Pending Leave Requests ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Pending Leave Requests</h3>
          <span className="badge bg-yellow-100 text-yellow-700">{pendingLeaves.length} pending</span>
        </div>
        {pendingLeaves.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No pending leave requests</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">From</th>
                  <th className="pb-3 font-medium">To</th>
                  <th className="pb-3 font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((l: any) => (
                  <tr key={l._id} className="table-row">
                    <td className="py-3">{l.employee?.firstName} {l.employee?.lastName}</td>
                    <td className="py-3 capitalize">{l.leaveType}</td>
                    <td className="py-3">{fmtDate(l.startDate)}</td>
                    <td className="py-3">{fmtDate(l.endDate)}</td>
                    <td className="py-3">{l.totalDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
