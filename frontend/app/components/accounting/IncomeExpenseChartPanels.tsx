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

type Summary = {
  total_interest_income: number;
  total_collection_inflow: number;
  total_disbursement_expense: number;
  total_refund_expense: number;
  total_expense: number;
  net_profit: number;
};

type PeriodRow = {
  period: string;
  interest_income: number;
  collection_inflow: number;
  total_expense: number;
  net_profit: number;
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

function PeriodTimelineChart({
  title,
  rows,
  currency,
  formatPeriodLabel,
}: {
  title: string;
  rows: PeriodRow[];
  currency: string;
  formatPeriodLabel: (period: string) => string;
}) {
  const displayRows = rows.slice(-12);

  if (displayRows.length === 0) {
    return (
      <ChartPanel title={title} icon={LineChart}>
        <p className="text-xs text-slate-500 py-8 text-center">No timeline data for the selected period.</p>
      </ChartPanel>
    );
  }

  const maxValue = Math.max(
    ...displayRows.flatMap((row) => [row.interest_income, row.total_expense, Math.abs(row.net_profit)]),
    1
  );

  return (
    <ChartPanel title={title} icon={LineChart}>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {displayRows.map((row, index) => {
          const incomeWidth = (row.interest_income / maxValue) * 100;
          const expenseWidth = (row.total_expense / maxValue) * 100;
          const profitWidth = (Math.abs(row.net_profit) / maxValue) * 100;

          return (
            <div
              key={row.period}
              className="rounded-xl border border-violet-50 bg-violet-50/30 p-3"
              style={{ animationDelay: chartStaggerDelay(index, 0.1) }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-black">{formatPeriodLabel(row.period)}</span>
                <span
                  className={`text-xs font-bold tabular-nums ${row.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                >
                  {row.net_profit >= 0 ? '+' : '−'}
                  {formatMoney(Math.abs(row.net_profit), currency)}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="font-semibold text-emerald-700">Interest Income</span>
                    <span className="tabular-nums text-black">{formatMoney(row.interest_income, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 chart-animate-fill"
                      style={{
                        width: `${Math.max(incomeWidth, row.interest_income > 0 ? 4 : 0)}%`,
                        animationDelay: chartStaggerDelay(index, 0.15),
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="font-semibold text-rose-700">Total Expense</span>
                    <span className="tabular-nums text-black">{formatMoney(row.total_expense, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-rose-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500 chart-animate-fill"
                      style={{
                        width: `${Math.max(expenseWidth, row.total_expense > 0 ? 4 : 0)}%`,
                        animationDelay: chartStaggerDelay(index, 0.22),
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="font-semibold text-violet-700">Net Profit</span>
                    <span className="tabular-nums text-black">{formatMoney(row.net_profit, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-violet-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full chart-animate-fill ${row.net_profit >= 0 ? 'bg-gradient-to-r from-violet-500 to-indigo-500' : 'bg-gradient-to-r from-rose-600 to-red-500'}`}
                      style={{
                        width: `${Math.max(profitWidth, row.net_profit !== 0 ? 4 : 0)}%`,
                        animationDelay: chartStaggerDelay(index, 0.29),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartPanel>
  );
}

function PeriodProfitBarChart({
  title,
  rows,
  currency,
  formatPeriodLabel,
}: {
  title: string;
  rows: PeriodRow[];
  currency: string;
  formatPeriodLabel: (period: string) => string;
}) {
  const displayRows = rows.slice(-8);

  if (displayRows.length === 0) {
    return (
      <ChartPanel title={title} icon={BarChart3}>
        <p className="text-xs text-slate-500 py-8 text-center">No profit trend data for the selected period.</p>
      </ChartPanel>
    );
  }

  const maxAbsProfit = Math.max(...displayRows.map((row) => Math.abs(row.net_profit)), 1);

  return (
    <ChartPanel title={title} icon={BarChart3}>
      <div className="flex items-end justify-center gap-3 sm:gap-4 h-56 pt-2 overflow-x-auto">
        {displayRows.map((row, index) => {
          const height = Math.max(8, (Math.abs(row.net_profit) / maxAbsProfit) * 100);
          const negative = row.net_profit < 0;

          return (
            <div key={row.period} className="flex flex-col items-center justify-end gap-2 min-w-[56px] flex-1 max-w-[72px]">
              <p
                className={`text-[10px] font-bold tabular-nums text-center leading-tight ${negative ? 'text-rose-700' : 'text-emerald-700'}`}
              >
                {negative ? '−' : ''}
                {formatMoney(Math.abs(row.net_profit), currency)}
              </p>
              <div className="w-full flex items-end justify-center h-40">
                <div
                  className={`w-full max-w-[44px] rounded-t-xl shadow-sm chart-animate-bar chart-animate-fill ${negative ? 'bg-gradient-to-t from-rose-600 to-rose-400' : 'bg-gradient-to-t from-emerald-600 to-teal-400'}`}
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

export function IncomeExpenseCharts({
  summary,
  rows,
  currency,
  formatPeriodLabel,
}: {
  summary: Summary;
  rows: PeriodRow[];
  currency: string;
  formatPeriodLabel: (period: string) => string;
}) {
  const expenseSlices: ChartSlice[] = [
    {
      key: 'disbursement',
      label: 'Disbursements',
      value: summary.total_disbursement_expense,
      color: '#e11d48',
    },
    {
      key: 'refund',
      label: 'Refunds',
      value: summary.total_refund_expense,
      color: '#db2777',
    },
  ];

  const revenueSlices: ChartSlice[] = [
    {
      key: 'interest',
      label: 'Interest Income',
      value: summary.total_interest_income,
      color: '#0891b2',
    },
    {
      key: 'collections',
      label: 'Collection Inflow',
      value: summary.total_collection_inflow,
      color: '#06b6d4',
    },
  ];

  const compareBars: ChartSlice[] = [
    {
      key: 'interest_income',
      label: 'Interest Income',
      value: summary.total_interest_income,
      color: 'linear-gradient(to top, #0891b2, #06b6d4)',
    },
    {
      key: 'total_expense',
      label: 'Total Expense',
      value: summary.total_expense,
      color: 'linear-gradient(to top, #e11d48, #f43f5e)',
    },
    {
      key: 'net_profit',
      label: 'Net Profit',
      value: summary.net_profit,
      color: 'linear-gradient(to top, #7c3aed, #8b5cf6)',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="chart-animate-panel rounded-2xl border border-violet-100 bg-white/70 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">Visual Summary</p>
        <h2 className="text-lg font-extrabold text-black mt-1">Income &amp; Expense Charts</h2>
        <p className="text-xs text-slate-600 mt-1">
          Pie and bar charts showing revenue, costs, profit trend, and period-by-period movement.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DonutChart title="Revenue Mix" slices={revenueSlices} currency={currency} />
        <DonutChart title="Expense Mix" slices={expenseSlices} currency={currency} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <VerticalBarChart title="Income vs Expense vs Profit" bars={compareBars} currency={currency} showSign />
        <PeriodProfitBarChart
          title="Net Profit by Period"
          rows={rows}
          currency={currency}
          formatPeriodLabel={formatPeriodLabel}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HorizontalBarChart title="Revenue Breakdown" bars={revenueSlices} currency={currency} />
        <HorizontalBarChart title="Expense Breakdown" bars={expenseSlices} currency={currency} />
      </div>

      <PeriodTimelineChart
        title="Period Timeline — Income, Expense & Profit"
        rows={rows}
        currency={currency}
        formatPeriodLabel={formatPeriodLabel}
      />
    </div>
  );
}
