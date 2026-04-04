'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CollectionRow = {
  id: number;
  collection_date?: string | null;
  created_at?: string | null;
  collected_amount?: number | string | null;
  capital_amount?: number | string | null;
  interest_amount?: number | string | null;
  penalty_amount?: number | string | null;
};

type MonthSummaryRow = {
  monthIndex: number;
  monthName: string;
  totalCollection: number;
  totalCapital: number;
  totalProfit: number;
};

const API_BASE = 'http://localhost:8000/api';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function YearEndSummaryReportPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

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

    const loadData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE}/microfinance/collections`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        setRows(Array.isArray(response.data) ? response.data : []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    rows.forEach((row) => {
      const dateText = String(row.collection_date || row.created_at || '').slice(0, 10);
      if (!dateText) return;

      const parsed = new Date(`${dateText}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return;

      years.add(parsed.getFullYear());
    });

    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }

    return Array.from(years).sort((a, b) => b - a);
  }, [rows]);

  useEffect(() => {
    if (!availableYears.includes(Number(selectedYear))) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  const monthSummary = useMemo(() => {
    const year = Number(selectedYear);

    const base: MonthSummaryRow[] = MONTH_LABELS.map((label, index) => ({
      monthIndex: index,
      monthName: label,
      totalCollection: 0,
      totalCapital: 0,
      totalProfit: 0,
    }));

    rows.forEach((row) => {
      const dateText = String(row.collection_date || row.created_at || '').slice(0, 10);
      if (!dateText) return;

      const parsed = new Date(`${dateText}T00:00:00`);
      if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== year) return;

      const month = parsed.getMonth();
      const collected = Number(row.collected_amount || 0);
      const capital = Number(row.capital_amount || 0);
      const profit = Number(row.interest_amount || 0) + Number(row.penalty_amount || 0);

      base[month].totalCollection += collected;
      base[month].totalCapital += capital;
      base[month].totalProfit += profit;
    });

    return base;
  }, [rows, selectedYear]);

  const totals = useMemo(() => {
    return monthSummary.reduce(
      (acc, row) => {
        acc.collection += row.totalCollection;
        acc.capital += row.totalCapital;
        acc.profit += row.totalProfit;
        return acc;
      },
      { collection: 0, capital: 0, profit: 0 }
    );
  }, [monthSummary]);

  const formatMoney = (value: number) => Number(value || 0).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-sky-100 p-5 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-indigo-100 bg-white/85 p-5 shadow-[0_20px_50px_-30px_rgba(79,70,229,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Report Center
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900">Year End Summary Report</h1>
              <p className="mt-1 text-sm text-slate-600">Monthly summary from January to December: collection, capital collection, and profit.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/microfinance')}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Back
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-indigo-100 bg-white/90 p-5 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(79,70,229,0.4)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="mt-1 w-48 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {availableYears.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[320px]">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                <p className="text-xs uppercase tracking-wide text-indigo-700">Year Collection</p>
                <p className="text-lg font-extrabold text-indigo-700">{formatMoney(totals.collection)}</p>
              </div>
              <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
                <p className="text-xs uppercase tracking-wide text-cyan-700">Year Capital</p>
                <p className="text-lg font-extrabold text-cyan-700">{formatMoney(totals.capital)}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Year Profit</p>
                <p className="text-lg font-extrabold text-emerald-700">{formatMoney(totals.profit)}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-indigo-100 bg-white">
            <table className="min-w-full text-sm text-left text-slate-700">
              <thead className="bg-indigo-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">Month</th>
                  <th className="px-3 py-2 font-semibold">Total Collection</th>
                  <th className="px-3 py-2 font-semibold">Capital Collection</th>
                  <th className="px-3 py-2 font-semibold">Profit</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-5 text-center text-slate-500" colSpan={4}>Loading summary...</td>
                  </tr>
                ) : (
                  monthSummary.map((row) => (
                    <tr key={row.monthIndex} className="border-b border-indigo-100 last:border-b-0 hover:bg-indigo-50/40">
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.monthName}</td>
                      <td className="px-3 py-2">{formatMoney(row.totalCollection)}</td>
                      <td className="px-3 py-2">{formatMoney(row.totalCapital)}</td>
                      <td className="px-3 py-2 text-emerald-700 font-semibold">{formatMoney(row.totalProfit)}</td>
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
