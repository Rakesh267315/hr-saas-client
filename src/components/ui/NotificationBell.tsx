'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from 'lucide-react';
import { notifApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// ── Icon / colour per notification type ──────────────────────────────────────
const typeStyle: Record<string, { bg: string; dot: string }> = {
  leave_request:  { bg: 'bg-blue-50',   dot: 'bg-blue-500'   },
  leave_approved: { bg: 'bg-green-50',  dot: 'bg-green-500'  },
  leave_rejected: { bg: 'bg-red-50',    dot: 'bg-red-500'    },
  payroll_paid:   { bg: 'bg-emerald-50',dot: 'bg-emerald-500' },
  review:         { bg: 'bg-purple-50', dot: 'bg-purple-500' },
  default:        { bg: 'bg-gray-50',   dot: 'bg-gray-400'   },
};

function fmtRelative(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open,         setOpen]         = useState(false);
  const [notifs,       setNotifs]       = useState<Notification[]>([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [loading,      setLoading]      = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notifApi.getAll({ limit: 30 });
      setNotifs(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch {}
    finally { setLoading(false); }
  }, []);

  // Poll every 60 seconds for new notifications
  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const markRead = async (id: string) => {
    await notifApi.markRead(id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notifApi.markAllRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    await notifApi.clearAll();
    setNotifs([]);
    setUnreadCount(0);
  };

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) await markRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all read"
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifs.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifs.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-0.5">You're all caught up!</p>
              </div>
            ) : (
              notifs.map((n) => {
                const style = typeStyle[n.type] || typeStyle.default;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? style.bg : ''}`}
                  >
                    {/* Dot */}
                    <div className="mt-1.5 shrink-0">
                      <div className={`w-2 h-2 rounded-full ${!n.is_read ? style.dot : 'bg-gray-200'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </p>
                        {n.link && <ExternalLink className="w-3 h-3 text-gray-300 shrink-0 mt-0.5" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{fmtRelative(n.created_at)}</p>
                    </div>

                    {/* Mark read */}
                    {!n.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        title="Mark as read"
                        className="mt-1 p-1 rounded hover:bg-white text-gray-300 hover:text-green-500 shrink-0 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
