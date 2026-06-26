'use client';

import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api';

type NotificationType =
  | 'system'
  | 'task'
  | 'approval'
  | 'finance'
  | 'reminder'
  | 'microfinance_loan_request';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  important: boolean;
  actionUrl?: string;
};

type ApiNotificationRow = {
  id?: number | string;
  title?: string;
  message?: string;
  type?: string;
  created_at?: string;
  is_read?: boolean;
  is_important?: boolean;
  action_url?: string | null;
};

const typeStyles: Record<NotificationType, string> = {
  system: 'bg-violet-100 text-violet-700 border-violet-200',
  task: 'bg-blue-100 text-blue-700 border-blue-200',
  approval: 'bg-amber-100 text-amber-700 border-amber-200',
  finance: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  reminder: 'bg-rose-100 text-rose-700 border-rose-200',
  microfinance_loan_request: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const resolveNotificationType = (value: string): NotificationType => {
  const normalized = String(value || 'system') as NotificationType;
  if (normalized in typeStyles) {
    return normalized;
  }

  return 'system';
};

export default function NotificationsPage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'unread' | 'important'>('all');
  const [summary, setSummary] = useState({ total: 0, unread: 0, important: 0 });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setNotice('');
    try {
      const response = await axios.get(`${apiBaseUrl}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          tab,
          q: query,
          limit: 100,
        },
      });

      const rows = Array.isArray(response.data?.notifications) ? response.data.notifications : [];
      setNotifications(
        (rows as ApiNotificationRow[]).map((row) => ({
          id: Number(row.id),
          title: String(row.title || 'Notification'),
          message: String(row.message || ''),
          type: resolveNotificationType(String(row.type || 'system')),
          createdAt: String(row.created_at || new Date().toISOString()),
          read: Boolean(row.is_read),
          important: Boolean(row.is_important),
          actionUrl: typeof row.action_url === 'string' ? row.action_url : undefined,
        }))
      );
      setSummary({
        total: Number(response.data?.summary?.total || 0),
        unread: Number(response.data?.summary?.unread || 0),
        important: Number(response.data?.summary?.important || 0),
      });
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Failed to load notifications.';
      setNotice(message);
      setNotifications([]);
      setSummary({ total: 0, unread: 0, important: 0 });
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, tab, query]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      await axios.patch(
        `${apiBaseUrl}/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      await fetchNotifications();
    } catch {
      setNotice('Failed to mark notification as read.');
    }
  };

  const toggleImportant = async (id: number, nextValue: boolean) => {
    if (!token) return;
    try {
      await axios.patch(
        `${apiBaseUrl}/notifications/${id}/important`,
        { is_important: nextValue },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      await fetchNotifications();
    } catch {
      setNotice('Failed to update notification.');
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await axios.patch(
        `${apiBaseUrl}/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      await fetchNotifications();
    } catch {
      setNotice('Failed to mark all notifications as read.');
    }
  };

  const clearRead = async () => {
    if (!token) return;
    try {
      await axios.delete(`${apiBaseUrl}/notifications/read`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      await fetchNotifications();
    } catch {
      setNotice('Failed to clear read notifications.');
    }
  };

  const unreadCount = summary.unread;
  const importantCount = summary.important;
  const totalCount = summary.total;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-amber-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl backdrop-blur sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Notification Center
              </p>
              <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Notifications</h1>
              <p className="mt-1 text-sm text-slate-600">Stay updated with system alerts, approvals, and reminders.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {notice && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-600">Unread</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{unreadCount}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-rose-600">Important</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{importantCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {(['all', 'unread', 'important'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    tab === key
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notifications..."
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <button
                onClick={() => void markAllAsRead()}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Mark All Read
              </button>
              <button
                onClick={() => void clearRead()}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Clear Read
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 text-center text-slate-500 shadow-sm">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 text-center text-slate-500 shadow-sm">
              No notifications found for this filter.
            </div>
          ) : (
            notifications.map((row) => (
              <div
                key={row.id}
                className={`rounded-2xl border p-4 shadow-sm transition ${
                  row.read ? 'border-slate-200 bg-white/90' : 'border-amber-200 bg-amber-50/60'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{row.title}</h3>
                      {!row.read && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          Unread
                        </span>
                      )}
                      {row.important && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
                          Important
                        </span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${typeStyles[row.type] || typeStyles.system}`}>
                        {row.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{row.message}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(row.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {row.actionUrl && (
                      <button
                        onClick={() => router.push(row.actionUrl as string)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        Open
                      </button>
                    )}
                    {!row.read && (
                      <button
                        onClick={() => void markAsRead(row.id)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => void toggleImportant(row.id, !row.important)}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      {row.important ? 'Unstar' : 'Star'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
