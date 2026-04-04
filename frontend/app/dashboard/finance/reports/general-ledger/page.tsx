'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Download, Filter, Scale } from 'lucide-react';

type LedgerLine = {
  account_code: string;
  account_name: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  opening_balance: number;
  period_movement: number;
  closing_balance: number;
  closing_side: 'debit' | 'credit';
  closing_debit: number;
  closing_credit: number;
};

type Summary = {
  opening_debits: number;
  opening_credits: number;
  period_debits: number;
  period_credits: number;
  closing_debits: number;
  closing_credits: number;
  net_period_movement: number;
  accounts_count: number;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function amount(value: unknown): string {
  return toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

export default function GeneralLedgerSnapshotPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productType, setProductType] = useState('all');
  const [status, setStatus] = useState('all');

  const [summary, setSummary] = useState<Summary>({
    opening_debits: 0,
    opening_credits: 0,
    period_debits: 0,
    period_credits: 0,
    closing_debits: 0,
    closing_credits: 0,
    net_period_movement: 0,
    accounts_count: 0,
  });
  const [lines, setLines] = useState<LedgerLine[]>([]);

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
      const response = await axios.get(`${API_URL}/api/finances/reports/general-ledger`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          product_type: productType === 'all' ? undefined : productType,
          status: status === 'all' ? undefined : status,
        },
      });

      const payload = response.data || {};
      setSummary({
        opening_debits: toNumber(payload.summary?.opening_debits),
        opening_credits: toNumber(payload.summary?.opening_credits),
        period_debits: toNumber(payload.summary?.period_debits),
        period_credits: toNumber(payload.summary?.period_credits),
        closing_debits: toNumber(payload.summary?.closing_debits),
        closing_credits: toNumber(payload.summary?.closing_credits),
        net_period_movement: toNumber(payload.summary?.net_period_movement),
        accounts_count: Number(payload.summary?.accounts_count || 0),
      });
      setLines(Array.isArray(payload.lines) ? payload.lines : []);
    } catch {
      setSummary({
        opening_debits: 0,
        opening_credits: 0,
        period_debits: 0,
        period_credits: 0,
        closing_debits: 0,
        closing_credits: 0,
        net_period_movement: 0,
        accounts_count: 0,
      });
      setLines([]);
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
    setTimeout(() => {
      fetchReport();
    }, 0);
  };

  const exportCsv = () => {
    const headers = [
      'Account Code',
      'Account Name',
      'Opening Debit',
      'Opening Credit',
      'Period Debit',
      'Period Credit',
      'Opening Balance',
      'Period Movement',
      'Closing Balance',
      'Closing Side',
      'Closing Debit',
      'Closing Credit',
    ];

    const data = lines.map((line) => [
      line.account_code,
      line.account_name,
      amount(line.opening_debit),
      amount(line.opening_credit),
      amount(line.period_debit),
      amount(line.period_credit),
      amount(line.opening_balance),
      amount(line.period_movement),
      amount(line.closing_balance),
      line.closing_side,
      amount(line.closing_debit),
      amount(line.closing_credit),
    ]);

    const csv = [headers, ...data].map((line) => line.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'general-ledger-snapshot.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasLines = useMemo(() => lines.length > 0, [lines]);

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
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">General Ledger Snapshot</h1>
              <p className="text-sm text-slate-600 mt-1">Account-wise opening, period movement, and closing debit-credit balances.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!hasLines}
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

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Opening Debit / Credit</p>
              <p className="text-lg font-extrabold text-slate-900 mt-1">{amount(summary.opening_debits)} / {amount(summary.opening_credits)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Period Debit / Credit</p>
              <p className="text-lg font-extrabold text-slate-900 mt-1">{amount(summary.period_debits)} / {amount(summary.period_credits)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Closing Debit / Credit</p>
              <p className="text-lg font-extrabold text-slate-900 mt-1">{amount(summary.closing_debits)} / {amount(summary.closing_credits)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-emerald-100 shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Net Movement</p>
              <p className={`text-lg font-extrabold mt-1 ${summary.net_period_movement >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {amount(summary.net_period_movement)}
              </p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-emerald-100 shadow-[0_18px_40px_-24px_rgba(5,150,105,0.45)] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ledger Lines</h2>
              <p className="text-xs text-slate-600 mt-1">Snapshot view of key finance ledger accounts.</p>
            </div>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              {summary.accounts_count} accounts
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : lines.length === 0 ? (
            <p className="text-sm text-slate-500">No ledger data found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-emerald-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-emerald-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Code</th>
                    <th className="px-3 py-2 font-semibold">Account</th>
                    <th className="px-3 py-2 font-semibold">Opening Dr</th>
                    <th className="px-3 py-2 font-semibold">Opening Cr</th>
                    <th className="px-3 py-2 font-semibold">Period Dr</th>
                    <th className="px-3 py-2 font-semibold">Period Cr</th>
                    <th className="px-3 py-2 font-semibold">Closing Dr</th>
                    <th className="px-3 py-2 font-semibold">Closing Cr</th>
                    <th className="px-3 py-2 font-semibold">Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.account_code} className="border-b border-emerald-100 last:border-b-0">
                      <td className="px-3 py-2 font-semibold text-slate-900">{line.account_code}</td>
                      <td className="px-3 py-2">{line.account_name}</td>
                      <td className="px-3 py-2">{amount(line.opening_debit)}</td>
                      <td className="px-3 py-2">{amount(line.opening_credit)}</td>
                      <td className="px-3 py-2">{amount(line.period_debit)}</td>
                      <td className="px-3 py-2">{amount(line.period_credit)}</td>
                      <td className="px-3 py-2">{amount(line.closing_debit)}</td>
                      <td className="px-3 py-2">{amount(line.closing_credit)}</td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold ${line.closing_side === 'debit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {amount(Math.abs(line.closing_balance))} {line.closing_side.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-emerald-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-700" />
              <p className="font-bold text-slate-900">Ledger Integrity</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Review debit-credit movements by account for a quick accounting snapshot.</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-cyan-700" />
              <p className="font-bold text-slate-900">Balance Position</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Closing side highlights whether each account stands debit or credit.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
