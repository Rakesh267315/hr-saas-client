'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { attendanceApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';

export default function EmployeeAttendancePage() {
  const { employee } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const load = async () => {
    if (!employee?._id) return;
    const [att, summ] = await Promise.all([
      attendanceApi.getByEmployee(employee._id, { month, year }),
      attendanceApi.getSummary(employee._id, { month, year }),
    ]);
    setRecords(att.data.data);
    setSummary(summ.data.data);
  };

  useEffect(() => { load(); }, [employee, month, year]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <div className="flex gap-3">
          <select className="input w-36" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <input type="number" className="input w-24" value={year} onChange={(e) => setYear(+e.target.value)} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Present', value: summary.present || 0, color: 'text-green-600' },
          { label: 'Absent', value: summary.absent || 0, color: 'text-red-500' },
          { label: 'Late', value: summary.late || 0, color: 'text-orange-500' },
          { label: 'Half Day', value: summary.halfDay || 0, color: 'text-yellow-600' },
          { label: 'On Leave', value: summary.onLeave || 0, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="text-sm font-medium text-gray-500 mb-1">Total Work Hours: <span className="text-gray-900 font-bold">{Math.round(summary.totalWorkHours || 0)}h</span></p>
        <p className="text-sm font-medium text-gray-500">Total Late Minutes: <span className="text-orange-600 font-bold">{summary.totalLateMinutes || 0} min</span></p>
      </div>

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
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No records</td></tr>
              ) : records.map((r: any) => (
                <tr key={r._id} className="table-row">
                  <td className="px-6 py-4 font-medium">{fmtDate(r.date, 'EEE, dd MMM')}</td>
                  <td className="px-4 py-4 font-mono text-xs">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-4 font-mono text-xs">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—'}</td>
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
