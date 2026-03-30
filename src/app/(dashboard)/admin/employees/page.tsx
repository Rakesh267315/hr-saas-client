'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePersistState } from '@/lib/hooks';
import { employeeApi, deptApi, faceApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Badge from '@/components/ui/Badge';
import { fmtDate, fmtCurrency, getInitials, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Search, Plus, Eye, X, Copy, Check,
  Mail, Phone, Building2, Briefcase, Calendar,
  KeyRound, User, ShieldCheck, EyeOff, IndianRupee,
  Clock, Edit3, RefreshCw, Save, AlertTriangle,
  Wand2, Shield, CheckCircle2, Pencil, Trash2, ScanFace,
} from 'lucide-react';

// Lazy-load — contains face-api.js (browser-only, large bundle)
const FaceRegistration = dynamic(() => import('@/components/FaceRegistration'), { ssr: false });

// ── Helpers ───────────────────────────────────────────────────────────────────
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!%';
  const all = upper + lower + digits + special;
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 0; i < 6; i++) pwd.push(all[Math.floor(Math.random() * all.length)]);
  return pwd.sort(() => Math.random() - 0.5).join('');
}

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score === 4) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  email, password, empName, onConfirm, onCancel, saving,
}: {
  email: string; password: string; empName: string;
  onConfirm: () => void; onCancel: () => void; saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Confirm Credential Change</h3>
            <p className="text-xs text-gray-400">This action will be logged</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          You are about to update login credentials for <span className="font-semibold text-gray-900">{empName}</span>.
        </p>

        <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4 border border-gray-100">
          {email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-gray-500">New email:</span>
              <span className="font-medium text-gray-800 truncate">{email}</span>
            </div>
          )}
          {password && (
            <div className="flex items-center gap-2 text-sm">
              <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-gray-500">New password:</span>
              <span className="font-mono font-medium text-gray-800">{'•'.repeat(password.length)}</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5">
          <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            The employee will need to use the new credentials to log in. Inform them immediately after updating.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Confirm Update</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Credential Section ────────────────────────────────────────────────────────
function CredentialSection({ emp, onUpdated }: { emp: any; onUpdated: (email: string) => void }) {
  const storageKey = `hr_pwd_${emp._id}`;
  const getCachedPwd = () => {
    if (typeof window === 'undefined') return 'Hr@123456';
    try { return sessionStorage.getItem(storageKey) || 'Hr@123456'; } catch { return 'Hr@123456'; }
  };

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showPassword, setShowPassword] = useState(false);
  const [editEmail, setEditEmail] = useState(emp.email || '');
  const [editPassword, setEditPassword] = useState(() => getCachedPwd());
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastChanged, setLastChanged] = useState<{ by: string; at: string } | null>(null);
  // Tracks the actual current password displayed in view mode (updates after save)
  const [currentPassword, setCurrentPassword] = useState(() => getCachedPwd());

  const strength = passwordStrength(editPassword);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key); toast.success('Copied!');
      setTimeout(() => setCopied(null), 2000);
    } catch { toast.error('Copy failed'); }
  };

  const handleGenerate = () => {
    const newPwd = generatePassword();
    setEditPassword(newPwd);
    setShowEditPwd(true);
  };

  const handleSave = () => {
    if (!editEmail.trim()) { toast.error('Email cannot be empty'); return; }
    if (!editPassword.trim()) { toast.error('Password cannot be empty'); return; }
    if (editPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setShowConfirm(true);
  };

  const hasAccount = !!emp.userId;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const payload: any = { email: editEmail, password: editPassword };

      const res = await employeeApi.updateCredentials(emp._id, payload);
      setLastChanged({ by: res.data.changedBy, at: res.data.changedAt });
      setCurrentPassword(editPassword);
      try { sessionStorage.setItem(storageKey, editPassword); } catch {}
      toast.success(hasAccount ? 'Credentials updated successfully!' : 'Login account created successfully!');
      setMode('view');
      setShowConfirm(false);
      onUpdated(editEmail);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditEmail(emp.email || '');
    setEditPassword(currentPassword); // reset to whatever password is currently saved
    setShowEditPwd(false);
    setMode('view');
  };

  return (
    <div className="px-6 py-5">
      {showConfirm && (
        <ConfirmModal
          email={!hasAccount ? editEmail : (editEmail !== emp.email ? editEmail : '')}
          password={editPassword}
          empName={`${emp.firstName} ${emp.lastName || ''}`}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          saving={saving}
        />
      )}

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Login Credentials</p>
        </div>
        {mode === 'view' && (
          <button
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              hasAccount
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100'
            }`}
          >
            {hasAccount ? <><Edit3 className="w-3 h-3" /> Edit</> : <><Plus className="w-3 h-3" /> Create Account</>}
          </button>
        )}
      </div>

      {/* No account warning */}
      {!hasAccount && mode === 'view' && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800">No login account</p>
            <p className="text-xs text-amber-700 mt-0.5">This employee cannot log in yet. Click <strong>Create Account</strong> to set up their credentials.</p>
          </div>
        </div>
      )}

      {mode === 'view' ? (
        /* ── VIEW MODE ── */
        <div className="space-y-3">
          {/* Email */}
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Username / Email</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{emp.email}</p>
                </div>
              </div>
              <button
                onClick={() => copy(emp.email, 'email')}
                className="ml-2 p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                {copied === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password (view) */}
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Default Password</p>
                  <p className="text-sm font-mono font-semibold text-gray-800 tracking-widest">
                    {showPassword ? currentPassword : '••••••••••'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button onClick={() => setShowPassword((v) => !v)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => copy(currentPassword, 'password')} className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                  {copied === 'password' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {lastChanged && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Updated by <strong>{lastChanged.by}</strong> · {new Date(lastChanged.at).toLocaleString('en-IN')}</span>
            </div>
          )}

          <p className="text-xs text-amber-600 flex items-start gap-1.5">
            <span className="mt-0.5">⚠</span>
            <span>Default password. Ask the employee to change it after first login.</span>
          </p>

          {/* Copy all */}
          <button
            onClick={() => copy(
              `Login URL: ${window.location.origin}/login\nEmail: ${emp.email}\nPassword: ${currentPassword}`,
              'all'
            )}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200',
              copied === 'all'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
            )}
          >
            {copied === 'all' ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy All Credentials</>}
          </button>
        </div>
      ) : (
        /* ── EDIT MODE ── */
        <div className="space-y-4">
          {/* Warning banner */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              {hasAccount
                ? <>Changing credentials will require the employee to <strong>re-login</strong>. This action is logged with your name.</>
                : <>This will <strong>create a new login account</strong> for this employee. They will be able to log in with the credentials you set below.</>
              }
            </p>
          </div>

          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Email / Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                autoComplete="off"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="employee@company.com"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                New Password
              </label>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Wand2 className="w-3 h-3" /> Auto-generate
              </button>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type={showEditPwd ? 'text' : 'password'}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="Enter new password"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowEditPwd((v) => !v)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {showEditPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => copy(editPassword, 'editPwd')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {copied === 'editPwd' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {/* Strength bar */}
            {editPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-all duration-300',
                        i <= strength.score ? strength.color : 'bg-gray-200'
                      )}
                    />
                  ))}
                </div>
                <p className={cn('text-xs font-medium', {
                  'text-red-500': strength.label === 'Weak',
                  'text-amber-500': strength.label === 'Fair',
                  'text-blue-500': strength.label === 'Good',
                  'text-green-500': strength.label === 'Strong',
                })}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Employee Detail Drawer ────────────────────────────────────────────────────
function EmployeeDetailDrawer({
  empId, onClose, canManage, onEdit,
}: {
  empId: string; onClose: () => void; canManage?: boolean; onEdit?: (emp: any) => void;
}) {
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employeeApi.getOne(empId)
      .then((r) => setEmp(r.data.data))
      .catch(() => toast.error('Failed to load employee details'))
      .finally(() => setLoading(false));
  }, [empId]);

  const handleEmailUpdated = (newEmail: string) => {
    setEmp((prev: any) => prev ? { ...prev, email: newEmail } : prev);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Employee Details</h2>
          <div className="flex items-center gap-2">
            {canManage && emp && (
              <button
                onClick={() => onEdit?.(emp)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !emp ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Employee not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Profile hero */}
            <div className="px-6 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg">
                  {getInitials(`${emp.firstName} ${emp.lastName || ''}`)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{emp.firstName} {emp.lastName || ''}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{emp.designation || '—'}</p>
                  <div className="mt-2"><Badge status={emp.status} /></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-white/70 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-gray-500">Employee Code</p>
                  <p className="text-sm font-bold text-blue-700 font-mono">{emp.employeeCode}</p>
                </div>
                <div className="bg-white/70 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-gray-500">Employment Type</p>
                  <p className="text-sm font-semibold text-gray-700 capitalize">{emp.employmentType?.replace('_', ' ') || '—'}</p>
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Personal Information</p>
              <div className="space-y-4">
                <InfoRow icon={Mail} label="Email" value={emp.email} />
                <InfoRow icon={Phone} label="Phone" value={emp.phone || '—'} />
                <InfoRow icon={Building2} label="Department" value={emp.department?.name || '—'} />
                <InfoRow icon={Briefcase} label="Designation" value={emp.designation || '—'} />
                <InfoRow icon={Calendar} label="Joining Date" value={emp.joiningDate ? fmtDate(emp.joiningDate) : '—'} />
                <InfoRow icon={Clock} label="Work Start Time" value={emp.workStartTime || '—'} />
                <InfoRow icon={IndianRupee} label="Base Salary" value={emp.baseSalary ? fmtCurrency(emp.baseSalary) : '—'} />
              </div>
            </div>

            <div className="mx-6 border-t border-gray-100" />

            {/* Login Credentials */}
            <CredentialSection emp={emp} onUpdated={handleEmailUpdated} />

            {/* Face ID Section */}
            <FaceIdSection emp={emp} />
          </div>
        )}
      </div>
    </>
  );
}

// ── Face ID Admin Section ─────────────────────────────────────────────────────
function FaceIdSection({ emp }: { emp: any }) {
  const [registered,   setRegistered]   = useState<boolean | null>(null);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);

  const load = () => {
    faceApi.status(emp._id)
      .then((r) => {
        setRegistered(r.data.data.registered);
        setRegisteredAt(r.data.data.face_registered_at);
      })
      .catch(() => setRegistered(false));
  };

  useEffect(() => { load(); }, [emp._id]);

  const handleDelete = async () => {
    if (!confirm(`Delete face data for ${emp.firstName}? They will need to re-register.`)) return;
    setDeleting(true);
    try {
      await faceApi.deleteFace(emp._id);
      setRegistered(false);
      setRegisteredAt(null);
      toast.success('Face data deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete face data');
    } finally { setDeleting(false); }
  };

  return (
    <div className="px-6 pb-6">
      <div className="border-t border-gray-100 mb-4" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScanFace className="w-4 h-4 text-indigo-600" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Face ID</p>
        </div>
        {/* Always-visible Register button */}
        <button
          onClick={() => setShowRegModal(true)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors font-medium"
        >
          <ScanFace className="w-3.5 h-3.5" />
          {registered ? 'Re-register' : 'Register Face'}
        </button>
      </div>

      {/* Status card */}
      {registered === null ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
          Checking status…
        </div>
      ) : registered ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Face Registered ✓</span>
              </div>
              {registeredAt && (
                <p className="text-xs text-green-600 mt-0.5 ml-6">
                  Registered on {new Date(registeredAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>
              )}
              <p className="text-xs text-green-600 ml-6 mt-0.5">
                Employee can check in with Face Recognition
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 shrink-0 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
            >
              {deleting
                ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                : <Trash2 className="w-3 h-3" />}
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <ScanFace className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900">No Face Registered</p>
              <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
                Click <strong>"Register Face"</strong> above to set up face recognition for this employee.
                They can also register from their own dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Face Registration Modal */}
      {showRegModal && (
        <FaceRegistration
          employeeId={emp._id}
          employeeName={`${emp.firstName} ${emp.lastName || ''}`}
          onClose={() => setShowRegModal(false)}
          onSuccess={() => {
            setShowRegModal(false);
            load();  // refresh status
            toast.success(`Face registered for ${emp.firstName}`);
          }}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const { isHR } = useAuthStore();
  const canManage = isHR(); // admin + hr can edit/delete

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = usePersistState('emp_search', '');
  const [deptFilter, setDeptFilter] = usePersistState('emp_dept', '');
  const [statusFilter, setStatusFilter] = usePersistState('emp_status', '');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [viewEmpId, setViewEmpId] = useState<string | null>(null);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [deleteEmp, setDeleteEmp] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEmployees = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await employeeApi.getAll({ search, department: deptFilter, status: statusFilter, ...params });
      setEmployees(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  }, [search, deptFilter, statusFilter]);

  // Auto-search with debounce when search/filter changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { loadEmployees(); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, deptFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteEmp) return;
    setDeleting(true);
    try {
      await employeeApi.remove(deleteEmp._id);
      toast.success(`${deleteEmp.firstName} ${deleteEmp.lastName || ''} removed`);
      setDeleteEmp(null);
      // Close detail drawer if it was showing the deleted employee
      if (viewEmpId === deleteEmp._id) setViewEmpId(null);
      loadEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete employee');
    } finally { setDeleting(false); }
  };

  useEffect(() => {
    deptApi.getAll().then((r) => setDepartments(r.data.data));
    loadEmployees();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total employees</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by name, code, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
            />
          </div>
          <select className="input w-48" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select className="input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
          </select>
          <button onClick={() => loadEmployees()} className="btn-primary">Apply</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-4 py-4 font-medium">Code</th>
                <th className="px-4 py-4 font-medium">Department</th>
                <th className="px-4 py-4 font-medium">Designation</th>
                <th className="px-4 py-4 font-medium">Joined</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium" title="Face ID registered">
                  <div className="flex items-center gap-1"><ScanFace className="w-3.5 h-3.5" /> Face</div>
                </th>
                <th className="px-4 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No employees found</td></tr>
              ) : employees.map((emp: any) => (
                <tr key={emp._id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                        {getInitials(`${emp.firstName} ${emp.lastName || ''}`)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                        <p className="text-gray-400 text-xs">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-gray-600">{emp.employeeCode}</td>
                  <td className="px-4 py-4 text-gray-600">{emp.department?.name || '—'}</td>
                  <td className="px-4 py-4 text-gray-600">{emp.designation}</td>
                  <td className="px-4 py-4 text-gray-500">{fmtDate(emp.joiningDate)}</td>
                  <td className="px-4 py-4"><Badge status={emp.status} /></td>
                  <td className="px-4 py-4">
                    {/* Face status — shown if backend returns it, otherwise neutral */}
                    <button
                      onClick={() => setViewEmpId(emp._id)}
                      title={emp.faceRegistered ? 'Face ID registered — click View to manage' : 'No face registered — click View to register'}
                      className="flex items-center justify-center"
                    >
                      <ScanFace className={`w-4 h-4 ${emp.faceRegistered ? 'text-green-500' : 'text-gray-300'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewEmpId(emp._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => setEditEmp(emp)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-100"
                            title="Edit employee"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteEmp(emp)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                            title="Delete employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-500">
          Showing {employees.length} of {pagination.total} employees
        </div>
      </div>

      {/* Employee Detail Drawer */}
      {viewEmpId && (
        <EmployeeDetailDrawer
          empId={viewEmpId}
          onClose={() => setViewEmpId(null)}
          canManage={canManage}
          onEdit={(emp: any) => { setViewEmpId(null); setEditEmp(emp); }}
        />
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <AddEmployeeModal
          departments={departments}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadEmployees(); }}
        />
      )}

      {/* Edit Employee Modal */}
      {editEmp && (
        <EditEmployeeModal
          emp={editEmp}
          departments={departments}
          onClose={() => setEditEmp(null)}
          onSave={() => { setEditEmp(null); loadEmployees(); }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteEmp && (
        <DeleteConfirmModal
          emp={deleteEmp}
          onConfirm={handleDelete}
          onCancel={() => setDeleteEmp(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

// ── Employee Form Fields (shared by Add & Edit) ───────────────────────────────
function EmployeeFormFields({ form, setForm, departments }: { form: any; setForm: any; departments: any[] }) {
  return (
    <>
      {[
        { label: 'First Name', key: 'firstName', required: true },
        { label: 'Last Name', key: 'lastName' },
        { label: 'Email', key: 'email', type: 'email', required: true },
        { label: 'Phone', key: 'phone', required: true },
        { label: 'Designation', key: 'designation', required: true },
        { label: 'Joining Date', key: 'joiningDate', type: 'date', required: true },
        { label: 'Base Salary', key: 'baseSalary', type: 'number', required: true },
        { label: 'Work Start Time', key: 'workStartTime', type: 'time' },
      ].map(({ label, key, type = 'text', required }) => (
        <div key={key}>
          <label className="label">{label} {required && <span className="text-red-500">*</span>}</label>
          <input
            type={type}
            className="input"
            required={required}
            value={form[key] || ''}
            onChange={(e) => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
          />
        </div>
      ))}
      <div>
        <label className="label">Department <span className="text-red-500">*</span></label>
        <select className="input" required value={form.department || ''} onChange={(e) => setForm((p: any) => ({ ...p, department: e.target.value }))}>
          <option value="">Select...</option>
          {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Employment Type</label>
        <select className="input" value={form.employmentType || 'full_time'} onChange={(e) => setForm((p: any) => ({ ...p, employmentType: e.target.value }))}>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </select>
      </div>
    </>
  );
}

// ── Edit Employee Modal ────────────────────────────────────────────────────────
function EditEmployeeModal({ emp, departments, onClose, onSave }: any) {
  const toDateInput = (v: string | null) => {
    if (!v) return '';
    try { return new Date(v).toISOString().split('T')[0]; } catch { return ''; }
  };

  const [form, setForm] = useState<any>({
    firstName: emp.firstName || '',
    lastName: emp.lastName || '',
    email: emp.email || '',
    phone: emp.phone || '',
    designation: emp.designation || '',
    joiningDate: toDateInput(emp.joiningDate),
    baseSalary: emp.baseSalary || '',
    workStartTime: emp.workStartTime || '09:00',
    department: emp.department?._id || '',
    employmentType: emp.employmentType || 'full_time',
    status: emp.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await employeeApi.update(emp._id, form);
      toast.success('Employee updated successfully');
      onSave();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update employee');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Pencil className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Employee</h2>
              <p className="text-xs text-gray-400">{emp.employeeCode} · {emp.firstName} {emp.lastName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={save} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <EmployeeFormFields form={form} setForm={setForm} departments={departments} />
            {/* Status */}
            <div className="col-span-2">
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm((p: any) => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-5 mt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ emp, onConfirm, onCancel, deleting }: any) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={!deleting ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Delete Employee</h3>
            <p className="text-xs text-gray-400">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900">{emp.firstName} {emp.lastName || ''}</span>?
        </p>

        <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">
            All attendance, payroll, and leave records linked to this employee will also be permanently removed.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {deleting ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Yes, Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Employee Modal ────────────────────────────────────────────────────────
function AddEmployeeModal({ departments, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({
    firstName: '', lastName: '', email: '', phone: '',
    department: '', designation: '', joiningDate: '', baseSalary: '',
    workStartTime: '09:00', employmentType: 'full_time',
    createAccount: true, password: 'Hr@123456',
  });
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const save = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      await employeeApi.create(form);
      if (form.createAccount) {
        setCredentials({ email: form.email, password: form.password || 'Hr@123456' });
      } else {
        toast.success('Employee added successfully');
        onSave();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add employee');
    } finally { setSaving(false); }
  };

  if (credentials) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-1">Employee Added!</h2>
          <p className="text-gray-500 text-sm mb-5">Share these login credentials with the employee:</p>
          <div className="bg-gray-50 border rounded-xl p-4 text-left space-y-3 mb-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Login URL</p>
              <p className="text-sm font-medium text-blue-600 break-all">{window.location.origin}/login</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
              <p className="text-sm font-medium text-gray-800">{credentials.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Password</p>
              <p className="text-sm font-mono font-bold text-gray-800 bg-yellow-50 px-2 py-1 rounded">{credentials.password}</p>
            </div>
          </div>
          <p className="text-xs text-amber-600 mb-5">⚠ Ask the employee to change their password after first login.</p>
          <button className="btn-primary w-full" onClick={() => { setCredentials(null); onSave(); }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Plus className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Add New Employee</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={save} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <EmployeeFormFields form={form} setForm={(v: any) => setForm(typeof v === 'function' ? v(form) : v)} departments={departments} />
            <div className="col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="ca" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />
              <label htmlFor="ca" className="text-sm text-gray-700">Create login account</label>
            </div>
            {form.createAccount && (
              <div className="col-span-2">
                <label className="label">Login Password <span className="text-red-500">*</span></label>
                <input type="text" className="input font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Hr@123456" />
                <p className="text-xs text-gray-400 mt-1">This password will be shared with the employee for first login.</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-5 mt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Plus className="w-4 h-4" /> Add Employee</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
