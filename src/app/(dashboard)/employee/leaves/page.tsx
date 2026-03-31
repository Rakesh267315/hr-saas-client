'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { leaveApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, X, ChevronLeft, ChevronRight, CalendarDays, Info, ShieldAlert } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
function prevMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function fmtMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}
function todayMonth() {
  return new Date().toISOString().slice(0, 7);
}

// ── Balance Card ─────────────────────────────────────────────────────────────
function BalanceCard({ data, color }: { data: any; color: { bg: string; ring: string; bar: string; text: string } }) {
  const pctApproved = data.totalLeaves > 0 ? Math.min(100, (data.approvedLeaves / data.totalLeaves) * 100) : 0;
  const pctPending  = data.totalLeaves > 0 ? Math.min(100 - pctApproved, (data.pendingLeaves  / data.totalLeaves) * 100) : 0;

  return (
    <div className={`card border-2 ${color.ring}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${color.bg} ${color.text}`}>
              {data.type}
            </span>
            {data.isOverridden && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                <ShieldAlert className="w-3 h-3" />
                Custom Quota
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{data.label}</p>
        </div>
        {!data.isOverridden && data.carryForward > 0 && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
            +{data.carryForward} carried
          </span>
        )}
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">{data.totalLeaves}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-600">{data.approvedLeaves ?? data.usedLeaves}</p>
          <p className="text-xs text-gray-400 mt-0.5">Used</p>
          {(data.pendingLeaves ?? 0) > 0 && (
            <p className="text-xs text-yellow-600 font-medium mt-0.5">+{data.pendingLeaves} pending</p>
          )}
        </div>
        <div>
          <p className={`text-2xl font-bold ${data.remainingLeaves > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {data.remainingLeaves}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Remaining</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{Math.round(pctApproved)}% used</span>
          <span>{data.remainingLeaves} remaining</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden relative">
          <div className={`absolute left-0 top-0 h-2 rounded-full transition-all duration-500 ${color.bar}`}
            style={{ width: `${pctApproved}%` }} />
          {pctPending > 0 && (
            <div className="absolute top-0 h-2 rounded-full opacity-50 bg-yellow-400 transition-all duration-500"
              style={{ left: `${pctApproved}%`, width: `${pctPending}%` }} />
          )}
        </div>
        {(data.pendingLeaves ?? 0) > 0 && (
          <p className="text-xs text-yellow-600">
            ⏳ {data.pendingLeaves} day{data.pendingLeaves !== 1 ? 's' : ''} awaiting approval
          </p>
        )}
      </div>

      {/* Footer info */}
      {data.isOverridden ? (
        <p className="text-xs text-purple-600 mt-3 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          Quota set by manager — {data.totalLeaves === 0 ? 'no leave allowed this month' : `${data.totalLeaves} day(s) allowed`}
          {data.overrideNotes && <span className="text-gray-400 ml-1">· {data.overrideNotes}</span>}
        </p>
      ) : (
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {data.defaultLeaves}/month default · max {6} carry-forward
        </p>
      )}
    </div>
  );
}

// ── Apply Modal ───────────────────────────────────────────────────────────────
const CL_SL_TYPES = [
  { value: 'CL', label: 'Casual Leave (CL)' },
  { value: 'SL', label: 'Sick Leave (SL)' },
];
const OTHER_TYPES = [
  { value: 'annual',    label: 'Annual Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'unpaid',    label: 'Unpaid Leave' },
];

function ApplyModal({
  onClose, onSuccess, employeeId, balance,
}: { onClose: () => void; onSuccess: () => void; employeeId: string; balance: any }) {
  const [form, setForm] = useState({
    leaveType: 'CL', startDate: '', endDate: '', reason: '', isHalfDay: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // Check if selected CL/SL type has 0 remaining
  const isCLSL = ['CL', 'SL'].includes(form.leaveType);
  const selectedBalance = isCLSL ? balance?.[form.leaveType] : null;
  const isBlocked = isCLSL && selectedBalance != null && selectedBalance.remainingLeaves <= 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return toast.error(`No ${form.leaveType} balance remaining for this month`);
    if (!form.startDate || !form.endDate) return toast.error('Select start and end dates');
    if (form.startDate > form.endDate)    return toast.error('Start date must be before end date');
    setSubmitting(true);
    try {
      await leaveApi.apply({ ...form, employeeId });
      toast.success('Leave application submitted!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <h2 className="text-xl font-bold text-gray-900">Apply for Leave</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Leave type */}
          <div>
            <label className="label">Leave Type</label>
            {/* CL / SL quick pick */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {CL_SL_TYPES.map(({ value, label }) => {
                const b = balance?.[value];
                const remaining = b?.remainingLeaves ?? null;
                const blocked   = remaining !== null && remaining <= 0;
                return (
                  <button
                    key={value} type="button"
                    onClick={() => f('leaveType', value)}
                    className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all relative ${
                      form.leaveType === value
                        ? value === 'CL'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-red-400 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {label}
                    {remaining !== null && (
                      <span className={`block text-xs mt-0.5 font-normal ${blocked ? 'text-red-500' : 'text-gray-400'}`}>
                        {blocked ? '⛔ 0 remaining' : `${remaining} left`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Other types dropdown */}
            <select
              className="input text-sm"
              value={OTHER_TYPES.some(t => t.value === form.leaveType) ? form.leaveType : ''}
              onChange={(e) => { if (e.target.value) f('leaveType', e.target.value); }}
            >
              <option value="">— Other leave types —</option>
              {OTHER_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Blocked notice */}
          {isBlocked && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You have <strong>0 {form.leaveType} days remaining</strong> for this month.
                {selectedBalance?.isOverridden
                  ? ' Your manager has set a custom quota of 0 for this month.'
                  : ' Please contact HR if you need additional leave.'}
              </span>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">From <span className="text-red-500">*</span></label>
              <input type="date" required className="input" value={form.startDate}
                onChange={(e) => { f('startDate', e.target.value); if (!form.endDate) f('endDate', e.target.value); }} />
            </div>
            <div>
              <label className="label">To <span className="text-red-500">*</span></label>
              <input type="date" required className="input" value={form.endDate} min={form.startDate}
                onChange={(e) => f('endDate', e.target.value)} />
            </div>
          </div>

          {/* Half-day */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isHalfDay} onChange={(e) => f('isHalfDay', e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-700">Half day</span>
          </label>

          {/* Reason */}
          <div>
            <label className="label">Reason <span className="text-red-500">*</span></label>
            <textarea required className="input resize-none" rows={3}
              placeholder="Briefly describe the reason for leave..."
              value={form.reason} onChange={(e) => f('reason', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={submitting || isBlocked}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Submitting…' : isBlocked ? `No ${form.leaveType} Balance` : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Type badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    CL: 'bg-green-100 text-green-700',
    SL: 'bg-red-100 text-red-700',
    annual: 'bg-blue-100 text-blue-700',
    casual: 'bg-emerald-100 text-emerald-700',
    sick: 'bg-orange-100 text-orange-700',
    maternity: 'bg-pink-100 text-pink-700',
    unpaid: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${map[type] ?? map.unpaid}`}>
      {type}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeLeavesPage() {
  const { employee } = useAuthStore();
  const [month, setMonth]           = useState(todayMonth());
  const [monthlyBal, setMonthlyBal] = useState<any>(null);
  const [leaves, setLeaves]         = useState<any[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    if (!employee?._id) return;
    setLoading(true);
    try {
      const [balRes, leavesRes] = await Promise.all([
        leaveApi.getMonthlyBalance(employee._id, month),
        leaveApi.getAll({ employeeId: employee._id, limit: 100 }),
      ]);
      setMonthlyBal(balRes.data.data);
      setLeaves(leavesRes.data.data);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  }, [employee?._id, month]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await leaveApi.cancel(id);
      toast.success('Leave cancelled');
      load();
    } catch { toast.error('Failed to cancel'); }
  };

  // Filter leaves for the selected month only
  const monthLeaves = leaves.filter((l) => l.startDate?.slice(0, 7) === month);
  const bal = monthlyBal?.balance;

  // Check if apply button should be disabled (both CL and SL at 0)
  const clRemaining = bal?.CL?.remainingLeaves ?? null;
  const slRemaining = bal?.SL?.remainingLeaves ?? null;
  const bothBlocked = clRemaining !== null && slRemaining !== null && clRemaining <= 0 && slRemaining <= 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
          <p className="text-gray-500 text-sm">Track your Casual & Sick leave balance</p>
        </div>
        <div className="flex items-center gap-2">
          {bothBlocked && month === todayMonth() && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              No CL/SL balance this month
            </span>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setMonth(prevMonth(month))}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg min-w-[180px] justify-center">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-800">{fmtMonth(month)}</span>
        </div>
        <button onClick={() => setMonth(nextMonth(month))}
          disabled={month >= todayMonth()}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
        {month !== todayMonth() && (
          <button onClick={() => setMonth(todayMonth())}
            className="text-sm text-blue-600 hover:underline">Today</button>
        )}
      </div>

      {/* CL + SL Balance Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[0, 1].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-5 w-16 bg-gray-200 rounded mb-4" />
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[0, 1, 2].map((j) => <div key={j} className="h-10 bg-gray-100 rounded" />)}
              </div>
              <div className="h-2 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : bal ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <BalanceCard
            data={bal.CL}
            color={{ bg: 'bg-green-100', ring: 'border-green-200', bar: 'bg-green-500', text: 'text-green-700' }}
          />
          <BalanceCard
            data={bal.SL}
            color={{ bg: 'bg-red-100', ring: 'border-red-200', bar: 'bg-red-500', text: 'text-red-700' }}
          />
        </div>
      ) : null}

      {/* Leave history — current month */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">
            Leave History — {fmtMonth(month)}
          </h2>
          <span className="text-sm text-gray-500">{monthLeaves.length} request{monthLeaves.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {monthLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No leave applications for {fmtMonth(month)}
                  </td>
                </tr>
              ) : monthLeaves.map((l: any) => (
                <tr key={l._id} className="table-row">
                  <td className="px-6 py-4"><TypeBadge type={l.leaveType} /></td>
                  <td className="px-4 py-4 text-gray-700">{fmtDate(l.startDate)}</td>
                  <td className="px-4 py-4 text-gray-700">{fmtDate(l.endDate)}</td>
                  <td className="px-4 py-4 font-semibold text-gray-900">{l.totalDays}</td>
                  <td className="px-4 py-4 max-w-[200px] truncate text-gray-500">{l.reason}</td>
                  <td className="px-4 py-4"><Badge status={l.status} /></td>
                  <td className="px-4 py-4">
                    {['pending', 'approved'].includes(l.status) && (
                      <button onClick={() => cancel(l._id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline">
                        Cancel
                      </button>
                    )}
                    {l.status === 'rejected' && l.rejectionReason && (
                      <span className="text-xs text-gray-400" title={l.rejectionReason}>View reason</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All-time requests (outside current month) */}
      {leaves.filter(l => l.startDate?.slice(0, 7) !== month).length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 select-none">
            All other requests ({leaves.filter(l => l.startDate?.slice(0, 7) !== month).length})
          </summary>
          <div className="card p-0 overflow-hidden mt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {leaves.filter(l => l.startDate?.slice(0, 7) !== month).map((l: any) => (
                    <tr key={l._id} className="table-row">
                      <td className="px-6 py-3"><TypeBadge type={l.leaveType} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(l.startDate)} → {fmtDate(l.endDate)}</td>
                      <td className="px-4 py-3 font-medium">{l.totalDays}d</td>
                      <td className="px-4 py-3"><Badge status={l.status} /></td>
                      <td className="px-4 py-3 text-gray-400 truncate max-w-[150px] text-xs">{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}

      {/* Apply Modal */}
      {showModal && employee?._id && (
        <ApplyModal
          onClose={() => setShowModal(false)}
          onSuccess={load}
          employeeId={employee._id}
          balance={bal}
        />
      )}
    </div>
  );
}
