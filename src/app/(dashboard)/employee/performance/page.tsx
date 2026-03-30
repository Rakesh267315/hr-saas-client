'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { performanceApi } from '@/lib/api';
import { Target, Star, TrendingUp, CheckCircle2, Clock, Award, BarChart3 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="w-4 h-4" viewBox="0 0 20 20" fill={i <= Math.round(value) ? '#f59e0b' : '#e5e7eb'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function EmployeePerformancePage() {
  const { employee } = useAuthStore();
  const [goals,   setGoals]   = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'goals' | 'reviews'>('goals');

  const load = useCallback(async () => {
    if (!employee?._id) return;
    setLoading(true);
    try {
      const [goalsRes, reviewsRes, summaryRes] = await Promise.all([
        performanceApi.getGoals(),
        performanceApi.getReviews(),
        performanceApi.getSummary(employee._id),
      ]);
      setGoals(goalsRes.data.data);
      setReviews(reviewsRes.data.data);
      setSummary(summaryRes.data.data);
    } catch {}
    finally { setLoading(false); }
  }, [employee?._id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const avgRating = summary?.reviews?.avgRating || 0;
  const ratingLabel = avgRating >= 4.5 ? 'Outstanding' : avgRating >= 4 ? 'Excellent' : avgRating >= 3 ? 'Good' : avgRating >= 2 ? 'Fair' : 'Needs Improvement';
  const ratingColor = avgRating >= 4.5 ? 'text-green-600' : avgRating >= 3 ? 'text-amber-600' : 'text-red-500';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" /> My Performance
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Track your goals and view performance reviews</p>
      </div>

      {/* ── Overview Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Goals',  value: summary?.goals?.active || 0,    icon: Target,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Completed',     value: summary?.goals?.completed || 0, icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Avg Progress',  value: `${summary?.goals?.avgProgress || 0}%`, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Reviews',       value: summary?.reviews?.total || 0,   icon: Award,        color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rating summary */}
      {avgRating > 0 && (
        <div className="card mb-5 flex items-center gap-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
            <Star className="w-7 h-7 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Overall Performance Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <StarDisplay value={avgRating} />
              <span className="text-2xl font-bold text-amber-600">{avgRating.toFixed(1)}</span>
              <span className={`text-sm font-semibold ${ratingColor}`}>{ratingLabel}</span>
            </div>
            {summary?.reviews?.lastReview && (
              <p className="text-xs text-gray-400 mt-0.5">
                Last reviewed: {new Date(summary.reviews.lastReview).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-5">
        {[
          { id: 'goals',   label: 'My Goals',   count: goals.length   },
          { id: 'reviews', label: 'My Reviews',  count: reviews.length },
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

      {tab === 'goals' ? (
        <div className="space-y-3">
          {goals.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No goals assigned yet</p>
              <p className="text-xs mt-1">Your manager will assign goals to you</p>
            </div>
          ) : goals.map((g) => (
            <div key={g.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{g.title}</h3>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[g.status] || ''}`}>
                      {g.status}
                    </span>
                    <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                      {g.category?.replace('_', ' ')}
                    </span>
                  </div>
                  {g.targetDate && (
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due: {new Date(g.targetDate).toLocaleDateString()}
                    </p>
                  )}
                  {g.description && (
                    <p className="text-xs text-gray-500 mb-2">{g.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${g.progress}%`, background: `hsl(${g.progress * 1.2}, 70%, 50%)` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-9 text-right">{g.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No reviews yet</p>
              <p className="text-xs mt-1">Your performance review will appear here</p>
            </div>
          ) : reviews.map((r) => (
            <div key={r.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div>
                  {r.reviewPeriod && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {r.reviewPeriod}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Reviewed by {r.reviewerName} · {new Date(r.reviewDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StarDisplay value={Math.round(r.overallRating)} />
                  <span className="text-lg font-bold text-amber-600">{r.overallRating.toFixed(1)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                {[
                  { label: 'Quality',  value: r.ratings.workQuality },
                  { label: 'Punctuality', value: r.ratings.punctuality },
                  { label: 'Teamwork',    value: r.ratings.teamwork },
                  { label: 'Communication', value: r.ratings.communication },
                  { label: 'Leadership',  value: r.ratings.leadership },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-base font-bold text-gray-700">{value?.toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {r.strengths && (
                <div className="bg-green-50 rounded-xl p-3 mb-2 text-xs text-green-800">
                  <p className="font-semibold mb-0.5">💪 Strengths</p>
                  <p>{r.strengths}</p>
                </div>
              )}
              {r.improvements && (
                <div className="bg-amber-50 rounded-xl p-3 mb-2 text-xs text-amber-800">
                  <p className="font-semibold mb-0.5">🎯 Areas to Improve</p>
                  <p>{r.improvements}</p>
                </div>
              )}
              {r.comments && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700">
                  <p className="font-semibold mb-0.5 text-gray-500">💬 Comments</p>
                  <p>{r.comments}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
