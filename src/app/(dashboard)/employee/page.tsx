'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { attendanceApi, leaveApi, payrollApi, breakApi, settingsApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate, fmtCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Clock, LogIn, LogOut, Calendar, DollarSign, Coffee, Building2 } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user, employee } = useAuthStore();
  const [summary, setSummary] = useState<any>({});
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [latestPayroll, setLatestPayroll] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [breakInfo, setBreakInfo] = useState<{ data: any[]; totalMinutes: number }>({ data: [], totalMinutes: 0 });
  const [loading, setLoading] = useState(false);
  const now = new Date();

  const loadData = useCallback(async () => {
    if (!employee?._id) return;
    try {
      const [attSummary, leaves, payrolls, cfg] = await Promise.all([
        attendanceApi.getSummary(employee._id, { month: now.getMonth() + 1, year: now.getFullYear() }),
        leaveApi.getAll({ employeeId: employee._id, status: 'pending' }),
        payrollApi.getAll({ employeeId: employee._id, limit: 1 }),
        settingsApi.get(),
      ]);
      setSummary(attSummary.data.data);
      setPendingLeaves(leaves.data.data);
      setLatestPayroll(payrolls.data.data[0] || null);
      setSettings(cfg.data.data);
    } catch {}
  }, [employee]);

  const loadToday = useCallback(async () => {
    if (!employee?._id) return;
    try {
      const [attRes, brk] = await Promise.all([
        attendanceApi.getByEmployee(employee._id, { month: now.getMonth() + 1, year: now.getFullYear() }),
        breakApi.getByEmployee(employee._id),
      ]);
      const today = attRes.data.data.find((r: any) =>
        new Date(r.date).toDateString() === now.toDateString()
      );
      setTodayRecord(today || null);
      setBreakInfo({ data: brk.data.data, totalMinutes: brk.data.totalMinutes });
    } catch {}
  }, [employee]);

  useEffect(() => { loadData(); loadToday(); }, [employee]);

  const doCheckIn = async () => {
    setLoading(true);
    try {
      await attendanceApi.checkIn({ employeeId: employee?._id });
      toast.success('Checked in!');
      loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setLoading(false); }
  };

  const doCheckOut = async () => {
    setLoading(true);
    try {
      await attendanceApi.checkOut({ employeeId: employee?._id });
      toast.success('Checked out!');
      loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally { setLoading(false); }
  };

  const doStartBreak = async () => {
    setLoading(true);
    try {
      await breakApi.startBreak({ employeeId: employee?._id });
      toast.success('Break started');
      loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start break');
    } finally { setLoading(false); }
  };

  const doEndBreak = async () => {
    setLoading(true);
    try {
      await breakApi.endBreak({ employeeId: employee?._id });
      toast.success('Break ended');
      loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to end break');
    } finally { setLoading(false); }
  };

  const activeBreak = breakInfo.data.find((b: any) => !b.endTime);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 18 ? 'Afternoon' : 'Evening'}, {employee?.firstName || user?.name}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">{fmtDate(now, 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Office timing info */}
      {settings && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-5 text-sm">
          <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-gray-600">
            <span className="font-medium text-blue-700">Office Hours:</span> {settings.officeStartTime} – {settings.officeEndTime}
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">
            <span className="font-medium text-blue-700">Weekly Off:</span> {settings.weeklyOffDay}
          </span>
        </div>
      )}

      {/* Check in/out + break */}
      <div className="card mb-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <div className="flex flex-wrap gap-2">
            {!todayRecord?.checkIn && (
              <button onClick={doCheckIn} disabled={loading} className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors">
                <LogIn className="w-4 h-4" /> Check In
              </button>
            )}
            {todayRecord?.checkIn && !todayRecord?.checkOut && (
              <>
                {!activeBreak ? (
                  <button onClick={doStartBreak} disabled={loading} className="flex items-center gap-2 bg-amber-400 text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber-500 transition-colors">
                    <Coffee className="w-4 h-4" /> Start Break
                  </button>
                ) : (
                  <button onClick={doEndBreak} disabled={loading} className="flex items-center gap-2 bg-amber-400 text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber-500 transition-colors animate-pulse">
                    <Coffee className="w-4 h-4" /> End Break
                  </button>
                )}
                <button onClick={doCheckOut} disabled={loading || !!activeBreak} className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50">
                  <LogOut className="w-4 h-4" /> Check Out
                </button>
              </>
            )}
            {todayRecord?.checkOut && (
              <span className="text-primary-100 text-sm self-center">Done for today ✓</span>
            )}
          </div>
        </div>

        {/* Break summary */}
        {breakInfo.data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-primary-500 flex flex-wrap gap-4 text-sm text-primary-100">
            <span>Breaks today: <strong className="text-white">{breakInfo.data.length}</strong></span>
            <span>Total break time: <strong className="text-white">
              {breakInfo.totalMinutes >= 60
                ? `${Math.floor(breakInfo.totalMinutes / 60)}h ${breakInfo.totalMinutes % 60}m`
                : `${breakInfo.totalMinutes}m`}
            </strong></span>
            {activeBreak && (
              <span className="text-amber-300 font-medium">● Currently on break</span>
            )}
          </div>
        )}
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
