'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Download,
  Filter,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AnimatedProductBreakdownCard, CashFlowCharts } from '@/app/components/accounting/CashFlowChartPanels';

type PeriodRow = {
  period: string;
  cash_in: number;
  cash_out: number;
  refund_out: number;
  effective_cash_out: number;
  net_cash_flow: number;
  running_cash_balance: number;
  collection_count: number;
  disbursement_count: number;
};

type Summary = {
  periods_count: number;
  total_cash_in: number;
  total_cash_out: number;
  total_refund_out: number;
  total_effective_cash_out: number;
  net_cash_flow: number;
  ending_cash_balance: number;
  total_collections: number;
  total_disbursements: number;
};

type SourceBlock = {
  key: string;
  label: string;
  summary: Summary;
  periods: PeriodRow[];
};

type CompanyOption = {
  id: number;
  name: string;
  currency?: string | null;
};

const SOURCE_META: Record<string, { accent: string; badge: string }> = {
  finance: { accent: 'from-blue-500 to-indigo-600', badge: 'bg-blue-50 text-blue-800 border-blue-200' },
  microfinance: { accent: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  mortgage: { accent: 'from-amber-500 to-orange-600', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  instant_loan: { accent: 'from-fuchsia-500 to-purple-600', badge: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200' },
};

const SOURCE_ORDER = ['finance', 'microfinance', 'mortgage', 'instant_loan'] as const;

const inputClass =
  'w-full rounded-xl border border-violet-200/80 bg-white px-3.5 py-2.5 text-sm text-black shadow-sm transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200/80 placeholder:text-slate-400 [color-scheme:light]';

const labelClass = 'block text-xs font-bold text-slate-700 mb-1.5';

const PER_PAGE_OPTIONS = [10, 15, 25, 50] as const;

const emptySummary = (): Summary => ({
  periods_count: 0,
  total_cash_in: 0,
  total_cash_out: 0,
  total_refund_out: 0,
  total_effective_cash_out: 0,
  net_cash_flow: 0,
  ending_cash_balance: 0,
  total_collections: 0,
  total_disbursements: 0,
});

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSummary(raw: unknown): Summary {
  const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    periods_count: Number(payload.periods_count || 0),
    total_cash_in: toNumber(payload.total_cash_in),
    total_cash_out: toNumber(payload.total_cash_out),
    total_refund_out: toNumber(payload.total_refund_out),
    total_effective_cash_out: toNumber(payload.total_effective_cash_out),
    net_cash_flow: toNumber(payload.net_cash_flow),
    ending_cash_balance: toNumber(payload.ending_cash_balance),
    total_collections: Number(payload.total_collections || 0),
    total_disbursements: Number(payload.total_disbursements || 0),
  };
}

function parsePeriodRow(raw: unknown): PeriodRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    period: String(row.period ?? ''),
    cash_in: toNumber(row.cash_in),
    cash_out: toNumber(row.cash_out),
    refund_out: toNumber(row.refund_out),
    effective_cash_out: toNumber(row.effective_cash_out),
    net_cash_flow: toNumber(row.net_cash_flow),
    running_cash_balance: toNumber(row.running_cash_balance),
    collection_count: Number(row.collection_count || 0),
    disbursement_count: Number(row.disbursement_count || 0),
  };
}

function amount(value: unknown): string {
  return toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPeriod(period: string, groupBy: string): string {
  if (!period) return '—';
  const date = new Date(period);
  if (Number.isNaN(date.getTime())) return period;

  if (groupBy === 'day') {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date);
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function CashFlowTable({
  rows,
  groupBy,
  emptyMessage,
}: {
  rows: PeriodRow[];
  groupBy: string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
        <p className="text-xs font-semibold text-amber-900">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-violet-100">
      <table className="min-w-full text-xs text-black">
        <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider text-black">
          <tr>
            <th className="px-3 py-3 text-left">Period</th>
            <th className="px-3 py-3 text-right">Cash In</th>
            <th className="px-3 py-3 text-right">Cash Out</th>
            <th className="px-3 py-3 text-right">Refund Out</th>
            <th className="px-3 py-3 text-right">Effective Out</th>
            <th className="px-3 py-3 text-right">Net Flow</th>
            <th className="px-3 py-3 text-right">Running Balance</th>
            <th className="px-3 py-3 text-right">Counts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-violet-50 bg-white">
          {rows.map((row) => (
            <tr key={row.period} className="hover:bg-violet-50/40">
              <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{formatPeriod(row.period, groupBy)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">{amount(row.cash_in)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{amount(row.cash_out)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{amount(row.refund_out)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">{amount(row.effective_cash_out)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                <span className={`font-semibold ${row.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {amount(row.net_cash_flow)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                <span className={`font-semibold ${row.running_cash_balance >= 0 ? 'text-cyan-700' : 'text-rose-700'}`}>
                  {amount(row.running_cash_balance)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {row.collection_count} / {row.disbursement_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CashFlowReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCompanyId = Number(searchParams.get('branch_id') || searchParams.get('company_id') || 0) || null;

  const [token, setToken] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(initialCompanyId);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [sourceFilter, setSourceFilter] = useState('all');
  const [productType, setProductType] = useState('all');
  const [status, setStatus] = useState('all');
  const [groupBy, setGroupBy] = useState('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [summary, setSummary] = useState<Summary>(emptySummary());
  const [rows, setRows] = useState<PeriodRow[]>([]);
  const [sources, setSources] = useState<Record<string, SourceBlock>>({});

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const currency = selectedCompany?.currency || 'LKR';

  const orderedSources = useMemo(
    () =>
      SOURCE_ORDER.map((key) => sources[key]).filter((block): block is SourceBlock => Boolean(block)),
    [sources]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const fetchCompanies = async (authToken: string) => {
    setLoadingCompanies(true);
    try {
      const response = await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const list = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setCompanies(list);

      if (list.length > 0) {
        setSelectedCompanyId((current) => {
          if (current && list.some((row: CompanyOption) => row.id === current)) {
            return current;
          }
          return Number(list[0].id);
        });
      } else {
        setSelectedCompanyId(null);
      }
    } catch {
      setCompanies([]);
      setSelectedCompanyId(null);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchReport = async (overrides?: {
    from_date?: string;
    to_date?: string;
    source?: string;
    product_type?: string;
    status?: string;
    group_by?: string;
  }) => {
    if (!token) return;

    setLoading(true);
    setError('');

    const effectiveFromDate = overrides?.from_date ?? fromDate;
    const effectiveToDate = overrides?.to_date ?? toDate;
    const effectiveSource = overrides?.source ?? sourceFilter;
    const effectiveProductType = overrides?.product_type ?? productType;
    const effectiveStatus = overrides?.status ?? status;
    const effectiveGroupBy = overrides?.group_by ?? groupBy;

    try {
      const response = await axios.get('/api/finances/reports/cash-flow', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          branch_id: selectedCompanyId || undefined,
          from_date: effectiveFromDate || undefined,
          to_date: effectiveToDate || undefined,
          source: effectiveSource === 'all' ? undefined : effectiveSource,
          product_type: effectiveProductType === 'all' ? undefined : effectiveProductType,
          status: effectiveStatus === 'all' ? undefined : effectiveStatus,
          group_by: effectiveGroupBy,
        },
      });

      const payload = response.data || {};
      const periods = Array.isArray(payload.periods) ? payload.periods.map(parsePeriodRow) : [];
      const rawSources = payload.sources && typeof payload.sources === 'object' ? payload.sources : {};
      const parsedSources: Record<string, SourceBlock> = {};

      Object.entries(rawSources).forEach(([key, value]) => {
        const block = value as Record<string, unknown>;
        parsedSources[key] = {
          key,
          label: String(block.label || key),
          summary: parseSummary(block.summary),
          periods: Array.isArray(block.periods) ? block.periods.map(parsePeriodRow) : [],
        };
      });

      setSummary(parseSummary(payload.summary));
      setRows(periods);
      setSources(parsedSources);
    } catch (fetchError: unknown) {
      setSummary(emptySummary());
      setRows([]);
      setSources({});
      if (axios.isAxiosError(fetchError)) {
        setError(
          (typeof fetchError.response?.data?.message === 'string' && fetchError.response.data.message) ||
            'Failed to load cash flow data.'
        );
      } else {
        setError('Failed to load cash flow data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchCompanies(token);
  }, [token]);

  useEffect(() => {
    if (!token || loadingCompanies) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCompanyId, loadingCompanies]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows, pageSize, selectedCompanyId, fromDate, toDate, sourceFilter, productType, status, groupBy]);

  const applyFilters = () => {
    fetchReport();
  };

  const resetFilters = () => {
    const nextFrom = monthStartIso();
    const nextTo = todayIso();
    setFromDate(nextFrom);
    setToDate(nextTo);
    setSourceFilter('all');
    setProductType('all');
    setStatus('all');
    setGroupBy('month');
    fetchReport({
      from_date: nextFrom,
      to_date: nextTo,
      source: 'all',
      product_type: 'all',
      status: 'all',
      group_by: 'month',
    });
  };

  const exportCsv = () => {
    const headers = [
      'Section',
      'Period',
      'Cash In',
      'Cash Out (Disbursement)',
      'Refund Out',
      'Effective Cash Out',
      'Net Cash Flow',
      'Running Cash Balance',
      'Collections Count',
      'Disbursements Count',
    ];

    const combinedRows = rows.map((row) => [
      'Combined',
      formatPeriod(row.period, groupBy),
      amount(row.cash_in),
      amount(row.cash_out),
      amount(row.refund_out),
      amount(row.effective_cash_out),
      amount(row.net_cash_flow),
      amount(row.running_cash_balance),
      String(row.collection_count),
      String(row.disbursement_count),
    ]);

    const sourceRows = orderedSources.flatMap((block) =>
      block.periods.map((row) => [
        block.label,
        formatPeriod(row.period, groupBy),
        amount(row.cash_in),
        amount(row.cash_out),
        amount(row.refund_out),
        amount(row.effective_cash_out),
        amount(row.net_cash_flow),
        amount(row.running_cash_balance),
        String(row.collection_count),
        String(row.disbursement_count),
      ])
    );

    const csv = [headers, ...combinedRows, ...sourceRows].map((line) => line.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cash-flow-${selectedCompanyId || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasRows = useMemo(() => rows.length > 0, [rows]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / pageSize)), [rows.length, pageSize]);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return rows.slice(startIndex, startIndex + pageSize);
  }, [rows, currentPage, pageSize]);
  const paginationStart = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const paginationEnd = Math.min(currentPage * pageSize, rows.length);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-violet-300 blur-3xl" />
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-purple-300 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-300 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-100">Accounting</p>
              <h1 className="text-2xl font-extrabold mt-1">Cash Flow Report</h1>
              <p className="text-sm text-violet-50 mt-1">
                Unified cash inflows and outflows across finance, micro credit, mortgage, and instant loan products.
              </p>
              {selectedCompany ? (
                <p className="text-xs text-violet-100 mt-2 inline-flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {selectedCompany.name} · {currency}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!hasRows && orderedSources.every((block) => block.periods.length === 0)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => fetchReport()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/reports')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Reports Hub
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            {
              label: 'Cash In',
              value: amount(summary.total_cash_in),
              icon: TrendingUp,
              accent: 'from-emerald-500 to-teal-600',
              valueClass: 'text-emerald-700',
            },
            {
              label: 'Effective Cash Out',
              value: amount(summary.total_effective_cash_out),
              icon: TrendingDown,
              accent: 'from-rose-500 to-red-600',
              valueClass: 'text-rose-700',
            },
            {
              label: 'Net Cash Flow',
              value: amount(summary.net_cash_flow),
              icon: Wallet,
              accent: summary.net_cash_flow >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600',
              valueClass: summary.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-700',
            },
            {
              label: 'Ending Balance',
              value: amount(summary.ending_cash_balance),
              icon: Wallet,
              accent: 'from-cyan-500 to-blue-600',
              valueClass: summary.ending_cash_balance >= 0 ? 'text-cyan-700' : 'text-rose-700',
            },
            {
              label: 'Collections / Disbursements',
              value: `${summary.total_collections} / ${summary.total_disbursements}`,
              icon: Building2,
              accent: 'from-violet-500 to-purple-600',
              valueClass: 'text-black',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-violet-100 bg-white/90 p-3.5 shadow-sm chart-animate-panel">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className={`mt-1 text-sm font-bold truncate tabular-nums leading-snug ${item.valueClass}`}>{item.value}</p>
                  </div>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.accent} text-white chart-animate-icon`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {orderedSources.length > 0 ? (
          <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4 chart-animate-panel">
            <div>
              <h2 className="text-lg font-bold text-black">Product Breakdown</h2>
              <p className="text-xs text-slate-600 mt-1">Cash flow summary by lending product for the selected period.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {orderedSources.map((block) => {
                const meta = SOURCE_META[block.key] || SOURCE_META.finance;
                return (
                  <AnimatedProductBreakdownCard
                    key={block.key}
                    blockKey={block.key}
                    label={block.label}
                    badgeClass={meta.badge}
                    accentClass={meta.accent}
                    summary={block.summary}
                    formatAmount={(value) => amount(value)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-violet-700" />
              <h2 className="text-sm font-bold text-black">Filters</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
            <div>
              <label className={labelClass}>Company / Branch *</label>
              <select
                value={selectedCompanyId ?? ''}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)}
                disabled={loadingCompanies || companies.length === 0}
                className={inputClass}
              >
                {companies.length === 0 ? (
                  <option value="">No branches found</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className={labelClass}>From date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>To date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Product source</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={inputClass}>
                <option value="all">All products</option>
                <option value="finance">Finance</option>
                <option value="microfinance">Micro Credit</option>
                <option value="mortgage">Mortgage</option>
                <option value="instant_loan">Instant Loan</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Finance product</label>
              <select value={productType} onChange={(e) => setProductType(e.target.value)} className={inputClass}>
                <option value="all">All finance types</option>
                <option value="hire-purchase">Hire purchase</option>
                <option value="lease">Lease</option>
                <option value="loan">Loan</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Finance status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending_approval">Pending approval</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Group by</label>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={inputClass}>
                <option value="month">Month</option>
                <option value="day">Day</option>
              </select>
            </div>
          </div>
        </div>

        {!loading && selectedCompanyId && rows.length > 0 ? (
          <CashFlowCharts
            summary={summary}
            rows={rows}
            sources={orderedSources}
            currency={currency}
            formatPeriodLabel={(period) => formatPeriod(period, groupBy)}
          />
        ) : null}

        <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-black">Combined Cash Flow Timeline</h2>
              <p className="text-xs text-slate-600 mt-1">All products merged — period-level inflow, outflow, and running balance.</p>
            </div>
            <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
              {rows.length} periods
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
          ) : !selectedCompanyId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">Select a branch</p>
              <p className="text-xs text-amber-800 mt-1">Choose a company or branch to view cash flow data.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">No data for this branch</p>
              <p className="text-xs text-amber-800 mt-1">Try widening the date range or check lending activity for this branch.</p>
            </div>
          ) : (
            <>
              <CashFlowTable rows={paginatedRows} groupBy={groupBy} emptyMessage="No combined timeline data." />

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-violet-100 pt-4">
                <p className="text-xs text-slate-600">
                  Showing {paginationStart} to {paginationEnd} of {rows.length} periods
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    Rows
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value) || 15)}
                      className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-black"
                    >
                      {PER_PAGE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {orderedSources.map((block) => {
          const meta = SOURCE_META[block.key] || SOURCE_META.finance;
          return (
            <div key={block.key} className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm chart-animate-panel">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-black">{block.label} Cash Flow</h2>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.badge}`}>
                      {block.periods.length} periods
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Net {amount(block.summary.net_cash_flow)} · Cash in {amount(block.summary.total_cash_in)} · Out{' '}
                    {amount(block.summary.total_effective_cash_out)}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                </div>
              ) : (
                <CashFlowTable
                  rows={block.periods}
                  groupBy={groupBy}
                  emptyMessage={`No ${block.label.toLowerCase()} cash flow activity for this period.`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
