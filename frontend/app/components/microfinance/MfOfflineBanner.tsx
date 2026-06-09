'use client';

import { CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';

type MfOfflineBannerProps = {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  cacheAvailable: boolean;
  cachedAt?: string | null;
  lastSyncMessage?: string;
  onSyncNow: () => void;
  onRefreshCache?: () => void;
};

export default function MfOfflineBanner({
  isOnline,
  pendingCount,
  syncing,
  cacheAvailable,
  cachedAt,
  lastSyncMessage,
  onSyncNow,
  onRefreshCache,
}: MfOfflineBannerProps) {
  const formattedCacheTime = cachedAt
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(cachedAt))
    : null;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        isOnline
          ? 'border-emerald-200 bg-emerald-50/90'
          : 'border-amber-300 bg-amber-50/95'
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-bold text-black">
              {isOnline ? 'Online — collections sync automatically' : 'Offline mode — you can still collect payments'}
            </p>
            <p className="mt-1 text-xs text-black/80">
              {cacheAvailable
                ? `Loan data cached${formattedCacheTime ? ` at ${formattedCacheTime}` : ''}. Collections saved offline will upload when internet returns.`
                : 'Open this page once while online to download loan data for offline collection.'}
            </p>
            {!isOnline && !cacheAvailable ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                <CloudOff className="h-3.5 w-3.5" />
                No offline loan data yet. Connect to internet and refresh first.
              </p>
            ) : null}
            {lastSyncMessage ? <p className="mt-2 text-xs font-semibold text-emerald-800">{lastSyncMessage}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 ? (
            <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-900">
              {pendingCount} pending sync
            </span>
          ) : null}
          {isOnline && pendingCount > 0 ? (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync now
            </button>
          ) : null}
          {isOnline && onRefreshCache ? (
            <button
              type="button"
              onClick={onRefreshCache}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              Refresh cache
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
