'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { attendanceApi, leaveApi, payrollApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate, fmtCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Clock, LogIn, LogOut, Calendar, DollarSign } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user, employee } = useAuthStore();
  const [summary, setSummary] = useState<any>({});
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [latestPayroll, setLatestPayroll] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const now = new Date();

  const loadData = async () => {
    if (!employee?._id) return;
    try {
      const [attSummary, leaves, payrolls] = await Promise.all([
        attendanceApi.getSummary(employee._id, { month: now.getMonth() + 1, year: now.getFullYear() }),
        leaveApi.getAll({ employeeId: employee._id, status: 'pending' }),
        payrollApi.getAll({ employeeId: employee._id, limit: 1 }),
      ]);
      setSummary(attSummary.data.data);
      setPendingLeaves(leaves.data.data);
      setLatestPayroll(payrolls.data.data[0] || null);
    } catch {}
  };

  const loadToday = async () => {
    if (!employee?._id) return;
    try {
      const res = await attendanceApi.getByEmployee(employee._id, {
        month: now.getMonth() + 1, year: now.getFullYear(),
      });
      const today = res.data.data.find((r: any) =>
        new Date(r.date).toDateString() === now.toDateString()
      );
      setTodayRecord(today || null);
    } catch {}
  };

  useEffect(() => { loadData(); loadToday(); }, [employee]);

  const doCheckIn = async () => {
    setCheckingIn(true);
    try {
      await attendanceApi.checkIn({ employeeId: employee?._id });
      toast.success('Checked in successfully!');
      loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setCheckingIn(false); }
  };

  const doCheckOut = async () => {
    setCheckingIn(true);
    try {
      await attendanceApi.checkOut({ employeeId: employee?._id });
      toast.success('Checked out successfully!');
      loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally { setCheckingIn(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 18 ? 'Afternoon' : 'Evening'}, {employee?.firstName || user?.name}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">{fmtDate(now, 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Check in/out */}
      <div className="card mb-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm">Today's Attendance</p>
            {todayRecord ? (
              <div className="mt-2 space-y-1">
                <p className="text-lg font-semibold">
                  Check In: {todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString() : '—'}
                </p>
                <p className="text-lg font-semibold">
                  Check Out: {todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString() : 'Not yet'}
                </p>
                {todayRecord.lateMinutes > 0 && (
                  <p className="text-yellow-200 text-sm">Late by {todayRecord.lateMinutes} minutes</p>
                )}
              </div>
            ) : (
              <p className="text-lg font-semibold mt-1">Not checked in yet</p>
            )}
          </div>
          <div className="flex gap-3">
            {!todayRecord?.checkIn && (
              <button onClick={doCheckIn} disabled={checkingIn} className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors">
                <LogIn className="w-4 h-4" /> Check In
              </button>
            )}
            {todayRecord?.checkIn && !todayRecord?.checkOut && (
              <button onClick={doCheckOut} disabled={checkingIn} className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors">
                <LogOut className="w-4 h-4" /> Check Out
              </button>
            )}
            {todayRecord?.checkOut && (
              <span className="text-primary-100 text-sm self-center">Done for today ✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Present Days', value: summary.present || 0, color: 'text-green-600' },
          { label: 'Absent Days', value: summary.absent || 0, color: 'text-red-500' },
          { label: 'Late Arrivals', value: summary.late || 0, color: 'text-orange-500' },
          { label: 'Leave Days', value: summary.onLeave || 0, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest payslip */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" /> Latest Payslip
          </h3>
          {latestPayroll ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Period</span>
                <span className="font-medium">{latestPayroll.period}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Gross Salary</span>
                <span>{fmtCurrency(latestPayroll.grossSalary)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deductions</span>
                <span className="text-red-500">-{fmtCurrency(latestPayroll.totalDeductions)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Net Pay</span>
                <span className="text-green-700">{fmtCurrency(latestPayroll.netSalary)}</span>
              </div>
              <div className="pt-1"><Badge status={latestPayroll.status} /></div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No payslip available</p>
          )}
        </div>

        {/* Pending leaves */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> My Leave Requests
          </h3>
          {pendingLeaves.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No pending leave requests</p>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((l: any) => (
                <div key={l._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium capitalize">{l.leaveType} Leave</p>
                    <p className="text-xs text-gray-500">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</p>
                  </div>
                  <Badge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
