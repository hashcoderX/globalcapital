'use client';

import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type LoanChargeRow = {
  id: number;
  status?: string | null;
  loan_code?: string | null;
  customer_no?: string | null;
  customer_name?: string | null;
  field_officer?: string | null;
  loan_request_date?: string | null;
  created_at?: string | null;
  charge_payment_mode?: 'deduct_from_loan' | 'hand_cash' | string | null;
  document_charges?: number | string | null;
  stamp_charges?: number | string | null;
  insurance_charges?: number | string | null;
};

type ChargeReportRow = {
  id: number;
  date: string;
  status: string;
  loanCode: string;
  customerNo: string;
  customerName: string;
  fieldOfficer: string;
  chargePaymentMode: string;
  documentCharges: number;
  stampCharges: number;
  insuranceCharges: number;
  totalCharges: number;
};

const API_BASE = getApiBaseUrl();

export default function ChargesReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ChargeReportRow[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [officerFilter, setOfficerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

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
        const response = await axios.get(`${API_BASE}/microfinance/loan-requests`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          params: {
            branch_id: branchId,
          },
        });

        const loans: LoanChargeRow[] = Array.isArray(response.data) ? response.data : [];

        const mapped = loans
          .map((loan) => {
            const documentCharges = Number(loan.document_charges || 0);
            const stampCharges = Number(loan.stamp_charges || 0);
            const insuranceCharges = Number(loan.insurance_charges || 0);
            const totalCharges = documentCharges + stampCharges + insuranceCharges;
            const date = String(loan.loan_request_date || loan.created_at || '');
            const status = String(loan.status || '').toLowerCase();

            return {
              id: Number(loan.id || 0),
              date,
              status,
              loanCode: String(loan.loan_code || `LR-${loan.id || 0}`),
              customerNo: String(loan.customer_no || '-'),
              customerName: String(loan.customer_name || '-'),
              fieldOfficer: String(loan.field_officer || 'Unassigned'),
              chargePaymentMode: String(loan.charge_payment_mode || '-').replace(/_/g, ' '),
              documentCharges,
              stampCharges,
              insuranceCharges,
              totalCharges,
            } as ChargeReportRow;
          })
          .filter((row) => row.totalCharges > 0)
          .sort((a, b) => b.totalCharges - a.totalCharges);

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
    const search = keyword.trim().toLowerCase();

    return rows.filter((row) => {
      const rowDate = row.date ? new Date(row.date) : null;

      if (from && rowDate && !Number.isNaN(rowDate.getTime()) && rowDate < from) {
        return false;
      }

      if (to && rowDate && !Number.isNaN(rowDate.getTime()) && rowDate > to) {
        return false;
      }

      if (officerFilter !== 'all' && row.fieldOfficer.toLowerCase() !== officerFilter) {
        return false;
      }

      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        row.loanCode,
        row.customerNo,
        row.customerName,
        row.fieldOfficer,
        row.chargePaymentMode,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [rows, fromDate, toDate, officerFilter, statusFilter, keyword]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.document += row.documentCharges;
        acc.stamp += row.stampCharges;
        acc.insurance += row.insuranceCharges;
        acc.total += row.totalCharges;
        return acc;
      },
      {
        document: 0,
        stamp: 0,
        insurance: 0,
        total: 0,
      }
    );
  }, [filteredRows]);

  const formatMoney = (value: number) => Number(value || 0).toFixed(2);

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
      hour12: false,
    }).format(parsed);
  };

  const getReportFileDate = () => new Date().toISOString().slice(0, 10);

  const handleDownloadCsv = () => {
    const headers = [
      'Date & Time',
      'Status',
      'Loan Code',
      'Customer No',
      'Customer',
      'Field Officer',
      'Charge Payment Mode',
      'Document Charges',
      'Stamp Charges',
      'Insurance Charges',
      'Total Charges',
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
      row.status || '-',
      row.loanCode,
      row.customerNo,
      row.customerName,
      row.fieldOfficer,
      row.chargePaymentMode,
      formatMoney(row.documentCharges),
      formatMoney(row.stampCharges),
      formatMoney(row.insuranceCharges),
      formatMoney(row.totalCharges),
    ]);

    const csv = [headers, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `microfinance-charges-report-${getReportFileDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    doc.setFontSize(15);
    doc.text('Microfinance Charges Report', 40, 40);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-LK')}`, 40, 58);
    doc.text(`Rows: ${filteredRows.length}`, 40, 72);
    doc.text(`Total Charges: LKR ${formatMoney(summary.total)}`, 40, 86);

    autoTable(doc, {
      startY: 100,
      head: [[
        'Date',
        'Status',
        'Loan Code',
        'Customer',
        'Officer',
        'Mode',
        'Document',
        'Stamp',
        'Insurance',
        'Total',
      ]],
      body: filteredRows.map((row) => [
        formatDateTime(row.date),
        row.status || '-',
        row.loanCode,
        `${row.customerNo} - ${row.customerName}`,
        row.fieldOfficer,
        row.chargePaymentMode,
        formatMoney(row.documentCharges),
        formatMoney(row.stampCharges),
        formatMoney(row.insuranceCharges),
        formatMoney(row.totalCharges),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [14, 116, 144],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 55 },
        2: { cellWidth: 70 },
        3: { cellWidth: 170 },
        4: { cellWidth: 95 },
        5: { cellWidth: 80 },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
      },
    });

    doc.save(`microfinance-charges-report-${getReportFileDate()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-cyan-100 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Microfinance Reports</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Charges Report</h1>
              <p className="mt-1 text-sm text-slate-600">
                Detailed breakdown of document, stamp, and insurance charges by loan and officer.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.back()}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleDownloadCsv}
                disabled={filteredRows.length === 0}
                className="px-3 py-2 rounded-lg border border-cyan-200 bg-cyan-50 text-sm font-semibold text-cyan-800 disabled:opacity-50"
              >
                Download CSV
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={filteredRows.length === 0}
                className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-sm font-semibold text-white disabled:opacity-50"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl border border-cyan-100 shadow-sm p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Field Officer</label>
              <select
                value={officerFilter}
                onChange={(e) => setOfficerFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm"
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
              <label className="text-xs font-semibold text-slate-600">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="released">Released</option>
                <option value="hold">Hold</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Search</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Loan code, customer, officer"
                className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            { label: 'Document Charges', value: summary.document },
            { label: 'Stamp Charges', value: summary.stamp },
            { label: 'Insurance Charges', value: summary.insurance },
            { label: 'Total Charges', value: summary.total },
            { label: 'Loans Count', value: filteredRows.length, isCount: true },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-cyan-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">
                {loading ? '...' : item.isCount ? Number(item.value).toLocaleString() : `LKR ${formatMoney(Number(item.value))}`}
              </p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-cyan-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Loan Code</th>
                <th className="px-3 py-2 text-left font-semibold">Customer</th>
                <th className="px-3 py-2 text-left font-semibold">Field Officer</th>
                <th className="px-3 py-2 text-left font-semibold">Mode</th>
                <th className="px-3 py-2 text-right font-semibold">Document</th>
                <th className="px-3 py-2 text-right font-semibold">Stamp</th>
                <th className="px-3 py-2 text-right font-semibold">Insurance</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-cyan-50">
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(row.date)}</td>
                  <td className="px-3 py-2 text-slate-700 uppercase">{row.status || '-'}</td>
                  <td className="px-3 py-2 text-slate-800 font-semibold">{row.loanCode}</td>
                  <td className="px-3 py-2 text-slate-700">{row.customerNo} - {row.customerName}</td>
                  <td className="px-3 py-2 text-slate-700">{row.fieldOfficer}</td>
                  <td className="px-3 py-2 text-slate-700 capitalize">{row.chargePaymentMode}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{formatMoney(row.documentCharges)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{formatMoney(row.stampCharges)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{formatMoney(row.insuranceCharges)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-cyan-700">{formatMoney(row.totalCharges)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No charge records found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
