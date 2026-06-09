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
  Wallet,
} from 'lucide-react';
import { buildExpensePeriodTotals, ExpensesCharts } from '@/app/components/accounting/ExpensesChartPanels';

type ExpenseRow = {
  id: number;
  expense_date: string;
  category: string;
  title: string;
  amount: number | string;
  payment_method: string;
  reference_no?: string | null;
  notes?: string | null;
};

type CompanyOption = {
  id: number;
  name: string;
  currency?: string | null;
};

const CATEGORY_OPTIONS = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'transport', label: 'Transport' },
  { value: 'office_supplies', label: 'Office supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'main', label: 'Main account' },
];

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

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value.replace(/_/g, ' ');
}

function paymentLabel(value: string): string {
  return PAYMENT_OPTIONS.find((item) => item.value === value)?.label || value;
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

export default function ExpensesReportPage() {
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const currency = selectedCompany?.currency || 'LKR';

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    expenses.forEach((row) => {
      const key = row.category || 'other';
      const current = map.get(key) || { count: 0, total: 0 };
      map.set(key, {
        count: current.count + 1,
        total: current.total + toNumber(row.amount),
      });
    });
    return Array.from(map.entries())
      .map(([category, stats]) => ({
        category,
        label: categoryLabel(category),
        count: stats.count,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    expenses.forEach((row) => {
      const key = row.payment_method || 'cash';
      const current = map.get(key) || { count: 0, total: 0 };
      map.set(key, {
        count: current.count + 1,
        total: current.total + toNumber(row.amount),
      });
    });
    return Array.from(map.entries())
      .map(([method, stats]) => ({
        key: method,
        method,
        label: paymentLabel(method),
        count: stats.count,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const categoryChartRows = useMemo(
    () =>
      categoryBreakdown.map((row) => ({
        key: row.category,
        label: row.label,
        total: row.total,
        count: row.count,
      })),
    [categoryBreakdown]
  );

  const paymentChartRows = useMemo(
    () =>
      paymentBreakdown.map((row) => ({
        key: row.method,
        label: row.label,
        total: row.total,
        count: row.count,
      })),
    [paymentBreakdown]
  );

  const periodTotals = useMemo(() => buildExpensePeriodTotals(expenses), [expenses]);

  const formatMonthPeriod = (period: string): string => {
    const date = new Date(period);
    if (Number.isNaN(date.getTime())) return period;
    return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date);
  };

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
    category?: string;
    search?: string;
  }) => {
    if (!token || !selectedCompanyId) {
      setExpenses([]);
      setTotalAmount(0);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const effectiveFromDate = overrides?.from_date ?? fromDate;
    const effectiveToDate = overrides?.to_date ?? toDate;
    const effectiveCategory = overrides?.category ?? categoryFilter;
    const effectiveSearch = overrides?.search ?? search;

    try {
      const response = await axios.get(`/api/companies/${selectedCompanyId}/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          from_date: effectiveFromDate || undefined,
          to_date: effectiveToDate || undefined,
          category: effectiveCategory === 'all' ? undefined : effectiveCategory,
          search: effectiveSearch.trim() || undefined,
        },
      });

      const rows = Array.isArray(response.data?.expenses) ? response.data.expenses : [];
      setExpenses(rows);
      setTotalAmount(toNumber(response.data?.summary?.total_amount));
      setTotalCount(Number(response.data?.summary?.count || rows.length));
    } catch (fetchError: unknown) {
      setExpenses([]);
      setTotalAmount(0);
      setTotalCount(0);
      if (axios.isAxiosError(fetchError)) {
        setError(
          (typeof fetchError.response?.data?.message === 'string' && fetchError.response.data.message) ||
            'Failed to load expenses report.'
        );
      } else {
        setError('Failed to load expenses report.');
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
  }, [expenses, pageSize, selectedCompanyId, fromDate, toDate, categoryFilter, search]);

  const applyFilters = () => {
    fetchReport();
  };

  const resetFilters = () => {
    const nextFrom = monthStartIso();
    const nextTo = todayIso();
    setFromDate(nextFrom);
    setToDate(nextTo);
    setCategoryFilter('all');
    setSearch('');
    fetchReport({
      from_date: nextFrom,
      to_date: nextTo,
      category: 'all',
      search: '',
    });
  };

  const exportCsv = () => {
    const headers = ['Date', 'Category', 'Title', 'Amount', 'Payment Method', 'Reference', 'Notes'];
    const data = expenses.map((row) => [
      formatDate(row.expense_date),
      categoryLabel(row.category),
      row.title,
      amount(row.amount),
      paymentLabel(row.payment_method),
      row.reference_no || '',
      row.notes || '',
    ]);

    const csv = [headers, ...data].map((line) => line.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-report-${selectedCompanyId || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(expenses.length / pageSize)), [expenses.length, pageSize]);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return expenses.slice(startIndex, startIndex + pageSize);
  }, [expenses, currentPage, pageSize]);
  const paginationStart = expenses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const paginationEnd = Math.min(currentPage * pageSize, expenses.length);

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
              <h1 className="text-2xl font-extrabold mt-1">Expenses Report</h1>
              <p className="text-sm text-violet-50 mt-1">
                Review branch operating expenses by category, payment method, and date range.
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
                disabled={expenses.length === 0}
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Expenses',
              value: amount(totalAmount),
              icon: TrendingDown,
              accent: 'from-rose-500 to-red-600',
              valueClass: 'text-rose-700',
            },
            {
              label: 'Expense Count',
              value: String(totalCount),
              icon: Wallet,
              accent: 'from-violet-500 to-purple-600',
              valueClass: 'text-black',
            },
            {
              label: 'Categories Used',
              value: String(categoryBreakdown.length),
              icon: Building2,
              accent: 'from-cyan-500 to-blue-600',
              valueClass: 'text-cyan-700',
            },
            {
              label: 'Average Expense',
              value: totalCount > 0 ? amount(totalAmount / totalCount) : amount(0),
              icon: Wallet,
              accent: 'from-amber-500 to-orange-600',
              valueClass: 'text-amber-700',
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
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
              <label className={labelClass}>Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass}>
                <option value="all">All categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, reference, notes..."
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {!loading && selectedCompanyId && expenses.length > 0 ? (
          <ExpensesCharts
            totalAmount={totalAmount}
            totalCount={totalCount}
            categoryBreakdown={categoryChartRows}
            paymentBreakdown={paymentChartRows}
            periodTotals={periodTotals}
            currency={currency}
            formatPeriodLabel={formatMonthPeriod}
          />
        ) : null}

        <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm chart-animate-panel">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-black">Expense Records</h2>
              <p className="text-xs text-slate-600 mt-1">Detailed expense lines for the selected branch and period.</p>
            </div>
            <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
              {expenses.length} records
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
          ) : !selectedCompanyId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">Select a branch</p>
              <p className="text-xs text-amber-800 mt-1">Choose a company or branch to view expense data.</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">No expenses for this period</p>
              <p className="text-xs text-amber-800 mt-1">Try widening the date range or add expenses from the accounting module.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-violet-100">
                <table className="min-w-full text-xs text-black">
                  <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider text-black">
                    <tr>
                      <th className="px-3 py-3 text-left">Date</th>
                      <th className="px-3 py-3 text-left">Category</th>
                      <th className="px-3 py-3 text-left">Title</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                      <th className="px-3 py-3 text-left">Payment</th>
                      <th className="px-3 py-3 text-left">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50 bg-white">
                    {paginatedRows.map((row) => (
                      <tr key={row.id} className="hover:bg-violet-50/40">
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{formatDate(row.expense_date)}</td>
                        <td className="px-3 py-2.5">{categoryLabel(row.category)}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold">{row.title}</p>
                          {row.notes ? <p className="text-[10px] text-slate-500 mt-0.5">{row.notes}</p> : null}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">{amount(row.amount)}</td>
                        <td className="px-3 py-2.5">{paymentLabel(row.payment_method)}</td>
                        <td className="px-3 py-2.5">{row.reference_no || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-violet-100 pt-4">
                <p className="text-xs text-slate-600">
                  Showing {paginationStart} to {paginationEnd} of {expenses.length} records
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
