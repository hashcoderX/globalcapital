'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type LoanRow = {
  id: number;
  customer_no?: string | null;
  customer_name?: string | null;
  field_officer?: string | null;
};

type CollectionRow = {
  id: number;
  mf_loan_request_id: number | string;
  collection_date?: string | null;
  created_at?: string | null;
  collected_amount?: number | string;
  capital_amount?: number | string;
  interest_amount?: number | string;
  penalty_amount?: number | string;
  payment_type?: string | null;
  payment_reference?: string | null;
};

type TransactionRow = {
  id: number;
  date: string;
  loanId: number;
  customerNo: string;
  customerName: string;
  fieldOfficer: string;
  collected: number;
  capital: number;
  interest: number;
  penalty: number;
  paymentType: string;
  reference: string;
};

const API_BASE = 'http://localhost:8000/api';

export default function FieldOfficerCollectionReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [officerFilter, setOfficerFilter] = useState('all');

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

        const loanMap = new Map<number, LoanRow>();
        loans.forEach((loan) => {
          loanMap.set(Number(loan.id), loan);
        });

        const mapped: TransactionRow[] = collections
          .map((collection) => {
            const loanId = Number(collection.mf_loan_request_id || 0);
            const loan = loanMap.get(loanId);

            return {
              id: Number(collection.id),
              date: String(collection.collection_date || collection.created_at || ''),
              loanId,
              customerNo: String(loan?.customer_no || '-'),
              customerName: String(loan?.customer_name || '-'),
              fieldOfficer: String(loan?.field_officer || 'Unassigned'),
              collected: Number(collection.collected_amount || 0),
              capital: Number(collection.capital_amount || 0),
              interest: Number(collection.interest_amount || 0),
              penalty: Number(collection.penalty_amount || 0),
              paymentType: String(collection.payment_type || '-').replace('_', ' '),
              reference: String(collection.payment_reference || '-'),
            };
          })
          .sort((a, b) => {
            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();
            return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
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
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return rows.filter((row) => {
      const rowDate = row.date ? new Date(row.date) : null;

      if (from && rowDate && !Number.isNaN(rowDate.getTime()) && rowDate < from) {
        return false;
      }

      if (to && rowDate && !Number.isNaN(rowDate.getTime()) && rowDate > to) {
        return false;
      }

      if (officerFilter !== 'all') {
        return row.fieldOfficer.toLowerCase() === officerFilter;
      }

      return true;
    });
  }, [rows, fromDate, toDate, officerFilter]);

  const officerSummaries = useMemo(() => {
    const map = new Map<string, {
      officer: string;
      transactions: number;
      collected: number;
      capital: number;
      interest: number;
      penalty: number;
      loanIds: Set<number>;
    }>();

    filteredRows.forEach((row) => {
      const key = row.fieldOfficer || 'Unassigned';
      const existing = map.get(key) || {
        officer: key,
        transactions: 0,
        collected: 0,
        capital: 0,
        interest: 0,
        penalty: 0,
        loanIds: new Set<number>(),
      };

      existing.transactions += 1;
      existing.collected += row.collected;
      existing.capital += row.capital;
      existing.interest += row.interest;
      existing.penalty += row.penalty;
      if (row.loanId) {
        existing.loanIds.add(row.loanId);
      }

      map.set(key, existing);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        loanCount: item.loanIds.size,
      }))
      .sort((a, b) => b.collected - a.collected);
  }, [filteredRows]);

  const summary = useMemo(() => {
    const totals = filteredRows.reduce(
      (acc, row) => {
        acc.collected += row.collected;
        acc.capital += row.capital;
        acc.interest += row.interest;
        acc.penalty += row.penalty;
        return acc;
      },
      { collected: 0, capital: 0, interest: 0, penalty: 0 }
    );

    return {
      ...totals,
      transactionCount: filteredRows.length,
      officerCount: officerSummaries.length,
    };
  }, [filteredRows, officerSummaries.length]);

  const formatDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value || '-';
    }

    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(parsed);
  };

  const formatMoney = (value: number) => Number(value || 0).toFixed(2);

  const getReportFileDate = () => new Date().toISOString().slice(0, 10);

  const handleDownloadCsv = () => {
    const headers = [
      'Date & Time',
      'Field Officer',
      'Loan ID',
      'Loan Code',
      'Customer',
      'Payment Type',
      'Reference',
      'Collected',
      'Capital',
      'Interest',
      'Penalty',
    ];

    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const body = filteredRows.map((row) => [
      formatDateTime(row.date),
      row.fieldOfficer,
      row.loanId || '-',
      row.customerNo,
      row.customerName,
      row.paymentType,
      row.reference,
      formatMoney(row.collected),
      formatMoney(row.capital),
      formatMoney(row.interest),
      formatMoney(row.penalty),
    ]);

    const csv = [headers, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `field-officer-collection-report-${getReportFileDate()}.csv`;
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

    const dateFilterText =
      fromDate || toDate
        ? `Range: ${fromDate || 'Start'} to ${toDate || 'End'}`
        : 'Range: All Dates';

    const officerText = officerFilter === 'all' ? 'Officer: All' : `Officer: ${officerFilter}`;

    doc.setFontSize(16);
    doc.text('Field Officer Collection Report', 40, 40);
    doc.setFontSize(10);
    doc.text(`${dateFilterText} | ${officerText} | Generated: ${generatedAt}`, 40, 58);

    autoTable(doc, {
      startY: 72,
      head: [[
        'Date & Time',
        'Field Officer',
        'Loan ID',
        'Loan Code',
        'Customer',
        'Payment Type',
        'Reference',
        'Collected',
        'Capital',
        'Interest',
        'Penalty',
      ]],
      body: filteredRows.map((row) => [
        formatDateTime(row.date),
        row.fieldOfficer,
        row.loanId || '-',
        row.customerNo,
        row.customerName,
        row.paymentType,
        row.reference,
        formatMoney(row.collected),
        formatMoney(row.capital),
        formatMoney(row.interest),
        formatMoney(row.penalty),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [2, 132, 199],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
      margin: { left: 24, right: 24, top: 72, bottom: 24 },
      theme: 'striped',
    });

    doc.save(`field-officer-collection-report-${getReportFileDate()}.pdf`);
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
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Field Officer Collection Report</h1>
              <p className="text-sm text-slate-600 mt-1">Measure collection outcomes by officer with contribution and trend visibility.</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm"
            >
              Back
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Transactions</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.transactionCount}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Officers</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.officerCount}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Collected</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.collected)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Capital</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.capital)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Interest</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.interest)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Penalty</p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.penalty)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Officer Performance Summary</h2>
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
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 px-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 px-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setOfficerFilter('all');
                  setFromDate('');
                  setToDate('');
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
              >
                Reset
              </button>
            </div>
          </div>

          {officerSummaries.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-100/60 to-teal-100/40 p-8 text-sm text-slate-700 text-center">
              No data found for selected filters.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Field Officer</th>
                    <th className="px-3 py-2 font-semibold">Transactions</th>
                    <th className="px-3 py-2 font-semibold">Loans Covered</th>
                    <th className="px-3 py-2 font-semibold">Collected</th>
                    <th className="px-3 py-2 font-semibold">Capital</th>
                    <th className="px-3 py-2 font-semibold">Interest</th>
                    <th className="px-3 py-2 font-semibold">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {officerSummaries.map((item) => (
                    <tr key={item.officer} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                      <td className="px-3 py-2 font-semibold text-slate-900">{item.officer}</td>
                      <td className="px-3 py-2">{item.transactions}</td>
                      <td className="px-3 py-2">{item.loanCount}</td>
                      <td className="px-3 py-2 font-semibold text-emerald-700">{formatMoney(item.collected)}</td>
                      <td className="px-3 py-2">{formatMoney(item.capital)}</td>
                      <td className="px-3 py-2">{formatMoney(item.interest)}</td>
                      <td className="px-3 py-2">{formatMoney(item.penalty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <h2 className="text-lg font-bold text-slate-900">Transaction Details</h2>

          {filteredRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-100/60 to-teal-100/40 p-8 text-sm text-slate-700 text-center">
              No transactions available.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date & Time</th>
                    <th className="px-3 py-2 font-semibold">Field Officer</th>
                    <th className="px-3 py-2 font-semibold">Loan ID</th>
                    <th className="px-3 py-2 font-semibold">Loan Code</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Payment Type</th>
                    <th className="px-3 py-2 font-semibold">Reference</th>
                    <th className="px-3 py-2 font-semibold">Collected</th>
                    <th className="px-3 py-2 font-semibold">Capital</th>
                    <th className="px-3 py-2 font-semibold">Interest</th>
                    <th className="px-3 py-2 font-semibold">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                      <td className="px-3 py-2">{formatDateTime(row.date)}</td>
                      <td className="px-3 py-2">{row.fieldOfficer}</td>
                      <td className="px-3 py-2">{row.loanId || '-'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.customerNo}</td>
                      <td className="px-3 py-2">{row.customerName}</td>
                      <td className="px-3 py-2 capitalize">{row.paymentType}</td>
                      <td className="px-3 py-2">{row.reference}</td>
                      <td className="px-3 py-2 font-semibold text-emerald-700">{formatMoney(row.collected)}</td>
                      <td className="px-3 py-2">{formatMoney(row.capital)}</td>
                      <td className="px-3 py-2">{formatMoney(row.interest)}</td>
                      <td className="px-3 py-2">{formatMoney(row.penalty)}</td>
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
