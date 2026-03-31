'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { attendanceApi, leaveApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

// ── Compact Leave Balance Card ────────────────────────────────────────────────
function LeaveBalanceCard({ data, color }: { data: any; color: string }) {
  const pct = data.totalLeaves > 0
    ? Math.round((data.usedLeaves / data.totalLeaves) * 100)
    : 0;

  return (
    <div className={`card border-l-4 ${color} flex-1 min-w-[180px]`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{data.label}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{data.type}</span>
        </div>
        {data.isOverridden && (
          <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
            <ShieldAlert className="w-3 h-3" /> Custom
          </span>
        )}
      </div>

      {/* Total / Used / Remaining */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-xl font-bold text-gray-900">{data.totalLeaves}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
        </div>
        <div>
          <p className="text-xl font-bold text-orange-500">{data.usedLeaves}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Used</p>
        </div>
        <div>
          <p className={`text-xl font-bold ${data.remainingLeaves > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {data.remainingLeaves}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Left</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-400' : 'bg-green-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1 text-right">{pct}% used</p>
      {!data.isOverridden && data.carryForward > 0 && (
        <p className="text-[10px] text-blue-600 mt-0.5">+{data.carryForward} carried from last month</p>
      )}
      {data.remainingLeaves === 0 && (
        <p className="text-[10px] text-red-500 font-medium mt-1">No {data.type} leaves remaining this month</p>
      )}
    </div>
  );
}

export default function EmployeeAttendancePage() {
  const { employee } = useAuthStore();
  const [records, setRecords]         = useState<any[]>([]);
  const [summary, setSummary]         = useState<any>({});
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const load = async () => {
    if (!employee?._id) return;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const [att, summ] = await Promise.all([
      attendanceApi.getByEmployee(employee._id, { month, year }),
      attendanceApi.getSummary(employee._id, { month, year }),
    ]);
    setRecords(att.data.data);
    setSummary(summ.data.data);

    // Fetch CL/SL balance for this month
    setBalanceLoading(true);
    try {
      const bal = await leaveApi.getMonthlyBalance(employee._id, monthStr);
      setLeaveBalance(bal.data.data?.balance ?? null);
    } catch {
      setLeaveBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => { load(); }, [employee, month, year]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <div className="flex gap-3">
          <select className="input w-36" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(now.getFullYear(), i, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <input type="number" className="input w-24" value={year}
            onChange={(e) => setYear(+e.target.value)} />
        </div>
      </div>

      {/* CL/SL Leave Balance for this month */}
      {(leaveBalance || balanceLoading) && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Leave Balance — {new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
          {balanceLoading ? (
            <div className="flex gap-4">
              {[1, 2].map(i => (
                <div key={i} className="flex-1 card animate-pulse bg-gray-50 h-24" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 flex-wrap">
              {leaveBalance?.CL && (
                <LeaveBalanceCard
                  data={leaveBalance.CL}
                  color="border-green-500"
                />
              )}
              {leaveBalance?.SL && (
                <LeaveBalanceCard
                  data={leaveBalance.SL}
                  color="border-red-400"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Attendance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Present',  value: summary.present  || 0, color: 'text-green-600' },
          { label: 'Absent',   value: summary.absent   || 0, color: 'text-red-500'   },
          { label: 'Late',     value: summary.late     || 0, color: 'text-orange-500' },
          { label: 'Half Day', value: summary.halfDay  || 0, color: 'text-yellow-600' },
          { label: 'On Leave', value: summary.onLeave  || 0, color: 'text-blue-600'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="text-sm font-medium text-gray-500 mb-1">
          Total Work Hours: <span className="text-gray-900 font-bold">{Math.round(summary.totalWorkHours || 0)}h</span>
        </p>
        <p className="text-sm font-medium text-gray-500">
          Total Late Minutes: <span className="text-orange-600 font-bold">{summary.totalLateMinutes || 0} min</span>
        </p>
      </div>

      {/* Records table */}
      <div className="card mt-6 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-4 py-4 font-medium">Check In</th>
                <th className="px-4 py-4 font-medium">Check Out</th>
                <th className="px-4 py-4 font-medium">Work Hours</th>
                <th className="px-4 py-4 font-medium">Late (min)</th>
                <th className="px-4 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No attendance records for this month
                  </td>
                </tr>
              ) : records.map((r: any) => (
                <tr key={r._id} className="table-row">
                  <td className="px-6 py-4 font-medium">{fmtDate(r.date, 'EEE, dd MMM')}</td>
                  <td className="px-4 py-4 font-mono text-xs">
                    {r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">
                    {r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-4">{r.workHours ? `${r.workHours}h` : '—'}</td>
                  <td className="px-4 py-4 text-orange-600">{r.lateMinutes || 0}</td>
                  <td className="px-4 py-4"><Badge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
