'use client';
import { useEffect, useState, useMemo } from 'react';
import { attendanceApi, employeeApi } from '@/lib/api';
import { usePersistState } from '@/lib/hooks';
import Badge from '@/components/ui/Badge';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { RefreshCw, Users, Edit2, Unlock, Lock, AlertCircle, X, Save, Calculator, DatabaseBackup, ClipboardList, Check, ChevronDown, Clock, ChevronRight } from 'lucide-react';

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

// ── Helper ──────────────────────────────────────────────────────────────────
const toHHMM = (isoOrNull: string | null): string => {
  if (!isoOrNull) return '';
  const d = new Date(isoOrNull);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const STATUS_OPTIONS = [
  { value: 'present',  label: 'Present',  dot: 'bg-green-500' },
  { value: 'absent',   label: 'Absent',   dot: 'bg-red-500' },
  { value: 'late',     label: 'Late',     dot: 'bg-orange-500' },
  { value: 'half_day', label: 'Half Day', dot: 'bg-yellow-500' },
  { value: 'on_leave', label: 'On Leave', dot: 'bg-blue-500' },
];
const NO_TIME_STATUSES = ['absent', 'on_leave'];

type EntryRow = {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
  status: string;
  checkIn: string;
  checkOut: string;
  notes: string;
  include: boolean;
  isExisting: boolean; // had a record already
};

// ── Backdate Entry Modal ────────────────────────────────────────────────────
function BackdateEntryModal({ initialDate, onClose, onDone }: {
  initialDate: string; onClose: () => void; onDone: () => void;
}) {
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [date,          setDate]         = useState(initialDate < today ? initialDate : yesterday);
  const [entries,       setEntries]      = useState<EntryRow[]>([]);
  const [loaded,        setLoaded]       = useState(false);
  const [loading,       setLoading]      = useState(false);
  const [saving,        setSaving]       = useState(false);
  const [result,        setResult]       = useState<any>(null);
  const [defaultCIn,   setDefaultCIn]   = useState('10:00');
  const [defaultCOut,  setDefaultCOut]  = useState('19:00');
  const [allChecked,    setAllChecked]   = useState(true);

  // Load all active employees + existing records for the selected date
  const load = async (forDate?: string) => {
    const d = forDate ?? date;
    if (!d) return;
    setLoading(true);
    try {
      const [empRes, attRes] = await Promise.all([
        employeeApi.getAll({ status: 'active', limit: 200 }),
        attendanceApi.getAll({ date: d }),
      ]);
      const emps: any[]  = empRes.data.data || [];
      const atts: any[]  = attRes.data.data || [];
      const attMap: Record<string, any> = {};
      atts.forEach((a: any) => { attMap[a.employee?.id || ''] = a; });

      setEntries(emps.map(emp => {
        const existing = attMap[emp.id];
        return {
          employeeId:   emp.id,
          firstName:    emp.firstName,
          lastName:     emp.lastName || '',
          employeeCode: emp.employeeCode,
          department:   emp.department?.name || '—',
          status:       existing?.status    || 'absent',
          checkIn:      existing ? toHHMM(existing.checkIn)  : '',
          checkOut:     existing ? toHHMM(existing.checkOut) : '',
          notes:        existing?.notes || '',
          include:      true,
          isExisting:   !!existing,
        };
      }));
      setLoaded(true);
    } catch {
      toast.error('Failed to load employees');
    } finally { setLoading(false); }
  };

  const update = (idx: number, patch: Partial<EntryRow>) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      // Auto-clear times when switching to no-time status
      if (patch.status && NO_TIME_STATUSES.includes(patch.status)) {
        next[idx].checkIn  = '';
        next[idx].checkOut = '';
      }
      // Auto-fill default times when switching to time-based status from no-time
      if (patch.status && !NO_TIME_STATUSES.includes(patch.status) &&
          NO_TIME_STATUSES.includes(prev[idx].status)) {
        next[idx].checkIn  = defaultCIn;
        next[idx].checkOut = defaultCOut;
      }
      return next;
    });
  };

  const setAllStatus = (status: string) => {
    setEntries(prev => prev.map(e => ({
      ...e, status,
      checkIn:  NO_TIME_STATUSES.includes(status) ? '' : (e.checkIn  || defaultCIn),
      checkOut: NO_TIME_STATUSES.includes(status) ? '' : (e.checkOut || defaultCOut),
    })));
  };

  const applyDefaultTimes = () => {
    setEntries(prev => prev.map(e =>
      NO_TIME_STATUSES.includes(e.status) ? e : { ...e, checkIn: defaultCIn, checkOut: defaultCOut }
    ));
  };

  const toggleAll = (checked: boolean) => {
    setAllChecked(checked);
    setEntries(prev => prev.map(e => ({ ...e, include: checked })));
  };

  const includedCount = entries.filter(e => e.include).length;
  const presentCount  = entries.filter(e => e.include && !NO_TIME_STATUSES.includes(e.status)).length;

  const save = async (goNext = false) => {
    const toSave = entries.filter(e => e.include);
    if (toSave.length === 0) return toast.error('No employees selected');
    setSaving(true);
    try {
      const res = await attendanceApi.bulkEntry({
        date,
        entries: toSave.map(e => ({
          employeeId:   e.employeeId,
          status:       e.status,
          checkInTime:  NO_TIME_STATUSES.includes(e.status) ? null : (e.checkIn  || null),
          checkOutTime: NO_TIME_STATUSES.includes(e.status) ? null : (e.checkOut || null),
          notes:        e.notes || null,
        })),
      });
      setResult(res.data);
      toast.success(res.data.message);
      onDone();
      if (goNext) {
        const nextDate = new Date(date + 'T00:00:00');
        nextDate.setDate(nextDate.getDate() + 1);
        const nextStr = nextDate.toISOString().split('T')[0];
        if (nextStr <= yesterday) {
          setDate(nextStr);
          setEntries([]);
          setLoaded(false);
          await load(nextStr);
        } else {
          toast('No more past dates — you are at yesterday!', { icon: '📅' });
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const statusDot = (s: string) =>
    STATUS_OPTIONS.find(o => o.value === s)?.dot || 'bg-gray-400';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl my-4">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              Backdate Attendance Entry
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Manually fill attendance for any past date — all employees</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {result ? (
          // ── Result view ──
          <div className="p-8 space-y-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Saved Successfully!</h3>
            <p className="text-gray-500">{result.message}</p>
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mt-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-xs text-green-600">New Records</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-600">Updated</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-700">{result.errors?.length || 0}</p>
                <p className="text-xs text-gray-500">Errors</p>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="text-left bg-red-50 border border-red-200 rounded-xl p-4 mt-2">
                <p className="text-sm font-semibold text-red-700 mb-2">Failed entries:</p>
                {result.errors.map((e: any, i: number) => (
                  <p key={i} className="text-xs text-red-600">{e.employeeId}: {e.error}</p>
                ))}
              </div>
            )}
            <button onClick={onClose} className="btn-primary px-10 mt-2">Close</button>
          </div>
        ) : (
          <>
            {/* ── Date selector row ── */}
            <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Date</label>
                <input type="date" value={date} max={yesterday}
                  onChange={e => { setDate(e.target.value); setLoaded(false); setEntries([]); }}
                  className="input text-sm" />
              </div>
              <button onClick={() => load()} disabled={!date || loading}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                {loading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" />Loading…</>
                  : <><Users className="w-4 h-4" />{loaded ? 'Reload' : 'Load Employees'}</>}
              </button>
              <button
                onClick={() => {
                  if (!date) return;
                  const next = new Date(date);
                  next.setDate(next.getDate() + 1);
                  const nextStr = next.toISOString().split('T')[0];
                  if (nextStr > yesterday) return;
                  setDate(nextStr);
                  setLoaded(false);
                  setEntries([]);
                }}
                disabled={!date || date >= yesterday}
                title="Go to next day"
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40">
                Next Day <ChevronRight className="w-4 h-4" />
              </button>
              {loaded && (
                <p className="text-sm text-gray-500 ml-auto">
                  <span className="font-semibold text-gray-900">{entries.length}</span> employees loaded for{' '}
                  <span className="font-semibold text-indigo-600">{date}</span>
                  {' · '}<span className="text-gray-400">{entries.filter(e=>e.isExisting).length} existing records pre-filled</span>
                </p>
              )}
            </div>

            {loaded && (
              <>
                {/* ── Bulk action toolbar ── */}
                <div className="px-6 py-3 bg-indigo-50 border-b flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-indigo-800 mr-1">Quick Set:</span>
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setAllStatus(opt.value)}
                      className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-medium text-gray-700 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors">
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                      All {opt.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-medium">Default times:</span>
                    </div>
                    <input type="time" value={defaultCIn}  onChange={e => setDefaultCIn(e.target.value)}
                      className="input text-xs py-1 px-2 w-24" />
                    <span className="text-gray-400 text-xs">→</span>
                    <input type="time" value={defaultCOut} onChange={e => setDefaultCOut(e.target.value)}
                      className="input text-xs py-1 px-2 w-24" />
                    <button onClick={applyDefaultTimes}
                      className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                      Apply to All
                    </button>
                  </div>
                </div>

                {/* ── Employee table ── */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left text-gray-500 text-xs">
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={allChecked}
                            onChange={e => toggleAll(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600" />
                        </th>
                        <th className="px-4 py-3 font-medium">Employee</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                        <th className="px-4 py-3 font-medium w-36">Status</th>
                        <th className="px-4 py-3 font-medium w-32">Check In</th>
                        <th className="px-4 py-3 font-medium w-32">Check Out</th>
                        <th className="px-4 py-3 font-medium">Notes</th>
                        <th className="px-4 py-3 font-medium w-20 text-center">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {entries.map((emp, idx) => {
                        const noTime = NO_TIME_STATUSES.includes(emp.status);
                        return (
                          <tr key={emp.employeeId}
                            className={`transition-colors ${!emp.include ? 'opacity-40 bg-gray-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={emp.include}
                                onChange={e => update(idx, { include: e.target.checked })}
                                className="rounded border-gray-300 text-indigo-600" />
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                              <p className="text-xs text-gray-400">{emp.employeeCode}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{emp.department}</td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <select value={emp.status}
                                  onChange={e => update(idx, { status: e.target.value })}
                                  disabled={!emp.include}
                                  className={`input text-xs py-1.5 pl-6 pr-2 w-full appearance-none ${!emp.include ? 'cursor-not-allowed' : ''}`}>
                                  {STATUS_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${statusDot(emp.status)}`} />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input type="time" value={emp.checkIn}
                                disabled={noTime || !emp.include}
                                onChange={e => update(idx, { checkIn: e.target.value })}
                                className={`input text-xs py-1.5 w-full ${noTime ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                            </td>
                            <td className="px-4 py-3">
                              <input type="time" value={emp.checkOut}
                                disabled={noTime || !emp.include}
                                onChange={e => update(idx, { checkOut: e.target.value })}
                                className={`input text-xs py-1.5 w-full ${noTime ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={emp.notes}
                                disabled={!emp.include}
                                onChange={e => update(idx, { notes: e.target.value })}
                                placeholder="Optional…"
                                className="input text-xs py-1.5 w-full" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {emp.isExisting ? (
                                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">Update</span>
                              ) : (
                                <span className="text-xs bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">New</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Footer ── */}
                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between rounded-b-2xl">
                  <div className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">{includedCount}</span> employees selected
                    {presentCount > 0 && (
                      <> · <span className="text-green-600 font-medium">{presentCount} with check-in times</span></>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={() => save(false)} disabled={saving || includedCount === 0}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2 transition-colors">
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving…' : `Save ${includedCount} Records`}
                    </button>
                    <button onClick={() => save(true)} disabled={saving || includedCount === 0 || date >= yesterday}
                      title="Save and move to next day automatically"
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg flex items-center gap-2 transition-colors">
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving…' : 'Save & Next Day'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {!loaded && !loading && (
              <div className="py-16 text-center text-gray-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="font-medium">Select a past date and click <strong>Load Employees</strong></p>
                <p className="text-sm mt-1">All active employees will appear with their existing records pre-filled</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Backfill Modal ──────────────────────────────────────────────────────────
function BackfillModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 8) + '01';

  const [form, setForm] = useState({
    fromDate: firstOfMonth,
    toDate: today,
    status: 'absent',
    target: 'all', // 'all' | 'specific'
    employeeIds: [] as string[],
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    employeeApi.getAll({ status: 'active', limit: 200 })
      .then(r => setEmployees(r.data.data || []))
      .catch(() => {});
  }, []);

  // Count working days in range (Mon–Fri, skip Sunday as default weekly off)
  const workingDayCount = useMemo(() => {
    if (!form.fromDate || !form.toDate || form.fromDate > form.toDate) return 0;
    let count = 0;
    const cur = new Date(form.fromDate + 'T00:00:00Z');
    const end = new Date(form.toDate + 'T00:00:00Z');
    while (cur <= end) {
      const d = cur.getUTCDay();
      if (d !== 0 && d !== 6) count++; // skip Sun + Sat
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return count;
  }, [form.fromDate, form.toDate]);

  const empCount = form.target === 'all' ? employees.length : form.employeeIds.length;
  const totalRecords = workingDayCount * empCount;

  const toggleEmp = (id: string) =>
    setForm(p => ({
      ...p,
      employeeIds: p.employeeIds.includes(id)
        ? p.employeeIds.filter(e => e !== id)
        : [...p.employeeIds, id],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workingDayCount === 0) return toast.error('No working days in selected range');
    if (form.target === 'specific' && form.employeeIds.length === 0)
      return toast.error('Select at least one employee');
    setSaving(true);
    try {
      const res = await attendanceApi.backfill({
        fromDate: form.fromDate,
        toDate: form.toDate,
        status: form.status,
        employeeIds: form.target === 'all' ? 'all' : form.employeeIds,
      });
      setResult(res.data);
      toast.success(res.data.message);
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Backfill failed');
    } finally { setSaving(false); }
  };

  const statusColors: Record<string, string> = {
    absent:   'bg-red-100 text-red-700 border-red-200',
    present:  'bg-green-100 text-green-700 border-green-200',
    on_leave: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Backfill Attendance</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create missing records for a date range</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {result ? (
          // ── Success result view ──
          <div className="p-6 space-y-4">
            <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
              <p className="text-3xl font-bold text-green-700">{result.created}</p>
              <p className="text-sm text-green-600 mt-1">Records created</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-800">{result.workingDays}</p>
                <p className="text-gray-500 text-xs">Working Days</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-800">{result.employees}</p>
                <p className="text-gray-500 text-xs">Employees</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="font-semibold text-amber-700">{result.skipped}</p>
                <p className="text-amber-600 text-xs">Skipped (existed)</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-5">
            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input type="date" value={form.fromDate} max={today}
                  onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                  className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input type="date" value={form.toDate} max={today}
                  onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                  className="input w-full" required />
              </div>
            </div>

            {/* Status to set */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mark missing records as</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'absent',   label: '🔴 Absent' },
                  { value: 'present',  label: '🟢 Present' },
                  { value: 'on_leave', label: '🔵 On Leave' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.status === opt.value
                        ? statusColors[opt.value] + ' border'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employees</label>
              <div className="flex gap-2 mb-2">
                <button type="button"
                  onClick={() => setForm(p => ({ ...p, target: 'all', employeeIds: [] }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.target === 'all' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  All Active ({employees.length})
                </button>
                <button type="button"
                  onClick={() => setForm(p => ({ ...p, target: 'specific' }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.target === 'specific' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  Select Specific
                </button>
              </div>
              {form.target === 'specific' && (
                <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={form.employeeIds.includes(emp.id)}
                        onChange={() => toggleEmp(emp.id)}
                        className="rounded border-gray-300 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-gray-400">{emp.employeeCode} · {emp.department?.name || '—'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className={`rounded-xl p-4 text-sm border ${
              totalRecords > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            }`}>
              {totalRecords > 0 ? (
                <>
                  <p className="font-semibold text-blue-800 mb-1">Preview</p>
                  <p className="text-blue-700">
                    <strong>{workingDayCount}</strong> working days ×{' '}
                    <strong>{empCount}</strong> employee{empCount !== 1 ? 's' : ''} ={' '}
                    <strong>{totalRecords}</strong> records to create
                  </p>
                  <p className="text-blue-500 text-xs mt-1">
                    ✓ Records that already exist will be skipped automatically
                  </p>
                </>
              ) : (
                <p className="text-gray-500">Select a date range and employees to see preview</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving || totalRecords === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <DatabaseBackup className="w-4 h-4" />
                {saving ? 'Creating…' : `Backfill ${totalRecords > 0 ? totalRecords + ' Records' : ''}`}
              </button>
            </div>
          </form>
        )}
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
  const [showBackfill,  setShowBackfill]  = useState(false);
  const [showBackdate,  setShowBackdate]  = useState(false);

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
          late:    data.filter((r: any) => r.status === 'late').length,
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
          <button onClick={() => setShowBackdate(true)}
            className="btn-secondary text-sm flex items-center gap-2 text-indigo-600 border-indigo-300 hover:bg-indigo-50">
            <ClipboardList className="w-4 h-4" /> Backdate Entry
          </button>
          <button onClick={() => setShowBackfill(true)}
            className="btn-secondary text-sm flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50">
            <DatabaseBackup className="w-4 h-4" /> Backfill Data
          </button>
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
      {showBackdate && (
        <BackdateEntryModal
          initialDate={viewDate}
          onClose={() => setShowBackdate(false)}
          onDone={() => load()}
        />
      )}
      {showBackfill && (
        <BackfillModal onClose={() => setShowBackfill(false)} onDone={() => { setShowBackfill(false); load(); }} />
      )}
    </div>
  );
}
