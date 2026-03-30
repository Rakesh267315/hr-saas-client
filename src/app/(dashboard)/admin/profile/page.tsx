'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Eye, EyeOff, Save, Shield, CheckCircle2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();

  // ── Profile tab state ────────────────────────────────────────────────────
  const [name,  setName]  = useState(user?.name  || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  // ── Password tab state ───────────────────────────────────────────────────
  const [curPwd,  setCurPwd]  = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdDone,   setPwdDone]   = useState(false);

  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  // ── Password strength ────────────────────────────────────────────────────
  const pwdChecks = {
    length:    newPwd.length >= 8,
    uppercase: /[A-Z]/.test(newPwd),
    number:    /[0-9]/.test(newPwd),
  };
  const strength = Object.values(pwdChecks).filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-green-500'][strength];

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name cannot be empty');
    setSaving(true);
    try {
      const res = await authApi.updateProfile({ name: name.trim(), email: email.trim() });
      updateUser({ name: res.data.data.user.name, email: res.data.data.user.email });
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdChecks.length || !pwdChecks.uppercase || !pwdChecks.number)
      return toast.error('Password does not meet requirements');
    if (newPwd !== confPwd)
      return toast.error('Passwords do not match');
    setPwdSaving(true);
    try {
      await authApi.changePassword({ currentPassword: curPwd, newPassword: newPwd });
      setPwdDone(true);
      setCurPwd(''); setNewPwd(''); setConfPwd('');
      toast.success('Password changed successfully!');
      setTimeout(() => setPwdDone(false), 4000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account details and password</p>
      </div>

      {/* ── Avatar card ─────────────────────────────────────────────────── */}
      <div className="card mb-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
          {getInitials(user?.name || 'U')}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full capitalize">
            <Shield className="w-3 h-3" />
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex border-b mb-5">
        {(['profile', 'password'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'profile' ? 'Account Details' : 'Change Password'}
          </button>
        ))}
      </div>

      {/* ── Profile tab ─────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> Account Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input pl-9"
                placeholder="Your full name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-9"
                placeholder="your@email.com"
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Changing email will update your login email</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value={user?.role?.replace('_', ' ') || ''}
              disabled
              className="input bg-gray-50 text-gray-400 cursor-not-allowed capitalize"
            />
            <p className="text-xs text-gray-400 mt-1">Role cannot be changed here. Contact Super Admin.</p>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* ── Password tab ────────────────────────────────────────────────── */}
      {tab === 'password' && (
        <form onSubmit={handleChangePassword} className="card space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" /> Change Password
          </h2>

          {pwdDone && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Password changed successfully!
            </div>
          )}

          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showCur ? 'text' : 'password'}
                value={curPwd}
                onChange={(e) => setCurPwd(e.target.value)}
                className="input pl-9 pr-10"
                placeholder="Enter current password"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowCur(!showCur)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="input pl-9 pr-10"
                placeholder="Enter new password"
                autoComplete="new-password"
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {newPwd && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength === 3 ? 'text-green-600' : strength === 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {strengthLabel}
                </p>
              </div>
            )}

            {/* Requirements */}
            <ul className="mt-2 space-y-0.5">
              {[
                { ok: pwdChecks.length,    text: 'At least 8 characters' },
                { ok: pwdChecks.uppercase, text: 'One uppercase letter' },
                { ok: pwdChecks.number,    text: 'One number' },
              ].map(({ ok, text }) => (
                <li key={text} className={`text-xs flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                  <span>{ok ? '✓' : '○'}</span> {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showCon ? 'text' : 'password'}
                value={confPwd}
                onChange={(e) => setConfPwd(e.target.value)}
                className={`input pl-9 pr-10 ${confPwd && confPwd !== newPwd ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
              />
              <button type="button" onClick={() => setShowCon(!showCon)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confPwd && confPwd !== newPwd && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pwdSaving || !curPwd || !newPwd || !confPwd || newPwd !== confPwd}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {pwdSaving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Lock className="w-4 h-4" />}
              Update Password
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
