'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Building2, Shield } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

interface LoginForm { email: string; password: string }

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { companyName } = useSettingsStore();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register, handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      // Normalise email — trim + lowercase to avoid case-sensitivity issues
      const res = await authApi.login({ ...data, email: data.email.trim().toLowerCase() });
      const { token, data: { user, employee } } = res.data;
      setAuth(user, token, employee);
      toast.success(`Welcome back, ${user.name}! 👋`);
      if (['admin', 'super_admin', 'hr'].includes(user.role)) {
        router.push('/admin');
      } else {
        router.push('/employee');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 429) {
        toast.error('Too many login attempts. Please wait 15 minutes and try again.');
      } else if (err.response?.status === 401) {
        toast.error('Invalid email or password. Please check your credentials.');
      } else if (err.response?.status === 403) {
        toast.error('Your account has been deactivated. Contact your administrator.');
      } else {
        toast.error(msg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">{companyName}</h1>
          <p className="text-blue-100 mt-1">Human Resource Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Sign in</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className={`input ${errors.email ? 'border-red-400 focus:ring-red-500' : ''}`}
                placeholder="you@company.com"
                autoComplete="email"
                disabled={loading}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                })}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span>⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'border-red-400 focus:ring-red-500' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span>⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Contact your HR administrator if you have login issues.
          </p>
        </div>
      </div>
    </div>
  );
}
