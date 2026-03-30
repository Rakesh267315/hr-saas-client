'use client';
import { useEffect, useState } from 'react';
import { attendanceApi, employeeApi } from '@/lib/api';
import { usePersistState } from '@/lib/hooks';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { RefreshCw, Users, Clock, Edit2, Unlock, Lock, AlertCircle, X, Save, Calculator } from 'lucide-react';

const STATUSES = ['present', 'late', 'half_day', 'absent', 'on_leave'];

// ── Correction Modal ────────────────────────────────────────────────────────
function CorrectionModal({ record, onClose, onSave }: { record: any; onClose: () => void; onSave: () => void }) {
  // Timezone-safe: read UTC ISO → display as local, submit as UTC ISO
  // Use the stored ISO string directly in datetime-local (browser handles local display)
  const toDatetimeLocal = (iso: string | null) => {
    if (!iso) return '';
    // datetime-local needs format: YYYY-MM-DDTHH:MM  (no seconds, no Z)
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    checkIn: toDatetimeLocal(record.checkIn),
    checkOut: toDatetimeLocal(record.checkOut),
    status: record.status || 'present',
    notes: record.notes || '',
    editReason: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.editReason.trim()) return toast.error('Edit reason is required');
    if (form.checkIn && form.checkOut && new Date(form.checkIn) >= new Date(form.checkOut))
      return toast.error('Check-out time must be after check-in time');
    setSaving(true);
    try {
      await attendanceApi.correct(record._id, {
        checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : null,
        checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : null,
        status: form.status,
        notes: form.notes.trim(),
        editReason: form.editReason.trim(),
      });
      toast.success('Attendance corrected successfully');
      onSave();   // triggers load() in parent — refreshes table
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to correct attendance');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Correct Attendance</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {record.employee?.firstName} {record.employee?.lastName} — {fmtDate(record.date)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={save} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
              <input type="datetime-local" value={form.checkIn}
                onChange={e => setForm(p => ({...p, checkIn: e.target.value}))}
                className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
              <input type="datetime-local" value={form.checkOut}
                onChange={e => setForm(p => ({...p, checkOut: e.target.value}))}
                className="input w-full" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className="input w-full">
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              placeholder="Optional" className="input w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Edit Reason <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.editReason} onChange={e => setForm(p => ({...p, editReason: e.target.value}))}
              placeholder="e.g. Biometric missed, manual correction" className="input w-full" required />
          </div>

          {record.editReason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <p className="font-semibold mb-0.5">Previous edit by {record.editedBy}:</p>
              <p>"{record.editReason}"</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Unlock Modal ────────────────────────────────────────────────────────────
function UnlockModal({ record, onClose, onSave }: { record: any; onClose: () => void; onSave: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return toast.error('Reason is required');
    setSaving(true);
    try {
      await attendanceApi.unlock(record._id, { editReason: reason });
      toast.success('Attendance unlocked — employee can check in again');
      onSave();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unlock');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">Re-open Attendance</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2 text-sm text-orange-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">This will clear the check-out time for:</p>
              <p>{record.employee?.firstName} {record.employee?.lastName} — {fmtDate(record.date)}</p>
              <p className="mt-1">The employee will be able to check in again.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Employee forgot to check out, system error" className="input w-full" required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg flex-1 flex items-center justify-center gap-2 transition-colors">
              <Unlock className="w-4 h-4" />{saving ? 'Unlocking…' : 'Re-open Day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = usePersistState('att_viewDate', new Date().toISOString().split('T')[0]);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [unlockRecord, setUnlockRecord] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (viewDate === new Date().toISOString().split('T')[0]) {
        const res = await attendanceApi.getToday();
        setRecords(res.data.data);
        setStats(res.data.stats);
      } else {
        const res = await attendanceApi.getAll({ date: viewDate });
        const data = res.data.data;
        setRecords(data);
        setStats({
          present: data.filter((r: any) => ['present','late'].includes(r.status)).length,
          // Count late: status=late OR status=present with actual late_minutes (legacy records)
          late:    data.filter((r: any) => r.status === 'late' || (r.lateMinutes > 0 && r.status === 'present')).length,
          absent:  data.filter((r: any) => r.status === 'absent').length,
          onLeave: data.filter((r: any) => r.status === 'on_leave').length,
        });
      }
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  const markAbsent = async () => {
    try {
      await attendanceApi.markAbsent({ date: viewDate });
      toast.success('Absent employees marked');
      load();
    } catch { toast.error('Failed to mark absent'); }
  };

  const recalculate = async () => {
    try {
      const res = await attendanceApi.recalculate(viewDate);
      toast.success(res.data.message || 'Late minutes recalculated');
      load();
    } catch { toast.error('Failed to recalculate'); }
  };

  useEffect(() => { load(); }, [viewDate]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm">{fmtDate(new Date(), 'EEEE, dd MMM yyyy')}</p>
        </div>
        <div className="flex gap-3 items-center">
          <input type="date" value={viewDate}
            onChange={e => setViewDate(e.target.value)}
            className="input text-sm" />
          <button onClick={recalculate} title="Fix late minutes using correct IST timezone"
            className="btn-secondary text-sm flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50">
            <Calculator className="w-4 h-4" /> Recalculate Late
          </button>
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
          { label: 'Late',    value: stats.late    || 0, color: 'bg-orange-50 text-orange-700' },
          { label: 'Absent',  value: stats.absent  || 0, color: 'bg-red-50 text-red-700' },
          { label: 'On Leave',value: stats.onLeave || 0, color: 'bg-blue-50 text-blue-700' },
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
                <th className="px-4 py-4 font-medium">Hours</th>
                <th className="px-4 py-4 font-medium">Late (min)</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Lock</th>
                <th className="px-4 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No records for this date</td></tr>
              ) : records.map((r: any) => (
                <tr key={r._id} className="table-row">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{r.employee?.firstName} {r.employee?.lastName}</p>
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
                  <td className="px-4 py-4">
                    {r.isLocked ? (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Open</span>
                    )}
                    {r.editReason && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-[120px] truncate" title={r.editReason}>
                        ✏ {r.editReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditRecord(r)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Correct attendance"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {r.checkOut && (
                        <button
                          onClick={() => setUnlockRecord(r)}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Re-open (unlock) this day"
                        >
                          <Unlock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {editRecord && (
        <CorrectionModal record={editRecord} onClose={() => setEditRecord(null)} onSave={() => load()} />
      )}
      {unlockRecord && (
        <UnlockModal record={unlockRecord} onClose={() => setUnlockRecord(null)} onSave={() => { setUnlockRecord(null); load(); }} />
      )}
    </div>
  );
}
