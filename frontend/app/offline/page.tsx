'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { getPendingMfCollectionCount } from '@/lib/offline/mfOfflineSync';

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem('token')));

    const updateStatus = async () => {
      setIsOnline(navigator.onLine);
      try {
        setPendingCount(await getPendingMfCollectionCount());
      } catch {
        setPendingCount(0);
      }
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-emerald-300 blur-3xl" />
        <div className="absolute top-24 right-8 h-80 w-80 rounded-full bg-cyan-300 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_24px_70px_-30px_rgba(14,116,144,0.45)] p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-lg">
          {isOnline ? <Wifi className="h-8 w-8" /> : <WifiOff className="h-8 w-8" />}
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 text-center">Offline Collection Mode</p>
        <h1 className="mt-2 text-2xl font-extrabold text-black text-center">
          {isOnline ? 'You are back online' : 'No internet connection'}
        </h1>
        <p className="mt-3 text-sm text-black/80 text-center leading-relaxed">
          {isOnline
            ? 'Pending offline collections will sync automatically. You can continue with live microfinance collections.'
            : 'You can still collect loan installments offline if loan data was downloaded earlier on this device.'}
        </p>

        {pendingCount > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
            <p className="text-sm font-bold text-amber-900">{pendingCount} collection{pendingCount === 1 ? '' : 's'} waiting to sync</p>
            <p className="mt-1 text-xs text-black/75">They will upload automatically when internet is available.</p>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {hasToken ? (
            <button
              type="button"
              onClick={() => router.push('/dashboard/microfinance/collections')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:opacity-95"
            >
              <Smartphone className="h-4 w-4" />
              Open Microfinance Collections
            </button>
          ) : (
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:opacity-95"
            >
              Sign in to collect offline
            </Link>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-50"
          >
            <RefreshCw className="h-4 w-4" />
            Check connection
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
          <div className="flex items-start gap-3">
            <CloudOff className="h-5 w-5 text-cyan-700 shrink-0 mt-0.5" />
            <div className="text-xs text-black/80 leading-relaxed">
              <p className="font-bold text-black">How offline collection works</p>
              <ol className="mt-2 list-decimal pl-4 space-y-1">
                <li>Open Collections once while online to cache loan data.</li>
                <li>Go to the field without internet and collect payments as usual.</li>
                <li>When internet returns, collections sync to the server automatically.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
