'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoanRow = {
  id: number;
  loan_code?: string | null;
  customer_no?: string | null;
  customer_name?: string | null;
  field_officer?: string | null;
};

type CollectionRow = {
  id: number;
  mf_loan_request_id: number | string;
  collection_date?: string | null;
  created_at?: string | null;
  collected_amount?: number | string | null;
  capital_amount?: number | string | null;
  interest_amount?: number | string | null;
  penalty_amount?: number | string | null;
  payment_type?: string | null;
  payment_reference?: string | null;
};

type HistoryRow = {
  id: number;
  date: string;
  loanId: number;
  loanCode: string;
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

export default function CustomerPaymentHistoryReportPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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

        const loanMap = new Map<number, LoanRow>();
        loans.forEach((loan) => {
          loanMap.set(Number(loan.id), loan);
        });

        const mapped: HistoryRow[] = collections
          .map((collection) => {
            const loanId = Number(collection.mf_loan_request_id || 0);
            const loan = loanMap.get(loanId);

            return {
              id: Number(collection.id || 0),
              date: String(collection.collection_date || collection.created_at || ''),
              loanId,
              loanCode: String(loan?.loan_code || '').trim() || `LR-${loanId}`,
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
  }, [token]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
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

      if (!keyword) return true;

      const haystack = [
        row.customerNo,
        row.customerName,
        row.loanCode,
        row.fieldOfficer,
        row.reference,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [rows, search, fromDate, toDate]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.transactions += 1;
        acc.collected += row.collected;
        acc.capital += row.capital;
        acc.interest += row.interest;
        acc.penalty += row.penalty;
        acc.customers.add(row.customerNo);
        return acc;
      },
      {
        transactions: 0,
        collected: 0,
        capital: 0,
        interest: 0,
        penalty: 0,
        customers: new Set<string>(),
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
      second: '2-digit',
      hour12: false,
    }).format(parsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-pink-50 to-rose-100 p-5 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-fuchsia-100 bg-white/85 p-5 shadow-[0_20px_50px_-30px_rgba(217,70,239,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="inline-flex rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-700">
                Report Center
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900">Customer Payment History Report</h1>
              <p className="mt-1 text-sm text-slate-600">Complete payment trail by customer with transaction and profit components.</p>
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

        <div className="rounded-3xl border border-fuchsia-100 bg-white/90 p-5 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(217,70,239,0.4)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Customer no, customer name, loan code"
                className="mt-1 w-full rounded-xl border border-fuchsia-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-fuchsia-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-fuchsia-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/70 p-3">
              <p className="text-xs text-fuchsia-700 uppercase tracking-wide">Transactions</p>
              <p className="mt-1 text-xl font-extrabold text-fuchsia-700">{summary.transactions}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
              <p className="text-xs text-blue-700 uppercase tracking-wide">Customers</p>
              <p className="mt-1 text-xl font-extrabold text-blue-700">{summary.customers.size}</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
              <p className="text-xs text-cyan-700 uppercase tracking-wide">Collected</p>
              <p className="mt-1 text-xl font-extrabold text-cyan-700">{formatMoney(summary.collected)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
              <p className="text-xs text-emerald-700 uppercase tracking-wide">Capital</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-700">{formatMoney(summary.capital)}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
              <p className="text-xs text-rose-700 uppercase tracking-wide">Profit</p>
              <p className="mt-1 text-xl font-extrabold text-rose-700">{formatMoney(summary.interest + summary.penalty)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-fuchsia-100 bg-white/90 p-4 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(217,70,239,0.4)]">
          {loading ? (
            <p className="py-8 text-center text-slate-600">Loading report...</p>
          ) : filteredRows.length === 0 ? (
            <p className="py-8 text-center text-slate-600">No payment history found for selected filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-fuchsia-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-fuchsia-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date & Time</th>
                    <th className="px-3 py-2 font-semibold">Loan Code</th>
                    <th className="px-3 py-2 font-semibold">Customer No</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Field Officer</th>
                    <th className="px-3 py-2 font-semibold">Pay Type</th>
                    <th className="px-3 py-2 font-semibold">Reference</th>
                    <th className="px-3 py-2 font-semibold">Collected</th>
                    <th className="px-3 py-2 font-semibold">Capital</th>
                    <th className="px-3 py-2 font-semibold">Interest</th>
                    <th className="px-3 py-2 font-semibold">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-b border-fuchsia-100 last:border-b-0 hover:bg-fuchsia-50/40">
                      <td className="px-3 py-2">{formatDateTime(row.date)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.loanCode}</td>
                      <td className="px-3 py-2">{row.customerNo}</td>
                      <td className="px-3 py-2">{row.customerName}</td>
                      <td className="px-3 py-2">{row.fieldOfficer}</td>
                      <td className="px-3 py-2 capitalize">{row.paymentType}</td>
                      <td className="px-3 py-2">{row.reference}</td>
                      <td className="px-3 py-2 text-cyan-700 font-semibold">{formatMoney(row.collected)}</td>
                      <td className="px-3 py-2 text-emerald-700 font-semibold">{formatMoney(row.capital)}</td>
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
