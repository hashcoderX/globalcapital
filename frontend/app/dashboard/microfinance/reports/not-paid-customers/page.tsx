'use client';

import axios from 'axios';
import { getApiBaseUrl, getBackendOrigin } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoanRow = {
  id: number;
  loan_code?: string | null;
  customer_no?: string | null;
  customer_name?: string | null;
  field_officer?: string | null;
  status?: string | null;
  loan_amount?: number | string | null;
  refundable_amount?: number | string | null;
  arrears_balance?: number | string | null;
  due_date?: string | null;
  next_payment_date?: string | null;
};

type CollectionRow = {
  mf_loan_request_id: number | string;
  collection_date?: string | null;
  collected_amount?: number | string | null;
};

type NotPaidRow = {
  loanId: number;
  loanCode: string;
  customerNo: string;
  customerName: string;
  fieldOfficer: string;
  status: string;
  loanAmount: number;
  refundableAmount: number;
  collectedAmount: number;
  paidTodayAmount: number;
  outstandingAmount: number;
  arrearsAmount: number;
  dueDate: string;
  nextPaymentDate: string;
};

const API_BASE = getApiBaseUrl();

export default function NotPaidCustomersReportPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotPaidRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [officerFilter, setOfficerFilter] = useState('all');

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
          }),
          axios.get(`${API_BASE}/microfinance/collections`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
        ]);

        const loans: LoanRow[] = Array.isArray(loanRes.data) ? loanRes.data : [];
        const collections: CollectionRow[] = Array.isArray(collectionRes.data) ? collectionRes.data : [];
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const paidByLoan = new Map<number, number>();
        const paidTodayByLoan = new Map<number, number>();
        collections.forEach((collection) => {
          const loanId = Number(collection.mf_loan_request_id || 0);
          if (!loanId) return;

          const amount = Number(collection.collected_amount || 0);
          paidByLoan.set(loanId, (paidByLoan.get(loanId) || 0) + amount);

          const collectionDate = String(collection.collection_date || '').slice(0, 10);
          if (collectionDate === todayKey) {
            paidTodayByLoan.set(loanId, (paidTodayByLoan.get(loanId) || 0) + amount);
          }
        });

        const mapped = loans
          .filter((loan) => {
            const status = String(loan.status || '').toLowerCase();
            return status === 'approved' || status === 'released' || status === 'completed';
          })
          .map((loan) => {
            const loanId = Number(loan.id || 0);
            const loanAmount = Number(loan.loan_amount || 0);
            const refundableAmount = Number(loan.refundable_amount || 0);
            const collectedAmount = paidByLoan.get(loanId) || 0;
            const paidTodayAmount = paidTodayByLoan.get(loanId) || 0;
            const outstandingAmount = Math.max(refundableAmount - collectedAmount, 0);
            const arrearsAmount = Math.max(Number(loan.arrears_balance || 0), 0);
            const dueDate = String(loan.due_date || '').slice(0, 10);

            return {
              loanId,
              loanCode: String(loan.loan_code || '').trim() || `LR-${loanId}`,
              customerNo: String(loan.customer_no || '-'),
              customerName: String(loan.customer_name || '-'),
              fieldOfficer: String(loan.field_officer || 'Unassigned'),
              status: String(loan.status || '-'),
              loanAmount,
              refundableAmount,
              collectedAmount,
              outstandingAmount,
              arrearsAmount,
              dueDate: dueDate || '-',
              nextPaymentDate: String(loan.next_payment_date || '').slice(0, 10) || '-',
              paidTodayAmount,
            };
          })
          .filter((row) => row.dueDate === todayKey)
          .filter((row) => row.outstandingAmount > 0)
          .filter((row) => row.paidTodayAmount <= 0)
          .sort((a, b) => b.outstandingAmount - a.outstandingAmount);

        setRows(mapped);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [token]);

  const officerOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.fieldOfficer))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return rows.filter((row) => {
      if (officerFilter !== 'all' && row.fieldOfficer.toLowerCase() !== officerFilter) {
        return false;
      }

      if (!search) return true;

      const haystack = [row.loanCode, row.customerNo, row.customerName, row.fieldOfficer]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [rows, keyword, officerFilter]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.customers += 1;
        acc.loanAmount += row.loanAmount;
        acc.refundable += row.refundableAmount;
        acc.collected += row.collectedAmount;
        acc.outstanding += row.outstandingAmount;
        acc.arrears += row.arrearsAmount;
        return acc;
      },
      {
        customers: 0,
        loanAmount: 0,
        refundable: 0,
        collected: 0,
        outstanding: 0,
        arrears: 0,
      }
    );
  }, [filteredRows]);

  const formatMoney = (value: number) => Number(value || 0).toFixed(2);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100 p-5 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-rose-100 bg-white/85 p-5 shadow-[0_20px_50px_-30px_rgba(190,24,93,0.4)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
                Report Center
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900">Not Paid Customer Report</h1>
              <p className="mt-1 text-sm text-slate-600">Customers with unpaid loan balances and related loan details.</p>
            </div>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Back
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-white/85 p-5 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(190,24,93,0.35)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Loan code, customer no, customer name"
                className="mt-1 w-full rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Field Officer</label>
              <select
                value={officerFilter}
                onChange={(e) => setOfficerFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <option value="all">All Officers</option>
                {officerOptions.map((officer) => (
                  <option key={officer} value={officer.toLowerCase()}>
                    {officer}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
              <p className="text-xs text-rose-700 uppercase tracking-wide">Customers</p>
              <p className="mt-1 text-xl font-extrabold text-rose-700">{summary.customers}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
              <p className="text-xs text-amber-700 uppercase tracking-wide">Outstanding</p>
              <p className="mt-1 text-xl font-extrabold text-amber-700">{formatMoney(summary.outstanding)}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-3">
              <p className="text-xs text-orange-700 uppercase tracking-wide">Arrears</p>
              <p className="mt-1 text-xl font-extrabold text-orange-700">{formatMoney(summary.arrears)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
              <p className="text-xs text-emerald-700 uppercase tracking-wide">Collected</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-700">{formatMoney(summary.collected)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-white/90 p-4 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(190,24,93,0.35)]">
          {loading ? (
            <p className="py-8 text-center text-slate-600">Loading report...</p>
          ) : filteredRows.length === 0 ? (
            <p className="py-8 text-center text-slate-600">No unpaid customers found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-rose-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-rose-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Loan Code</th>
                    <th className="px-3 py-2 font-semibold">Customer No</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Field Officer</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Loan Amount</th>
                    <th className="px-3 py-2 font-semibold">Refundable</th>
                    <th className="px-3 py-2 font-semibold">Collected</th>
                    <th className="px-3 py-2 font-semibold">Outstanding</th>
                    <th className="px-3 py-2 font-semibold">Arrears</th>
                    <th className="px-3 py-2 font-semibold">Due Date</th>
                    <th className="px-3 py-2 font-semibold">Next Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.loanId} className="border-b border-rose-100 last:border-b-0 hover:bg-rose-50/40">
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.loanCode}</td>
                      <td className="px-3 py-2">{row.customerNo}</td>
                      <td className="px-3 py-2">{row.customerName}</td>
                      <td className="px-3 py-2">{row.fieldOfficer}</td>
                      <td className="px-3 py-2 capitalize">{row.status}</td>
                      <td className="px-3 py-2">{formatMoney(row.loanAmount)}</td>
                      <td className="px-3 py-2">{formatMoney(row.refundableAmount)}</td>
                      <td className="px-3 py-2 text-emerald-700 font-semibold">{formatMoney(row.collectedAmount)}</td>
                      <td className="px-3 py-2 text-rose-700 font-semibold">{formatMoney(row.outstandingAmount)}</td>
                      <td className="px-3 py-2 text-orange-700 font-semibold">{formatMoney(row.arrearsAmount)}</td>
                      <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                      <td className="px-3 py-2">{formatDate(row.nextPaymentDate)}</td>
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
