'use client';
import { useEffect, useState, useCallback } from 'react';
import { employeeApi, attendanceApi, leaveApi, payrollApi, settingsApi, breakApi } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import { useAuthStore } from '@/store/authStore';
import { fmtCurrency, fmtDate } from '@/lib/utils';
import {
  Users, Clock, CalendarOff, DollarSign,
  UserCheck, UserX, Coffee, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>({});
  const [todayAtt, setTodayAtt] = useState<any>({});
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>({});
  const [settings, setSettings] = useState<any>(null);
  const [breakData, setBreakData] = useState<{ data: any[]; onBreakCount: number }>({ data: [], onBreakCount: 0 });
  const now = new Date();

  const load = useCallback(async () => {
    try {
      const [empStats, att, leaves, payroll, cfg, brk] = await Promise.all([
        employeeApi.getStats(),
        attendanceApi.getToday(),
        leaveApi.getAll({ status: 'pending', limit: 5 }),
        payrollApi.getSummary({ month: now.getMonth() + 1, year: now.getFullYear() }),
        settingsApi.get(),
        breakApi.getToday(),
      ]);
      setStats(empStats.data.data);
      setTodayAtt(att.data.stats);
      setPendingLeaves(leaves.data.data);
      setPayrollSummary(payroll.data.data);
      setSettings(cfg.data.data);
      setBreakData({ data: brk.data.data, onBreakCount: brk.data.onBreakCount });
    } catch {}
  }, []);

  useEffect(() => {
    load();
    // Refresh break data every 30s for live durations
    const interval = setInterval(() => breakApi.getToday().then((r) =>
      setBreakData({ data: r.data.data, onBreakCount: r.data.onBreakCount })
    ).catch(() => {}), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const deptData = stats.byDepartment?.map((d: any) => ({ name: d.name, count: d.count })) || [];
  const attData = [
    { name: 'Present', value: todayAtt.present || 0, color: '#10b981' },
    { name: 'Absent', value: todayAtt.absent || 0, color: '#ef4444' },
    { name: 'Late', value: todayAtt.late || 0, color: '#f59e0b' },
    { name: 'On Leave', value: todayAtt.onLeave || 0, color: '#3b82f6' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name} 👋</h1>
        <p className="text-gray-500 mt-1">{fmtDate(new Date())} — Here's your HR overview</p>
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Employees" value={stats.total || 0} icon={Users} color="blue" />
        <StatCard title="Active Employees" value={stats.active || 0} icon={UserCheck} color="green" />
        <StatCard title="On Leave" value={stats.onLeave || 0} icon={UserX} color="orange" />
        <StatCard
          title="Monthly Payroll"
          value={fmtCurrency(payrollSummary.totalNet || 0)}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Today attendance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Present Today', val: todayAtt.present || 0, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Absent Today', val: todayAtt.absent || 0, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Late Today', val: todayAtt.late || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'On Leave', val: todayAtt.onLeave || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`card text-center ${bg}`}>
            <p className={`text-3xl font-bold ${color}`}>{val}</p>
            <p className="text-sm text-gray-600 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
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
          <h3 className="font-semibold text-gray-800 mb-4">Today's Attendance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={attData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {attData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Break Tracking */}
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
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          On Break
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

      {/* Pending leaves */}
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
