'use client';

import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type LoanRow = {
  id: number;
  status?: string | null;
  customer_no?: string | null;
  customer_name?: string | null;
  field_officer?: string | null;
  due_date?: string | null;
  refundable_amount?: number | string | null;
  installment_amount?: number | string | null;
  arrears_balance?: number | string | null;
};

type CollectionRow = {
  mf_loan_request_id: number | string;
  collected_amount?: number | string | null;
};

type ArrearsRow = {
  loanId: number;
  customerNo: string;
  customerName: string;
  fieldOfficer: string;
  dueDate: string;
  overdueDays: number;
  totalPayable: number;
  paidAmount: number;
  pendingAmount: number;
  rawArrearsAmount: number;
  arrearsAmount: number;
  status: string;
};

const API_BASE = getApiBaseUrl();

export default function ArrearsReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ArrearsRow[]>([]);
  const [officerFilter, setOfficerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'arrears'>('all');

  const branchId = Number(searchParams.get('branch_id') || 0) || undefined;

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadReport = async () => {
      setLoading(true);
      try {
        const [loanRes, collectionRes] = await Promise.all([
          axios.get(`${API_BASE}/microfinance/loan-requests`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            params: {
              branch_id: branchId,
            },
          }),
          axios.get(`${API_BASE}/microfinance/collections`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            params: {
              branch_id: branchId,
            },
          }),
        ]);

        const loans: LoanRow[] = Array.isArray(loanRes.data) ? loanRes.data : [];
        const collections: CollectionRow[] = Array.isArray(collectionRes.data) ? collectionRes.data : [];

        const paidByLoan = new Map<number, number>();
        collections.forEach((collection) => {
          const loanId = Number(collection.mf_loan_request_id || 0);
          if (!loanId) return;
          paidByLoan.set(loanId, (paidByLoan.get(loanId) || 0) + Number(collection.collected_amount || 0));
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const mapped = loans
          .filter((loan) => {
            const loanStatus = String(loan.status || '').toLowerCase();
            return loanStatus === 'approved' || loanStatus === 'released';
          })
          .map((loan) => {
            const loanId = Number(loan.id || 0);
            const dueDateText = String(loan.due_date || '').slice(0, 10);
            const dueDate = dueDateText ? new Date(`${dueDateText}T00:00:00`) : null;
            const dueDateValid = !!dueDate && !Number.isNaN(dueDate.getTime());

            const overdueDays = dueDateValid
              ? Math.max(Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)), 0)
              : 0;

            const totalPayable = Number(loan.refundable_amount || 0);
            const paidAmount = paidByLoan.get(loanId) || 0;
            const pendingAmount = Math.max(totalPayable - paidAmount, 0);
            const rawArrearsAmount = Math.max(Number(loan.arrears_balance || 0), 0);
            const installmentAmount = Math.max(Number(loan.installment_amount || 0), 0);

            const isOverdue = overdueDays > 0 && pendingAmount > 0;
            const status = rawArrearsAmount > 0 ? 'Arrears' : isOverdue ? 'Overdue' : 'Current';
            const arrearsAmount = rawArrearsAmount > 0
              ? rawArrearsAmount
              : isOverdue
                ? (installmentAmount > 0 ? installmentAmount : pendingAmount)
                : 0;
            return {
              loanId,
              customerNo: String(loan.customer_no || '-'),
              customerName: String(loan.customer_name || '-'),
              fieldOfficer: String(loan.field_officer || 'Unassigned'),
              dueDate: dueDateText || '-',
              overdueDays,
              totalPayable,
              paidAmount,
              pendingAmount,
              rawArrearsAmount,
              arrearsAmount,
              status,
            } as ArrearsRow;
          })
          .filter((row) => row.rawArrearsAmount > 0 || row.status === 'Overdue')
          .sort((a, b) => {
            if (b.arrearsAmount !== a.arrearsAmount) return b.arrearsAmount - a.arrearsAmount;
            return b.overdueDays - a.overdueDays;
          });

        setRows(mapped);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [token, branchId]);

  const officerOptions = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.fieldOfficer))).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (officerFilter !== 'all' && row.fieldOfficer.toLowerCase() !== officerFilter) {
        return false;
      }

      if (statusFilter === 'arrears' && row.rawArrearsAmount <= 0) {
        return false;
      }

      if (statusFilter === 'overdue' && row.status !== 'Overdue') {
        return false;
      }

      return true;
    });
  }, [rows, officerFilter, statusFilter]);

  const summary = useMemo(() => {
    const totals = filteredRows.reduce(
      (acc, row) => {
        acc.pending += row.pendingAmount;
        acc.arrears += row.arrearsAmount;
        acc.paid += row.paidAmount;
        return acc;
      },
      { pending: 0, arrears: 0, paid: 0 }
    );

    const overdueCount = filteredRows.filter((row) => row.status === 'Overdue').length;
    const arrearsCount = filteredRows.filter((row) => row.rawArrearsAmount > 0).length;

    return {
      ...totals,
      accountCount: filteredRows.length,
      overdueCount,
      arrearsCount,
    };
  }, [filteredRows]);

  const formatDate = (value: string) => {
    if (!value || value === '-') return '-';
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(parsed);
  };

  const formatMoney = (value: number) => Number(value || 0).toFixed(2);

  const getReportFileDate = () => new Date().toISOString().slice(0, 10);

  const handleDownloadCsv = () => {
    const headers = [
      'Loan ID',
      'Loan Code',
      'Customer',
      'Field Officer',
      'Due Date',
      'Overdue Days',
      'Total Payable',
      'Paid Amount',
      'Pending Amount',
      'Arrears Amount',
      'Status',
    ];

    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const body = filteredRows.map((row) => [
      row.loanId || '-',
      row.customerNo,
      row.customerName,
      row.fieldOfficer,
      formatDate(row.dueDate),
      row.overdueDays,
      formatMoney(row.totalPayable),
      formatMoney(row.paidAmount),
      formatMoney(row.pendingAmount),
      formatMoney(row.arrearsAmount),
      row.status,
    ]);

    const csv = [headers, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `arrears-report-${getReportFileDate()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const generatedAt = new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());

    const officerText = officerFilter === 'all' ? 'Officer: All' : `Officer: ${officerFilter}`;
    const statusText = `Status: ${statusFilter === 'all' ? 'All' : statusFilter}`;

    doc.setFontSize(16);
    doc.text('Arrears Report', 40, 40);
    doc.setFontSize(10);
    doc.text(`${officerText} | ${statusText} | Generated: ${generatedAt}`, 40, 58);

    autoTable(doc, {
      startY: 72,
      head: [[
        'Loan ID',
        'Loan Code',
        'Customer',
        'Field Officer',
        'Due Date',
        'Overdue Days',
        'Total Payable',
        'Paid',
        'Pending',
        'Arrears',
        'Status',
      ]],
      body: filteredRows.map((row) => [
        row.loanId || '-',
        row.customerNo,
        row.customerName,
        row.fieldOfficer,
        formatDate(row.dueDate),
        row.overdueDays,
        formatMoney(row.totalPayable),
        formatMoney(row.paidAmount),
        formatMoney(row.pendingAmount),
        formatMoney(row.arrearsAmount),
        row.status,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [217, 119, 6],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [255, 247, 237],
      },
      margin: { left: 24, right: 24, top: 72, bottom: 24 },
      theme: 'striped',
    });

    doc.save(`arrears-report-${getReportFileDate()}.pdf`);
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
                Reports Desk
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Arrears Report</h1>
              <p className="text-sm text-slate-600 mt-1">Track overdue and arrears-heavy loan accounts with pending exposure details.</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm"
            >
              Back
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Accounts</p>
              <p className="text-xs font-extrabold text-slate-900 mt-1">{summary.accountCount}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Overdue / Arrears</p>
              <p className="text-xs font-extrabold text-amber-700 mt-1">{summary.overdueCount} / {summary.arrearsCount}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending Amount</p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.pending)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Arrears Amount</p>
              <p className="text-2xl font-extrabold text-orange-700 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.arrears)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Paid Amount</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.paid)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Arrears Accounts</h2>
            <div className="flex items-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-semibold border border-emerald-200"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-3 py-2 rounded-xl bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-sm font-semibold border border-cyan-200"
              >
                Download PDF
              </button>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Officer</label>
                <select
                  value={officerFilter}
                  onChange={(e) => setOfficerFilter(e.target.value)}
                  className="mt-1 px-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                >
                  <option value="all">All Officers</option>
                  {officerOptions.map((officer) => (
                    <option key={officer} value={officer.toLowerCase()}>
                      {officer}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'overdue' | 'arrears')}
                  className="mt-1 px-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                >
                  <option value="all">All</option>
                  <option value="overdue">Overdue</option>
                  <option value="arrears">Arrears</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOfficerFilter('all');
                  setStatusFilter('all');
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
              >
                Reset
              </button>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-100/60 to-teal-100/40 p-8 text-sm text-slate-700 text-center">
              No arrears data found for selected filters.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Loan ID</th>
                    <th className="px-3 py-2 font-semibold">Loan Code</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Field Officer</th>
                    <th className="px-3 py-2 font-semibold">Due Date</th>
                    <th className="px-3 py-2 font-semibold">Overdue Days</th>
                    <th className="px-3 py-2 font-semibold">Total Payable</th>
                    <th className="px-3 py-2 font-semibold">Paid</th>
                    <th className="px-3 py-2 font-semibold">Pending</th>
                    <th className="px-3 py-2 font-semibold">Arrears</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.loanId} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                      <td className="px-3 py-2">{row.loanId || '-'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.customerNo}</td>
                      <td className="px-3 py-2">{row.customerName}</td>
                      <td className="px-3 py-2">{row.fieldOfficer}</td>
                      <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                      <td className="px-3 py-2 font-semibold text-amber-700">{row.overdueDays}</td>
                      <td className="px-3 py-2">{formatMoney(row.totalPayable)}</td>
                      <td className="px-3 py-2 text-emerald-700">{formatMoney(row.paidAmount)}</td>
                      <td className="px-3 py-2 font-semibold text-rose-700">{formatMoney(row.pendingAmount)}</td>
                      <td className="px-3 py-2 font-semibold text-orange-700">{formatMoney(row.arrearsAmount)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          row.status === 'Arrears'
                            ? 'border-orange-200 bg-orange-50 text-orange-800'
                            : row.status === 'Overdue'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}>
                          {row.status}
                        </span>
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
