'use client';

import axios from 'axios';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Badge from '../../_components/Badge';
import ClientMountGate from '@/app/components/ClientMountGate';
import { getApiBaseUrl } from '@/lib/api';
import {
  ArrowLeft,
  Banknote,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  HandCoins,
  LayoutGrid,
  List,
  ReceiptText,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200/70';

type ViewMode = 'table' | 'cards';

type CollectionRow = {
  id: number;
  mortgage_id: number;
  paid_date: string;
  amount: number | string;
  principal_amount?: number | string;
  interest_amount?: number | string;
  profit_amount?: number | string;
  payment_method?: string | null;
  remarks?: string | null;
  mortgage?: {
    id: number;
    mortgage_type?: string | null;
    status?: string | null;
    customer?: {
      customer_code?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      nic_passport?: string | null;
      phone?: string | null;
    } | null;
  } | null;
};

type CollectionSummary = {
  total_collections: number;
  total_amount: number;
  total_principal: number;
  total_interest: number;
  total_profit: number;
  unique_mortgages: number;
};

type PaginatedResponse = {
  data: CollectionRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: unknown): string {
  const amount = toNumber(value);
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function formatDate(value: unknown): string {
  const date = parseDateValue(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, headers: string[], rows: Array<Array<string>>) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function statusVariant(status: string | null | undefined): 'success' | 'warning' | 'info' | 'default' {
  const s = String(status || '').toLowerCase();
  if (s === 'settled' || s === 'active' || s === 'released') return 'success';
  if (s === 'arrears' || s === 'rejected') return 'warning';
  if (s === 'approved' || s === 'submitted') return 'info';
  return 'default';
}

function capitalizeMethod(method: unknown): string {
  const value = String(method || '—');
  if (value === '—') return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function MortgageCollectionReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = Number(searchParams.get('branch_id') || 0) || undefined;

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');

  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [summary, setSummary] = useState<CollectionSummary>({
    total_collections: 0,
    total_amount: 0,
    total_principal: 0,
    total_interest: 0,
    total_profit: 0,
    unique_mortgages: 0,
  });
  const [pagination, setPagination] = useState<PaginatedResponse>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const fetchReport = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await axios.get(`${getApiBaseUrl()}/mortgages/reports/collections`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          branch_id: branchId,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          status: status === 'all' ? undefined : status,
          payment_method: paymentMethod === 'all' ? undefined : paymentMethod,
          search: search.trim() || undefined,
          per_page: perPage,
          page,
        },
      });

      const payload = response.data || {};
      const paginated = payload.data || {};

      setSummary({
        total_collections: Number(payload.summary?.total_collections || 0),
        total_amount: toNumber(payload.summary?.total_amount),
        total_principal: toNumber(payload.summary?.total_principal),
        total_interest: toNumber(payload.summary?.total_interest),
        total_profit: toNumber(payload.summary?.total_profit),
        unique_mortgages: Number(payload.summary?.unique_mortgages || 0),
      });

      const nextRows = Array.isArray(paginated.data) ? paginated.data : [];
      setRows(nextRows);

      setPagination({
        data: nextRows,
        current_page: Number(paginated.current_page || 1),
        last_page: Number(paginated.last_page || 1),
        per_page: Number(paginated.per_page || perPage),
        total: Number(paginated.total || nextRows.length),
      });
    } catch {
      setSummary({
        total_collections: 0,
        total_amount: 0,
        total_principal: 0,
        total_interest: 0,
        total_profit: 0,
        unique_mortgages: 0,
      });
      setRows([]);
      setPagination((prev) => ({ ...prev, data: [], total: 0, last_page: 1, current_page: 1 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, branchId]);

  const applyFilters = () => {
    setPage(1);
    fetchReport();
  };

  const resetFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setStatus('all');
    setPaymentMethod('all');
    setPage(1);
    setTimeout(() => fetchReport(), 0);
  };

  const exportCurrentPageCsv = () => {
    const headers = [
      'Payment ID',
      'Paid Date',
      'Mortgage ID',
      'Customer',
      'Customer Code',
      'Mortgage Type',
      'Mortgage Status',
      'Method',
      'Amount',
      'Principal',
      'Interest',
      'Profit',
      'Remarks',
    ];

    const data = rows.map((row) => {
      const customerName = `${row.mortgage?.customer?.first_name || ''} ${row.mortgage?.customer?.last_name || ''}`.trim();
      return [
        String(row.id),
        formatDate(row.paid_date),
        String(row.mortgage_id || '—'),
        customerName || '—',
        String(row.mortgage?.customer?.customer_code || '—'),
        String(row.mortgage?.mortgage_type || '—'),
        String(row.mortgage?.status || '—'),
        String(row.payment_method || '—'),
        formatAmount(row.amount),
        formatAmount(row.principal_amount),
        formatAmount(row.interest_amount),
        formatAmount(row.profit_amount),
        String(row.remarks || ''),
      ];
    });

    downloadCsv('mortgage-collection-report.csv', headers, data);
  };

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  const pageFallback = (
    <div className="flex min-h-screen items-center justify-center bg-[#071a22]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
        <p className="text-sm font-medium text-cyan-100/80">Loading collection report...</p>
      </div>
    </div>
  );

  if (!token) {
    return <ClientMountGate fallback={pageFallback}>{pageFallback}</ClientMountGate>;
  }

  return (
    <ClientMountGate fallback={pageFallback}>
      <div className="relative min-h-screen overflow-hidden bg-[#f3f8fb]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-0 top-16 h-[28rem] w-[28rem] rounded-full bg-blue-500/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(14,116,144,0.1) 1px, transparent 0)',
              backgroundSize: '26px 26px',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0a1a24] via-[#0f3a52] to-[#0c5a7a] text-white shadow-[0_30px_80px_-24px_rgba(14,116,144,0.8)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.25),transparent_42%)]" />
            <div className="relative p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    Collection Analytics
                  </span>
                  <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Mortgage Collection Report</h1>
                  <p className="mt-2 text-sm leading-relaxed text-cyan-50/90 md:text-base">
                    Complete collection visibility with totals, principal–interest split, and payment-level audit trail.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-cyan-100/90">
                    <span className="rounded-lg bg-white/10 px-2.5 py-1">Reports</span>
                    <span className="text-cyan-200/50">/</span>
                    <span className="rounded-lg bg-cyan-400/20 px-2.5 py-1 font-semibold text-white">Collections</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={exportCurrentPageCsv}
                    disabled={!hasRows}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/mortgages/reports')}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Report Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => token && fetchReport()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:brightness-110 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {[
              { icon: ReceiptText, label: 'Collections', value: summary.total_collections, tone: 'text-slate-700', bg: 'from-slate-500/10 to-gray-500/5' },
              { icon: Banknote, label: 'Unique Mortgages', value: summary.unique_mortgages, tone: 'text-cyan-700', bg: 'from-cyan-500/10 to-blue-500/5' },
              { icon: Wallet, label: 'Total Amount', value: formatAmount(summary.total_amount), tone: 'text-emerald-700', bg: 'from-emerald-500/10 to-green-500/5' },
              { icon: TrendingUp, label: 'Principal', value: formatAmount(summary.total_principal), tone: 'text-indigo-700', bg: 'from-indigo-500/10 to-violet-500/5' },
              { icon: HandCoins, label: 'Interest', value: formatAmount(summary.total_interest), tone: 'text-amber-700', bg: 'from-amber-500/10 to-orange-500/5' },
              { icon: Sparkles, label: 'Profit', value: formatAmount(summary.total_profit), tone: 'text-violet-700', bg: 'from-violet-500/10 to-purple-500/5' },
            ].map((item) => (
              <div
                key={item.label}
                className={`overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br ${item.bg} p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5`}
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

          {/* Insight cards */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: ReceiptText, title: 'Payment Trail', desc: 'Every recorded collection with audit-ready transaction detail.', color: 'text-cyan-700' },
              { icon: HandCoins, title: 'Principal vs Interest', desc: 'Measure capital recovery and interest realization in one view.', color: 'text-emerald-700' },
              { icon: Wallet, title: 'Collection Health', desc: 'Track velocity across statuses and payment channels.', color: 'text-indigo-700' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/90 bg-white/95 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <p className="font-bold text-slate-900">{item.title}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </section>

          {/* Filters */}
          <section className="overflow-hidden rounded-3xl border border-white/90 bg-white/95 shadow-[0_22px_55px_-34px_rgba(14,116,144,0.45)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50/80"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-cyan-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Report Filters</p>
                  <p className="mt-1 text-sm text-slate-600">Date range, status, method, and keyword search.</p>
                </div>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{filtersOpen ? 'Hide' : 'Show'}</span>
            </button>

            {filtersOpen && (
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="relative lg:col-span-4">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search mortgage, customer, note..."
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                      <option value="all">All Statuses</option>
                      <option value="submitted">Submitted</option>
                      <option value="approved">Approved</option>
                      <option value="released">Released</option>
                      <option value="active">Active</option>
                      <option value="arrears">Arrears</option>
                      <option value="settled">Settled</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
                      <option value="all">All Methods</option>
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="transfer">Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-cyan-700 hover:to-blue-700"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Transactions */}
          <section className="overflow-hidden rounded-3xl border border-white/90 bg-white/95 shadow-[0_24px_60px_-34px_rgba(14,116,144,0.5)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Collection Transactions</h2>
                <p className="text-sm text-slate-500">
                  {pagination.total} record{pagination.total === 1 ? '' : 's'} • Page {pagination.current_page} of {pagination.last_page}
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === 'cards' ? 'bg-white text-cyan-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === 'table' ? 'bg-white text-cyan-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Table
                </button>
              </div>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-600" />
                  <p className="text-sm text-slate-500">Loading transactions...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                    <ReceiptText className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">No collections found</h3>
                  <p className="mt-1 max-w-md text-sm text-slate-500">Adjust filters or widen the date range to see payment records.</p>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {rows.map((row) => {
                    const customerName = `${row.mortgage?.customer?.first_name || ''} ${row.mortgage?.customer?.last_name || ''}`.trim();
                    return (
                      <article
                        key={row.id}
                        className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-cyan-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg"
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment #{row.id}</p>
                            <p className="mt-1 text-2xl font-black text-cyan-800">{formatAmount(row.amount)}</p>
                            <p className="mt-1 text-sm text-black">{formatDate(row.paid_date)}</p>
                          </div>
                          <Badge label={capitalizeMethod(row.payment_method)} variant="info" />
                        </div>
                        <div className="mt-3 rounded-xl border border-slate-100 bg-white/90 p-3">
                          <p className="font-semibold text-black">{customerName || '—'}</p>
                          <p className="text-xs text-slate-600">
                            Mortgage #{row.mortgage_id} • {row.mortgage?.mortgage_type || '—'} • {row.mortgage?.customer?.customer_code || '—'}
                          </p>
                          <div className="mt-2">
                            <Badge label={String(row.mortgage?.status || '—')} variant={statusVariant(row.mortgage?.status)} />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2">
                            <p className="text-[10px] font-bold uppercase text-indigo-800">Principal</p>
                            <p className="font-bold text-indigo-700">{formatAmount(row.principal_amount)}</p>
                          </div>
                          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2">
                            <p className="text-[10px] font-bold uppercase text-amber-800">Interest</p>
                            <p className="font-bold text-amber-700">{formatAmount(row.interest_amount)}</p>
                          </div>
                          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-2">
                            <p className="text-[10px] font-bold uppercase text-violet-800">Profit</p>
                            <p className="font-bold text-violet-700">{formatAmount(row.profit_amount)}</p>
                          </div>
                        </div>
                        {row.remarks && (
                          <p className="mt-3 truncate text-xs text-slate-600" title={row.remarks}>
                            Note: {row.remarks}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-cyan-100">
                  <table className="min-w-[1100px] w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-black">
                        <th className="px-3 py-3 text-black">Payment ID</th>
                        <th className="px-3 py-3 text-black">Paid Date</th>
                        <th className="px-3 py-3 text-black">Mortgage</th>
                        <th className="px-3 py-3 text-black">Customer</th>
                        <th className="px-3 py-3 text-black">Status</th>
                        <th className="px-3 py-3 text-black">Method</th>
                        <th className="px-3 py-3 text-black">Amount</th>
                        <th className="px-3 py-3 text-black">Principal</th>
                        <th className="px-3 py-3 text-black">Interest</th>
                        <th className="px-3 py-3 text-black">Profit</th>
                        <th className="px-3 py-3 text-black">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row, index) => {
                        const customerName = `${row.mortgage?.customer?.first_name || ''} ${row.mortgage?.customer?.last_name || ''}`.trim();
                        return (
                          <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-3 py-2.5 font-bold text-slate-900">#{row.id}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-black">{formatDate(row.paid_date)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-black">
                              #{row.mortgage_id} <span className="capitalize">({row.mortgage?.mortgage_type || '—'})</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-black">{customerName || '—'}</p>
                              <p className="text-xs text-slate-600">{row.mortgage?.customer?.customer_code || '—'}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge label={String(row.mortgage?.status || '—')} variant={statusVariant(row.mortgage?.status)} />
                            </td>
                            <td className="px-3 py-2.5 text-black capitalize">{row.payment_method || '—'}</td>
                            <td className="px-3 py-2.5 font-bold text-cyan-800">{formatAmount(row.amount)}</td>
                            <td className="px-3 py-2.5 text-black">{formatAmount(row.principal_amount)}</td>
                            <td className="px-3 py-2.5 text-black">{formatAmount(row.interest_amount)}</td>
                            <td className="px-3 py-2.5 text-black">{formatAmount(row.profit_amount)}</td>
                            <td className="max-w-[200px] truncate px-3 py-2.5 text-black" title={row.remarks || ''}>
                              {row.remarks || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {rows.length > 0 && pagination.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-600">
                    Page {pagination.current_page} of {pagination.last_page}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pagination.current_page <= 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={pagination.current_page >= pagination.last_page}
                      onClick={() => setPage((prev) => Math.min(pagination.last_page, prev + 1))}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </ClientMountGate>
  );
}

export default function MortgageCollectionReportPage() {
  const pageFallback = (
    <div className="flex min-h-screen items-center justify-center bg-[#071a22]">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
    </div>
  );

  return (
    <Suspense fallback={pageFallback}>
      <MortgageCollectionReportContent />
    </Suspense>
  );
}
