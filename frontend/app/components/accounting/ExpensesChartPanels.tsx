'use client';

import type { ReactNode } from 'react';
import { BarChart3, LineChart, PieChart } from 'lucide-react';
import { formatMoney } from '@/app/components/accounting/companyAccountingUtils';
import { chartStaggerDelay } from '@/app/components/accounting/chartAnimationUtils';
import {
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
  type ChartSlice,
} from '@/app/components/accounting/OverviewChartPanels';

type BreakdownRow = {
  key: string;
  label: string;
  total: number;
  count: number;
};

type PeriodTotal = {
  period: string;
  total: number;
  count: number;
};

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#f59e0b',
  utilities: '#06b6d4',
  salaries: '#8b5cf6',
  transport: '#14b8a6',
  office_supplies: '#3b82f6',
  maintenance: '#f97316',
  marketing: '#ec4899',
  other: '#64748b',
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#10b981',
  bank: '#3b82f6',
  main: '#a855f7',
};

function ChartPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof PieChart;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm h-full chart-animate-panel">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-violet-700 chart-animate-icon" />
        <h3 className="text-sm font-bold text-black">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function toSlices(rows: BreakdownRow[], colorMap: Record<string, string>, fallback: string): ChartSlice[] {
  return rows
    .filter((row) => row.total > 0)
    .map((row) => ({
      key: row.key,
      label: row.label,
      value: row.total,
      color: colorMap[row.key] || fallback,
    }));
}

function ExpenseTimelineChart({
  title,
  rows,
  currency,
  formatPeriodLabel,
}: {
  title: string;
  rows: PeriodTotal[];
  currency: string;
  formatPeriodLabel: (period: string) => string;
}) {
  const displayRows = rows.slice(-12);

  if (displayRows.length === 0) {
    return (
      <ChartPanel title={title} icon={LineChart}>
        <p className="text-xs text-slate-500 py-8 text-center">No spending timeline for the selected period.</p>
      </ChartPanel>
    );
  }

  const maxValue = Math.max(...displayRows.map((row) => row.total), 1);

  return (
    <ChartPanel title={title} icon={LineChart}>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {displayRows.map((row, index) => {
          const width = (row.total / maxValue) * 100;

          return (
            <div
              key={row.period}
              className="rounded-xl border border-violet-50 bg-violet-50/30 p-3"
              style={{ animationDelay: chartStaggerDelay(index, 0.1) }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-black">{formatPeriodLabel(row.period)}</span>
                <span className="text-xs font-bold tabular-nums text-rose-700">{formatMoney(row.total, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-slate-500">{row.count} expense{row.count === 1 ? '' : 's'}</span>
              </div>
              <div className="h-2.5 rounded-full bg-rose-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500 chart-animate-fill"
                  style={{
                    width: `${Math.max(width, row.total > 0 ? 4 : 0)}%`,
                    animationDelay: chartStaggerDelay(index, 0.18),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartPanel>
  );
}

function PeriodSpendBarChart({
  title,
  rows,
  currency,
  formatPeriodLabel,
}: {
  title: string;
  rows: PeriodTotal[];
  currency: string;
  formatPeriodLabel: (period: string) => string;
}) {
  const displayRows = rows.slice(-8);

  if (displayRows.length === 0) {
    return (
      <ChartPanel title={title} icon={BarChart3}>
        <p className="text-xs text-slate-500 py-8 text-center">No period spend data.</p>
      </ChartPanel>
    );
  }

  const maxValue = Math.max(...displayRows.map((row) => row.total), 1);

  return (
    <ChartPanel title={title} icon={BarChart3}>
      <div className="flex items-end justify-center gap-3 sm:gap-4 h-56 pt-2 overflow-x-auto">
        {displayRows.map((row, index) => {
          const height = Math.max(8, (row.total / maxValue) * 100);

          return (
            <div key={row.period} className="flex flex-col items-center justify-end gap-2 min-w-[56px] flex-1 max-w-[72px]">
              <p className="text-[10px] font-bold tabular-nums text-center leading-tight text-rose-700">
                {formatMoney(row.total, currency)}
              </p>
              <div className="w-full flex items-end justify-center h-40">
                <div
                  className="w-full max-w-[44px] rounded-t-xl shadow-sm chart-animate-bar chart-animate-fill bg-gradient-to-t from-rose-600 to-red-400"
                  style={{ height: `${height}%`, animationDelay: chartStaggerDelay(index, 0.2) }}
                />
              </div>
              <p className="text-[9px] font-semibold text-slate-600 text-center leading-tight">
                {formatPeriodLabel(row.period)}
              </p>
            </div>
          );
        })}
      </div>
    </ChartPanel>
  );
}

export function buildExpensePeriodTotals(
  expenses: Array<{ expense_date: string; amount: number | string }>
): PeriodTotal[] {
  const map = new Map<string, { total: number; count: number }>();

  expenses.forEach((row) => {
    const date = new Date(row.expense_date);
    if (Number.isNaN(date.getTime())) return;

    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    const current = map.get(period) || { total: 0, count: 0 };
    const value = typeof row.amount === 'number' ? row.amount : Number(row.amount) || 0;

    map.set(period, {
      total: current.total + value,
      count: current.count + 1,
    });
  });

  return Array.from(map.entries())
    .map(([period, stats]) => ({
      period,
      total: stats.total,
      count: stats.count,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function ExpensesCharts({
  totalAmount,
  totalCount,
  categoryBreakdown,
  paymentBreakdown,
  periodTotals,
  currency,
  formatPeriodLabel,
}: {
  totalAmount: number;
  totalCount: number;
  categoryBreakdown: BreakdownRow[];
  paymentBreakdown: BreakdownRow[];
  periodTotals: PeriodTotal[];
  currency: string;
  formatPeriodLabel: (period: string) => string;
}) {
  const categorySlices = toSlices(categoryBreakdown, CATEGORY_COLORS, '#64748b');
  const paymentSlices = toSlices(paymentBreakdown, PAYMENT_COLORS, '#6366f1');

  const average = totalCount > 0 ? totalAmount / totalCount : 0;
  const topCategory = categoryBreakdown[0];

  const summaryBars: ChartSlice[] = [
    {
      key: 'total',
      label: 'Total Spent',
      value: totalAmount,
      color: 'linear-gradient(to top, #e11d48, #f43f5e)',
    },
    {
      key: 'average',
      label: 'Average',
      value: average,
      color: 'linear-gradient(to top, #f59e0b, #f97316)',
    },
    {
      key: 'top_category',
      label: topCategory?.label || 'Top Category',
      value: topCategory?.total || 0,
      color: 'linear-gradient(to top, #7c3aed, #8b5cf6)',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="chart-animate-panel rounded-2xl border border-violet-100 bg-white/70 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">Visual Summary</p>
        <h2 className="text-lg font-extrabold text-black mt-1">Expense Charts</h2>
        <p className="text-xs text-slate-600 mt-1">
          Animated breakdown by category, payment method, and spending over time.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DonutChart title="Spending by Category" slices={categorySlices} currency={currency} />
        <DonutChart title="Spending by Payment Method" slices={paymentSlices} currency={currency} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <VerticalBarChart title="Total vs Average vs Top Category" bars={summaryBars} currency={currency} />
        <PeriodSpendBarChart
          title="Monthly Spending Trend"
          rows={periodTotals}
          currency={currency}
          formatPeriodLabel={formatPeriodLabel}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HorizontalBarChart title="Category Breakdown" bars={categorySlices} currency={currency} />
        <HorizontalBarChart title="Payment Method Breakdown" bars={paymentSlices} currency={currency} />
      </div>

      <ExpenseTimelineChart
        title="Spending Timeline by Month"
        rows={periodTotals}
        currency={currency}
        formatPeriodLabel={formatPeriodLabel}
      />
    </div>
  );
}
