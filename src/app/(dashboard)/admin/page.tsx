'use client';
import { useEffect, useState } from 'react';
import { employeeApi, attendanceApi, leaveApi, payrollApi } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import { useAuthStore } from '@/store/authStore';
import { fmtCurrency, fmtDate } from '@/lib/utils';
import {
  Users, Clock, CalendarOff, DollarSign,
  TrendingUp, UserCheck, UserX, AlertCircle,
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
  const now = new Date();

  useEffect(() => {
    const load = async () => {
      try {
        const [empStats, att, leaves, payroll] = await Promise.all([
          employeeApi.getStats(),
          attendanceApi.getToday(),
          leaveApi.getAll({ status: 'pending', limit: 5 }),
          payrollApi.getSummary({ month: now.getMonth() + 1, year: now.getFullYear() }),
        ]);
        setStats(empStats.data.data);
        setTodayAtt(att.data.stats);
        setPendingLeaves(leaves.data.data);
        setPayrollSummary(payroll.data.data);
      } catch {}
    };
    load();
  }, []);

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
        {/* Dept bar chart */}
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

        {/* Attendance pie */}
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
                    <td className="py-3">
                      {l.employee?.firstName} {l.employee?.lastName}
                    </td>
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
