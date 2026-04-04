'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Filter, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

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

export default function CashFlowReportPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productType, setProductType] = useState('all');
  const [status, setStatus] = useState('all');
  const [groupBy, setGroupBy] = useState('month');

  const [summary, setSummary] = useState<Summary>({
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
  const [rows, setRows] = useState<PeriodRow[]>([]);

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
      const response = await axios.get(`${API_URL}/api/finances/reports/cash-flow`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          product_type: productType === 'all' ? undefined : productType,
          status: status === 'all' ? undefined : status,
          group_by: groupBy,
        },
      });

      const payload = response.data || {};
      const periods = Array.isArray(payload.periods) ? payload.periods : [];

      setSummary({
        periods_count: Number(payload.summary?.periods_count || 0),
        total_cash_in: toNumber(payload.summary?.total_cash_in),
        total_cash_out: toNumber(payload.summary?.total_cash_out),
        total_refund_out: toNumber(payload.summary?.total_refund_out),
        total_effective_cash_out: toNumber(payload.summary?.total_effective_cash_out),
        net_cash_flow: toNumber(payload.summary?.net_cash_flow),
        ending_cash_balance: toNumber(payload.summary?.ending_cash_balance),
        total_collections: Number(payload.summary?.total_collections || 0),
        total_disbursements: Number(payload.summary?.total_disbursements || 0),
      });
      setRows(periods);
    } catch {
      setSummary({
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
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const applyFilters = () => {
    fetchReport();
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setProductType('all');
    setStatus('all');
    setGroupBy('month');
    setTimeout(() => {
      fetchReport();
    }, 0);
  };

  const exportCsv = () => {
    const headers = [
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

    const data = rows.map((row) => [
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

    const csv = [headers, ...data].map((line) => line.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash-flow-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-emerald-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-teal-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(5,150,105,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 border border-emerald-100">
                Finance Reports
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Cash Flow Report</h1>
              <p className="text-sm text-slate-600 mt-1">View period-wise cash inflows, outflows, and net movement for finance operations.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!hasRows}
                className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/reports')}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Reports Hub
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Cash In</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{amount(summary.total_cash_in)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Effective Cash Out</p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">{amount(summary.total_effective_cash_out)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Net Cash Flow</p>
              <p className={`text-2xl font-extrabold mt-1 ${summary.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {amount(summary.net_cash_flow)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Ending Balance</p>
              <p className={`text-2xl font-extrabold mt-1 ${summary.ending_cash_balance >= 0 ? 'text-cyan-700' : 'text-rose-700'}`}>
                {amount(summary.ending_cash_balance)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Collections / Disbursements</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.total_collections} / {summary.total_disbursements}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-emerald-100 shadow-[0_18px_40px_-24px_rgba(5,150,105,0.45)] p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">Filters</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-emerald-700 hover:to-teal-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <input
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              placeholder="Product type (or all)"
              className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="Status (or all)"
              className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="month">Group by Month</option>
              <option value="day">Group by Day</option>
            </select>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-emerald-100 shadow-[0_18px_40px_-24px_rgba(5,150,105,0.45)] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cash Flow Timeline</h2>
              <p className="text-xs text-slate-600 mt-1">Period-level inflow, outflow, and running balance movement.</p>
            </div>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              {rows.length} periods
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">No cash flow data found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-emerald-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-emerald-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Period</th>
                    <th className="px-3 py-2 font-semibold">Cash In</th>
                    <th className="px-3 py-2 font-semibold">Cash Out</th>
                    <th className="px-3 py-2 font-semibold">Refund Out</th>
                    <th className="px-3 py-2 font-semibold">Effective Out</th>
                    <th className="px-3 py-2 font-semibold">Net Flow</th>
                    <th className="px-3 py-2 font-semibold">Running Balance</th>
                    <th className="px-3 py-2 font-semibold">Counts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.period} className="border-b border-emerald-100 last:border-b-0">
                      <td className="px-3 py-2 font-semibold text-slate-900">{formatPeriod(row.period, groupBy)}</td>
                      <td className="px-3 py-2 text-emerald-700 font-semibold">{amount(row.cash_in)}</td>
                      <td className="px-3 py-2 text-rose-700">{amount(row.cash_out)}</td>
                      <td className="px-3 py-2 text-rose-700">{amount(row.refund_out)}</td>
                      <td className="px-3 py-2 font-semibold text-rose-700">{amount(row.effective_cash_out)}</td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold ${row.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {amount(row.net_cash_flow)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold ${row.running_cash_balance >= 0 ? 'text-cyan-700' : 'text-rose-700'}`}>
                          {amount(row.running_cash_balance)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{row.collection_count} / {row.disbursement_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-emerald-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-700" />
              <p className="font-bold text-slate-900">Inflow Strength</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Monitor collection cash-in across products and statuses.</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-700" />
              <p className="font-bold text-slate-900">Outflow Pressure</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Track disbursement and refund pressure period by period.</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-cyan-700" />
              <p className="font-bold text-slate-900">Liquidity Trend</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Running balance shows cash movement direction over time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
