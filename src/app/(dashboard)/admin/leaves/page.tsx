'use client';
import { useEffect, useState } from 'react';
import { leaveApi, employeeApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, X, AlertTriangle, CalendarDays, PlusCircle, ShieldAlert, Trash2, SlidersHorizontal } from 'lucide-react';

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

// ── Manual Leave Modal ────────────────────────────────────────────────────────
function ManualLeaveModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving]       = useState(false);
  const [forAll, setForAll]       = useState(false);

  // Default to current month's range
  const now      = new Date();
  const y        = now.getFullYear();
  const mo       = String(now.getMonth() + 1).padStart(2, '0');
  const firstDay = `${y}-${mo}-01`;
  const lastDay  = new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [form, setForm] = useState({
    employeeId: '',
    leaveType : 'CL',
    startDate : firstDay,
    endDate   : lastDay,
    reason    : '',
    isHalfDay : false,
  });

  useEffect(() => {
    employeeApi.getAll({ limit: 200, status: 'active' })
      .then((r) => setEmployees(r.data.data || []))
      .catch(() => {});
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forAll && !form.employeeId)
      return toast.error('Please select an employee or enable "All Employees"');

    setSaving(true);
    try {
      const payload = {
        employeeIds: forAll ? 'all' : [form.employeeId],
        leaveType  : form.leaveType,
        startDate  : form.startDate,
        endDate    : form.endDate,
        reason     : form.reason || 'Admin manual entry',
        isHalfDay  : form.isHalfDay,
      };
      const res = await leaveApi.adminManualAdd(payload);
      const d   = res.data;
      toast.success(d.message || `Created ${d.created} leave(s)`);
      if (d.skipped > 0)
        toast(`${d.skipped} employee(s) skipped — overlapping leave exists`, { icon: '⚠️' });
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add leave');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Manual Leave</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Record leave already taken — auto-approved immediately
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {/* Employee selector */}
          <div>
            <label className="label mb-2">Employee</label>

            {/* All employees toggle */}
            <label className="flex items-center gap-2.5 mb-3 cursor-pointer select-none group">
              <div
                onClick={() => setForAll((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${forAll ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${forAll ? 'translate-x-[18px]' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Apply to <span className="font-semibold text-blue-700">All Active Employees</span>
                {employees.length > 0 && <span className="text-gray-400 ml-1">({employees.length} employees)</span>}
              </span>
            </label>

            {!forAll ? (
              <select required className="input" value={form.employeeId}
                onChange={(e) => set('employeeId', e.target.value)}>
                <option value="">— Select employee —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                    {emp.employeeCode ? ` (${emp.employeeCode})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700 font-medium">
                ✓ Leave will be added for all {employees.length} active employees
              </div>
            )}
          </div>

          {/* Leave Type */}
          <div>
            <label className="label">Leave Type</label>
            <select className="input" value={form.leaveType}
              onChange={(e) => set('leaveType', e.target.value)}>
              <option value="CL">CL — Casual Leave</option>
              <option value="SL">SL — Sick Leave</option>
              <option value="annual">Annual Leave</option>
              <option value="sick">Sick</option>
              <option value="maternity">Maternity</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" required className="input" value={form.startDate}
                onChange={(e) => {
                  set('startDate', e.target.value);
                  if (form.endDate < e.target.value) set('endDate', e.target.value);
                }} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" required className="input" value={form.endDate}
                min={form.startDate}
                onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>

          {/* Half Day */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.isHalfDay}
              onChange={(e) => set('isHalfDay', e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-700">Half Day <span className="text-gray-400">(counts as 0.5 days)</span></span>
          </label>

          {/* Reason */}
          <div>
            <label className="label">Reason / Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea rows={2} className="input resize-none"
              placeholder="e.g. Employee was sick, retroactive record…"
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)} />
          </div>

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This leave is <strong>auto-approved</strong> and will deduct from the employee's monthly
              CL/SL quota. Attendance will be marked as <em>On Leave</em> for all working days.
              Employees who already have a leave in this range will be <strong>skipped</strong>.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg
                         transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Add Leave
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Set Leave Balance Modal (Manager Override) ────────────────────────────────
function SetLeaveBalanceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [tab, setTab]             = useState<'set' | 'list'>('set');

  const now     = new Date();
  const curMon  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [form, setForm] = useState({
    employeeId        : '',
    month             : curMon,
    leaveType         : 'CL',
    customTotalLeaves : '0',
    notes             : '',
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const loadData = async () => {
    const [empRes, ovRes] = await Promise.all([
      employeeApi.getAll({ limit: 200, status: 'active' }),
      leaveApi.getOverrides({ month: form.month }),
    ]);
    setEmployees(empRes.data.data || []);
    setOverrides(ovRes.data.data || []);
  };

  useEffect(() => { loadData().catch(() => {}); }, [form.month]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) return toast.error('Select an employee');
    setSaving(true);
    try {
      await leaveApi.setOverride({
        employeeId        : form.employeeId,
        month             : form.month,
        leaveType         : form.leaveType,
        customTotalLeaves : Number(form.customTotalLeaves),
        notes             : form.notes,
      });
      toast.success('Leave quota updated');
      loadData();
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to set override');
    } finally { setSaving(false); }
  };

  const removeOverride = async (id: string) => {
    if (!confirm('Remove this override? Balance will revert to default + carry-forward.')) return;
    setDeleting(id);
    try {
      await leaveApi.deleteOverride(id);
      toast.success('Override removed');
      loadData();
      onDone();
    } catch { toast.error('Failed to remove'); }
    finally { setDeleting(null); }
  };

  // Month options: 6 months back + 6 ahead
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { val, label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) };
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Set Leave Balance</h2>
              <p className="text-sm text-gray-500 mt-0.5">Override monthly CL/SL quota per employee</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0">
          {(['set', 'list'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'set' ? '⚙️ Set Override' : `📋 Active Overrides (${overrides.length})`}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'set' ? (
            <form onSubmit={submit} className="space-y-5">
              {/* Month */}
              <div>
                <label className="label">Month</label>
                <select className="input" value={form.month} onChange={(e) => set('month', e.target.value)}>
                  {monthOptions.map(({ val, label }) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Employee */}
              <div>
                <label className="label">Employee</label>
                <select required className="input" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)}>
                  <option value="">— Select employee —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}{emp.employeeCode ? ` (${emp.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type + Custom Total side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Leave Type</label>
                  <div className="flex gap-2">
                    {['CL', 'SL'].map((t) => (
                      <button key={t} type="button"
                        onClick={() => set('leaveType', t)}
                        className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${form.leaveType === t
                          ? t === 'CL' ? 'border-green-500 bg-green-50 text-green-700'
                                       : 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-500'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Total Leaves (days)</label>
                  <input
                    type="number" min="0" max="31" step="0.5" required className="input"
                    value={form.customTotalLeaves}
                    onChange={(e) => set('customTotalLeaves', e.target.value)}
                    placeholder="e.g. 0, 1, 2" />
                  <p className="text-xs text-gray-400 mt-1">Set 0 to block leave for this month</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" className="input" placeholder="Reason for override…"
                  value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>

              {/* Warning if 0 */}
              {Number(form.customTotalLeaves) === 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Setting 0 will <strong>completely block</strong> this employee from applying {form.leaveType} leave in {form.month}.</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                    : <><ShieldAlert className="w-4 h-4" /> Set Override</>}
                </button>
              </div>
            </form>
          ) : (
            /* Active overrides list */
            <div>
              {/* Filter by month */}
              <div className="mb-4 flex items-center gap-3">
                <label className="text-sm text-gray-600 font-medium">Filter Month:</label>
                <select className="input w-48 text-sm" value={form.month} onChange={(e) => set('month', e.target.value)}>
                  {monthOptions.map(({ val, label }) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              {overrides.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No overrides set for this month</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {overrides.map((ov: any) => (
                    <div key={ov.id}
                      className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {ov.first_name} {ov.last_name}
                          <span className="text-gray-400 ml-1 text-xs">({ov.employee_code})</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-xs mr-1.5 ${ov.leave_type === 'CL' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {ov.leave_type}
                          </span>
                          {ov.month} · <strong className={Number(ov.custom_total_leaves) === 0 ? 'text-red-600' : 'text-purple-700'}>
                            {ov.custom_total_leaves} days
                          </strong>
                          {ov.notes && <span className="text-gray-400 ml-1">· {ov.notes}</span>}
                        </p>
                        {ov.set_by_name && (
                          <p className="text-xs text-gray-400 mt-0.5">Set by {ov.set_by_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeOverride(ov.id)}
                        disabled={deleting === ov.id}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Remove override">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminLeavesPage() {
  const [leaves, setLeaves]             = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter]     = useState('');
  const [loading, setLoading]           = useState(true);
  const [pagination, setPagination]     = useState({ total: 0 });
  const [rejectLeave, setRejectLeave]   = useState<any>(null);
  const [showManual, setShowManual]     = useState(false);
  const [showOverride, setShowOverride] = useState(false);

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

        <div className="flex gap-2 flex-wrap items-center">
          {/* Set Leave Balance (Override) */}
          <button
            onClick={() => setShowOverride(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
            <ShieldAlert className="w-4 h-4" />
            Set Leave Balance
          </button>

          {/* Manual Leave button */}
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
            <PlusCircle className="w-4 h-4" />
            Add Manual Leave
          </button>

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

      {/* Manual Leave Modal */}
      {showManual && (
        <ManualLeaveModal
          onClose={() => setShowManual(false)}
          onDone={load}
        />
      )}

      {/* Set Leave Balance (Override) Modal */}
      {showOverride && (
        <SetLeaveBalanceModal
          onClose={() => setShowOverride(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
