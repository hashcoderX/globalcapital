'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, HandCoins, Landmark } from 'lucide-react';

export default function AccountingRefundOptionsPage() {
  const router = useRouter();
  const token = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem('token') || '',
    () => ''
  );

  useEffect(() => {
    if (!token) {
      router.push('/');
    }
  }, [router, token]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-teal-100 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Accounting Options</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">Refund Cash or Bank Deposit</h1>
              <p className="mt-1 text-sm text-slate-600">
                Select how to process a refund entry. Cash refunds affect branch cash account, bank refunds affect branch bank account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/accounting')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Accounting
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
            <div className="inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <HandCoins className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Refund to Cash Account</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use this when refund is paid from branch cash balance.
            </p>
            <button
              type="button"
              onClick={() => router.push('/dashboard/accounting/expenses?refund_mode=cash')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Building2 className="h-4 w-4" />
              Open Cash Refund Entry
            </button>
          </article>

          <article className="rounded-3xl border border-cyan-100 bg-white/90 p-5 shadow-sm">
            <div className="inline-flex rounded-xl bg-cyan-100 p-2 text-cyan-700">
              <Landmark className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Refund to Bank Deposit</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use this when refund is paid through branch bank account.
            </p>
            <button
              type="button"
              onClick={() => router.push('/dashboard/accounting/expenses?refund_mode=bank')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              <Landmark className="h-4 w-4" />
              Open Bank Refund Entry
            </button>
          </article>
        </section>
      </div>
    </div>
  );
}
