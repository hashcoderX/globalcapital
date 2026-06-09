'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Badge from '../../_components/Badge';
import ClientMountGate from '@/app/components/ClientMountGate';
import { getApiBaseUrl } from '@/lib/api';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  ChevronRight,
  FileText,
  History,
  LayoutGrid,
  List,
  PercentCircle,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingDown,
  Wallet,
} from 'lucide-react';

type ViewMode = 'table' | 'cards';

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAmount(v: unknown): string {
  const n = toNumber(v);
  if (!Number.isFinite(n) && v == null) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(v: unknown): string {
  const date = parseDateValue(v);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function capitalizeMethod(method: unknown): string {
  const value = String(method || '—');
  if (value === '—') return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function MortgagePayments() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [mortgage, setMortgage] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const id = params?.id as string;

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }
    setToken(t);
  }, [router]);

  const loadData = async (authToken: string) => {
    setLoading(true);
    try {
      await Promise.all([fetchMortgage(authToken), fetchPayments(authToken)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !id) return;
    loadData(token);
  }, [token, id]);

  const fetchPayments = async (authToken: string) => {
    try {
      const res = await axios.get(`${getApiBaseUrl()}/mortgages/${id}/payments`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });
      const data = res.data.data || res.data;
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setPayments([]);
    }
  };

  const fetchMortgage = async (authToken: string) => {
    try {
      const res = await axios.get(`${getApiBaseUrl()}/mortgages/${id}`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });
      setMortgage(res.data?.data ?? res.data);
    } catch (e) {
      console.error(e);
      setMortgage(null);
    }
  };

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
  }, [payments]);

  const monthlyRate = useMemo(() => {
    const annual = toNumber(mortgage?.interest_rate) / 100;
    return annual / 12;
  }, [mortgage]);

  const principal = useMemo(() => {
    if (!mortgage) return 0;
    const raw = mortgage.approved_amount ?? mortgage.requested_amount;
    return toNumber(raw);
  }, [mortgage]);

  const parseDate = (d: string | Date | undefined): Date | null => parseDateValue(d);

  const diffMonths = (from: Date, to: Date): number => {
    const y = to.getFullYear() - from.getFullYear();
    const m = to.getMonth() - from.getMonth();
    const total = y * 12 + m;
    return total < 0 ? 0 : total;
  };

  const enriched = useMemo(() => {
    if (!mortgage) return { rows: payments, principalAfter: principal, arrears: 0 };
    const start = parseDate(mortgage.created_at) || new Date();
    let runningPrincipal = principal;
    let arrears = 0;
    let prevDate = start;
    const rows = payments.map((p) => {
      const paidDate = parseDate(p.paid_date) || prevDate;
      const missed = diffMonths(prevDate, paidDate);
      for (let i = 0; i < missed; i++) {
        const monthInterest =
          mortgage.interest_type === 'reducing' ? runningPrincipal * monthlyRate : principal * monthlyRate;
        arrears += monthInterest;
      }

      const currentInterest =
        mortgage.interest_type === 'reducing' ? runningPrincipal * monthlyRate : principal * monthlyRate;

      const amount = toNumber(p.amount);
      const payToArrears = Math.min(amount, arrears);
      arrears -= payToArrears;
      let remaining = amount - payToArrears;

      const payToCurrentInterest = Math.min(remaining, currentInterest);
      remaining -= payToCurrentInterest;

      const totalDueThisPeriod = arrears + currentInterest;
      const deficitThisPeriod = Math.max(0, totalDueThisPeriod - (payToArrears + payToCurrentInterest));
      arrears = deficitThisPeriod;

      const principalApplied = Math.max(0, remaining);
      runningPrincipal = Math.max(0, runningPrincipal - principalApplied);

      const prevPaidDate = prevDate;
      prevDate = paidDate;
      return {
        ...p,
        last_paid_date: prevPaidDate
          ? `${prevPaidDate.getFullYear()}-${String(prevPaidDate.getMonth() + 1).padStart(2, '0')}-${String(prevPaidDate.getDate()).padStart(2, '0')}`
          : '',
        interest_due: currentInterest,
        interest_paid: payToArrears + payToCurrentInterest,
        principal_applied: principalApplied,
        arrears_after: arrears,
        principal_balance_after: runningPrincipal,
      };
    });

    return { rows, principalAfter: runningPrincipal, arrears };
  }, [payments, mortgage, principal, monthlyRate]);

  const totalInterestPaid = useMemo(
    () => enriched.rows.reduce((sum, p) => sum + toNumber(p.interest_paid), 0),
    [enriched.rows]
  );

  const totalPrincipalApplied = useMemo(
    () => enriched.rows.reduce((sum, p) => sum + toNumber(p.principal_applied), 0),
    [enriched.rows]
  );

  const customerName = useMemo(() => {
    const c = mortgage?.customer;
    if (!c) return '—';
    return `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—';
  }, [mortgage]);

  const pageFallback = (
    <div className="flex min-h-screen items-center justify-center bg-[#0c1020]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
        <p className="text-sm font-medium text-indigo-100/80">Loading payment history...</p>
      </div>
    </div>
  );

  if (!token) {
    return <ClientMountGate fallback={pageFallback}>{pageFallback}</ClientMountGate>;
  }

  return (
    <ClientMountGate fallback={pageFallback}>
      <div className="relative min-h-screen overflow-hidden bg-[#f5f6fc]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute right-0 top-16 h-[28rem] w-[28rem] rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.1) 1px, transparent 0)',
              backgroundSize: '26px 26px',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0e1024] via-[#1a1f4b] to-[#312e81] text-white shadow-[0_30px_80px_-24px_rgba(49,46,129,0.75)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.28),transparent_42%)]" />
            <div className="relative p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-100">
                    <History className="h-3.5 w-3.5" />
                    Payment Ledger
                  </span>
                  <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Mortgage #{id} Payments</h1>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-50/90 md:text-base">
                    {customerName !== '—' ? (
                      <>
                        Customer: <span className="font-semibold text-white">{customerName}</span> — review collections,
                        interest allocation, and principal balance progression.
                      </>
                    ) : (
                      'Review collections, interest allocation, and principal balance progression.'
                    )}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-indigo-100/90">
                    <span className="rounded-lg bg-white/10 px-2.5 py-1">Mortgages</span>
                    <span className="text-indigo-200/50">/</span>
                    <span className="rounded-lg bg-white/10 px-2.5 py-1">#{id}</span>
                    <span className="text-indigo-200/50">/</span>
                    <span className="rounded-lg bg-indigo-400/20 px-2.5 py-1 font-semibold text-white">Payments</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/mortgages/${id}`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/mortgages/collections')}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-400 to-violet-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
                  >
                    <Banknote className="h-4 w-4" />
                    Collect
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </div>
              </div>

              {mortgage && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/mortgages/${id}/schedule`)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Schedule <ChevronRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/mortgages/${id}/documents`)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    <FileText className="h-3 w-3" />
                    Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/mortgages/portfolio')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Portfolio
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Loan snapshot */}
          {mortgage && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: Wallet, label: 'Approved', value: formatAmount(mortgage.approved_amount ?? mortgage.requested_amount), tone: 'text-indigo-700', bg: 'from-indigo-500/10 to-violet-500/5' },
                { icon: PercentCircle, label: 'Interest', value: `${mortgage.interest_rate}% (${mortgage.interest_type})`, tone: 'text-violet-700', bg: 'from-violet-500/10 to-purple-500/5' },
                { icon: CalendarDays, label: 'Tenure', value: `${mortgage.tenure_months} months`, tone: 'text-slate-700', bg: 'from-slate-500/10 to-gray-500/5' },
                { icon: Sparkles, label: 'Status', value: String(mortgage.status || '—'), tone: 'text-cyan-700', bg: 'from-cyan-500/10 to-blue-500/5' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border border-white/80 bg-gradient-to-br ${item.bg} p-4 shadow-sm backdrop-blur`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                      <p className={`mt-2 text-lg font-black capitalize ${item.tone}`}>{item.value}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                      <item.icon className="h-5 w-5 text-slate-600" />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Payment stats */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {[
              { icon: Receipt, label: 'Payments', value: payments.length, tone: 'text-indigo-700', bg: 'from-indigo-500/10 to-violet-500/5' },
              { icon: Banknote, label: 'Total Collected', value: formatAmount(totalPaid), tone: 'text-emerald-700', bg: 'from-emerald-500/10 to-green-500/5' },
              { icon: PercentCircle, label: 'Interest Paid', value: formatAmount(totalInterestPaid), tone: 'text-violet-700', bg: 'from-violet-500/10 to-purple-500/5' },
              { icon: TrendingDown, label: 'Principal Applied', value: formatAmount(totalPrincipalApplied), tone: 'text-blue-700', bg: 'from-blue-500/10 to-cyan-500/5' },
              { icon: Wallet, label: 'Outstanding', value: mortgage ? formatAmount(enriched.principalAfter) : '—', tone: 'text-slate-700', bg: 'from-slate-500/10 to-gray-500/5' },
              { icon: History, label: 'Interest Arrears', value: formatAmount(enriched.arrears), tone: 'text-rose-700', bg: 'from-rose-500/10 to-red-500/5' },
            ].map((item) => (
              <div
                key={item.label}
                className={`group overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br ${item.bg} p-4 shadow-[0_16px_40px_-28px_rgba(79,70,229,0.45)] transition hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                    <p className={`mt-2 text-xl font-black ${item.tone}`}>{item.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                    <item.icon className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Payments list */}
          <section className="overflow-hidden rounded-3xl border border-white/90 bg-white/95 shadow-[0_24px_60px_-34px_rgba(79,70,229,0.45)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Payment History</h2>
                <p className="text-sm text-slate-500">{enriched.rows.length} transaction{enriched.rows.length === 1 ? '' : 's'} recorded</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === 'cards' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === 'table' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Table
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => token && loadData(token)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <p className="text-sm font-medium text-slate-500">Loading payments...</p>
              </div>
            ) : enriched.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <Receipt className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">No payments recorded yet</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Collections posted for this mortgage will appear here with interest and principal breakdown.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/mortgages/collections')}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
                >
                  <Banknote className="h-4 w-4" />
                  Go to Collections
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
                {enriched.rows.map((p, index) => (
                  <article
                    key={p.id ?? index}
                    className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-indigo-50/30 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment #{p.id ?? index + 1}</p>
                        <p className="mt-1 text-xl font-black text-slate-900">{formatAmount(p.amount)}</p>
                        <p className="mt-1 text-sm text-slate-600">{formatDate(p.paid_date)}</p>
                      </div>
                      <Badge label={capitalizeMethod(p.payment_method)} variant="info" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800">Interest Due</p>
                        <p className="mt-1 font-bold text-violet-700">{formatAmount(p.interest_due)}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Interest Paid</p>
                        <p className="mt-1 font-bold text-emerald-700">{formatAmount(p.interest_paid)}</p>
                      </div>
                      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-800">Principal Applied</p>
                        <p className="mt-1 font-bold text-blue-700">{formatAmount(p.principal_applied)}</p>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-rose-800">Arrears After</p>
                        <p className="mt-1 font-bold text-rose-700">{formatAmount(p.arrears_after)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                      <span>
                        Last paid: <span className="font-semibold text-slate-900">{formatDate(p.last_paid_date)}</span>
                      </span>
                      <span>
                        Balance: <span className="font-semibold text-slate-900">{formatAmount(p.principal_balance_after)}</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#0e1024] via-[#1a1f4b] to-[#312e81] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                      <th className="px-4 py-3">Paid Date</th>
                      <th className="px-4 py-3">Last Paid</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Interest Due</th>
                      <th className="px-4 py-3">Interest Paid</th>
                      <th className="px-4 py-3">Principal Applied</th>
                      <th className="px-4 py-3">Arrears After</th>
                      <th className="px-4 py-3">Principal Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enriched.rows.map((p, index) => (
                      <tr
                        key={p.id ?? index}
                        className={`transition hover:bg-indigo-50/40 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatDate(p.paid_date)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(p.last_paid_date)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-700">{formatAmount(p.amount)}</td>
                        <td className="px-4 py-3">
                          <Badge label={capitalizeMethod(p.payment_method)} variant="info" />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-violet-700">{formatAmount(p.interest_due)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{formatAmount(p.interest_paid)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-700">{formatAmount(p.principal_applied)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-rose-700">{formatAmount(p.arrears_after)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">{formatAmount(p.principal_balance_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </ClientMountGate>
  );
}
