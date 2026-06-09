'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, Filter, LineChart, TrendingUp } from 'lucide-react';

type GrowthPeriod = {
  period: string;
  deposit_amount: number;
  deposit_transactions: number;
  accounts_count: number;
  previous_amount: number | null;
  growth_percent: number | null;
};

type Summary = {
  total_deposit_amount: number;
  total_deposit_transactions: number;
  avg_deposit_amount: number;
  unique_accounts: number;
  periods_count: number;
  first_period_amount: number;
  last_period_amount: number;
  overall_growth_percent: number | null;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function amount(value: unknown): string {
  return toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPeriod(period: string, groupBy: string): string {
  if (!period) return '-';
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

export default function DepositGrowthReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const API_URL = '' /* use /api via getApiBaseUrl in new code */;

  const branchId = Number(searchParams.get('branch_id') || 0) || undefined;

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [accountType, setAccountType] = useState('all');
  const [status, setStatus] = useState('all');
  const [groupBy, setGroupBy] = useState('month');
  const [search, setSearch] = useState('');

  const [summary, setSummary] = useState<Summary>({
    total_deposit_amount: 0,
    total_deposit_transactions: 0,
    avg_deposit_amount: 0,
    unique_accounts: 0,
    periods_count: 0,
    first_period_amount: 0,
    last_period_amount: 0,
    overall_growth_percent: null,
  });
  const [periods, setPeriods] = useState<GrowthPeriod[]>([]);

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
      const response = await axios.get(`/api/savings-accounts/reports/deposit-growth`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          branch_id: branchId,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          account_type: accountType === 'all' ? undefined : accountType,
          status: status === 'all' ? undefined : status,
          group_by: groupBy,
          search: search.trim() || undefined,
        },
      });

      const payload = response.data || {};
      setSummary({
        total_deposit_amount: toNumber(payload.summary?.total_deposit_amount),
        total_deposit_transactions: Number(payload.summary?.total_deposit_transactions || 0),
        avg_deposit_amount: toNumber(payload.summary?.avg_deposit_amount),
        unique_accounts: Number(payload.summary?.unique_accounts || 0),
        periods_count: Number(payload.summary?.periods_count || 0),
        first_period_amount: toNumber(payload.summary?.first_period_amount),
        last_period_amount: toNumber(payload.summary?.last_period_amount),
        overall_growth_percent:
          payload.summary?.overall_growth_percent === null || payload.summary?.overall_growth_percent === undefined
            ? null
            : toNumber(payload.summary?.overall_growth_percent),
      });
      setPeriods(Array.isArray(payload.periods) ? payload.periods : []);
    } catch {
      setSummary({
        total_deposit_amount: 0,
        total_deposit_transactions: 0,
        avg_deposit_amount: 0,
        unique_accounts: 0,
        periods_count: 0,
        first_period_amount: 0,
        last_period_amount: 0,
        overall_growth_percent: null,
      });
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, branchId]);

  const applyFilters = () => {
    fetchReport();
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setAccountType('all');
    setStatus('all');
    setGroupBy('month');
    setSearch('');
    setTimeout(() => {
      fetchReport();
    }, 0);
  };

  const exportCsv = () => {
    const headers = ['Period', 'Deposit Amount', 'Deposit Transactions', 'Accounts Count', 'Previous Amount', 'Growth %'];

    const rows = periods.map((row) => [
      formatPeriod(row.period, groupBy),
      amount(row.deposit_amount),
      String(row.deposit_transactions),
      String(row.accounts_count),
      row.previous_amount === null ? '-' : amount(row.previous_amount),
      row.growth_percent === null ? '-' : `${row.growth_percent.toFixed(2)}%`,
    ]);

    const csv = [headers, ...rows].map((line) => line.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'deposit-growth-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const highestPeriod = useMemo(() => {
    if (periods.length === 0) return null;
    return periods.reduce((max, row) => (toNumber(row.deposit_amount) > toNumber(max.deposit_amount) ? row : max), periods[0]);
  }, [periods]);

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
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(146,64,14,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700 border border-orange-100">
                Savings Reports
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Deposit Growth Report</h1>
              <p className="text-sm text-slate-600 mt-1">Period-over-period growth analysis for savings deposit inflows.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={periods.length === 0}
                onClick={exportCsv}
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

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="rounded-xl bg-white/90 border border-orange-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Deposits</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{amount(summary.total_deposit_amount)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-orange-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Deposit Transactions</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.total_deposit_transactions}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-orange-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Average Deposit</p>
              <p className="text-2xl font-extrabold text-cyan-700 mt-1">{amount(summary.avg_deposit_amount)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-orange-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unique Accounts</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.unique_accounts}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-orange-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Overall Growth</p>
              <p className={`text-2xl font-extrabold mt-1 ${(summary.overall_growth_percent ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {summary.overall_growth_percent === null ? '-' : `${summary.overall_growth_percent.toFixed(2)}%`}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-orange-100 shadow-[0_18px_40px_-24px_rgba(146,64,14,0.45)] p-5">
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
              placeholder="Search account/customer/reference"
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
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All Account Types</option>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="fixed_deposit">Fixed Deposit</option>
              <option value="investment">Investment</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active</option>
              <option value="dormant">Dormant</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="month">Group by Month</option>
              <option value="day">Group by Day</option>
            </select>
            <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
              <LineChart className="h-4 w-4 text-orange-700" />
              Periods Analysed: {summary.periods_count}
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              Peak Period: {highestPeriod ? `${formatPeriod(highestPeriod.period, groupBy)} (${amount(highestPeriod.deposit_amount)})` : '-'}
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-orange-100 shadow-[0_18px_40px_-24px_rgba(146,64,14,0.45)] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Growth Timeline</h2>
              <p className="text-xs text-slate-600 mt-1">Shows how deposits move from one period to the next.</p>
            </div>
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">
              {periods.length} periods
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : periods.length === 0 ? (
            <p className="text-sm text-slate-500">No deposit growth data found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-orange-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-orange-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Period</th>
                    <th className="px-3 py-2 font-semibold">Deposit Amount</th>
                    <th className="px-3 py-2 font-semibold">Transactions</th>
                    <th className="px-3 py-2 font-semibold">Accounts</th>
                    <th className="px-3 py-2 font-semibold">Previous Amount</th>
                    <th className="px-3 py-2 font-semibold">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((row) => (
                    <tr key={row.period} className="border-b border-orange-100 last:border-b-0">
                      <td className="px-3 py-2 font-semibold text-slate-900">{formatPeriod(row.period, groupBy)}</td>
                      <td className="px-3 py-2 text-emerald-700 font-semibold">{amount(row.deposit_amount)}</td>
                      <td className="px-3 py-2">{row.deposit_transactions}</td>
                      <td className="px-3 py-2">{row.accounts_count}</td>
                      <td className="px-3 py-2">{row.previous_amount === null ? '-' : amount(row.previous_amount)}</td>
                      <td className="px-3 py-2">
                        {row.growth_percent === null ? (
                          '-'
                        ) : (
                          <span className={`font-semibold ${row.growth_percent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {row.growth_percent.toFixed(2)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
