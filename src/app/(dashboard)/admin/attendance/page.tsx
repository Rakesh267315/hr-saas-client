'use client';
import { useEffect, useState } from 'react';
import { attendanceApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { RefreshCw, Users, Clock } from 'lucide-react';

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getToday();
      setRecords(res.data.data);
      setStats(res.data.stats);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  const markAbsent = async () => {
    try {
      await attendanceApi.markAbsent({ date: new Date().toISOString() });
      toast.success('Absent employees marked');
      load();
    } catch { toast.error('Failed to mark absent'); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Attendance</h1>
          <p className="text-gray-500 text-sm">{fmtDate(new Date(), 'EEEE, dd MMM yyyy')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={markAbsent} className="btn-secondary text-sm flex items-center gap-2">
            <Users className="w-4 h-4" /> Mark Absent
          </button>
          <button onClick={load} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Present', value: stats.present || 0, color: 'bg-green-50 text-green-700' },
          { label: 'Late', value: stats.late || 0, color: 'bg-orange-50 text-orange-700' },
          { label: 'Absent', value: stats.absent || 0, color: 'bg-red-50 text-red-700' },
          { label: 'On Leave', value: stats.onLeave || 0, color: 'bg-blue-50 text-blue-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`card text-center ${color}`}>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-4 py-4 font-medium">Department</th>
                <th className="px-4 py-4 font-medium">Check In</th>
                <th className="px-4 py-4 font-medium">Check Out</th>
                <th className="px-4 py-4 font-medium">Work Hours</th>
                <th className="px-4 py-4 font-medium">Late (min)</th>
                <th className="px-4 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No records for today</td></tr>
              ) : records.map((r: any) => (
                <tr key={r._id} className="table-row">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {r.employee?.firstName} {r.employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{r.employee?.employeeCode}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{r.employee?.department?.name || '—'}</td>
                  <td className="px-4 py-4 text-gray-700 font-mono text-xs">
                    {r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-4 text-gray-700 font-mono text-xs">
                    {r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-4 text-gray-600">{r.workHours ? `${r.workHours}h` : '—'}</td>
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
