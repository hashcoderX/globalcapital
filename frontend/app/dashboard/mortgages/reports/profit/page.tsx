'use client';

import axios from 'axios';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Badge from '../../_components/Badge';
import ClientMountGate from '@/app/components/ClientMountGate';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  HandCoins,
  LayoutGrid,
  List,
  PieChart,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200/70';

type ViewMode = 'table' | 'cards';

type ProfitRow = {
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

type ProfitSummary = {
  total_collections: number;
  total_amount: number;
  total_principal: number;
  total_interest: number;
  total_profit: number;
  unique_mortgages: number;
  average_profit_per_collection: number;
  profit_share_of_collections: number;
};

type BreakdownByMethod = {
  payment_method: string;
  collections: number;
  total_amount: number;
  total_profit: number;
};

type BreakdownByMonth = {
  period: string;
  collections: number;
  total_profit: number;
  total_amount: number;
};

type BreakdownByType = {
  mortgage_type: string;
  collections: number;
  total_profit: number;
};

type PaginatedResponse = {
  data: ProfitRow[];
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

function formatPeriod(period: string): string {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return period;
  const [, year, month] = match;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date);
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

function MortgageProfitReportContent() {
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
  const [mortgageType, setMortgageType] = useState('all');
  const [minProfit, setMinProfit] = useState('');

  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const [rows, setRows] = useState<ProfitRow[]>([]);
  const [summary, setSummary] = useState<ProfitSummary>({
    total_collections: 0,
    total_amount: 0,
    total_principal: 0,
    total_interest: 0,
    total_profit: 0,
    unique_mortgages: 0,
    average_profit_per_collection: 0,
    profit_share_of_collections: 0,
  });
  const [byMethod, setByMethod] = useState<BreakdownByMethod[]>([]);
  const [byMonth, setByMonth] = useState<BreakdownByMonth[]>([]);
  const [byType, setByType] = useState<BreakdownByType[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [fetchError, setFetchError] = useState('');
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState('');
  const widgetPrefix = 'mortgages_profit_report_widget_';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
    void fetchWidgetPreferences(storedToken);
  }, [router]);

  async function fetchWidgetPreferences(authToken: string) {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/dashboard/widgets`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const rows = Array.isArray(response.data?.widgets) ? response.data.widgets : [];
      const nextHidden = new Set<string>();
      for (const row of rows) {
        const key = String(row?.widget_key || '').trim();
        if (!key.startsWith(widgetPrefix)) continue;
        if (row?.is_visible === false) nextHidden.add(key);
      }
      setHiddenWidgetKeys(nextHidden);
    } catch {
      setHiddenWidgetKeys(new Set());
    }
  }

  const saveWidgetPreference = useCallback(async (widgetKey: string, isVisible: boolean) => {
    if (!token) return false;
    try {
      await axios.patch(
        `${getApiBaseUrl()}/dashboard/widgets`,
        { widget_key: widgetKey, is_visible: isVisible },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch {
      return false;
    }
  }, [token]);

  const hideWidget = useCallback(async (widgetKey: string) => {
    setWidgetNotice('');
    const previous = new Set(hiddenWidgetKeys);
    const next = new Set(hiddenWidgetKeys);
    next.add(widgetKey);
    setHiddenWidgetKeys(next);
    const ok = await saveWidgetPreference(widgetKey, false);
    if (!ok) {
      setHiddenWidgetKeys(previous);
      setWidgetNotice('Failed to hide widget. Please try again.');
    }
  }, [hiddenWidgetKeys, saveWidgetPreference]);

  const fetchReport = async () => {
    if (!token) return;

    setLoading(true);
    setFetchError('');
    try {
      const response = await axios.get(`${getApiBaseUrl()}/mortgages/reports/profit`, {
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
          mortgage_type: mortgageType === 'all' ? undefined : mortgageType,
          min_profit: minProfit.trim() ? minProfit : undefined,
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
        average_profit_per_collection: toNumber(payload.summary?.average_profit_per_collection),
        profit_share_of_collections: toNumber(payload.summary?.profit_share_of_collections),
      });

      setByMethod(Array.isArray(payload.breakdown?.by_payment_method) ? payload.breakdown.by_payment_method : []);
      setByMonth(Array.isArray(payload.breakdown?.by_month) ? payload.breakdown.by_month : []);
      setByType(Array.isArray(payload.breakdown?.by_mortgage_type) ? payload.breakdown.by_mortgage_type : []);

      const nextRows = Array.isArray(paginated.data) ? paginated.data : [];
      setRows(nextRows);

      setPagination({
        data: nextRows,
        current_page: Number(paginated.current_page || 1),
        last_page: Number(paginated.last_page || 1),
        per_page: Number(paginated.per_page || perPage),
        total: Number(paginated.total || nextRows.length),
      });
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? String(error.response.data.message)
          : 'Failed to load profit report from mortgage payments.';
      setFetchError(message);
      setSummary({
        total_collections: 0,
        total_amount: 0,
        total_principal: 0,
        total_interest: 0,
        total_profit: 0,
        unique_mortgages: 0,
        average_profit_per_collection: 0,
        profit_share_of_collections: 0,
      });
      setByMethod([]);
      setByMonth([]);
      setByType([]);
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
    setMortgageType('all');
    setMinProfit('');
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
      'Paid Amount',
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

    downloadCsv('mortgage-profit-report.csv', headers, data);
  };

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  const kpiCards = [
    { key: 'kpi_total_profit', icon: Sparkles, label: 'Total Profit', value: formatAmount(summary.total_profit), tone: 'text-violet-700', bg: 'from-violet-500/10 to-purple-500/5' },
    { key: 'kpi_profit_share', icon: TrendingUp, label: 'Profit Share', value: `${summary.profit_share_of_collections.toFixed(1)}%`, tone: 'text-fuchsia-700', bg: 'from-fuchsia-500/10 to-pink-500/5' },
    { key: 'kpi_avg_profit', icon: HandCoins, label: 'Avg Profit / Payment', value: formatAmount(summary.average_profit_per_collection), tone: 'text-amber-700', bg: 'from-amber-500/10 to-orange-500/5' },
    { key: 'kpi_collections', icon: Banknote, label: 'Collections', value: summary.total_collections, tone: 'text-slate-700', bg: 'from-slate-500/10 to-gray-500/5' },
    { key: 'kpi_total_collected', icon: Wallet, label: 'Total Collected', value: formatAmount(summary.total_amount), tone: 'text-emerald-700', bg: 'from-emerald-500/10 to-green-500/5' },
    { key: 'kpi_interest', icon: BarChart3, label: 'Interest', value: formatAmount(summary.total_interest), tone: 'text-indigo-700', bg: 'from-indigo-500/10 to-violet-500/5' },
    { key: 'kpi_principal', icon: PieChart, label: 'Principal', value: formatAmount(summary.total_principal), tone: 'text-cyan-700', bg: 'from-cyan-500/10 to-blue-500/5' },
    { key: 'kpi_unique_mortgages', icon: Banknote, label: 'Unique Mortgages', value: summary.unique_mortgages, tone: 'text-teal-700', bg: 'from-teal-500/10 to-cyan-500/5' },
  ];
  const visibleKpiCards = kpiCards.filter((item) => !hiddenWidgetKeys.has(`${widgetPrefix}${item.key}`));

  const profitTableColumns = [
    { key: 'payment_id', label: 'Payment ID', render: (row: ProfitRow) => <span className="font-bold text-slate-900">#{row.id}</span> },
    { key: 'paid_date', label: 'Paid Date', render: (row: ProfitRow) => <span className="whitespace-nowrap text-black">{formatDate(row.paid_date)}</span> },
    { key: 'mortgage', label: 'Mortgage', render: (row: ProfitRow) => <span className="whitespace-nowrap text-black">#{row.mortgage_id} <span className="capitalize">({row.mortgage?.mortgage_type || '—'})</span></span> },
    {
      key: 'customer',
      label: 'Customer',
      render: (row: ProfitRow) => {
        const customerName = `${row.mortgage?.customer?.first_name || ''} ${row.mortgage?.customer?.last_name || ''}`.trim();
        return (
          <>
            <p className="font-semibold text-black">{customerName || '—'}</p>
            <p className="text-xs text-slate-600">{row.mortgage?.customer?.customer_code || '—'}</p>
          </>
        );
      },
    },
    { key: 'status', label: 'Status', render: (row: ProfitRow) => <Badge label={String(row.mortgage?.status || '—')} variant={statusVariant(row.mortgage?.status)} /> },
    { key: 'method', label: 'Method', render: (row: ProfitRow) => <span className="capitalize text-black">{row.payment_method || '—'}</span> },
    { key: 'profit', label: 'Profit', render: (row: ProfitRow) => <span className="font-bold text-violet-800">{formatAmount(row.profit_amount)}</span> },
    { key: 'paid_amount', label: 'Paid Amount', render: (row: ProfitRow) => <span className="text-black">{formatAmount(row.amount)}</span> },
    { key: 'principal', label: 'Principal', render: (row: ProfitRow) => <span className="text-black">{formatAmount(row.principal_amount)}</span> },
    { key: 'interest', label: 'Interest', render: (row: ProfitRow) => <span className="text-black">{formatAmount(row.interest_amount)}</span> },
    { key: 'note', label: 'Note', render: (row: ProfitRow) => <span className="max-w-[200px] truncate text-black" title={row.remarks || ''}>{row.remarks || '—'}</span> },
  ];
  const visibleProfitTableColumns = profitTableColumns.filter((column) => !hiddenWidgetKeys.has(`${widgetPrefix}table_col_${column.key}`));

  const showHeroWidget = !hiddenWidgetKeys.has(`${widgetPrefix}hero`);
  const showKpiWidget = !hiddenWidgetKeys.has(`${widgetPrefix}kpis`);
  const showBreakdownsWidget = !hiddenWidgetKeys.has(`${widgetPrefix}breakdowns`);
  const showFiltersWidget = !hiddenWidgetKeys.has(`${widgetPrefix}filters`);
  const showTransactionsWidget = !hiddenWidgetKeys.has(`${widgetPrefix}transactions`);
  const showAnyWidget =
    showHeroWidget ||
    (showKpiWidget && visibleKpiCards.length > 0) ||
    showBreakdownsWidget ||
    showFiltersWidget ||
    showTransactionsWidget;

  const pageFallback = (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1028]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
        <p className="text-sm font-medium text-violet-100/80">Loading profit report...</p>
      </div>
    </div>
  );

  if (!token) {
    return <ClientMountGate fallback={pageFallback}>{pageFallback}</ClientMountGate>;
  }

  return (
    <ClientMountGate fallback={pageFallback}>
      <div className="relative min-h-screen overflow-hidden bg-[#f8f5fc]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="absolute right-0 top-16 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(109,40,217,0.1) 1px, transparent 0)',
              backgroundSize: '26px 26px',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {widgetNotice ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {widgetNotice}
            </div>
          ) : null}

          {!showAnyWidget ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600">
              All widgets are hidden. Use Restore Hidden Widgets from the dashboard to bring them back.
            </div>
          ) : null}

          {showHeroWidget ? (
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#1a1028] via-[#3b1d6e] to-[#5b21b6] text-white shadow-[0_30px_80px_-24px_rgba(109,40,217,0.8)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(192,132,252,0.25),transparent_42%)]" />
            <div className="relative p-6 md:p-8">
              <WidgetCloseGate>
                <button
                  type="button"
                  onClick={() => void hideWidget(`${widgetPrefix}hero`)}
                  className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white/85 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                  aria-label="Hide profit report hero widget"
                >
                  ×
                </button>
              </WidgetCloseGate>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    Profit Analytics
                  </span>
                  <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Mortgage Profit Report</h1>
                  <p className="mt-2 text-sm leading-relaxed text-violet-50/90 md:text-base">
                    Interest income and profit realization from mortgage collections, with breakdowns by method, month, and product type.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-violet-100/90">
                    <span className="rounded-lg bg-white/10 px-2.5 py-1">Reports</span>
                    <span className="text-violet-200/50">/</span>
                    <span className="rounded-lg bg-violet-400/20 px-2.5 py-1 font-semibold text-white">Profit</span>
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
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-violet-500/30 transition hover:brightness-110 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </section>
          ) : null}

          {showKpiWidget ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            {visibleKpiCards.map((item) => (
              <div
                key={item.label}
                className={`relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br ${item.bg} p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5`}
              >
                <WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => void hideWidget(`${widgetPrefix}${item.key}`)}
                    className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white/85 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Hide ${item.label} widget`}
                  >
                    ×
                  </button>
                </WidgetCloseGate>
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
            {visibleKpiCards.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-4 2xl:col-span-8 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600">
                All KPI widgets are hidden.
              </div>
            ) : null}
          </section>
          ) : null}

          {showBreakdownsWidget ? (
          <section className="relative grid grid-cols-1 gap-4 lg:grid-cols-3">
            <WidgetCloseGate>
              <button
                type="button"
                onClick={() => void hideWidget(`${widgetPrefix}breakdowns`)}
                className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-xs font-bold text-slate-700 shadow-sm hover:bg-rose-50 hover:text-rose-700"
                aria-label="Hide profit breakdown widgets"
              >
                ×
              </button>
            </WidgetCloseGate>
            <div className="rounded-2xl border border-white/90 bg-white/95 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-violet-700" />
                <p className="font-bold text-slate-900">Profit by Payment Method</p>
              </div>
              {byMethod.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No breakdown data for current filters.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {byMethod.map((row) => (
                    <li key={row.payment_method} className="flex items-center justify-between rounded-lg bg-violet-50/60 px-3 py-2 text-sm">
                      <span className="font-semibold capitalize text-black">{row.payment_method}</span>
                      <span className="font-bold text-violet-800">{formatAmount(row.total_profit)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-white/90 bg-white/95 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-fuchsia-700" />
                <p className="font-bold text-slate-900">Profit by Month</p>
              </div>
              {byMonth.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No monthly breakdown for current filters.</p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  {byMonth.map((row) => (
                    <li key={row.period} className="flex items-center justify-between rounded-lg bg-fuchsia-50/60 px-3 py-2 text-sm">
                      <span className="font-semibold text-black">{formatPeriod(row.period)}</span>
                      <span className="font-bold text-fuchsia-800">{formatAmount(row.total_profit)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-white/90 bg-white/95 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-700" />
                <p className="font-bold text-slate-900">Profit by Mortgage Type</p>
              </div>
              {byType.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No product-type breakdown for current filters.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {byType.map((row) => (
                    <li key={row.mortgage_type} className="flex items-center justify-between rounded-lg bg-amber-50/60 px-3 py-2 text-sm">
                      <span className="font-semibold capitalize text-black">{row.mortgage_type}</span>
                      <span className="font-bold text-amber-800">{formatAmount(row.total_profit)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          ) : null}

          {showFiltersWidget ? (
          <section className="relative overflow-hidden rounded-3xl border border-white/90 bg-white/95 shadow-[0_22px_55px_-34px_rgba(109,40,217,0.45)] backdrop-blur-xl">
            <WidgetCloseGate>
              <button
                type="button"
                onClick={() => void hideWidget(`${widgetPrefix}filters`)}
                className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-xs font-bold text-slate-700 shadow-sm hover:bg-rose-50 hover:text-rose-700"
                aria-label="Hide profit report filters widget"
              >
                ×
              </button>
            </WidgetCloseGate>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50/80"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-violet-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Report Filters</p>
                  <p className="mt-1 text-sm text-slate-600">Date range, product type, status, method, and minimum profit.</p>
                </div>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">{filtersOpen ? 'Hide' : 'Show'}</span>
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
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Mortgage Type</label>
                    <select value={mortgageType} onChange={(e) => setMortgageType(e.target.value)} className={inputClass}>
                      <option value="all">All Types</option>
                      <option value="land">Land</option>
                      <option value="house">House</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="gold">Gold</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Min Profit</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minProfit}
                      onChange={(e) => setMinProfit(e.target.value)}
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
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
                  <div>
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
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-violet-700 hover:to-fuchsia-700"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </section>
          ) : null}

          {showTransactionsWidget ? (
          <section className="relative overflow-hidden rounded-3xl border border-white/90 bg-white/95 shadow-[0_24px_60px_-34px_rgba(109,40,217,0.5)] backdrop-blur-xl">
            <WidgetCloseGate>
              <button
                type="button"
                onClick={() => void hideWidget(`${widgetPrefix}transactions`)}
                className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-xs font-bold text-slate-700 shadow-sm hover:bg-rose-50 hover:text-rose-700"
                aria-label="Hide profit transactions widget"
              >
                ×
              </button>
            </WidgetCloseGate>
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Profit Transactions</h2>
                <p className="text-sm text-slate-500">
                  {pagination.total} record{pagination.total === 1 ? '' : 's'} • Page {pagination.current_page} of {pagination.last_page}
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === 'cards' ? 'bg-white text-violet-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === 'table' ? 'bg-white text-violet-800 shadow-sm' : 'text-slate-600'
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
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                  <p className="text-sm text-slate-500">Loading profit transactions...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">No profit records found</h3>
                  <p className="mt-1 max-w-md text-sm text-slate-500">Adjust filters or widen the date range to see profit from collections.</p>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {rows.map((row) => {
                    const customerName = `${row.mortgage?.customer?.first_name || ''} ${row.mortgage?.customer?.last_name || ''}`.trim();
                    return (
                      <article
                        key={row.id}
                        className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-violet-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment #{row.id}</p>
                            <p className="mt-1 text-2xl font-black text-violet-800">{formatAmount(row.profit_amount)}</p>
                            <p className="text-xs font-semibold uppercase text-violet-600">Profit</p>
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
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2">
                            <p className="text-[10px] font-bold uppercase text-emerald-800">Collected</p>
                            <p className="font-bold text-emerald-700">{formatAmount(row.amount)}</p>
                          </div>
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2">
                            <p className="text-[10px] font-bold uppercase text-indigo-800">Principal</p>
                            <p className="font-bold text-indigo-700">{formatAmount(row.principal_amount)}</p>
                          </div>
                          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2">
                            <p className="text-[10px] font-bold uppercase text-amber-800">Interest</p>
                            <p className="font-bold text-amber-700">{formatAmount(row.interest_amount)}</p>
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
                <div className="overflow-x-auto rounded-2xl border border-violet-100">
                  {visibleProfitTableColumns.length > 0 ? (
                    <table className="min-w-[1100px] w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-black">
                          {visibleProfitTableColumns.map((column) => (
                            <th key={column.key} className="px-3 py-3 text-black">
                              <div className="flex items-center justify-between gap-2">
                                <span>{column.label}</span>
                                <WidgetCloseGate>
                                  <button
                                    type="button"
                                    onClick={() => void hideWidget(`${widgetPrefix}table_col_${column.key}`)}
                                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                                    aria-label={`Hide ${column.label} column`}
                                  >
                                    ×
                                  </button>
                                </WidgetCloseGate>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.map((row, index) => (
                          <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            {visibleProfitTableColumns.map((column) => (
                              <td key={column.key} className="px-3 py-2.5">
                                {column.render(row)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-sm text-slate-600">All profit table columns are hidden.</div>
                  )}
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
          ) : null}
        </div>
      </div>
    </ClientMountGate>
  );
}

export default function MortgageProfitReportPage() {
  const pageFallback = (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1028]">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
    </div>
  );

  return (
    <Suspense fallback={pageFallback}>
      <MortgageProfitReportContent />
    </Suspense>
  );
}
