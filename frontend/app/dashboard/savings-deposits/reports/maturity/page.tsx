'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock3, Download, Filter } from 'lucide-react';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

type MaturityRow = {
  id: number;
  account_number?: string | null;
  account_type?: string | null;
  opening_deposit?: number | string | null;
  balance?: number | string | null;
  interest_rate?: number | string | null;
  opened_at?: string | null;
  status?: string | null;
  estimated_maturity_date?: string | null;
  days_to_maturity?: number | string | null;
  customer?: {
    customer_code?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
};

type Summary = {
  total_accounts: number;
  total_balance: number;
  upcoming_accounts: number;
  matured_accounts: number;
  avg_balance: number;
};

type Pagination = {
  data: MaturityRow[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function amount(value: unknown): string {
  return toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: unknown): string {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

export default function MaturityReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const API_URL = '' /* use /api via getApiBaseUrl in new code */;

  const branchId = Number(searchParams.get('branch_id') || 0) || undefined;

  const [token, setToken] = useState('');
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('all');
  const [maturityState, setMaturityState] = useState('all');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [windowDays, setWindowDays] = useState('');

  const [page, setPage] = useState(1);
  const [perPage] = useState(25);

  const [summary, setSummary] = useState<Summary>({
    total_accounts: 0,
    total_balance: 0,
    upcoming_accounts: 0,
    matured_accounts: 0,
    avg_balance: 0,
  });
  const [rows, setRows] = useState<MaturityRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    data: [],
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 25,
  });
  const widgetPrefix = 'savings_maturity_widget_';

  const fetchWidgetPreferences = async (authToken: string) => {
    try {
      const response = await axios.get('/api/dashboard/widgets', {
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
  };

  const saveWidgetPreference = async (widgetKey: string, isVisible: boolean) => {
    if (!token) return false;
    try {
      await axios.patch(
        '/api/dashboard/widgets',
        { widget_key: widgetKey, is_visible: isVisible },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch {
      return false;
    }
  };

  const hideWidget = async (widgetKey: string) => {
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
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
    void fetchWidgetPreferences(storedToken);
  }, [router]);

  const fetchReport = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await axios.get(`/api/savings-accounts/reports/maturity`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          branch_id: branchId,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          status: status === 'all' ? undefined : status,
          maturity_state: maturityState === 'all' ? undefined : maturityState,
          tenure_months: Number(tenureMonths || 12),
          window_days: windowDays ? Number(windowDays) : undefined,
          search: search.trim() || undefined,
          page,
          per_page: perPage,
        },
      });

      const payload = response.data || {};
      const pageData = payload.data || {};
      const nextRows = Array.isArray(pageData.data) ? pageData.data : [];

      setSummary({
        total_accounts: Number(payload.summary?.total_accounts || 0),
        total_balance: toNumber(payload.summary?.total_balance),
        upcoming_accounts: Number(payload.summary?.upcoming_accounts || 0),
        matured_accounts: Number(payload.summary?.matured_accounts || 0),
        avg_balance: toNumber(payload.summary?.avg_balance),
      });

      setRows(nextRows);
      setPagination({
        data: nextRows,
        current_page: Number(pageData.current_page || 1),
        last_page: Number(pageData.last_page || 1),
        total: Number(pageData.total || nextRows.length),
        per_page: Number(pageData.per_page || perPage),
      });
    } catch {
      setSummary({
        total_accounts: 0,
        total_balance: 0,
        upcoming_accounts: 0,
        matured_accounts: 0,
        avg_balance: 0,
      });
      setRows([]);
      setPagination({ data: [], current_page: 1, last_page: 1, total: 0, per_page: perPage });
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
    setMaturityState('all');
    setTenureMonths('12');
    setWindowDays('');
    setPage(1);
    setTimeout(() => {
      fetchReport();
    }, 0);
  };

  const exportCsv = () => {
    const headers = [
      'Account Number',
      'Customer',
      'Customer Code',
      'Opened Date',
      'Estimated Maturity Date',
      'Days To Maturity',
      'Balance',
      'Opening Deposit',
      'Interest Rate',
      'Status',
    ];

    const data = rows.map((row) => {
      const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
      return [
        String(row.account_number || '-'),
        customerName || '-',
        String(row.customer?.customer_code || '-'),
        formatDate(row.opened_at),
        formatDate(row.estimated_maturity_date),
        String(row.days_to_maturity ?? '-'),
        amount(row.balance),
        amount(row.opening_deposit),
        toNumber(row.interest_rate).toFixed(2),
        String(row.status || '-'),
      ];
    });

    const csv = [headers, ...data].map((line) => line.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maturity-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasRows = useMemo(() => rows.length > 0, [rows]);
  const showHeaderWidget = !hiddenWidgetKeys.has(`${widgetPrefix}header`);
  const statsCards = [
    { key: 'stat_total_accounts', label: 'Total FD Accounts', value: summary.total_accounts, valueClass: 'text-2xl font-extrabold text-slate-900 mt-1' },
    { key: 'stat_total_balance', label: 'Total Balance', value: amount(summary.total_balance), valueClass: 'text-2xl font-extrabold text-cyan-700 mt-1' },
    { key: 'stat_upcoming', label: 'Upcoming', value: summary.upcoming_accounts, valueClass: 'text-2xl font-extrabold text-emerald-700 mt-1' },
    { key: 'stat_matured', label: 'Matured', value: summary.matured_accounts, valueClass: 'text-2xl font-extrabold text-rose-700 mt-1' },
    { key: 'stat_avg_balance', label: 'Average Balance', value: amount(summary.avg_balance), valueClass: 'text-2xl font-extrabold text-slate-900 mt-1' },
  ];
  const visibleStatsCards = statsCards.filter((card) => !hiddenWidgetKeys.has(`${widgetPrefix}${card.key}`));
  const showFiltersWidget = !hiddenWidgetKeys.has(`${widgetPrefix}filters`);
  const showMaturityWidget = !hiddenWidgetKeys.has(`${widgetPrefix}maturity_table`);
  const maturityColumns = [
    { key: 'account', label: 'Account' },
    { key: 'customer', label: 'Customer' },
    { key: 'opened_date', label: 'Opened Date' },
    { key: 'maturity_date', label: 'Estimated Maturity Date' },
    { key: 'days_to_maturity', label: 'Days to Maturity' },
    { key: 'balance', label: 'Balance' },
    { key: 'opening_deposit', label: 'Opening Deposit' },
    { key: 'interest_rate', label: 'Interest Rate' },
    { key: 'status', label: 'Status' },
  ] as const;
  const visibleMaturityColumns = maturityColumns.filter(
    (column) => !hiddenWidgetKeys.has(`${widgetPrefix}col_${column.key}`)
  );
  const isAnyWidgetVisible = showHeaderWidget || visibleStatsCards.length > 0 || showFiltersWidget || showMaturityWidget;

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-yellow-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-orange-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {widgetNotice ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {widgetNotice}
          </div>
        ) : null}
        {!isAnyWidgetVisible ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            All widgets are hidden on this page. Restore hidden widgets from dashboard.
          </div>
        ) : null}

        {showHeaderWidget ? (
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(146,64,14,0.45)] p-6 md:p-7 relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}header`)}
              className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide header widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700 border border-orange-100">
                Savings Reports
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Maturity Report</h1>
              <p className="text-sm text-slate-600 mt-1">Upcoming and completed fixed-deposit maturities based on configured tenure.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!hasRows}
                className="px-4 py-2 rounded-xl bg-white hover:bg-orange-50 text-orange-800 text-sm font-semibold border border-orange-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Reports Hub
              </button>
            </div>
          </div>

          {visibleStatsCards.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {visibleStatsCards.map((card) => (
                <div key={card.key} className="rounded-xl bg-white/90 border border-orange-100 shadow-sm p-4 relative">
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => void hideWidget(`${widgetPrefix}${card.key}`)}
                      className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                      aria-label={`Hide ${card.label} widget`}
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className={card.valueClass}>{card.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        ) : null}

        {showFiltersWidget ? (
        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-orange-100 shadow-[0_18px_40px_-24px_rgba(146,64,14,0.45)] p-5 relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}filters`)}
              className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide filters widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-orange-700" />
              <h2 className="text-sm font-bold text-slate-900">Filters</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-orange-700 hover:to-amber-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search account/customer"
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900 xl:col-span-2"
            />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="dormant">Dormant</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={maturityState}
              onChange={(e) => setMaturityState(e.target.value)}
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All Maturity States</option>
              <option value="upcoming">Upcoming</option>
              <option value="matured">Matured</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <input
              type="number"
              min={1}
              max={120}
              value={tenureMonths}
              onChange={(e) => setTenureMonths(e.target.value)}
              placeholder="Tenure months (default 12)"
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <input
              type="number"
              min={1}
              max={3650}
              value={windowDays}
              onChange={(e) => setWindowDays(e.target.value)}
              placeholder="Upcoming window days (optional)"
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-orange-700" />
              FD maturity estimated from opened date + tenure months
            </div>
          </div>
        </div>
        ) : null}

        {showMaturityWidget ? (
        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-orange-100 shadow-[0_18px_40px_-24px_rgba(146,64,14,0.45)] p-5 relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}maturity_table`)}
              className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide maturity table widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Maturity Accounts</h2>
              <p className="text-xs text-slate-600 mt-1">Fixed-deposit accounts sorted by nearest estimated maturity date.</p>
            </div>
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">
              {pagination.total} records
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">No maturity records found for the selected filters.</p>
          ) : visibleMaturityColumns.length === 0 ? (
            <p className="text-sm text-amber-800">All table columns are hidden. Restore hidden widgets from dashboard.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-orange-100">
                <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                  <thead className="bg-orange-50/70 text-slate-700">
                    <tr>
                      {visibleMaturityColumns.map((column) => (
                        <th key={column.key} className="px-3 py-2 font-semibold relative">
                          {column.label}
                          <WidgetCloseGate>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void hideWidget(`${widgetPrefix}col_${column.key}`);
                              }}
                              className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-orange-200 bg-white text-[10px] font-bold text-orange-700 hover:bg-rose-50 hover:text-rose-700"
                              aria-label={`Hide ${column.label} column`}
                            >
                              ×
                            </button>
                          </WidgetCloseGate>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
                      const days = toNumber(row.days_to_maturity);
                      const isUpcoming = days >= 0;

                      return (
                        <tr key={row.id} className="border-b border-orange-100 last:border-b-0">
                          {visibleMaturityColumns.map((column) => {
                            if (column.key === 'account') {
                              return (
                                <td key={column.key} className="px-3 py-2">
                                  <p className="font-semibold text-slate-900">{row.account_number || '-'}</p>
                                  <p className="text-xs text-slate-500 capitalize">{row.account_type || '-'}</p>
                                </td>
                              );
                            }
                            if (column.key === 'customer') {
                              return (
                                <td key={column.key} className="px-3 py-2">
                                  <p className="font-semibold text-slate-900">{customerName || '-'}</p>
                                  <p className="text-xs text-slate-500">{row.customer?.customer_code || '-'}</p>
                                </td>
                              );
                            }
                            if (column.key === 'opened_date') {
                              return <td key={column.key} className="px-3 py-2 whitespace-nowrap">{formatDate(row.opened_at)}</td>;
                            }
                            if (column.key === 'maturity_date') {
                              return <td key={column.key} className="px-3 py-2 whitespace-nowrap">{formatDate(row.estimated_maturity_date)}</td>;
                            }
                            if (column.key === 'days_to_maturity') {
                              return (
                                <td key={column.key} className="px-3 py-2">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isUpcoming ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                    {days}
                                  </span>
                                </td>
                              );
                            }
                            if (column.key === 'balance') {
                              return <td key={column.key} className="px-3 py-2 font-semibold text-cyan-700">{amount(row.balance)}</td>;
                            }
                            if (column.key === 'interest_rate') {
                              return <td key={column.key} className="px-3 py-2">{toNumber(row.interest_rate).toFixed(2)}</td>;
                            }
                            return (
                              <td key={column.key} className="px-3 py-2">
                                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 capitalize">
                                  {row.status || '-'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-600">Page {pagination.current_page} of {pagination.last_page}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.current_page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => setPage((prev) => Math.min(pagination.last_page, prev + 1))}
                    className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        ) : null}
      </div>
    </div>
  );
}
