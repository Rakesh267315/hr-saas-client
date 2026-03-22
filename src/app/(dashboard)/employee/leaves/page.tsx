'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { leaveApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';

export default function EmployeeLeavesPage() {
  const { employee } = useAuthStore();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'annual', startDate: '', endDate: '', reason: '', isHalfDay: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!employee?._id) return;
    try {
      const [leavesRes, balRes] = await Promise.all([
        leaveApi.getAll({ employeeId: employee._id, limit: 50 }),
        leaveApi.getBalance(employee._id),
      ]);
      setLeaves(leavesRes.data.data);
      setBalance(balRes.data.data);
    } catch {}
  };

  useEffect(() => { load(); }, [employee]);

  const submit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leaveApi.apply({ ...form, employeeId: employee?._id });
      toast.success('Leave application submitted');
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally { setSubmitting(false); }
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancel this leave?')) return;
    try {
      await leaveApi.cancel(id);
      toast.success('Leave cancelled');
      load();
    } catch { toast.error('Failed to cancel'); }
  };

  const leaveTypes = ['annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {/* Leave balance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { type: 'annual', label: 'Annual', color: 'bg-blue-50 text-blue-700' },
          { type: 'sick', label: 'Sick', color: 'bg-red-50 text-red-700' },
          { type: 'casual', label: 'Casual', color: 'bg-green-50 text-green-700' },
          { type: 'unpaid', label: 'Unpaid', color: 'bg-gray-50 text-gray-600' },
        ].map(({ type, label, color }) => (
          <div key={type} className={`card text-center ${color}`}>
            <p className="text-3xl font-bold">{balance[type] ?? '—'}</p>
            <p className="text-sm mt-1 font-medium">{label} Leave</p>
            <p className="text-xs opacity-70">days remaining</p>
          </div>
        ))}
      </div>

      {/* Leaves table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-4 py-4 font-medium">From</th>
                <th className="px-4 py-4 font-medium">To</th>
                <th className="px-4 py-4 font-medium">Days</th>
                <th className="px-4 py-4 font-medium">Reason</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No leave applications yet</td></tr>
              ) : leaves.map((l: any) => (
                <tr key={l._id} className="table-row">
                  <td className="px-6 py-4 capitalize font-medium">{l.leaveType}</td>
                  <td className="px-4 py-4">{fmtDate(l.startDate)}</td>
                  <td className="px-4 py-4">{fmtDate(l.endDate)}</td>
                  <td className="px-4 py-4 font-semibold">{l.totalDays}</td>
                  <td className="px-4 py-4 max-w-xs truncate text-gray-500">{l.reason}</td>
                  <td className="px-4 py-4"><Badge status={l.status} /></td>
                  <td className="px-4 py-4">
                    {['pending', 'approved'].includes(l.status) && (
                      <button onClick={() => cancel(l._id)} className="text-xs text-red-500 hover:underline">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Apply for Leave</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Leave Type</label>
                <select className="input" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                  {leaveTypes.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">From</label>
                  <input type="date" required className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="label">To</label>
                  <input type="date" required className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hd" checked={form.isHalfDay} onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })} />
                <label htmlFor="hd" className="text-sm text-gray-700">Half day</label>
              </div>
              <div>
                <label className="label">Reason <span className="text-red-500">*</span></label>
                <textarea required className="input" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
