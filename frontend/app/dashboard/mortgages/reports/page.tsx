'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { BarChart3, Banknote, CheckCircle2, Clock3, PieChart, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type MortgageRow = {
  id: number;
  created_at?: string | null;
  due_date?: string | null;
  mortgage_type?: string | null;
  requested_amount?: number | string | null;
  approved_amount?: number | string | null;
  installment_amount?: number | string | null;
  interest_rate?: number | string | null;
  interest_type?: string | null;
  tenure_months?: number | string | null;
  status?: string | null;
  installment_frequency?: string | null;
  interest_calculation_frequency?: string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
  } | null;
};

type PaymentRow = {
  id: number;
  paid_date?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  remarks?: string | null;
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

function getPeriodsPerYear(frequency: unknown): number {
  const map: Record<string, number> = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    yearly: 1,
  };
  const key = String(frequency || 'monthly').toLowerCase();
  return map[key] ?? 12;
}

function calculateInstallmentAmount(row: MortgageRow): number {
  const stored = toNumber(row.installment_amount);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const principal = toNumber(row.approved_amount ?? row.requested_amount);
  const annualRate = toNumber(row.interest_rate) / 100;
  const months = Math.max(1, Math.round(toNumber(row.tenure_months)));

  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(annualRate)) return NaN;

  const installmentPerYear = getPeriodsPerYear(row.installment_frequency);
  const interestCalcPerYear = getPeriodsPerYear(row.interest_calculation_frequency || 'monthly');
  const years = months / 12;
  const installmentCount = Math.max(1, Math.round(years * installmentPerYear));

  const effectiveAnnualRate = Math.pow(1 + (annualRate / interestCalcPerYear), interestCalcPerYear) - 1;
  const installmentRate = Math.pow(1 + effectiveAnnualRate, 1 / installmentPerYear) - 1;

  if (String(row.interest_type || '').toLowerCase() === 'reducing') {
    if (!Number.isFinite(installmentRate) || installmentRate <= 0) {
      return principal / installmentCount;
    }

    const pow = Math.pow(1 + installmentRate, installmentCount);
    return principal * installmentRate * pow / (pow - 1);
  }

  const totalInterest = principal * annualRate * years;
  return (principal + totalInterest) / installmentCount;
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

export default function MortgageReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MortgageRow[]>([]);
  const [runningPage, setRunningPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const PAGE_SIZE = 10;

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMortgage, setHistoryMortgage] = useState<MortgageRow | null>(null);
  const [historyRows, setHistoryRows] = useState<PaymentRow[]>([]);

  const [settledQuery, setSettledQuery] = useState('');
  const [settledFrom, setSettledFrom] = useState('');
  const [settledTo, setSettledTo] = useState('');

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
        const response = await axios.get('http://localhost:8000/api/mortgages', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        });

        const data = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];

        setRows(data);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [token]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const approved = rows.filter((row) => String(row.status || '').toLowerCase() === 'approved').length;
    const submitted = rows.filter((row) => String(row.status || '').toLowerCase() === 'submitted').length;

    const totalRequested = rows.reduce((sum, row) => {
      const amount = toNumber(row.requested_amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const totalApproved = rows.reduce((sum, row) => {
      const amount = toNumber(row.approved_amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const totalInstallment = rows.reduce((sum, row) => {
      const amount = toNumber(row.installment_amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    return {
      total,
      approved,
      submitted,
      totalRequested,
      totalApproved,
      totalInstallment,
    };
  }, [rows]);

  const byType = useMemo(() => {
    const map = new Map<string, { count: number; requested: number; approved: number }>();

    rows.forEach((row) => {
      const key = String(row.mortgage_type || 'unknown').toLowerCase();
      const requested = toNumber(row.requested_amount);
      const approved = toNumber(row.approved_amount);
      const current = map.get(key) || { count: 0, requested: 0, approved: 0 };
      map.set(key, {
        count: current.count + 1,
        requested: current.requested + (Number.isFinite(requested) ? requested : 0),
        approved: current.approved + (Number.isFinite(approved) ? approved : 0),
      });
    });

    return Array.from(map.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();

    rows.forEach((row) => {
      const key = String(row.status || 'unknown').toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const runningRows = useMemo(() => {
    const runningStatuses = new Set(['approved', 'active', 'arrears', 'released']);
    return rows.filter((row) => runningStatuses.has(String(row.status || '').trim().toLowerCase()));
  }, [rows]);

  const rejectedRows = useMemo(() => {
    return rows.filter((row) => String(row.status || '').toLowerCase() === 'rejected');
  }, [rows]);

  const settledRows = useMemo(() => {
    return rows.filter((row) => String(row.status || '').toLowerCase() === 'settled');
  }, [rows]);

  const filteredSettledRows = useMemo(() => {
    const q = settledQuery.trim().toLowerCase();

    return settledRows.filter((row) => {
      const haystack = [
        row.id,
        row.mortgage_type || '',
        row.status || '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesText = !q || haystack.includes(q);

      const createdRaw = row.created_at ? new Date(String(row.created_at)) : null;
      const hasValidCreated = !!createdRaw && !Number.isNaN(createdRaw.getTime());

      const fromDate = settledFrom ? new Date(`${settledFrom}T00:00:00`) : null;
      const toDate = settledTo ? new Date(`${settledTo}T23:59:59`) : null;

      const matchesFrom = !fromDate || (hasValidCreated && (createdRaw as Date) >= fromDate);
      const matchesTo = !toDate || (hasValidCreated && (createdRaw as Date) <= toDate);

      return matchesText && matchesFrom && matchesTo;
    });
  }, [settledRows, settledQuery, settledFrom, settledTo]);

  useEffect(() => {
    setRunningPage(1);
  }, [runningRows.length]);

  useEffect(() => {
    setRejectedPage(1);
  }, [rejectedRows.length]);

  const runningLastPage = Math.max(1, Math.ceil(runningRows.length / PAGE_SIZE));
  const rejectedLastPage = Math.max(1, Math.ceil(rejectedRows.length / PAGE_SIZE));

  const pagedRunningRows = useMemo(() => {
    const start = (runningPage - 1) * PAGE_SIZE;
    return runningRows.slice(start, start + PAGE_SIZE);
  }, [runningRows, runningPage]);

  const pagedRejectedRows = useMemo(() => {
    const start = (rejectedPage - 1) * PAGE_SIZE;
    return rejectedRows.slice(start, start + PAGE_SIZE);
  }, [rejectedRows, rejectedPage]);

  const downloadCsv = (fileName: string, headers: string[], data: Array<Array<string>>) => {
    const csv = [headers, ...data]
      .map((row) => row.map((cell) => csvEscape(cell)).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = (title: string, fileName: string, headers: string[], data: Array<Array<string>>) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(title, 14, 14);

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [8, 145, 178] },
    });

    doc.save(fileName);
  };

  const exportRunningCsv = () => {
    const headers = ['ID', 'Type', 'Approved Amount', 'Installment Amount', 'Interest', 'Tenure (Months)', 'Due Date', 'Refund Frequency', 'Interest Calc Frequency', 'Status', 'Created At'];
    const data = runningRows.map((row) => [
      String(row.id),
      String(row.mortgage_type || '-'),
      formatAmount(row.approved_amount ?? row.requested_amount),
      formatAmount(calculateInstallmentAmount(row)),
      Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}% (${row.interest_type || '-'})` : '-',
      String(row.tenure_months || '-'),
      formatDate(row.due_date),
      String(row.installment_frequency || '-'),
      String(row.interest_calculation_frequency || '-'),
      String(row.status || '-'),
      formatDate(row.created_at),
    ]);

    downloadCsv('running-mortgages-report.csv', headers, data);
  };

  const exportRunningPdf = () => {
    const headers = ['ID', 'Type', 'Approved Amount', 'Installment Amount', 'Interest', 'Tenure (Months)', 'Due Date', 'Refund Freq', 'Interest Calc Freq', 'Status', 'Created At'];
    const data = runningRows.map((row) => [
      String(row.id),
      String(row.mortgage_type || '-'),
      formatAmount(row.approved_amount ?? row.requested_amount),
      formatAmount(calculateInstallmentAmount(row)),
      Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}% (${row.interest_type || '-'})` : '-',
      String(row.tenure_months || '-'),
      formatDate(row.due_date),
      String(row.installment_frequency || '-'),
      String(row.interest_calculation_frequency || '-'),
      String(row.status || '-'),
      formatDate(row.created_at),
    ]);

    downloadPdf('Running Mortgages Report', 'running-mortgages-report.pdf', headers, data);
  };

  const exportRejectedCsv = () => {
    const headers = ['ID', 'Type', 'Requested Amount', 'Interest Rate', 'Due Date', 'Status', 'Created At'];
    const data = rejectedRows.map((row) => [
      String(row.id),
      String(row.mortgage_type || '-'),
      formatAmount(row.requested_amount),
      Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}%` : '-',
      formatDate(row.due_date),
      String(row.status || '-'),
      formatDate(row.created_at),
    ]);

    downloadCsv('rejected-mortgages-report.csv', headers, data);
  };

  const exportRejectedPdf = () => {
    const headers = ['ID', 'Type', 'Requested Amount', 'Interest Rate', 'Due Date', 'Status', 'Created At'];
    const data = rejectedRows.map((row) => [
      String(row.id),
      String(row.mortgage_type || '-'),
      formatAmount(row.requested_amount),
      Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}%` : '-',
      formatDate(row.due_date),
      String(row.status || '-'),
      formatDate(row.created_at),
    ]);

    downloadPdf('Rejected Mortgages Report', 'rejected-mortgages-report.pdf', headers, data);
  };

  const exportHistoryCsv = () => {
    if (!historyMortgage || historyRows.length === 0) return;
    const headers = ['Payment ID', 'Paid Date', 'Amount', 'Method', 'Remarks'];
    const data = historyRows.map((p) => [
      String(p.id),
      formatDate(p.paid_date),
      formatAmount(p.amount),
      String(p.payment_method || '-'),
      String(p.remarks || ''),
    ]);

    downloadCsv(`mortgage-${historyMortgage.id}-payments.csv`, headers, data);
  };

  const exportHistoryPdf = () => {
    if (!historyMortgage || historyRows.length === 0) return;
    const headers = ['Payment ID', 'Paid Date', 'Amount', 'Method', 'Remarks'];
    const data = historyRows.map((p) => [
      String(p.id),
      formatDate(p.paid_date),
      formatAmount(p.amount),
      String(p.payment_method || '-'),
      String(p.remarks || ''),
    ]);

    downloadPdf(
      `Mortgage Payment History #${historyMortgage.id}`,
      `mortgage-${historyMortgage.id}-payments.pdf`,
      headers,
      data,
    );
  };

  const openHistoryModal = async (row: MortgageRow) => {
    if (!token) return;
    setHistoryMortgage(row);
    setHistoryRows([]);
    setHistoryOpen(true);
    try {
      setHistoryLoading(true);
      const response = await axios.get(`http://localhost:8000/api/mortgages/${row.id}/payments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      setHistoryRows(data as PaymentRow[]);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
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
        <div className="bg-white/82 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
                Mortgage Reports
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Mortgage Report Center</h1>
              <p className="text-sm text-slate-600 mt-1">Dedicated mortgage analytics only. This page is separate from the main reports module.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard/mortgages')}
                className="px-4 py-2 rounded-xl bg-white hover:bg-cyan-50 text-cyan-800 text-sm font-semibold border border-cyan-200 shadow-sm"
              >
                Back to Mortgage Dashboard
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Records</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{metrics.approved}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{metrics.submitted}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Requested</p>
              <p className="text-2xl font-extrabold text-cyan-700 mt-1">{formatAmount(metrics.totalRequested)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Approved</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{formatAmount(metrics.totalApproved)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Installment Book</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{formatAmount(metrics.totalInstallment)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Running Mortgages Report</h2>
                <p className="text-xs text-slate-600 mt-1">Statuses included: approved, active, arrears, released</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
                  {runningRows.length} records
                </span>
                <button
                  type="button"
                  onClick={exportRunningCsv}
                  className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={exportRunningPdf}
                  className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-cyan-700 hover:to-blue-700"
                >
                  Download PDF
                </button>
              </div>
            </div>

            {runningRows.length === 0 ? (
              <p className="text-sm text-slate-500">No running mortgages found.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-cyan-100">
                <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                  <thead className="bg-cyan-50/70 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">ID</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Approved</th>
                      <th className="px-3 py-2 font-semibold">Installment</th>
                      <th className="px-3 py-2 font-semibold">Interest</th>
                      <th className="px-3 py-2 font-semibold">Tenure</th>
                      <th className="px-3 py-2 font-semibold">Due Date</th>
                      <th className="px-3 py-2 font-semibold">Terms</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRunningRows.map((row) => (
                      <tr key={row.id} className="border-b border-cyan-100 last:border-b-0">
                        <td className="px-3 py-2 font-semibold text-slate-900">#{row.id}</td>
                        <td className="px-3 py-2 capitalize">{row.mortgage_type || '-'}</td>
                        <td className="px-3 py-2">{formatAmount(row.approved_amount ?? row.requested_amount)}</td>
                        <td className="px-3 py-2 font-semibold text-cyan-800">{formatAmount(calculateInstallmentAmount(row))}</td>
                        <td className="px-3 py-2">{Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}% (${row.interest_type || '-'})` : '-'}</td>
                        <td className="px-3 py-2">{row.tenure_months || '-'} months</td>
                        <td className="px-3 py-2">{formatDate(row.due_date)}</td>
                        <td className="px-3 py-2">{row.installment_frequency || '-'} / {row.interest_calculation_frequency || '-'}</td>
                        <td className="px-3 py-2 capitalize">{row.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {runningRows.length > PAGE_SIZE && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-600">Page {runningPage} of {runningLastPage}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={runningPage <= 1}
                    onClick={() => setRunningPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={runningPage >= runningLastPage}
                    onClick={() => setRunningPage((p) => Math.min(runningLastPage, p + 1))}
                    className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-rose-100 shadow-[0_18px_40px_-24px_rgba(190,24,93,0.25)] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Rejected Mortgages Report</h2>
                <p className="text-xs text-slate-600 mt-1">Applications that ended in rejected status</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  {rejectedRows.length} records
                </span>
                <button
                  type="button"
                  onClick={exportRejectedCsv}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={exportRejectedPdf}
                  className="rounded-lg bg-gradient-to-r from-rose-600 to-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-rose-700 hover:to-red-700"
                >
                  Download PDF
                </button>
              </div>
            </div>

            {rejectedRows.length === 0 ? (
              <p className="text-sm text-slate-500">No rejected mortgages found.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-rose-100">
                <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                  <thead className="bg-rose-50/70 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">ID</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Requested</th>
                      <th className="px-3 py-2 font-semibold">Interest</th>
                      <th className="px-3 py-2 font-semibold">Due Date</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRejectedRows.map((row) => (
                      <tr key={row.id} className="border-b border-rose-100 last:border-b-0">
                        <td className="px-3 py-2 font-semibold text-slate-900">#{row.id}</td>
                        <td className="px-3 py-2 capitalize">{row.mortgage_type || '-'}</td>
                        <td className="px-3 py-2">{formatAmount(row.requested_amount)}</td>
                        <td className="px-3 py-2">{Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}%` : '-'}</td>
                        <td className="px-3 py-2">{formatDate(row.due_date)}</td>
                        <td className="px-3 py-2 capitalize">{row.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {rejectedRows.length > PAGE_SIZE && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-600">Page {rejectedPage} of {rejectedLastPage}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={rejectedPage <= 1}
                    onClick={() => setRejectedPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={rejectedPage >= rejectedLastPage}
                    onClick={() => setRejectedPage((p) => Math.min(rejectedLastPage, p + 1))}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-bold text-slate-900">By Mortgage Type</h2>
            </div>
            <div className="space-y-2">
              {byType.length === 0 ? (
                <p className="text-sm text-slate-500">No data available.</p>
              ) : (
                byType.map((item) => (
                  <div key={item.type} className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 capitalize">{item.type}</p>
                      <p className="text-xs text-slate-600">Approved: {formatAmount(item.approved)}</p>
                      <p className="text-xs text-slate-500">Requested: {formatAmount(item.requested)}</p>
                    </div>
                    <span className="text-sm font-bold text-cyan-700">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-bold text-slate-900">By Status</h2>
            </div>
            <div className="space-y-2">
              {byStatus.length === 0 ? (
                <p className="text-sm text-slate-500">No data available.</p>
              ) : (
                byStatus.map((item) => (
                  <div key={item.status} className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3 flex items-center justify-between">
                    <p className="font-semibold text-slate-900 capitalize">{item.status}</p>
                    <span className="text-sm font-bold text-cyan-700">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-emerald-100 shadow-[0_18px_40px_-24px_rgba(22,163,74,0.35)] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Settled Mortgages & History</h2>
              <p className="text-xs text-slate-600 mt-1">Fully settled mortgage portfolio and their repayment history</p>
            </div>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {filteredSettledRows.length} records
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end mb-3 text-xs">
            <input
              value={settledQuery}
              onChange={(e) => setSettledQuery(e.target.value)}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-slate-900 min-w-[180px]"
              placeholder="Filter by id or type"
            />
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Created From</span>
              <input
                type="date"
                value={settledFrom}
                onChange={(e) => setSettledFrom(e.target.value)}
                className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">To</span>
              <input
                type="date"
                value={settledTo}
                onChange={(e) => setSettledTo(e.target.value)}
                className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs text-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSettledQuery('');
                setSettledFrom('');
                setSettledTo('');
              }}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Clear
            </button>
          </div>

          {filteredSettledRows.length === 0 ? (
            <p className="text-sm text-slate-500">No settled mortgages found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-emerald-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-emerald-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">ID</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Approved</th>
                    <th className="px-3 py-2 font-semibold">Installment</th>
                    <th className="px-3 py-2 font-semibold">Interest</th>
                    <th className="px-3 py-2 font-semibold">Tenure</th>
                    <th className="px-3 py-2 font-semibold">Created</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold text-center">History</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSettledRows.map((row) => {
                    const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
                    return (
                    <tr key={row.id} className="border-b border-emerald-100 last:border-b-0">
                      <td className="px-3 py-2 font-semibold text-slate-900">#{row.id}</td>
                      <td className="px-3 py-2 capitalize">{row.mortgage_type || '-'}</td>
                      <td className="px-3 py-2">{customerName || '-'}</td>
                      <td className="px-3 py-2">{formatAmount(row.approved_amount ?? row.requested_amount)}</td>
                      <td className="px-3 py-2 font-semibold text-emerald-700">{formatAmount(calculateInstallmentAmount(row))}</td>
                      <td className="px-3 py-2">{Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}% (${row.interest_type || '-'})` : '-'}</td>
                      <td className="px-3 py-2">{row.tenure_months || '-'} months</td>
                      <td className="px-3 py-2">{formatDate(row.created_at)}</td>
                      <td className="px-3 py-2 capitalize">{row.status || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => openHistoryModal(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200"
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          View History
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-cyan-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-700" />
              <p className="font-bold text-slate-900">Portfolio Value Lens</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Track requested vs approved scale before final release decisions.</p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-700" />
              <p className="font-bold text-slate-900">Approval Throughput</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Measure pipeline movement from submitted applications to approved accounts.</p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-700" />
              <p className="font-bold text-slate-900">Repayment Strength</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Monitor installment volume for exposure and collection planning.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white/86 backdrop-blur-xl p-4 text-xs text-slate-500 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-cyan-700" />
          This page is a dedicated mortgage report surface and is intentionally not wired to the global dashboard reports section.
        </div>
      </div>

      {historyOpen && historyMortgage && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-emerald-100 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mortgage Payment History #{historyMortgage.id}</h3>
                <p className="text-sm text-slate-600 mt-1">Chronological list of all recorded payments for this mortgage.</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {historyLoading ? (
                <p className="text-sm text-slate-600">Loading payments...</p>
              ) : historyRows.length === 0 ? (
                <p className="text-sm text-slate-500">No payments found for this mortgage.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-emerald-100">
                    <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                      <thead className="bg-emerald-50/70 text-slate-700">
                        <tr>
                          <th className="px-3 py-2 font-semibold">ID</th>
                          <th className="px-3 py-2 font-semibold">Paid Date</th>
                          <th className="px-3 py-2 font-semibold">Amount</th>
                          <th className="px-3 py-2 font-semibold">Method</th>
                          <th className="px-3 py-2 font-semibold">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRows.map((p) => (
                          <tr key={p.id} className="border-b border-emerald-100 last:border-b-0">
                            <td className="px-3 py-2 font-semibold text-slate-900">#{p.id}</td>
                            <td className="px-3 py-2">{formatDate(p.paid_date)}</td>
                            <td className="px-3 py-2 font-semibold text-emerald-700">{formatAmount(p.amount)}</td>
                            <td className="px-3 py-2 capitalize">{p.payment_method || '-'}</td>
                            <td className="px-3 py-2">{p.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={exportHistoryCsv}
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                    >
                      Download CSV
                    </button>
                    <button
                      type="button"
                      onClick={exportHistoryPdf}
                      className="rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-emerald-700 hover:to-cyan-700"
                    >
                      Download PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
