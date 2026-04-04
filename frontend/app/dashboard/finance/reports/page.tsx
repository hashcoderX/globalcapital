'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarRange,
  Download,
  FileText,
  HandCoins,
  Layers,
  PieChart,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';

type FinanceRow = {
  id: number;
  finance_type?: string | null;
  product_type?: string | null;
  financed_amount?: number | string | null;
  amount?: number | string | null;
  total_paid_amount?: number | string | null;
  balance_amount?: number | string | null;
  arrears?: number | string | null;
  due_amount?: number | string | null;
  due_date?: string | null;
  installment_amount?: number | string | null;
  interest_rate?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  customer?: {
    customer_code?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatAmount(value: unknown): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: unknown): string {
  if (!value) return '-';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function daysPastDue(value: unknown): number {
  if (!value) return 0;
  const due = new Date(String(value));
  if (Number.isNaN(due.getTime())) return 0;

  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, headers: string[], data: Array<Array<string>>) {
  const csv = [headers, ...data].map((row) => row.map(csvEscape).join(',')).join('\n');
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

export default function FinanceReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FinanceRow[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const fetchRows = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/finances?per_page=1000', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          setRows([]);
          return;
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        setRows(data as FinanceRow[]);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [token]);

  const productOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => String(r.product_type || '').trim()).filter((v) => v !== '')))
      .sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return rows.filter((row) => {
      if (statusFilter !== 'all' && String(row.status || '').toLowerCase() !== statusFilter) return false;
      if (productFilter !== 'all' && String(row.product_type || '').toLowerCase() !== productFilter) return false;

      if (from || to) {
        const created = row.created_at ? new Date(String(row.created_at)) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        if (from && created < from) return false;
        if (to && created > to) return false;
      }

      if (!q) return true;

      const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
      const haystack = [
        row.id,
        row.product_type || '',
        row.finance_type || '',
        row.status || '',
        row.customer?.customer_code || '',
        customerName,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, search, statusFilter, productFilter, fromDate, toDate]);

  const metrics = useMemo(() => {
    const totalAccounts = filteredRows.length;

    const totalFinanced = filteredRows.reduce((sum, row) => {
      const value = toNumber(row.financed_amount ?? row.amount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const totalCollected = filteredRows.reduce((sum, row) => {
      const value = toNumber(row.total_paid_amount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const totalOutstanding = filteredRows.reduce((sum, row) => {
      const value = toNumber(row.balance_amount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const totalArrears = filteredRows.reduce((sum, row) => {
      const value = toNumber(row.arrears);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const activeCount = filteredRows.filter((r) => String(r.status || '').toLowerCase() === 'active').length;
    const settledCount = filteredRows.filter((r) => String(r.status || '').toLowerCase() === 'settled').length;
    const pendingCount = filteredRows.filter((r) => String(r.status || '').toLowerCase() === 'pending_approval').length;

    const atRiskCount = filteredRows.filter((row) => {
      const arrears = Math.max(0, Number(row.arrears || 0));
      const overdueDays = daysPastDue(row.due_date);
      return arrears > 0 || overdueDays > 0;
    }).length;

    const collectionRate = totalFinanced > 0 ? (totalCollected / totalFinanced) * 100 : 0;

    return {
      totalAccounts,
      totalFinanced,
      totalCollected,
      totalOutstanding,
      totalArrears,
      activeCount,
      settledCount,
      pendingCount,
      atRiskCount,
      collectionRate,
    };
  }, [filteredRows]);

  const statusReport = useMemo(() => {
    const map = new Map<string, { count: number; financed: number; outstanding: number; arrears: number }>();

    filteredRows.forEach((row) => {
      const key = String(row.status || 'unknown').toLowerCase();
      const financed = Number(row.financed_amount ?? row.amount ?? 0);
      const outstanding = Number(row.balance_amount || 0);
      const arrears = Number(row.arrears || 0);
      const prev = map.get(key) || { count: 0, financed: 0, outstanding: 0, arrears: 0 };

      map.set(key, {
        count: prev.count + 1,
        financed: prev.financed + (Number.isFinite(financed) ? financed : 0),
        outstanding: prev.outstanding + (Number.isFinite(outstanding) ? outstanding : 0),
        arrears: prev.arrears + (Number.isFinite(arrears) ? arrears : 0),
      });
    });

    return Array.from(map.entries())
      .map(([status, info]) => ({ status, ...info }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRows]);

  const productReport = useMemo(() => {
    const map = new Map<string, { count: number; financed: number; avgRate: number; rateSamples: number }>();

    filteredRows.forEach((row) => {
      const key = String(row.product_type || 'unassigned').trim() || 'unassigned';
      const financed = Number(row.financed_amount ?? row.amount ?? 0);
      const rate = Number(row.interest_rate || 0);
      const prev = map.get(key) || { count: 0, financed: 0, avgRate: 0, rateSamples: 0 };

      map.set(key, {
        count: prev.count + 1,
        financed: prev.financed + (Number.isFinite(financed) ? financed : 0),
        avgRate: prev.avgRate + (Number.isFinite(rate) ? rate : 0),
        rateSamples: prev.rateSamples + (Number.isFinite(rate) ? 1 : 0),
      });
    });

    return Array.from(map.entries())
      .map(([product, info]) => ({
        product,
        count: info.count,
        financed: info.financed,
        avgRate: info.rateSamples > 0 ? info.avgRate / info.rateSamples : 0,
      }))
      .sort((a, b) => b.financed - a.financed);
  }, [filteredRows]);

  const arrearsAgingReport = useMemo(() => {
    const buckets = [
      { label: 'Current (0 days)', key: 'current', count: 0, arrears: 0 },
      { label: '1-30 days', key: 'd30', count: 0, arrears: 0 },
      { label: '31-60 days', key: 'd60', count: 0, arrears: 0 },
      { label: '61-90 days', key: 'd90', count: 0, arrears: 0 },
      { label: '90+ days', key: 'd90p', count: 0, arrears: 0 },
    ];

    filteredRows.forEach((row) => {
      const days = daysPastDue(row.due_date);
      const arrears = Math.max(0, Number(row.arrears || 0));

      if (days <= 0) {
        buckets[0].count += 1;
        buckets[0].arrears += arrears;
      } else if (days <= 30) {
        buckets[1].count += 1;
        buckets[1].arrears += arrears;
      } else if (days <= 60) {
        buckets[2].count += 1;
        buckets[2].arrears += arrears;
      } else if (days <= 90) {
        buckets[3].count += 1;
        buckets[3].arrears += arrears;
      } else {
        buckets[4].count += 1;
        buckets[4].arrears += arrears;
      }
    });

    return buckets;
  }, [filteredRows]);

  const riskWatchlist = useMemo(() => {
    return filteredRows
      .map((row) => {
        const financed = Number(row.financed_amount ?? row.amount ?? 0);
        const arrears = Math.max(0, Number(row.arrears || 0));
        const outstanding = Math.max(0, Number(row.balance_amount || 0));
        const due = Math.max(0, Number(row.due_amount || 0));
        const overdueDays = daysPastDue(row.due_date);
        const riskScore = arrears + overdueDays * 100 + due * 0.1;

        return {
          ...row,
          financed,
          arrears,
          outstanding,
          due,
          overdueDays,
          riskScore,
        };
      })
      .filter((row) => row.arrears > 0 || row.overdueDays > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }, [filteredRows]);

  const monthlyReport = useMemo(() => {
    const map = new Map<string, { count: number; financed: number; collected: number }>();

    filteredRows.forEach((row) => {
      const date = row.created_at ? new Date(String(row.created_at)) : null;
      if (!date || Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const financed = Number(row.financed_amount ?? row.amount ?? 0);
      const collected = Number(row.total_paid_amount || 0);
      const prev = map.get(key) || { count: 0, financed: 0, collected: 0 };

      map.set(key, {
        count: prev.count + 1,
        financed: prev.financed + (Number.isFinite(financed) ? financed : 0),
        collected: prev.collected + (Number.isFinite(collected) ? collected : 0),
      });
    });

    return Array.from(map.entries())
      .map(([month, info]) => {
        const collectionRate = info.financed > 0 ? (info.collected / info.financed) * 100 : 0;
        const profitLoss = info.collected - info.financed;
        const profitLossRate = info.financed > 0 ? (profitLoss / info.financed) * 100 : 0;

        return {
          month,
          ...info,
          collectionRate,
          profitLoss,
          profitLossRate,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [filteredRows]);

  const exportPortfolioSnapshot = () => {
    const headers = [
      'Finance ID',
      'Customer Code',
      'Product',
      'Status',
      'Financed',
      'Collected',
      'Outstanding',
      'Arrears',
      'Due Amount',
      'Due Date',
      'Created At',
    ];

    const data = filteredRows.map((row) => [
      String(row.id),
      String(row.customer?.customer_code || '-'),
      String(row.product_type || '-'),
      String(row.status || '-'),
      formatAmount(row.financed_amount ?? row.amount),
      formatAmount(row.total_paid_amount),
      formatAmount(row.balance_amount),
      formatAmount(row.arrears),
      formatAmount(row.due_amount),
      formatDate(row.due_date),
      formatDate(row.created_at),
    ]);

    downloadCsv('finance-portfolio-snapshot.csv', headers, data);
  };

  const exportRiskWatchlist = () => {
    const headers = [
      'Finance ID',
      'Customer Code',
      'Product',
      'Status',
      'Overdue Days',
      'Arrears',
      'Due Amount',
      'Outstanding',
      'Risk Score',
    ];

    const data = riskWatchlist.map((row) => [
      String(row.id),
      String(row.customer?.customer_code || '-'),
      String(row.product_type || '-'),
      String(row.status || '-'),
      String(row.overdueDays),
      formatAmount(row.arrears),
      formatAmount(row.due),
      formatAmount(row.outstanding),
      formatAmount(row.riskScore),
    ]);

    downloadCsv('finance-risk-watchlist.csv', headers, data);
  };

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/90 rounded-3xl border border-cyan-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Finance Manager Console</p>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Finance Reports</h1>
            <p className="text-sm text-slate-600 mt-1">All reports below are built directly from the finance portfolio dataset.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={exportPortfolioSnapshot}
              className="px-4 py-2 rounded-xl bg-white border border-cyan-200 text-cyan-800 text-sm font-semibold inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Portfolio CSV
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/finance')}
              className="px-4 py-2 rounded-xl bg-white border border-cyan-200 text-cyan-800 text-sm font-semibold inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        <div className="bg-white/90 rounded-3xl border border-cyan-100 p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 rounded-xl border border-cyan-100 bg-cyan-50/40 px-3 py-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-700" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search finance id, customer code, product, status"
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-500 outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="settled">Settled</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All Products</option>
              {productOptions.map((p) => (
                <option key={p} value={p.toLowerCase()}>{p}</option>
              ))}
            </select>

            <div className="rounded-xl border border-cyan-100 bg-white px-3 py-2 flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-cyan-700" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-sm text-slate-900 outline-none"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-sm text-slate-900 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4">
            <div className="inline-flex items-center gap-2 text-cyan-700"><Layers className="h-4 w-4" /><p className="text-xs font-bold uppercase">Accounts</p></div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.totalAccounts}</p>
            <p className="text-xs text-slate-500 mt-1">Active: {metrics.activeCount} | Pending: {metrics.pendingCount}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4">
            <div className="inline-flex items-center gap-2 text-emerald-700"><TrendingUp className="h-4 w-4" /><p className="text-xs font-bold uppercase">Financed</p></div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatAmount(metrics.totalFinanced)}</p>
            <p className="text-xs text-slate-500 mt-1">Settled accounts: {metrics.settledCount}</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4">
            <div className="inline-flex items-center gap-2 text-blue-700"><HandCoins className="h-4 w-4" /><p className="text-xs font-bold uppercase">Collected</p></div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatAmount(metrics.totalCollected)}</p>
            <p className="text-xs text-slate-500 mt-1">Collection rate: {metrics.collectionRate.toFixed(2)}%</p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white/90 p-4">
            <div className="inline-flex items-center gap-2 text-amber-700"><BarChart3 className="h-4 w-4" /><p className="text-xs font-bold uppercase">Outstanding</p></div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatAmount(metrics.totalOutstanding)}</p>
            <p className="text-xs text-slate-500 mt-1">Still to recover from running book</p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white/90 p-4">
            <div className="inline-flex items-center gap-2 text-rose-700"><AlertTriangle className="h-4 w-4" /><p className="text-xs font-bold uppercase">Arrears</p></div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatAmount(metrics.totalArrears)}</p>
            <p className="text-xs text-slate-500 mt-1">At-risk accounts: {metrics.atRiskCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4">
            <div className="flex items-center gap-2 text-cyan-800 mb-3"><PieChart className="h-5 w-5" /><p className="font-bold">Status Report</p></div>
            <div className="overflow-x-auto rounded-lg border border-cyan-100">
              <table className="min-w-full text-xs text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Count</th>
                    <th className="px-2 py-2 font-semibold">Financed</th>
                    <th className="px-2 py-2 font-semibold">Outstanding</th>
                    <th className="px-2 py-2 font-semibold">Arrears</th>
                  </tr>
                </thead>
                <tbody>
                  {statusReport.map((item) => (
                    <tr key={item.status} className="border-b border-cyan-100 last:border-b-0">
                      <td className="px-2 py-2 capitalize">{item.status}</td>
                      <td className="px-2 py-2">{item.count}</td>
                      <td className="px-2 py-2">{formatAmount(item.financed)}</td>
                      <td className="px-2 py-2">{formatAmount(item.outstanding)}</td>
                      <td className="px-2 py-2">{formatAmount(item.arrears)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4">
            <div className="flex items-center gap-2 text-cyan-800 mb-3"><FileText className="h-5 w-5" /><p className="font-bold">Product Report</p></div>
            <div className="overflow-x-auto rounded-lg border border-cyan-100">
              <table className="min-w-full text-xs text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Product</th>
                    <th className="px-2 py-2 font-semibold">Accounts</th>
                    <th className="px-2 py-2 font-semibold">Financed</th>
                    <th className="px-2 py-2 font-semibold">Avg Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {productReport.map((item) => (
                    <tr key={item.product} className="border-b border-cyan-100 last:border-b-0">
                      <td className="px-2 py-2">{item.product}</td>
                      <td className="px-2 py-2">{item.count}</td>
                      <td className="px-2 py-2">{formatAmount(item.financed)}</td>
                      <td className="px-2 py-2">{item.avgRate.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-amber-100 bg-white/90 p-4">
            <div className="flex items-center gap-2 text-amber-800 mb-3"><ShieldAlert className="h-5 w-5" /><p className="font-bold">Arrears Aging Report</p></div>
            <div className="overflow-x-auto rounded-lg border border-amber-100">
              <table className="min-w-full text-xs text-left text-slate-700 bg-white">
                <thead className="bg-amber-50/70">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Aging Bucket</th>
                    <th className="px-2 py-2 font-semibold">Accounts</th>
                    <th className="px-2 py-2 font-semibold">Arrears</th>
                  </tr>
                </thead>
                <tbody>
                  {arrearsAgingReport.map((item) => (
                    <tr key={item.key} className="border-b border-amber-100 last:border-b-0">
                      <td className="px-2 py-2">{item.label}</td>
                      <td className="px-2 py-2">{item.count}</td>
                      <td className="px-2 py-2">{formatAmount(item.arrears)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-white/90 p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-2 text-indigo-800"><AlertTriangle className="h-5 w-5" /><p className="font-bold">Risk Watchlist (Top 10)</p></div>
              <button
                type="button"
                onClick={exportRiskWatchlist}
                className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 inline-flex items-center gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-indigo-100">
              <table className="min-w-full text-xs text-left text-slate-700 bg-white">
                <thead className="bg-indigo-50/70">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Finance</th>
                    <th className="px-2 py-2 font-semibold">Customer</th>
                    <th className="px-2 py-2 font-semibold">Overdue</th>
                    <th className="px-2 py-2 font-semibold">Arrears</th>
                    <th className="px-2 py-2 font-semibold">Due</th>
                    <th className="px-2 py-2 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {riskWatchlist.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-4 text-center text-slate-500">No at-risk accounts for selected filters.</td>
                    </tr>
                  ) : (
                    riskWatchlist.map((item) => (
                      <tr key={item.id} className="border-b border-indigo-100 last:border-b-0">
                        <td className="px-2 py-2">#{item.id}</td>
                        <td className="px-2 py-2">{item.customer?.customer_code || '-'}</td>
                        <td className="px-2 py-2">{item.overdueDays} days</td>
                        <td className="px-2 py-2">{formatAmount(item.arrears)}</td>
                        <td className="px-2 py-2">{formatAmount(item.due)}</td>
                        <td className="px-2 py-2 font-semibold text-indigo-800">{formatAmount(item.riskScore)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4">
          <div className="inline-flex items-center gap-2 text-cyan-800 mb-3"><BarChart3 className="h-5 w-5" /><p className="font-bold">Monthly Trend (Last 12 Months)</p></div>
          <div className="overflow-x-auto rounded-lg border border-cyan-100">
            <table className="min-w-full text-xs text-left text-slate-700 bg-white">
              <thead className="bg-cyan-50/70">
                <tr>
                  <th className="px-2 py-2 font-semibold">Month</th>
                  <th className="px-2 py-2 font-semibold">New Accounts</th>
                  <th className="px-2 py-2 font-semibold">Financed</th>
                  <th className="px-2 py-2 font-semibold">Collected</th>
                  <th className="px-2 py-2 font-semibold">Collected %</th>
                  <th className="px-2 py-2 font-semibold">Profit / Loss</th>
                  <th className="px-2 py-2 font-semibold">P/L %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center text-slate-500">No monthly trend data for selected filters.</td>
                  </tr>
                ) : (
                  monthlyReport.map((item) => (
                    <tr key={item.month} className="border-b border-cyan-100 last:border-b-0">
                      <td className="px-2 py-2">{item.month}</td>
                      <td className="px-2 py-2">{item.count}</td>
                      <td className="px-2 py-2">{formatAmount(item.financed)}</td>
                      <td className="px-2 py-2">{formatAmount(item.collected)}</td>
                      <td className="px-2 py-2 font-semibold text-cyan-800">{item.collectionRate.toFixed(2)}%</td>
                      <td className={`px-2 py-2 font-semibold ${item.profitLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.profitLoss >= 0 ? '+' : '-'}{formatAmount(Math.abs(item.profitLoss))}
                      </td>
                      <td className={`px-2 py-2 font-semibold ${item.profitLossRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.profitLossRate >= 0 ? '+' : '-'}{Math.abs(item.profitLossRate).toFixed(2)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
