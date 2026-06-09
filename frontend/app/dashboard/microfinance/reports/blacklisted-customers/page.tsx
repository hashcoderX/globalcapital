'use client';

import axios from 'axios';
import { getApiBaseUrl, getBackendOrigin } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Customer = {
  id: number;
  branch_id?: number | string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  customer_code?: string | null;
  phone?: string | null;
  contact_number?: string | null;
  email?: string | null;
  nic_passport?: string | null;
  status?: string | null;
};

type LoanRow = {
  id: number;
  customer_no?: string | null;
  customer_name?: string | null;
  nic?: string | null;
  status?: string | null;
  field_officer?: string | null;
  refundable_amount?: number | string | null;
  arrears_balance?: number | string | null;
};

type CollectionRow = {
  mf_loan_request_id: number | string;
  collected_amount?: number | string | null;
};

type AuthUser = {
  id: number;
  branch_id?: number | null;
  designation?: { id: number; name: string } | null;
};

type BlacklistedReportRow = {
  customerId: number;
  customerNo: string;
  customerName: string;
  nic: string;
  contact: string;
  email: string;
  status: string;
  linkedLoans: number;
  totalRefundable: number;
  totalCollected: number;
  pendingAmount: number;
  arrearsAmount: number;
  riskLevel: 'high' | 'medium' | 'low';
  fieldOfficer: string;
};

const API_BASE = getApiBaseUrl();

export default function BlacklistedCustomerReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BlacklistedReportRow[]>([]);
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const branchId = Number(searchParams.get('branch_id') || 0) || undefined;

  const designationName = String(authUser?.designation?.name || '').toLowerCase();
  const isFieldOfficer = designationName.includes('field') && designationName.includes('officer');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);

    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setAuthUser(JSON.parse(storedUser));
      } catch {
        setAuthUser(null);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadReport = async () => {
      setLoading(true);
      try {
        const customerParams =
          branchId
            ? { per_page: 1000, branch_id: branchId }
            : isFieldOfficer && authUser?.branch_id
              ? { per_page: 1000, branch_id: authUser.branch_id }
              : { per_page: 1000 };

        const [customerRes, loanRes, collectionRes] = await Promise.all([
          axios.get(`${API_BASE}/customers`, {
            params: customerParams,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
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

        const customerPayload = customerRes.data;
        const customers: Customer[] = Array.isArray(customerPayload)
          ? customerPayload
          : Array.isArray(customerPayload?.data)
          ? customerPayload.data
          : Array.isArray(customerPayload?.customers)
          ? customerPayload.customers
          : [];

        const loans: LoanRow[] = Array.isArray(loanRes.data) ? loanRes.data : [];
        const collections: CollectionRow[] = Array.isArray(collectionRes.data) ? collectionRes.data : [];

        const paidByLoan = new Map<number, number>();
        collections.forEach((collection) => {
          const loanId = Number(collection.mf_loan_request_id || 0);
          if (!loanId) return;
          paidByLoan.set(loanId, (paidByLoan.get(loanId) || 0) + Number(collection.collected_amount || 0));
        });

        const blacklistedCustomers = customers.filter(
          (customer) => String(customer.status || '').toLowerCase() === 'blacklisted'
        );

        const mapped: BlacklistedReportRow[] = blacklistedCustomers.map((customer) => {
          const customerNo = String(customer.customer_code || '').trim();
          const customerNic = String(customer.nic_passport || '').trim().toLowerCase();

          const linkedLoans = loans.filter((loan) => {
            const loanNo = String(loan.customer_no || '').trim();
            const loanNic = String(loan.nic || '').trim().toLowerCase();

            if (customerNo && loanNo && customerNo === loanNo) return true;
            if (customerNic && loanNic && customerNic === loanNic) return true;
            return false;
          });

          let totalRefundable = 0;
          let totalCollected = 0;
          let arrearsAmount = 0;
          let officer = 'Unassigned';

          linkedLoans.forEach((loan) => {
            const loanId = Number(loan.id || 0);
            totalRefundable += Number(loan.refundable_amount || 0);
            totalCollected += paidByLoan.get(loanId) || 0;
            arrearsAmount += Math.max(Number(loan.arrears_balance || 0), 0);
            if (officer === 'Unassigned' && String(loan.field_officer || '').trim() !== '') {
              officer = String(loan.field_officer);
            }
          });

          const pendingAmount = Math.max(totalRefundable - totalCollected, 0);
          const riskScore = pendingAmount + arrearsAmount;

          const riskLevel: 'high' | 'medium' | 'low' =
            riskScore >= 500000 || arrearsAmount >= 100000
              ? 'high'
              : riskScore >= 150000 || arrearsAmount > 0
              ? 'medium'
              : 'low';

          const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

          return {
            customerId: Number(customer.id),
            customerNo: customerNo || '-',
            customerName:
              String(customer.full_name || customer.name || fullName || `Customer #${customer.id}`).trim(),
            nic: String(customer.nic_passport || '-'),
            contact: String(customer.phone || customer.contact_number || '-'),
            email: String(customer.email || '-'),
            status: String(customer.status || '-'),
            linkedLoans: linkedLoans.length,
            totalRefundable,
            totalCollected,
            pendingAmount,
            arrearsAmount,
            riskLevel,
            fieldOfficer: officer,
          };
        });

        mapped.sort((a, b) => {
          const riskRank = { high: 3, medium: 2, low: 1 };
          if (riskRank[b.riskLevel] !== riskRank[a.riskLevel]) {
            return riskRank[b.riskLevel] - riskRank[a.riskLevel];
          }
          return b.pendingAmount + b.arrearsAmount - (a.pendingAmount + a.arrearsAmount);
        });

        setRows(mapped);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [token, isFieldOfficer, authUser?.branch_id, branchId]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => (riskFilter === 'all' ? true : row.riskLevel === riskFilter));
  }, [rows, riskFilter]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.count += 1;
        acc.linkedLoans += row.linkedLoans;
        acc.totalRefundable += row.totalRefundable;
        acc.totalCollected += row.totalCollected;
        acc.pending += row.pendingAmount;
        acc.arrears += row.arrearsAmount;
        if (row.riskLevel === 'high') acc.high += 1;
        if (row.riskLevel === 'medium') acc.medium += 1;
        if (row.riskLevel === 'low') acc.low += 1;
        return acc;
      },
      {
        count: 0,
        linkedLoans: 0,
        totalRefundable: 0,
        totalCollected: 0,
        pending: 0,
        arrears: 0,
        high: 0,
        medium: 0,
        low: 0,
      }
    );
  }, [filteredRows]);

  const formatMoney = (value: number) => Number(value || 0).toFixed(2);

  const getReportFileDate = () => new Date().toISOString().slice(0, 10);

  const handleDownloadCsv = () => {
    const headers = [
      'Customer ID',
      'Customer No',
      'Customer Name',
      'NIC',
      'Contact',
      'Email',
      'Status',
      'Risk Level',
      'Field Officer',
      'Linked Loans',
      'Total Refundable',
      'Total Collected',
      'Pending Amount',
      'Arrears Amount',
    ];

    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const body = filteredRows.map((row) => [
      row.customerId,
      row.customerNo,
      row.customerName,
      row.nic,
      row.contact,
      row.email,
      row.status,
      row.riskLevel,
      row.fieldOfficer,
      row.linkedLoans,
      formatMoney(row.totalRefundable),
      formatMoney(row.totalCollected),
      formatMoney(row.pendingAmount),
      formatMoney(row.arrearsAmount),
    ]);

    const csv = [headers, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `blacklisted-customer-report-${getReportFileDate()}.csv`;
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

    const riskText = `Risk: ${riskFilter}`;

    doc.setFontSize(16);
    doc.text('Blacklisted Customer Report', 40, 40);
    doc.setFontSize(10);
    doc.text(`${riskText} | Generated: ${generatedAt}`, 40, 58);

    autoTable(doc, {
      startY: 72,
      head: [[
        'Customer ID',
        'Customer No',
        'Customer Name',
        'Risk',
        'Field Officer',
        'Loans',
        'Refundable',
        'Collected',
        'Pending',
        'Arrears',
      ]],
      body: filteredRows.map((row) => [
        row.customerId,
        row.customerNo,
        row.customerName,
        row.riskLevel,
        row.fieldOfficer,
        row.linkedLoans,
        formatMoney(row.totalRefundable),
        formatMoney(row.totalCollected),
        formatMoney(row.pendingAmount),
        formatMoney(row.arrearsAmount),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242],
      },
      margin: { left: 24, right: 24, top: 72, bottom: 24 },
      theme: 'striped',
    });

    doc.save(`blacklisted-customer-report-${getReportFileDate()}.pdf`);
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
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Blacklisted Customer Report</h1>
              <p className="text-sm text-slate-600 mt-1">Analyze blacklisted customers with linked loan exposure and arrears risk profile.</p>
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
              <p className="text-xs uppercase tracking-wide text-slate-500">Blacklisted</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.count}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Linked Loans</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.linkedLoans}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.pending)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Arrears</p>
              <p className="text-2xl font-extrabold text-orange-700 mt-1">
                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.arrears)}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">High / Medium</p>
              <p className="text-2xl font-extrabold text-red-700 mt-1">{summary.high} / {summary.medium}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Low</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{summary.low}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Blacklisted Customers</h2>
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
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Risk Level</label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                  className="mt-1 px-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setRiskFilter('all')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
              >
                Reset
              </button>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-100/60 to-teal-100/40 p-8 text-sm text-slate-700 text-center">
              No blacklisted customers found for selected filters.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">ID</th>
                    <th className="px-3 py-2 font-semibold">Customer No</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">NIC</th>
                    <th className="px-3 py-2 font-semibold">Contact</th>
                    <th className="px-3 py-2 font-semibold">Field Officer</th>
                    <th className="px-3 py-2 font-semibold">Loans</th>
                    <th className="px-3 py-2 font-semibold">Collected</th>
                    <th className="px-3 py-2 font-semibold">Pending</th>
                    <th className="px-3 py-2 font-semibold">Arrears</th>
                    <th className="px-3 py-2 font-semibold">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.customerId} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                      <td className="px-3 py-2">{row.customerId}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.customerNo}</td>
                      <td className="px-3 py-2">{row.customerName}</td>
                      <td className="px-3 py-2">{row.nic}</td>
                      <td className="px-3 py-2">{row.contact}</td>
                      <td className="px-3 py-2">{row.fieldOfficer}</td>
                      <td className="px-3 py-2">{row.linkedLoans}</td>
                      <td className="px-3 py-2 text-emerald-700 font-semibold">{formatMoney(row.totalCollected)}</td>
                      <td className="px-3 py-2 text-rose-700 font-semibold">{formatMoney(row.pendingAmount)}</td>
                      <td className="px-3 py-2 text-orange-700 font-semibold">{formatMoney(row.arrearsAmount)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${
                          row.riskLevel === 'high'
                            ? 'border-red-200 bg-red-50 text-red-800'
                            : row.riskLevel === 'medium'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}>
                          {row.riskLevel}
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
