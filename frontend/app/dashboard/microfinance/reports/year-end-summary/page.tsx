'use client';

import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

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

const API_BASE = getApiBaseUrl();

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function YearEndSummaryReportPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });
  const widgetPrefix = 'mf_year_end_summary_widget_';

  const fetchWidgetPreferences = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_BASE}/dashboard/widgets`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const rows = Array.isArray(response.data?.widgets) ? response.data.widgets : [];
      const nextHidden = new Set<string>();
      for (const row of rows) {
        const key = String(row?.widget_key || '').trim();
        if (!key.startsWith(widgetPrefix)) continue;
        if (row?.is_visible === false) nextHidden.add(key);
      }
      setHiddenWidgetKeys(nextHidden);
    } catch {
      setHiddenWidgetKeys(new Set());
    }
  };

  const saveWidgetPreference = async (widgetKey: string, isVisible: boolean) => {
    if (!token) return false;
    try {
      await axios.patch(
        `${API_BASE}/dashboard/widgets`,
        { widget_key: widgetKey, is_visible: isVisible },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch {
      return false;
    }
  };

  const hideWidget = async (widgetKey: string) => {
    const previous = new Set(hiddenWidgetKeys);
    const next = new Set(hiddenWidgetKeys);
    next.add(widgetKey);
    setHiddenWidgetKeys(next);

    const ok = await saveWidgetPreference(widgetKey, false);
    if (!ok) {
      setHiddenWidgetKeys(previous);
      setWidgetNotice({
        open: true,
        title: 'Widget Update Failed',
        message: 'Failed to hide this widget. Please try again.',
      });
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
    void fetchWidgetPreferences(storedToken);
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

  const chartScale = useMemo(() => {
    const maxMonthlyValue = monthSummary.reduce((maxValue, row) => {
      return Math.max(maxValue, row.totalCollection, row.totalCapital, row.totalProfit);
    }, 0);

    return maxMonthlyValue > 0 ? maxMonthlyValue : 1;
  }, [monthSummary]);

  const profitTrendPoints = useMemo(() => {
    const chartWidth = 720;
    const chartHeight = 220;
    const leftPad = 32;
    const rightPad = 24;
    const topPad = 20;
    const bottomPad = 24;
    const usableWidth = chartWidth - leftPad - rightPad;
    const usableHeight = chartHeight - topPad - bottomPad;

    return monthSummary
      .map((row, index) => {
        const x = leftPad + (index / Math.max(monthSummary.length - 1, 1)) * usableWidth;
        const y = topPad + (1 - row.totalProfit / chartScale) * usableHeight;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [monthSummary, chartScale]);
  const formatMoney = (value: number) => Number(value || 0).toFixed(2);
  const summaryCards = [
    {
      key: `${widgetPrefix}summary_collection`,
      label: 'Year Collection',
      value: formatMoney(totals.collection),
      boxClass: 'border-indigo-100 bg-indigo-50/70',
      labelClass: 'text-indigo-700',
      valueClass: 'text-indigo-700',
    },
    {
      key: `${widgetPrefix}summary_capital`,
      label: 'Year Capital',
      value: formatMoney(totals.capital),
      boxClass: 'border-cyan-100 bg-cyan-50/70',
      labelClass: 'text-cyan-700',
      valueClass: 'text-cyan-700',
    },
    {
      key: `${widgetPrefix}summary_profit`,
      label: 'Year Profit',
      value: formatMoney(totals.profit),
      boxClass: 'border-emerald-100 bg-emerald-50/70',
      labelClass: 'text-emerald-700',
      valueClass: 'text-emerald-700',
    },
  ];
  const visibleSummaryCards = summaryCards.filter((card) => !hiddenWidgetKeys.has(card.key));
  const showControlSection = !hiddenWidgetKeys.has(`${widgetPrefix}controls_section`);
  const showGraphSection = !hiddenWidgetKeys.has(`${widgetPrefix}graph_section`);
  const showTableSection = !hiddenWidgetKeys.has(`${widgetPrefix}table_section`);
  const isColumnVisible = (columnKey: string) =>
    !hiddenWidgetKeys.has(`${widgetPrefix}table_col_${columnKey}`);

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
              onClick={() => router.back()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Back
            </button>
          </div>
        </div>

        {showControlSection && (
        <div className="relative rounded-3xl border border-indigo-100 bg-white/90 p-5 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(79,70,229,0.4)]">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}controls_section`)}
              className="absolute right-4 top-4 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide controls widget"
            >
              ×
            </button>
          </WidgetCloseGate>
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
              {visibleSummaryCards.map((card) => (
                <div key={card.key} className={`relative rounded-xl border p-3 ${card.boxClass}`}>
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => void hideWidget(card.key)}
                      className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                      aria-label={`Hide ${card.label} summary card`}
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                  <p className={`text-xs uppercase tracking-wide ${card.labelClass}`}>{card.label}</p>
                  <p className={`text-lg font-extrabold ${card.valueClass}`}>{card.value}</p>
                </div>
              ))}
            </div>
          </div>
          {visibleSummaryCards.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              All summary widgets are hidden. Restore from dashboard with admin approval.
            </div>
          )}

          {showGraphSection && (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-indigo-100 bg-white">
            <div className="relative border-b border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-sky-50/70 to-emerald-50/70 px-4 py-4">
              <WidgetCloseGate>
                <button
                  type="button"
                  onClick={() => void hideWidget(`${widgetPrefix}graph_section`)}
                  className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                  aria-label="Hide graphical preview widget"
                >
                  ×
                </button>
              </WidgetCloseGate>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Graphical Preview</h2>
              <p className="mt-1 text-xs text-slate-500">Bar chart compares monthly collection and capital; line shows monthly profit trend.</p>
            </div>

            <div className="overflow-x-auto px-4 py-4">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-12 gap-2 items-end h-64">
                  {monthSummary.map((row) => {
                    const collectionHeight = Math.max((row.totalCollection / chartScale) * 100, row.totalCollection > 0 ? 2.5 : 0);
                    const capitalHeight = Math.max((row.totalCapital / chartScale) * 100, row.totalCapital > 0 ? 2.5 : 0);

                    return (
                      <div key={`bar-${row.monthIndex}`} className="flex flex-col items-center gap-2">
                        <div className="w-full rounded-md border border-indigo-100 bg-indigo-50/35 p-1.5">
                          <div className="flex items-end justify-center gap-1 h-44">
                            <div
                              className="w-3 rounded-sm bg-gradient-to-t from-indigo-600 to-indigo-400"
                              style={{ height: `${collectionHeight}%` }}
                              title={`${row.monthName} Collection: ${formatMoney(row.totalCollection)}`}
                            />
                            <div
                              className="w-3 rounded-sm bg-gradient-to-t from-cyan-600 to-cyan-400"
                              style={{ height: `${capitalHeight}%` }}
                              title={`${row.monthName} Capital: ${formatMoney(row.totalCapital)}`}
                            />
                          </div>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600">{row.monthName}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Profit Trend</p>
                    <p className="text-xs text-slate-500">Monthly profit progression</p>
                  </div>
                  <svg viewBox="0 0 720 220" className="h-44 w-full">
                    <rect x="0" y="0" width="720" height="220" fill="transparent" />
                    {[0, 1, 2, 3, 4].map((step) => {
                      const y = 20 + (step / 4) * (220 - 44);
                      return <line key={`grid-${step}`} x1="32" y1={y} x2="696" y2={y} stroke="#bbf7d0" strokeWidth="1" />;
                    })}
                    <polyline
                      points={profitTrendPoints}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {monthSummary.map((row, index) => {
                      const x = 32 + (index / Math.max(monthSummary.length - 1, 1)) * (720 - 32 - 24);
                      const y = 20 + (1 - row.totalProfit / chartScale) * (220 - 20 - 24);

                      return (
                        <g key={`point-${row.monthIndex}`}>
                          <circle cx={x} cy={y} r="4" fill="#10b981" />
                          <text x={x} y={212} textAnchor="middle" fontSize="10" fill="#475569">
                            {row.monthName}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                  <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    Collection
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-cyan-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                    Capital Collection
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Profit Trend
                  </span>
                </div>
              </div>
            </div>
          </div>
          )}

          {showTableSection && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-indigo-100 bg-white">
              <div className="relative px-3 py-2 bg-indigo-50/60 border-b border-indigo-100">
                <WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => void hideWidget(`${widgetPrefix}table_section`)}
                    className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                    aria-label="Hide summary table widget"
                  >
                    ×
                  </button>
                </WidgetCloseGate>
              </div>
              <table className="min-w-full text-sm text-left text-slate-700">
                <thead className="bg-indigo-50 text-slate-700">
                  <tr>
                    {isColumnVisible('month') && (
                      <th className="relative px-3 py-2 pr-8 font-semibold">
                        Month
                        <WidgetCloseGate>
                          <button
                            type="button"
                            onClick={() => void hideWidget(`${widgetPrefix}table_col_month`)}
                            className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-[10px] font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                            aria-label="Hide Month column"
                          >
                            ×
                          </button>
                        </WidgetCloseGate>
                      </th>
                    )}
                    {isColumnVisible('collection') && (
                      <th className="relative px-3 py-2 pr-8 font-semibold">
                        Total Collection
                        <WidgetCloseGate>
                          <button
                            type="button"
                            onClick={() => void hideWidget(`${widgetPrefix}table_col_collection`)}
                            className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-[10px] font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                            aria-label="Hide Total Collection column"
                          >
                            ×
                          </button>
                        </WidgetCloseGate>
                      </th>
                    )}
                    {isColumnVisible('capital') && (
                      <th className="relative px-3 py-2 pr-8 font-semibold">
                        Capital Collection
                        <WidgetCloseGate>
                          <button
                            type="button"
                            onClick={() => void hideWidget(`${widgetPrefix}table_col_capital`)}
                            className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-[10px] font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                            aria-label="Hide Capital Collection column"
                          >
                            ×
                          </button>
                        </WidgetCloseGate>
                      </th>
                    )}
                    {isColumnVisible('profit') && (
                      <th className="relative px-3 py-2 pr-8 font-semibold">
                        Profit
                        <WidgetCloseGate>
                          <button
                            type="button"
                            onClick={() => void hideWidget(`${widgetPrefix}table_col_profit`)}
                            className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-[10px] font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                            aria-label="Hide Profit column"
                          >
                            ×
                          </button>
                        </WidgetCloseGate>
                      </th>
                    )}
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
                        {isColumnVisible('month') && <td className="px-3 py-2 font-semibold text-slate-900">{row.monthName}</td>}
                        {isColumnVisible('collection') && <td className="px-3 py-2">{formatMoney(row.totalCollection)}</td>}
                        {isColumnVisible('capital') && <td className="px-3 py-2">{formatMoney(row.totalCapital)}</td>}
                        {isColumnVisible('profit') && <td className="px-3 py-2 text-emerald-700 font-semibold">{formatMoney(row.totalProfit)}</td>}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!showGraphSection && !showTableSection && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              All report widgets are hidden. Restore from dashboard with admin approval.
            </div>
          )}
        </div>
        )}
      </div>
      {widgetNotice.open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={() => setWidgetNotice({ open: false, title: '', message: '' })} />
          <div className="relative w-full max-w-sm rounded-2xl border border-indigo-100 bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">{widgetNotice.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{widgetNotice.message}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setWidgetNotice({ open: false, title: '', message: '' })}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
