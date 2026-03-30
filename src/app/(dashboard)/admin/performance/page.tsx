'use client';
import { useEffect, useState, useCallback } from 'react';
import { performanceApi, employeeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Target, Star, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  TrendingUp, CheckCircle2, Clock, AlertCircle, Users, Award,
  X, Save, BarChart3
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Goal {
  id: string; employeeId: string; employeeName: string; employeeCode: string;
  title: string; description: string; category: string;
  targetDate: string; progress: number; status: string;
}
interface Review {
  id: string; employeeId: string; employeeName: string; reviewerName: string;
  reviewPeriod: string; reviewDate: string; overallRating: number;
  ratings: { workQuality: number; punctuality: number; teamwork: number; communication: number; leadership: number };
  strengths: string; improvements: string; comments: string; status: string;
}

const CATEGORIES = ['professional', 'technical', 'soft_skills', 'leadership', 'personal'];
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',  cancelled: 'bg-gray-100 text-gray-500',
};

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: string }) {
  const s = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange?.(i)} disabled={!onChange}
          className={`${s} transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}>
          <svg viewBox="0 0 20 20" fill={i <= value ? '#f59e0b' : '#e5e7eb'}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function AdminPerformancePage() {
  const [tab, setTab] = useState<'goals' | 'reviews'>('goals');
  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Goal modal ─────────────────────────────────────────────────────────────
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({
    employeeId: '', title: '', description: '', category: 'professional',
    targetDate: '', progress: 0,
  });

  // ── Review modal ───────────────────────────────────────────────────────────
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    employeeId: '', reviewPeriod: '', overallRating: 4,
    workQuality: 4, punctuality: 4, teamwork: 4, communication: 4, leadership: 4,
    strengths: '', improvements: '', comments: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, reviewsRes, empsRes] = await Promise.all([
        performanceApi.getGoals(filterEmp ? { employeeId: filterEmp } : undefined),
        performanceApi.getReviews(filterEmp ? { employeeId: filterEmp } : undefined),
        employeeApi.getAll({ status: 'active', limit: 200 }),
      ]);
      setGoals(goalsRes.data.data);
      setReviews(reviewsRes.data.data);
      setEmployees(empsRes.data.data);
    } catch { toast.error('Failed to load performance data'); }
    finally { setLoading(false); }
  }, [filterEmp]);

  useEffect(() => { load(); }, [load]);

  // ── Goal CRUD ──────────────────────────────────────────────────────────────
  const openGoalModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalForm({ employeeId: goal.employeeId, title: goal.title, description: goal.description || '',
        category: goal.category, targetDate: goal.targetDate?.split('T')[0] || '', progress: goal.progress });
    } else {
      setEditingGoal(null);
      setGoalForm({ employeeId: '', title: '', description: '', category: 'professional', targetDate: '', progress: 0 });
    }
    setShowGoalModal(true);
  };

  const saveGoal = async () => {
    if (!goalForm.employeeId || !goalForm.title.trim())
      return toast.error('Employee and title are required');
    try {
      if (editingGoal) {
        await performanceApi.updateGoal(editingGoal.id, goalForm);
        toast.success('Goal updated');
      } else {
        await performanceApi.createGoal(goalForm);
        toast.success('Goal created');
      }
      setShowGoalModal(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save goal'); }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await performanceApi.deleteGoal(id);
      toast.success('Goal deleted');
      load();
    } catch { toast.error('Failed to delete goal'); }
  };

  const updateGoalProgress = async (id: string, progress: number) => {
    try {
      await performanceApi.updateGoal(id, { progress, status: progress === 100 ? 'completed' : 'active' });
      load();
    } catch {}
  };

  // ── Review CRUD ────────────────────────────────────────────────────────────
  const saveReview = async () => {
    if (!reviewForm.employeeId) return toast.error('Select an employee');
    try {
      await performanceApi.createReview(reviewForm);
      toast.success('Review submitted — employee notified!');
      setShowReviewModal(false);
      setReviewForm({ employeeId: '', reviewPeriod: '', overallRating: 4,
        workQuality: 4, punctuality: 4, teamwork: 4, communication: 4, leadership: 4,
        strengths: '', improvements: '', comments: '' });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save review'); }
  };

  const filteredGoals = filterStatus
    ? goals.filter((g) => g.status === filterStatus)
    : goals;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" /> Performance
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Track goals and conduct performance reviews</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openGoalModal()} className="btn-secondary flex items-center gap-2 text-sm">
            <Target className="w-4 h-4" /> Add Goal
          </button>
          <button onClick={() => setShowReviewModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Star className="w-4 h-4" /> New Review
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Goals',     value: goals.filter(g => g.status === 'active').length,    icon: Target,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Completed',        value: goals.filter(g => g.status === 'completed').length, icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Overdue',          value: goals.filter(g => g.status === 'overdue').length,   icon: AlertCircle,  color: 'text-red-500',    bg: 'bg-red-50'    },
          { label: 'Reviews Done',     value: reviews.length,                                     icon: Award,        color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}
          className="input text-sm py-1.5 w-48">
          <option value="">All Employees</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
          ))}
        </select>
        {tab === 'goals' && (
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); }}
            className="input text-sm py-1.5 w-36">
            <option value="">All Status</option>
            {['active','completed','overdue','cancelled'].map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-5">
        {[
          { id: 'goals',   label: 'Goals',   count: goals.length   },
          { id: 'reviews', label: 'Reviews', count: reviews.length },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : tab === 'goals' ? (
        /* ── Goals Tab ─────────────────────────────────────────────────────── */
        <div className="space-y-3">
          {filteredGoals.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No goals found</p>
              <p className="text-xs mt-1">Create a goal to get started</p>
            </div>
          ) : filteredGoals.map((g) => (
            <div key={g.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{g.title}</h3>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[g.status] || STATUS_COLORS.active}`}>
                      {g.status}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                      {g.category?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {g.employeeName}
                    </span>
                    {g.targetDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due: {new Date(g.targetDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {g.description && <p className="text-xs text-gray-400 mb-2 line-clamp-1">{g.description}</p>}

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${g.progress}%`, background: `hsl(${g.progress * 1.2}, 70%, 50%)` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-9 text-right">{g.progress}%</span>
                  </div>

                  {/* Quick progress update */}
                  {g.status === 'active' && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[25, 50, 75, 100].map((p) => (
                        <button key={p} onClick={() => updateGoalProgress(g.id, p)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                            g.progress === p
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                          }`}>
                          {p}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openGoalModal(g)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteGoal(g.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Reviews Tab ────────────────────────────────────────────────────── */
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No reviews yet</p>
              <p className="text-xs mt-1">Conduct a performance review to get started</p>
            </div>
          ) : reviews.map((r) => (
            <div key={r.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{r.employeeName}</p>
                    {r.reviewPeriod && (
                      <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                        {r.reviewPeriod}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">by {r.reviewerName}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <StarRating value={Math.round(r.overallRating)} size="sm" />
                    <span className="text-sm font-bold text-amber-600">{r.overallRating.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">/ 5.0</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-gray-500">
                    {[
                      { label: 'Quality',       value: r.ratings.workQuality },
                      { label: 'Punctuality',   value: r.ratings.punctuality },
                      { label: 'Teamwork',      value: r.ratings.teamwork },
                      { label: 'Communication', value: r.ratings.communication },
                      { label: 'Leadership',    value: r.ratings.leadership },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-1.5 text-center">
                        <p className="font-semibold text-gray-700">{value?.toFixed(1) || '—'}</p>
                        <p className="text-[10px]">{label}</p>
                      </div>
                    ))}
                  </div>

                  {r.strengths && (
                    <p className="text-xs text-green-700 mt-2 bg-green-50 rounded px-2 py-1">
                      <strong>Strengths:</strong> {r.strengths}
                    </p>
                  )}
                  {r.improvements && (
                    <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 rounded px-2 py-1">
                      <strong>Improve:</strong> {r.improvements}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {new Date(r.reviewDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Goal Modal ─────────────────────────────────────────────────────── */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">{editingGoal ? 'Edit Goal' : 'Create Goal'}</h3>
              <button onClick={() => setShowGoalModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Employee *</label>
                <select value={goalForm.employeeId} onChange={(e) => setGoalForm({ ...goalForm, employeeId: e.target.value })} className="input">
                  <option value="">Select employee…</option>
                  {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Goal Title *</label>
                <input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="input" placeholder="e.g. Complete React certification" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  className="input resize-none" rows={2} placeholder="Optional details…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select value={goalForm.category} onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })} className="input">
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Target Date</label>
                  <input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })} className="input" />
                </div>
              </div>
              {editingGoal && (
                <div>
                  <label className="label">Progress: {goalForm.progress}%</label>
                  <input type="range" min={0} max={100} step={5}
                    value={goalForm.progress}
                    onChange={(e) => setGoalForm({ ...goalForm, progress: +e.target.value })}
                    className="w-full accent-blue-600" />
                </div>
              )}
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowGoalModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveGoal} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {editingGoal ? 'Update' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Modal ──────────────────────────────────────────────────── */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" /> Performance Review
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Employee *</label>
                  <select value={reviewForm.employeeId} onChange={(e) => setReviewForm({ ...reviewForm, employeeId: e.target.value })} className="input">
                    <option value="">Select…</option>
                    {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Review Period</label>
                  <input value={reviewForm.reviewPeriod} onChange={(e) => setReviewForm({ ...reviewForm, reviewPeriod: e.target.value })}
                    className="input" placeholder="e.g. Q1 2026" />
                </div>
              </div>

              {/* Ratings */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Ratings (1–5 stars)</p>
                {[
                  { key: 'overallRating',   label: 'Overall Rating' },
                  { key: 'workQuality',     label: 'Work Quality' },
                  { key: 'punctuality',     label: 'Punctuality' },
                  { key: 'teamwork',        label: 'Teamwork' },
                  { key: 'communication',   label: 'Communication' },
                  { key: 'leadership',      label: 'Leadership' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{label}</span>
                    <div className="flex items-center gap-2">
                      <StarRating
                        value={(reviewForm as any)[key]}
                        onChange={(v) => setReviewForm({ ...reviewForm, [key]: v })}
                      />
                      <span className="text-sm font-semibold text-amber-600 w-4">{(reviewForm as any)[key]}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="label">Strengths</label>
                <textarea value={reviewForm.strengths} onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                  className="input resize-none" rows={2} placeholder="Key strengths observed…" />
              </div>
              <div>
                <label className="label">Areas for Improvement</label>
                <textarea value={reviewForm.improvements} onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                  className="input resize-none" rows={2} placeholder="Areas to work on…" />
              </div>
              <div>
                <label className="label">Additional Comments</label>
                <textarea value={reviewForm.comments} onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                  className="input resize-none" rows={2} placeholder="Any other feedback…" />
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowReviewModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveReview} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Award className="w-4 h-4" /> Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
