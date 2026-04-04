'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { attendanceApi, leaveApi, payrollApi, breakApi, settingsApi, faceApi, notifApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate, fmtCurrency } from '@/lib/utils';
import { voiceCheckIn, voiceCheckOut, voiceBreakStart, voiceBreakEnd, unlockAndSpeak } from '@/lib/voice';
import toast from 'react-hot-toast';
import {
  LogIn, LogOut, Calendar, IndianRupee,
  Coffee, Building2, Play, Pause, Loader2, ScanFace, ChevronRight, Volume2, VolumeX,
} from 'lucide-react';

// Lazy-load face components — they import face-api.js (browser-only)
const FaceCheckin      = dynamic(() => import('@/components/FaceCheckin'),      { ssr: false });
const FaceRegistration = dynamic(() => import('@/components/FaceRegistration'), { ssr: false });

// ── Derived status from today's data ─────────────────────────────────────────
type WorkStatus = 'not_checked_in' | 'working' | 'on_break' | 'checked_out';

function getWorkStatus(todayRecord: any, activeBreak: any): WorkStatus {
  if (!todayRecord?.checkIn) return 'not_checked_in';
  if (todayRecord?.checkOut) return 'checked_out';
  if (activeBreak) return 'on_break';
  return 'working';
}

export default function EmployeeDashboard() {
  const { user, employee } = useAuthStore();
  const [summary, setSummary] = useState<any>({});
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [latestPayroll, setLatestPayroll] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [breakInfo, setBreakInfo] = useState<{ data: any[]; totalMinutes: number }>({ data: [], totalMinutes: 0 });

  // Separate loading states — prevent mixed button disable
  const [attLoading, setAttLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);

  // Ref-based guard: prevents double-click race conditions
  const breakInFlight = useRef(false);
  const attInFlight   = useRef(false);

  // Face modals
  const [showFaceCheckin,      setShowFaceCheckin]      = useState(false);
  const [showFaceCheckout,     setShowFaceCheckout]     = useState(false);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [faceRegistered,       setFaceRegistered]       = useState<boolean | null>(null);
  const [leaveBalance,         setLeaveBalance]         = useState<any>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    // Read from localStorage on first render
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hrflow_voice') === 'true';
  });

  const now = new Date();

  // ── Voice unlock ─────────────────────────────────────────────────────────
  // Must be called directly from a user-click event to unlock browser audio
  const enableVoice = () => {
    setVoiceEnabled(true);
    localStorage.setItem('hrflow_voice', 'true');
    toast.success('🔊 Voice notifications enabled!');
    // Unlock browser audio + pick best available voice
    unlockAndSpeak('Voice notifications enabled. Hello! Have a great day!');
  };

  const disableVoice = () => {
    window.speechSynthesis?.cancel();
    setVoiceEnabled(false);
    localStorage.setItem('hrflow_voice', 'false');
    toast('🔇 Voice notifications disabled');
  };

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!employee?._id) return;
    try {
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [attSummary, leaves, payrolls, cfg, balRes] = await Promise.all([
        attendanceApi.getSummary(employee._id, { month: now.getMonth() + 1, year: now.getFullYear() }),
        leaveApi.getAll({ employeeId: employee._id, status: 'pending' }),
        payrollApi.getAll({ employeeId: employee._id, limit: 1 }),
        settingsApi.get(),
        leaveApi.getMonthlyBalance(employee._id, curMonth),
      ]);
      setSummary(attSummary.data.data);
      setPendingLeaves(leaves.data.data);
      setLatestPayroll(payrolls.data.data[0] || null);
      setSettings(cfg.data.data);
      setLeaveBalance(balRes.data.data?.balance || null);
    } catch {}
  }, [employee]);

  const loadToday = useCallback(async () => {
    if (!employee?._id) return;
    try {
      const [attRes, brk] = await Promise.all([
        attendanceApi.getByEmployee(employee._id, { month: now.getMonth() + 1, year: now.getFullYear() }),
        breakApi.getByEmployee(employee._id),
      ]);
      const today = attRes.data.data.find((r: any) =>
        new Date(r.date).toDateString() === now.toDateString()
      );
      setTodayRecord(today || null);
      setBreakInfo({ data: brk.data.data, totalMinutes: brk.data.totalMinutes });
    } catch {}
  }, [employee]);

  // Check face registration status on mount
  useEffect(() => {
    if (!employee?._id) return;
    faceApi.status(employee._id)
      .then((r) => setFaceRegistered(r.data.data.registered))
      .catch(() => setFaceRegistered(false));
  }, [employee?._id]);

  useEffect(() => { loadData(); loadToday(); }, [employee]);

  // ── Voice Message Polling ─────────────────────────────────────────────────
  // Polls every 30s for unread voice messages from admin, plays them via voice
  const playedIds = useRef<Set<string>>(new Set());
  const pollVoiceMessages = useCallback(async () => {
    if (!employee?._id) return;
    try {
      const res = await notifApi.getVoiceMessages();
      const messages: any[] = res.data.data || [];
      for (const msg of messages) {
        if (playedIds.current.has(msg.id)) continue;
        playedIds.current.add(msg.id);
        // Show toast
        toast(`🎙️ ${msg.title}`, { duration: 6000, icon: '📢' });
        // Play voice — works whether voiceEnabled or not (admin message is important!)
        const text = `Attention ${employee?.firstName || ''}! Message from admin: ${msg.message}`;
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const synth = window.speechSynthesis;
          if (synth.paused) synth.resume();
          synth.cancel();
          const u  = new SpeechSynthesisUtterance(text);
          u.lang   = 'en-US'; u.volume = 1; u.rate = 0.85; u.pitch = 1.05;
          const voices = synth.getVoices();
          const best = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
                    || voices.find(v => v.name === 'Samantha')
                    || voices.find(v => v.lang.startsWith('en')) || null;
          if (best) u.voice = best;
          synth.speak(u);
        }
        // Mark as read after 2s
        setTimeout(() => notifApi.markRead(msg.id).catch(() => {}), 2000);
      }
    } catch { /* silent */ }
  }, [employee]);

  useEffect(() => {
    if (!employee?._id) return;
    pollVoiceMessages(); // immediate first poll
    const interval = setInterval(pollVoiceMessages, 30000); // then every 30s
    return () => clearInterval(interval);
  }, [employee, pollVoiceMessages]);

  // ── Derived state ──────────────────────────────────────────────────────────
  // FIX: backend returns snake_case `end_time`, NOT camelCase `endTime`
  const activeBreak = breakInfo.data.find((b: any) => !b.end_time);
  const workStatus = getWorkStatus(todayRecord, activeBreak);

  // ── Actions ────────────────────────────────────────────────────────────────
  const doCheckIn = async () => {
    if (attInFlight.current || attLoading) return; // double-click guard
    attInFlight.current = true;
    setAttLoading(true);
    // 🔊 Voice FIRST — before any await (Chrome blocks speech after async gaps)
    if (voiceEnabled) {
      const now2    = new Date();
      const nowTime = now2.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      // Calculate late minutes from office start time (settings) — no API needed
      let lateMin   = 0;
      if (settings?.officeStartTime) {
        const [oh, om] = settings.officeStartTime.split(':').map(Number);
        const officeStart = new Date(now2);
        officeStart.setHours(oh, om, 0, 0);
        lateMin = Math.max(0, Math.floor((now2.getTime() - officeStart.getTime()) / 60000));
      }
      voiceCheckIn(employee?.firstName || 'there', nowTime, lateMin);
    }
    try {
      await attendanceApi.checkIn({ employeeId: employee?._id });
      toast.success('Checked in! Have a great day 👍');
      await loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setAttLoading(false);
      attInFlight.current = false;
    }
  };

  const doCheckOut = async () => {
    if (attInFlight.current || attLoading) return;
    attInFlight.current = true;
    setAttLoading(true);
    // 🔊 Voice FIRST — before any await
    if (voiceEnabled) {
      const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      voiceCheckOut(employee?.firstName || 'there', nowTime);
    }
    try {
      await attendanceApi.checkOut({ employeeId: employee?._id });
      toast.success('Checked out! See you tomorrow 👋');
      await loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setAttLoading(false);
      attInFlight.current = false;
    }
  };

  const doStartBreak = async () => {
    if (breakInFlight.current || breakLoading) return; // double-click guard
    if (workStatus !== 'working') {
      toast.error('You must be working to start a break');
      return;
    }
    breakInFlight.current = true;
    setBreakLoading(true);
    // 🔊 Voice FIRST — before any await
    if (voiceEnabled) voiceBreakStart(employee?.firstName || 'there');
    try {
      await breakApi.startBreak({ employeeId: employee?._id });
      toast.success('Break started ☕');
      await loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start break');
    } finally {
      setBreakLoading(false);
      breakInFlight.current = false;
    }
  };

  const doEndBreak = async () => {
    if (breakInFlight.current || breakLoading) return; // double-click guard
    if (workStatus !== 'on_break') {
      toast.error('No active break to end');
      return;
    }
    breakInFlight.current = true;
    setBreakLoading(true);
    // 🔊 Voice FIRST — before any await
    if (voiceEnabled) voiceBreakEnd(employee?.firstName || 'there');
    try {
      await breakApi.endBreak({ employeeId: employee?._id });
      toast.success('Break ended — back to work! 💪');
      await loadToday();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to end break');
    } finally {
      setBreakLoading(false);
      breakInFlight.current = false;
    }
  };

  const fmtBreakTime = (mins: number) =>
    mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 18 ? 'Afternoon' : 'Evening'},{' '}
            {employee?.firstName || user?.name}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{fmtDate(now, 'EEEE, dd MMMM yyyy')}</p>
        </div>

        {/* Voice toggle button */}
        <button
          onClick={voiceEnabled ? disableVoice : enableVoice}
          title={voiceEnabled ? 'Disable voice notifications' : 'Enable voice notifications'}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
            voiceEnabled
              ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
              : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {voiceEnabled
            ? <><Volume2 className="w-4 h-4" /> Voice On</>
            : <><VolumeX className="w-4 h-4" /> Voice Off</>
          }
        </button>
      </div>

      {/* Office hours + attendance mode banner */}
      {settings && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-5 text-sm">
          <Building2 className="w-4 h-4 text-blue-500 shrink-0 hidden sm:block" />
          <span className="text-gray-600">
            <span className="font-medium text-blue-700">Office Hours:</span>{' '}
            {settings.officeStartTime} – {settings.officeEndTime}
          </span>
          <span className="text-gray-300 hidden sm:block">|</span>
          <span className="text-gray-600">
            <span className="font-medium text-blue-700">Weekly Off:</span> {settings.weeklyOffDay}
          </span>
          <span className="text-gray-300 hidden sm:block">|</span>
          {/* Face recognition mode indicator */}
          {settings.faceRecognitionEnabled ? (
            <span className="flex items-center gap-1.5 text-blue-700 font-medium">
              <ScanFace className="w-3.5 h-3.5" />
              Face verification required
            </span>
          ) : (
            <span className="text-gray-500">Normal attendance mode</span>
          )}
        </div>
      )}

      {/* ── Attendance + Break Card ── */}
      <div className="card mb-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: times */}
          <div>
            <p className="text-primary-100 text-sm">Today's Attendance</p>
            {todayRecord ? (
              <div className="mt-2 space-y-1">
                <p className="text-lg font-semibold">
                  Check In: {todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString() : '—'}
                </p>
                <p className="text-lg font-semibold">
                  Check Out: {todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString() : 'Not yet'}
                </p>
                {todayRecord.lateMinutes > 0 && (
                  <p className="text-yellow-200 text-sm">Late by {todayRecord.lateMinutes} minutes</p>
                )}
              </div>
            ) : (
              <p className="text-lg font-semibold mt-1">Not checked in yet</p>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap gap-2">

            {/* Not checked in → Check In options */}
            {workStatus === 'not_checked_in' && (
              <>
                {settings?.faceRecognitionEnabled ? (
                  /* ── Face-only mode: only face check-in allowed ── */
                  faceRegistered ? (
                    <button
                      onClick={() => setShowFaceCheckin(true)}
                      className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
                    >
                      <ScanFace className="w-4 h-4" /> Face Check-in
                    </button>
                  ) : (
                    <div className="text-right">
                      <p className="text-xs text-yellow-200 font-medium">⚠️ Face not registered</p>
                      <p className="text-xs text-primary-200">Contact admin to register your face</p>
                    </div>
                  )
                ) : (
                  /* ── Normal mode: regular + optional face ── */
                  <>
                    <button
                      onClick={doCheckIn}
                      disabled={attLoading}
                      className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-60"
                    >
                      {attLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      Check In
                    </button>
                    {faceRegistered && (
                      <button
                        onClick={() => setShowFaceCheckin(true)}
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-lg border border-white/40 transition-colors"
                      >
                        <ScanFace className="w-4 h-4" /> Face Check-in
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* Working → Take Break + Check Out */}
            {workStatus === 'working' && (
              <>
                <button
                  onClick={doStartBreak}
                  disabled={breakLoading}
                  className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  {breakLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Coffee className="w-4 h-4" />}
                  Take Break
                </button>

                {/* Check-out button logic */}
                {settings?.faceRecognitionEnabled ? (
                  /* ── Face-only mode: ONLY face check-out ── */
                  faceRegistered ? (
                    <button
                      onClick={() => setShowFaceCheckout(true)}
                      className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
                    >
                      <ScanFace className="w-4 h-4" /> Face Check-out
                    </button>
                  ) : (
                    <div className="text-right">
                      <p className="text-xs text-yellow-200 font-medium">⚠️ Face not registered</p>
                      <p className="text-xs text-primary-200">Contact admin to register your face</p>
                    </div>
                  )
                ) : (
                  /* ── Normal mode: always show normal Check Out ── */
                  <>
                    <button
                      onClick={doCheckOut}
                      disabled={attLoading}
                      className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-60"
                    >
                      {attLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                      Check Out
                    </button>
                    {/* Face Check-out is optional bonus when face is registered */}
                    {faceRegistered && (
                      <button
                        onClick={() => setShowFaceCheckout(true)}
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-lg border border-white/40 transition-colors"
                      >
                        <ScanFace className="w-4 h-4" /> Face Check-out
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* On break → Resume Work only (Check Out blocked until break ends) */}
            {workStatus === 'on_break' && (
              <>
                <button
                  onClick={doEndBreak}
                  disabled={breakLoading}
                  className="flex items-center gap-2 bg-green-400 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 animate-pulse"
                >
                  {breakLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Play className="w-4 h-4" />}
                  Resume Work
                </button>
                <button
                  disabled
                  title="End your break first"
                  className="flex items-center gap-2 bg-white/50 text-primary-700 font-semibold px-4 py-2 rounded-lg cursor-not-allowed opacity-50"
                >
                  <LogOut className="w-4 h-4" /> Check Out
                </button>
              </>
            )}

            {/* Checked out */}
            {workStatus === 'checked_out' && (
              <span className="text-primary-100 text-sm self-center">Done for today ✓</span>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div className="mt-4 flex items-center gap-3">
          {workStatus === 'working' && (
            <span className="inline-flex items-center gap-1.5 bg-green-500/30 text-green-200 text-xs font-medium px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" /> Working
            </span>
          )}
          {workStatus === 'on_break' && (
            <span className="inline-flex items-center gap-1.5 bg-amber-500/30 text-amber-200 text-xs font-medium px-3 py-1 rounded-full">
              <Pause className="w-3 h-3" /> On Break
            </span>
          )}
          {workStatus === 'checked_out' && (
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-primary-100 text-xs font-medium px-3 py-1 rounded-full">
              ✓ Checked Out
            </span>
          )}
        </div>

        {/* Break summary */}
        {breakInfo.data.length > 0 && (
          <div className="mt-3 pt-3 border-t border-primary-500 flex flex-wrap gap-4 text-sm text-primary-100">
            <span>Breaks today: <strong className="text-white">{breakInfo.data.length}</strong></span>
            <span>Total break time: <strong className="text-white">{fmtBreakTime(breakInfo.totalMinutes)}</strong></span>
            {activeBreak && (
              <span className="text-amber-300 font-medium">● Currently on break</span>
            )}
          </div>
        )}
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Present Days',  value: summary.present || 0,  color: 'text-green-600'  },
          { label: 'Absent Days',   value: summary.absent  || 0,  color: 'text-red-500'    },
          { label: 'Late Arrivals', value: summary.late    || 0,  color: 'text-orange-500' },
          { label: 'Leave Days',    value: summary.onLeave || 0,  color: 'text-blue-600'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* CL / SL Leave Balance — this month */}
      {leaveBalance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {(['CL', 'SL'] as const).map((type) => {
            const b = leaveBalance[type];
            if (!b) return null;
            const pct = b.totalLeaves > 0 ? Math.round((b.approvedLeaves / b.totalLeaves) * 100) : 0;
            const isCL = type === 'CL';
            return (
              <div key={type} className={`card border-2 ${isCL ? 'border-green-200' : 'border-red-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isCL ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {type}
                    </span>
                    <span className="text-sm text-gray-500">{b.label}</span>
                  </div>
                  {b.carryForward > 0 && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                      +{b.carryForward} carried
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{b.totalLeaves}</p>
                    <p className="text-xs text-gray-400">Total</p>
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${isCL ? 'text-green-600' : 'text-red-600'}`}>
                      {b.approvedLeaves ?? 0}
                    </p>
                    <p className="text-xs text-gray-400">Used</p>
                    {(b.pendingLeaves ?? 0) > 0 && (
                      <p className="text-[10px] text-yellow-600 font-medium">+{b.pendingLeaves} pending</p>
                    )}
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${b.remainingLeaves > 0 ? 'text-gray-800' : 'text-red-500'}`}>
                      {b.remainingLeaves}
                    </p>
                    <p className="text-xs text-gray-400">Left</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${isCL ? 'bg-green-500' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-right">{pct}% used this month</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-green-600" /> Latest Payslip
          </h3>
          {latestPayroll ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Period</span>
                <span className="font-medium">{latestPayroll.period}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Gross Salary</span>
                <span>{fmtCurrency(latestPayroll.grossSalary)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deductions</span>
                <span className="text-red-500">-{fmtCurrency(latestPayroll.totalDeductions)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Net Pay</span>
                <span className="text-green-700">{fmtCurrency(latestPayroll.netSalary)}</span>
              </div>
              <div className="pt-1"><Badge status={latestPayroll.status} /></div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No payslip available</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> My Leave Requests
          </h3>
          {pendingLeaves.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No pending leave requests</p>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((l: any) => (
                <div key={l._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium capitalize">{l.leaveType} Leave</p>
                    <p className="text-xs text-gray-500">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</p>
                  </div>
                  <Badge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Face Registration Banner (only if not registered) ──────────────── */}
      {faceRegistered === false && (
        <div className="mt-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <ScanFace className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 text-sm">Enable Face Check-in</p>
              <p className="text-xs text-blue-600 mt-0.5">Register your face once to check in instantly with just a glance</p>
            </div>
          </div>
          <button
            onClick={() => setShowFaceRegistration(true)}
            className="btn-primary shrink-0 text-sm py-2 flex items-center gap-2"
          >
            <ScanFace className="w-4 h-4" />
            Register Face
          </button>
        </div>
      )}

      {/* ── Face registered status ────────────────────────────────────────── */}
      {faceRegistered === true && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <ScanFace className="w-4 h-4" />
            <span className="font-medium">Face ID registered</span>
            <span className="text-green-500">— use Face Check-in / Check-out buttons above</span>
          </div>
          <button
            onClick={() => setShowFaceRegistration(true)}
            className="text-xs text-green-600 hover:text-green-800 underline"
          >
            Update
          </button>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showFaceCheckin && employee && (
        <FaceCheckin
          employeeId={employee._id}
          employeeName={`${employee.firstName} ${employee.lastName || ''}`}
          mode="checkin"
          onClose={() => setShowFaceCheckin(false)}
          onSuccess={() => { loadToday(); setShowFaceCheckin(false); }}
        />
      )}
      {showFaceCheckout && employee && (
        <FaceCheckin
          employeeId={employee._id}
          employeeName={`${employee.firstName} ${employee.lastName || ''}`}
          mode="checkout"
          onClose={() => setShowFaceCheckout(false)}
          onSuccess={() => { loadToday(); setShowFaceCheckout(false); }}
        />
      )}
      {showFaceRegistration && employee && (
        <FaceRegistration
          employeeId={employee._id}
          employeeName={`${employee.firstName} ${employee.lastName || ''}`}
          onClose={() => setShowFaceRegistration(false)}
          onSuccess={() => {
            setFaceRegistered(true);
            setShowFaceRegistration(false);
            toast.success('Face registered! You can now use Face Check-in.');
          }}
        />
      )}
    </div>
  );
}
