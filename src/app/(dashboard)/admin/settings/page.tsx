'use client';
import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import { useSettingsStore } from '@/store/settingsStore';
import toast from 'react-hot-toast';
import {
  Building2, Clock, UserCheck, Calendar, Banknote, FileText, Save, ChevronRight, ScanFace,
} from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TABS = [
  { id: 'office',     label: 'Office Timing',    icon: Clock },
  { id: 'attendance', label: 'Attendance Rules',  icon: UserCheck },
  { id: 'leave',      label: 'Leave Policy',      icon: Calendar },
  { id: 'salary',     label: 'Salary Rules',      icon: Banknote },
  { id: 'policies',   label: 'Company Policies',  icon: FileText },
];

const DEFAULT: Record<string, any> = {
  companyName: '',
  officeStartTime: '10:00',
  officeEndTime: '19:00',
  weeklyOffDay: 'Sunday',
  timezone: 'Asia/Kolkata',
  // Attendance
  gracePeriodMinutes: 15,
  halfDayAfterMinutes: 240,
  absentAfterMinutes: 480,
  // Salary
  lateCountForHalfDay: 3,
  overtimeMultiplier: 1.5,
  hraPercent: 10,
  transportAllowance: 1500,
  medicalAllowance: 1000,
  pfPercent: 12,
  taxPercent: 10,
  taxThreshold: 50000,
  // Leave
  monthlyLeaveLimit: 2,
  casualLeaveLimit: 2,
  sickLeaveLimit: 1,
  leaveIsPaid: true,
  leaveApprovalRequired: true,
  // Policies
  companyPolicies: '',
  // Face Recognition
  faceRecognitionEnabled: false,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function NumInput({ name, value, onChange, min, max, step }: any) {
  return (
    <input
      type="number" name={name} value={value}
      onChange={onChange} min={min} max={max} step={step || 1}
      className="input w-full"
    />
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('office');
  const [form, setForm] = useState<Record<string, any>>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const { setSettings } = useSettingsStore();

  useEffect(() => {
    settingsApi.get().then((r) => {
      const d = r.data.data;
      setForm({ ...DEFAULT, ...d });
    }).catch(() => {});
  }, []);

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const v = type === 'checkbox' ? (e.target as HTMLInputElement).checked
            : type === 'number' ? (value === '' ? '' : Number(value))
            : value;
    set(name, v);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(form);
      // Update global store so sidebar/header reflect new company name instantly
      if (form.companyName) setSettings({ companyName: form.companyName });
      toast.success('Settings saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Building2 className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings & Policies</h1>
          <p className="text-sm text-gray-500">Controls attendance logic, salary calculation and leave rules</p>
        </div>
      </div>

      <form onSubmit={save}>
        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-52 shrink-0 space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id} type="button"
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {tab === id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className="flex-1 card space-y-5">

            {/* ── OFFICE TIMING ─────────────────────────────────────────────── */}
            {tab === 'office' && (
              <>
                <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Office Timing</h2>
                <Field label="Company Name">
                  <input name="companyName" value={form.companyName} onChange={onChange} placeholder="My Company" className="input w-full" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Office Start Time">
                    <input type="time" name="officeStartTime" value={form.officeStartTime} onChange={onChange} className="input w-full" />
                  </Field>
                  <Field label="Office End Time">
                    <input type="time" name="officeEndTime" value={form.officeEndTime} onChange={onChange} className="input w-full" />
                  </Field>
                </div>
                <Field label="Weekly Off Day">
                  <select name="weeklyOffDay" value={form.weeklyOffDay} onChange={onChange} className="input w-full">
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Timezone">
                  <input name="timezone" value={form.timezone} onChange={onChange} placeholder="Asia/Kolkata" className="input w-full" />
                </Field>
              </>
            )}

            {/* ── ATTENDANCE RULES ──────────────────────────────────────────── */}
            {tab === 'attendance' && (
              <>
                <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Attendance Rules</h2>
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-0.5">
                  <p><strong>How status is assigned on check-in:</strong></p>
                  <p>≤ Grace Period → <span className="font-medium">Present</span></p>
                  <p>Grace + 1 min … Half-Day threshold → <span className="font-medium">Late</span></p>
                  <p>Half-Day + 1 min … Absent threshold → <span className="font-medium">Half Day</span></p>
                  <p>{'>'} Absent threshold → <span className="font-medium">Absent</span></p>
                </div>
                <Field label="Grace Period (minutes)" hint="Employee is marked Present within this window after office start time.">
                  <NumInput name="gracePeriodMinutes" value={form.gracePeriodMinutes} onChange={onChange} min={0} max={60} />
                </Field>
                <Field label="Half-Day After (minutes late)" hint="If late by more than this, employee is marked Half Day instead of Late.">
                  <NumInput name="halfDayAfterMinutes" value={form.halfDayAfterMinutes} onChange={onChange} min={30} max={480} />
                </Field>
                <Field label="Absent After (minutes late)" hint="If late by more than this, employee is marked Absent.">
                  <NumInput name="absentAfterMinutes" value={form.absentAfterMinutes} onChange={onChange} min={60} max={600} />
                </Field>

                {/* ── Face Recognition Toggle ──────────────────────────────────── */}
                <div className={`rounded-xl border-2 p-4 transition-colors ${form.faceRecognitionEnabled ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${form.faceRecognitionEnabled ? 'bg-blue-100' : 'bg-gray-200'}`}>
                        <ScanFace className={`w-5 h-5 ${form.faceRecognitionEnabled ? 'text-blue-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Face Recognition Attendance</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {form.faceRecognitionEnabled
                            ? '🔐 Employees must verify face to check in/out. Normal buttons are blocked.'
                            : '🔓 Normal check-in/out is active. Face recognition is optional.'}
                        </p>
                        {form.faceRecognitionEnabled && (
                          <p className="text-xs text-orange-600 font-medium mt-1">
                            ⚠️ Employees without a registered face cannot check in until you register their face.
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      onClick={() => set('faceRecognitionEnabled', !form.faceRecognitionEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${form.faceRecognitionEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.faceRecognitionEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── LEAVE POLICY ──────────────────────────────────────────────── */}
            {tab === 'leave' && (
              <>
                <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Leave Policy</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Casual Leave — CL (per month)" hint="Max CL days allowed per employee per month.">
                    <NumInput name="casualLeaveLimit" value={form.casualLeaveLimit} onChange={onChange} min={0} max={30} />
                  </Field>
                  <Field label="Sick Leave — SL (per month)" hint="Max SL days allowed per employee per month.">
                    <NumInput name="sickLeaveLimit" value={form.sickLeaveLimit} onChange={onChange} min={0} max={30} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Annual / Other Leave Limit" hint="Max annual/other leaves per month per employee.">
                    <NumInput name="monthlyLeaveLimit" value={form.monthlyLeaveLimit} onChange={onChange} min={0} max={30} />
                  </Field>
                </div>
                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox" name="leaveIsPaid"
                      checked={!!form.leaveIsPaid}
                      onChange={onChange}
                      className="mt-0.5 w-4 h-4 rounded accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Paid Leave</p>
                      <p className="text-xs text-gray-400">When checked, approved leaves count as paid days in payroll.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox" name="leaveApprovalRequired"
                      checked={!!form.leaveApprovalRequired}
                      onChange={onChange}
                      className="mt-0.5 w-4 h-4 rounded accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Approval Required</p>
                      <p className="text-xs text-gray-400">Leaves are auto-approved if unchecked.</p>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* ── SALARY RULES ──────────────────────────────────────────────── */}
            {tab === 'salary' && (
              <>
                <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Salary Rules</h2>

                <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
                  <p><strong>Per-day salary formula:</strong></p>
                  <p className="font-mono mt-1">net_pay = (base_salary ÷ working_days) × effective_days</p>
                  <p className="mt-1">effective_days = present + half_days×0.5 + paid_leaves</p>
                </div>

                <h3 className="text-sm font-semibold text-gray-700 pt-1">Allowances</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="HRA (%)" hint="% of base salary">
                    <NumInput name="hraPercent" value={form.hraPercent} onChange={onChange} min={0} max={100} step={0.5} />
                  </Field>
                  <Field label="Transport (₹/month)">
                    <NumInput name="transportAllowance" value={form.transportAllowance} onChange={onChange} min={0} />
                  </Field>
                  <Field label="Medical (₹/month)">
                    <NumInput name="medicalAllowance" value={form.medicalAllowance} onChange={onChange} min={0} />
                  </Field>
                </div>

                <h3 className="text-sm font-semibold text-gray-700 pt-1">Deductions</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="PF (%)" hint="% of base pay">
                    <NumInput name="pfPercent" value={form.pfPercent} onChange={onChange} min={0} max={100} step={0.5} />
                  </Field>
                  <Field label="Tax (%)" hint="Applied when salary > threshold">
                    <NumInput name="taxPercent" value={form.taxPercent} onChange={onChange} min={0} max={100} step={0.5} />
                  </Field>
                  <Field label="Tax Threshold (₹)" hint="Monthly base pay above which tax applies">
                    <NumInput name="taxThreshold" value={form.taxThreshold} onChange={onChange} min={0} />
                  </Field>
                </div>

                <h3 className="text-sm font-semibold text-gray-700 pt-1">Late Penalty Rule</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Late Lates = 0.5 Day Deduction" hint="e.g. 3 = every 3 late arrivals deduct half a day's salary. Set 0 to disable.">
                    <NumInput name="lateCountForHalfDay" value={form.lateCountForHalfDay} onChange={onChange} min={0} max={30} />
                  </Field>
                  <Field label="Overtime Multiplier" hint="e.g. 1.5 = 1.5× hourly rate for OT. Set 0 to disable.">
                    <NumInput name="overtimeMultiplier" value={form.overtimeMultiplier} onChange={onChange} min={0} max={3} step={0.1} />
                  </Field>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  {form.lateCountForHalfDay > 0 ? (
                    <>
                      <p><strong>Late penalty example</strong> (with {form.lateCountForHalfDay} lates = 0.5 day):</p>
                      <p className="mt-1">If employee is late {form.lateCountForHalfDay * 2} times → {form.lateCountForHalfDay * 2 / form.lateCountForHalfDay * 0.5} day(s) deducted from salary.</p>
                    </>
                  ) : (
                    <p><strong>Late penalty is disabled.</strong> No deduction will be applied for late arrivals.</p>
                  )}
                </div>
              </>
            )}

            {/* ── COMPANY POLICIES ──────────────────────────────────────────── */}
            {tab === 'policies' && (
              <>
                <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Company Policies</h2>
                <p className="text-sm text-gray-500">This text is visible to all employees in their dashboard. Write your HR rules, code of conduct, leave policies, etc.</p>
                <Field label="Policy Text">
                  <textarea
                    name="companyPolicies"
                    value={form.companyPolicies}
                    onChange={onChange}
                    rows={14}
                    placeholder={`Example:\n1. Office hours: 10:00 AM – 7:00 PM\n2. Grace period of 15 minutes allowed.\n3. More than 3 late marks in a month will result in half-day deduction.\n4. Leave requests must be submitted 2 days in advance.\n5. Sick leave requires a medical certificate if exceeding 2 days.`}
                    className="input w-full font-mono text-xs resize-y"
                  />
                </Field>
                <p className="text-xs text-gray-400">Supports plain text. Shown as-is to employees.</p>
              </>
            )}

            {/* Save button */}
            <div className="pt-4 border-t flex items-center justify-between">
              <p className="text-xs text-gray-400">Changes affect all employees immediately.</p>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
