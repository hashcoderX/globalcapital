'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Download,
  Filter,
  LineChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { IncomeExpenseCharts } from '@/app/components/accounting/IncomeExpenseChartPanels';

type PeriodRow = {
  period: string;
  interest_income: number;
  collection_inflow: number;
  refund_expense: number;
  disbursement_expense: number;
  disbursement_accounts: number;
  total_expense: number;
  net_profit: number;
};

type Summary = {
  periods_count: number;
  total_interest_income: number;
  total_collection_inflow: number;
  total_disbursement_expense: number;
  total_refund_expense: number;
  total_expense: number;
  net_profit: number;
  disbursement_accounts: number;
  instant_loan_collections: number;
};

type CompanyOption = {
  id: number;
  name: string;
  currency?: string | null;
};

const inputClass =
  'w-full rounded-xl border border-violet-200/80 bg-white px-3.5 py-2.5 text-sm text-black shadow-sm transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200/80 placeholder:text-slate-400 [color-scheme:light]';

const labelClass = 'block text-xs font-bold text-slate-700 mb-1.5';

const PER_PAGE_OPTIONS = [10, 15, 25, 50] as const;

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

export default function IncomeExpenseReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCompanyId = Number(searchParams.get('branch_id') || searchParams.get('company_id') || 0) || null;

  const [token, setToken] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(initialCompanyId);
  const [companyMeta, setCompanyMeta] = useState<{ id: number; name: string; currency: string } | null>(null);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [productType, setProductType] = useState('all');
  const [status, setStatus] = useState('all');
  const [groupBy, setGroupBy] = useState('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [summary, setSummary] = useState<Summary>({
    periods_count: 0,
    total_interest_income: 0,
    total_collection_inflow: 0,
    total_disbursement_expense: 0,
    total_refund_expense: 0,
    total_expense: 0,
    net_profit: 0,
    disbursement_accounts: 0,
    instant_loan_collections: 0,
  });
  const [rows, setRows] = useState<PeriodRow[]>([]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const currency = companyMeta?.currency || selectedCompany?.currency || 'LKR';

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
    product_type?: string;
    status?: string;
    group_by?: string;
  }) => {
    if (!token) return;

    setLoading(true);
    setError('');

    const effectiveFromDate = overrides?.from_date ?? fromDate;
    const effectiveToDate = overrides?.to_date ?? toDate;
    const effectiveProductType = overrides?.product_type ?? productType;
    const effectiveStatus = overrides?.status ?? status;
    const effectiveGroupBy = overrides?.group_by ?? groupBy;

    try {
      const response = await axios.get('/api/finances/reports/income-expense', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          branch_id: selectedCompanyId || undefined,
          company_id: selectedCompanyId || undefined,
          from_date: effectiveFromDate || undefined,
          to_date: effectiveToDate || undefined,
          product_type: effectiveProductType === 'all' ? undefined : effectiveProductType,
          status: effectiveStatus === 'all' ? undefined : effectiveStatus,
          group_by: effectiveGroupBy,
        },
      });

      const payload = response.data || {};
      const periods = Array.isArray(payload.periods) ? payload.periods : [];

      setSummary({
        periods_count: Number(payload.summary?.periods_count || 0),
        total_interest_income: toNumber(payload.summary?.total_interest_income),
        total_collection_inflow: toNumber(payload.summary?.total_collection_inflow),
        total_disbursement_expense: toNumber(payload.summary?.total_disbursement_expense),
        total_refund_expense: toNumber(payload.summary?.total_refund_expense),
        total_expense: toNumber(payload.summary?.total_expense),
        net_profit: toNumber(payload.summary?.net_profit),
        disbursement_accounts: Number(payload.summary?.disbursement_accounts || 0),
        instant_loan_collections: Number(payload.summary?.instant_loan_collections || 0),
      });
      setRows(periods);
      setCompanyMeta(payload.company || null);
    } catch (fetchError: unknown) {
      setSummary({
        periods_count: 0,
        total_interest_income: 0,
        total_collection_inflow: 0,
        total_disbursement_expense: 0,
        total_refund_expense: 0,
        total_expense: 0,
        net_profit: 0,
        disbursement_accounts: 0,
        instant_loan_collections: 0,
      });
      setRows([]);
      if (axios.isAxiosError(fetchError)) {
        setError(
          (typeof fetchError.response?.data?.message === 'string' && fetchError.response.data.message) ||
            'Failed to load income and expense data.'
        );
      } else {
        setError('Failed to load income and expense data.');
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
  }, [rows, pageSize, selectedCompanyId, fromDate, toDate, productType, status, groupBy]);

  const applyFilters = () => {
    fetchReport();
  };

  const resetFilters = () => {
    const nextFrom = monthStartIso();
    const nextTo = todayIso();
    setFromDate(nextFrom);
    setToDate(nextTo);
    setProductType('all');
    setStatus('all');
    setGroupBy('month');
    fetchReport({
      from_date: nextFrom,
      to_date: nextTo,
      product_type: 'all',
      status: 'all',
      group_by: 'month',
    });
  };

  const exportCsv = () => {
    const headers = [
      'Period',
      'Interest Income',
      'Collection Inflow',
      'Disbursement Expense',
      'Refund Expense',
      'Total Expense',
      'Net Profit',
      'Disbursement Accounts',
    ];

    const data = rows.map((row) => [
      formatPeriod(row.period, groupBy),
      amount(row.interest_income),
      amount(row.collection_inflow),
      amount(row.disbursement_expense),
      amount(row.refund_expense),
      amount(row.total_expense),
      amount(row.net_profit),
      String(row.disbursement_accounts),
    ]);

    const csv = [headers, ...data].map((line) => line.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `income-expense-${selectedCompanyId || 'all'}.csv`;
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
              <h1 className="text-2xl font-extrabold mt-1">Income &amp; Expense Report</h1>
              <p className="text-sm text-violet-50 mt-1">
                Finance collections and instant loan collections from office collections, scoped to the selected branch.
              </p>
              {companyMeta ? (
                <p className="text-xs text-violet-100 mt-2 inline-flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {companyMeta.name} · {currency}
                </p>
              ) : selectedCompany ? (
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
                disabled={!hasRows}
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
              label: 'Interest Income',
              value: amount(summary.total_interest_income),
              icon: TrendingUp,
              accent: 'from-emerald-500 to-teal-600',
              valueClass: 'text-emerald-700',
            },
            {
              label: 'Collection Inflow',
              value: amount(summary.total_collection_inflow),
              icon: Wallet,
              accent: 'from-cyan-500 to-blue-600',
              valueClass: 'text-cyan-700',
            },
            {
              label: 'Total Expense',
              value: amount(summary.total_expense),
              icon: TrendingDown,
              accent: 'from-rose-500 to-red-600',
              valueClass: 'text-rose-700',
            },
            {
              label: 'Net Profit',
              value: amount(summary.net_profit),
              icon: LineChart,
              accent: summary.net_profit >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600',
              valueClass: summary.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700',
            },
            {
              label: 'Disbursements',
              value: String(summary.disbursement_accounts),
              icon: Building2,
              accent: 'from-violet-500 to-purple-600',
              valueClass: 'text-black',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-violet-100 bg-white/90 p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className={`mt-1 text-sm font-bold truncate tabular-nums leading-snug ${item.valueClass}`}>{item.value}</p>
                  </div>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.accent} text-white`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
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
              <label className={labelClass}>Product type</label>
              <select value={productType} onChange={(e) => setProductType(e.target.value)} className={inputClass}>
                <option value="all">All products</option>
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
          <IncomeExpenseCharts
            summary={summary}
            rows={rows}
            currency={currency}
            formatPeriodLabel={(period) => formatPeriod(period, groupBy)}
          />
        ) : null}

        <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-black">Income vs Expense Timeline</h2>
              <p className="text-xs text-slate-600 mt-1">
                Finance and instant loan activity for the selected branch only.
                {(summary.instant_loan_collections ?? 0) > 0
                  ? ` Includes ${summary.instant_loan_collections} instant loan collection${summary.instant_loan_collections === 1 ? '' : 's'}.`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
                {rows.length} periods
              </span>
              {(summary.instant_loan_collections ?? 0) > 0 ? (
                <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
                  {summary.instant_loan_collections} instant loan collections
                </span>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
          ) : !selectedCompanyId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">Select a branch</p>
              <p className="text-xs text-amber-800 mt-1">Choose a company or branch to view related income and expense data.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">No data for this branch</p>
              <p className="text-xs text-amber-800 mt-1">Try widening the date range or check finance activity for this branch.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-violet-100">
                <table className="min-w-full text-sm text-black">
                  <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider text-black">
                    <tr>
                      <th className="px-3 py-3 text-left">Period</th>
                      <th className="px-3 py-3 text-right">Interest Income</th>
                      <th className="px-3 py-3 text-right">Collection Inflow</th>
                      <th className="px-3 py-3 text-right">Disbursement</th>
                      <th className="px-3 py-3 text-right">Refund</th>
                      <th className="px-3 py-3 text-right">Total Expense</th>
                      <th className="px-3 py-3 text-right">Net Profit</th>
                      <th className="px-3 py-3 text-right">Accounts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50 bg-white">
                    {paginatedRows.map((row) => (
                      <tr key={row.period} className="hover:bg-violet-50/40">
                        <td className="px-3 py-3 font-semibold whitespace-nowrap">{formatPeriod(row.period, groupBy)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-emerald-700 font-semibold">{amount(row.interest_income)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-cyan-700">{amount(row.collection_inflow)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-rose-700">{amount(row.disbursement_expense)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-rose-700">{amount(row.refund_expense)}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-rose-700">{amount(row.total_expense)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span className={`font-semibold ${row.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {amount(row.net_profit)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.disbursement_accounts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
      </div>
    </div>
  );
}
