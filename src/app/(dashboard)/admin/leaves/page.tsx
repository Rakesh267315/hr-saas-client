'use client';
import { useEffect, useState } from 'react';
import { leaveApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, X, AlertTriangle, CalendarDays } from 'lucide-react';

// ── Type Badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    CL: 'bg-green-100 text-green-700 border border-green-200',
    SL: 'bg-red-100 text-red-700 border border-red-200',
    annual: 'bg-blue-100 text-blue-700',
    casual: 'bg-emerald-100 text-emerald-700',
    sick: 'bg-orange-100 text-orange-700',
    maternity: 'bg-pink-100 text-pink-700',
    unpaid: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${map[type] ?? map.unpaid}`}>
      {type}
    </span>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ leave, onClose, onDone }: { leave: any; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return toast.error('Rejection reason required');
    setSaving(true);
    try {
      await leaveApi.updateStatus(leave._id, { status: 'rejected', rejectionReason: reason.trim() });
      toast.success('Leave rejected');
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">Reject Leave</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{leave.employee?.firstName} {leave.employee?.lastName}</p>
              <p className="text-xs mt-0.5">
                <TypeBadge type={leave.leaveType} /> &nbsp;
                {fmtDate(leave.startDate)} → {fmtDate(leave.endDate)} ({leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''})
              </p>
            </div>
          </div>
          <div>
            <label className="label">Rejection Reason <span className="text-red-500">*</span></label>
            <textarea rows={3} required className="input resize-none" placeholder="Explain why this leave is rejected..."
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Rejecting…' : 'Reject Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminLeavesPage() {
  const [leaves, setLeaves]           = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter]   = useState('');
  const [loading, setLoading]         = useState(true);
  const [pagination, setPagination]   = useState({ total: 0 });
  const [rejectLeave, setRejectLeave] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getAll({
        status: statusFilter || undefined,
        limit: 100,
      });
      let data = res.data.data;
      if (typeFilter) data = data.filter((l: any) => l.leaveType === typeFilter);
      setLeaves(data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const approve = async (id: string) => {
    try {
      await leaveApi.updateStatus(id, { status: 'approved' });
      toast.success('Leave approved ✓');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // Stats for current filter
  const pending  = leaves.filter((l) => l.status === 'pending').length;
  const approved = leaves.filter((l) => l.status === 'approved').length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-500 text-sm">
            {pagination.total} total · {pending} pending · {approved} approved
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Status filter */}
          <select className="input w-36 text-sm" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {/* Type filter */}
          <select className="input w-36 text-sm" value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="CL">CL — Casual</option>
            <option value="SL">SL — Sick</option>
            <option value="annual">Annual</option>
            <option value="maternity">Maternity</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Table */}
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
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400">No leave requests found</p>
                  </td>
                </tr>
              ) : leaves.map((l: any) => (
                <tr key={l._id} className="table-row">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {l.employee?.firstName} {l.employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{l.employee?.employeeCode}</p>
                  </td>
                  <td className="px-4 py-4"><TypeBadge type={l.leaveType} /></td>
                  <td className="px-4 py-4 text-gray-700">{fmtDate(l.startDate)}</td>
                  <td className="px-4 py-4 text-gray-700">{fmtDate(l.endDate)}</td>
                  <td className="px-4 py-4 font-semibold text-gray-900">{l.totalDays}</td>
                  <td className="px-4 py-4 max-w-[180px] truncate text-gray-500" title={l.reason}>
                    {l.reason}
                  </td>
                  <td className="px-4 py-4">
                    <Badge status={l.status} />
                    {l.status === 'rejected' && l.rejectionReason && (
                      <p className="text-xs text-gray-400 mt-1 max-w-[120px] truncate" title={l.rejectionReason}>
                        {l.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {l.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => approve(l._id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => setRejectLeave(l)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                          <XCircle className="w-5 h-5" />
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

      {/* Reject Modal */}
      {rejectLeave && (
        <RejectModal
          leave={rejectLeave}
          onClose={() => setRejectLeave(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
