'use client';
import { useEffect, useState } from 'react';
import { leaveApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Filter } from 'lucide-react';

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getAll({ status: statusFilter || undefined, limit: 50 });
      setLeaves(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const approve = async (id: string) => {
    try {
      await leaveApi.updateStatus(id, { status: 'approved' });
      toast.success('Leave approved');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const reject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await leaveApi.updateStatus(id, { status: 'rejected', rejectionReason: reason });
      toast.success('Leave rejected');
      load();
    } catch { toast.error('Failed to reject'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-500 text-sm">{pagination.total} requests</p>
        </div>
        <select className="input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-4 py-4 font-medium">Type</th>
                <th className="px-4 py-4 font-medium">From</th>
                <th className="px-4 py-4 font-medium">To</th>
                <th className="px-4 py-4 font-medium">Days</th>
                <th className="px-4 py-4 font-medium">Reason</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No leave requests</td></tr>
              ) : leaves.map((l: any) => (
                <tr key={l._id} className="table-row">
                  <td className="px-6 py-4">
                    <p className="font-medium">{l.employee?.firstName} {l.employee?.lastName}</p>
                    <p className="text-xs text-gray-400">{l.employee?.employeeCode}</p>
                  </td>
                  <td className="px-4 py-4 capitalize">{l.leaveType}</td>
                  <td className="px-4 py-4">{fmtDate(l.startDate)}</td>
                  <td className="px-4 py-4">{fmtDate(l.endDate)}</td>
                  <td className="px-4 py-4 font-semibold">{l.totalDays}</td>
                  <td className="px-4 py-4 max-w-xs truncate text-gray-500">{l.reason}</td>
                  <td className="px-4 py-4"><Badge status={l.status} /></td>
                  <td className="px-4 py-4">
                    {l.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => approve(l._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => reject(l._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Reject">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
