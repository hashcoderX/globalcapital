'use client';

import type { ReactNode } from 'react';
import { BarChart3, LineChart, PieChart, Wallet } from 'lucide-react';
import { formatMoney } from '@/app/components/accounting/companyAccountingUtils';
import { chartStaggerDelay } from '@/app/components/accounting/chartAnimationUtils';
import {
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
  type ChartSlice,
} from '@/app/components/accounting/OverviewChartPanels';

type Summary = {
  total_cash_in: number;
  total_cash_out: number;
  total_refund_out: number;
  total_effective_cash_out: number;
  net_cash_flow: number;
  ending_cash_balance: number;
};

type PeriodRow = {
  period: string;
  cash_in: number;
  cash_out: number;
  refund_out: number;
  effective_cash_out: number;
  net_cash_flow: number;
  running_cash_balance: number;
};

type SourceBlock = {
  key: string;
  label: string;
  summary: Summary;
};

const SOURCE_COLORS: Record<string, string> = {
  finance: '#3b82f6',
  microfinance: '#14b8a6',
  mortgage: '#f59e0b',
  instant_loan: '#a855f7',
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

function CashFlowTimelineChart({
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
    ...displayRows.flatMap((row) => [row.cash_in, row.effective_cash_out, Math.abs(row.net_cash_flow)]),
    1
  );

  return (
    <ChartPanel title={title} icon={LineChart}>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {displayRows.map((row, index) => {
          const inWidth = (row.cash_in / maxValue) * 100;
          const outWidth = (row.effective_cash_out / maxValue) * 100;

          return (
            <div
              key={row.period}
              className="rounded-xl border border-violet-50 bg-violet-50/30 p-3"
              style={{ animationDelay: chartStaggerDelay(index, 0.1) }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-black">{formatPeriodLabel(row.period)}</span>
                <span
                  className={`text-xs font-bold tabular-nums ${row.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                >
                  {row.net_cash_flow >= 0 ? '+' : '−'}
                  {formatMoney(Math.abs(row.net_cash_flow), currency)}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="font-semibold text-emerald-700">Cash In</span>
                    <span className="tabular-nums text-black">{formatMoney(row.cash_in, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 chart-animate-fill"
                      style={{
                        width: `${Math.max(inWidth, row.cash_in > 0 ? 4 : 0)}%`,
                        animationDelay: chartStaggerDelay(index, 0.15),
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="font-semibold text-rose-700">Effective Cash Out</span>
                    <span className="tabular-nums text-black">{formatMoney(row.effective_cash_out, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-rose-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500 chart-animate-fill"
                      style={{
                        width: `${Math.max(outWidth, row.effective_cash_out > 0 ? 4 : 0)}%`,
                        animationDelay: chartStaggerDelay(index, 0.22),
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="font-semibold text-cyan-700">Running Balance</span>
                    <span className="tabular-nums text-black">{formatMoney(row.running_cash_balance, currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-cyan-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full chart-animate-fill ${row.running_cash_balance >= 0 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-rose-600 to-red-500'}`}
                      style={{
                        width: `${Math.max((Math.abs(row.running_cash_balance) / maxValue) * 100, row.running_cash_balance !== 0 ? 4 : 0)}%`,
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

function NetFlowPeriodChart({
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
        <p className="text-xs text-slate-500 py-8 text-center">No net flow trend data.</p>
      </ChartPanel>
    );
  }

  const maxAbs = Math.max(...displayRows.map((row) => Math.abs(row.net_cash_flow)), 1);

  return (
    <ChartPanel title={title} icon={BarChart3}>
      <div className="flex items-end justify-center gap-3 sm:gap-4 h-56 pt-2 overflow-x-auto">
        {displayRows.map((row, index) => {
          const height = Math.max(8, (Math.abs(row.net_cash_flow) / maxAbs) * 100);
          const negative = row.net_cash_flow < 0;

          return (
            <div key={row.period} className="flex flex-col items-center justify-end gap-2 min-w-[56px] flex-1 max-w-[72px]">
              <p
                className={`text-[10px] font-bold tabular-nums text-center leading-tight ${negative ? 'text-rose-700' : 'text-emerald-700'}`}
              >
                {negative ? '−' : ''}
                {formatMoney(Math.abs(row.net_cash_flow), currency)}
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

export function CashFlowCharts({
  summary,
  rows,
  sources,
  currency,
  formatPeriodLabel,
}: {
  summary: Summary;
  rows: PeriodRow[];
  sources: SourceBlock[];
  currency: string;
  formatPeriodLabel: (period: string) => string;
}) {
  const movementSlices: ChartSlice[] = [
    { key: 'cash_in', label: 'Cash In', value: summary.total_cash_in, color: '#10b981' },
    { key: 'cash_out', label: 'Effective Cash Out', value: summary.total_effective_cash_out, color: '#f43f5e' },
  ];

  const outflowSlices: ChartSlice[] = [
    { key: 'disbursement', label: 'Disbursements', value: summary.total_cash_out, color: '#e11d48' },
    { key: 'refund', label: 'Refunds', value: summary.total_refund_out, color: '#db2777' },
  ];

  const productCashInSlices: ChartSlice[] = sources
    .filter((block) => block.summary.total_cash_in > 0)
    .map((block) => ({
      key: block.key,
      label: block.label,
      value: block.summary.total_cash_in,
      color: SOURCE_COLORS[block.key] || '#6366f1',
    }));

  const productNetSlices: ChartSlice[] = sources
    .filter((block) => Math.abs(block.summary.net_cash_flow) > 0)
    .map((block) => ({
      key: `${block.key}_net`,
      label: block.label,
      value: Math.abs(block.summary.net_cash_flow),
      color: SOURCE_COLORS[block.key] || '#6366f1',
    }));

  const compareBars: ChartSlice[] = [
    {
      key: 'cash_in',
      label: 'Cash In',
      value: summary.total_cash_in,
      color: 'linear-gradient(to top, #10b981, #14b8a6)',
    },
    {
      key: 'cash_out',
      label: 'Cash Out',
      value: summary.total_effective_cash_out,
      color: 'linear-gradient(to top, #e11d48, #f43f5e)',
    },
    {
      key: 'net_flow',
      label: 'Net Flow',
      value: summary.net_cash_flow,
      color: 'linear-gradient(to top, #7c3aed, #8b5cf6)',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="chart-animate-panel rounded-2xl border border-violet-100 bg-white/70 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">Visual Summary</p>
        <h2 className="text-lg font-extrabold text-black mt-1">Cash Flow Charts</h2>
        <p className="text-xs text-slate-600 mt-1">
          Animated charts for cash movement, product mix, outflows, and period trends.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DonutChart title="Cash In vs Cash Out" slices={movementSlices} currency={currency} />
        <DonutChart title="Outflow Breakdown" slices={outflowSlices} currency={currency} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DonutChart title="Cash In by Product" slices={productCashInSlices} currency={currency} />
        <DonutChart title="Net Flow by Product" slices={productNetSlices} currency={currency} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <VerticalBarChart title="Cash In vs Out vs Net Flow" bars={compareBars} currency={currency} showSign />
        <NetFlowPeriodChart
          title="Net Cash Flow by Period"
          rows={rows}
          currency={currency}
          formatPeriodLabel={formatPeriodLabel}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HorizontalBarChart title="Product Cash In" bars={productCashInSlices} currency={currency} />
        <HorizontalBarChart title="Product Net Flow (absolute)" bars={productNetSlices} currency={currency} />
      </div>

      <CashFlowTimelineChart
        title="Period Timeline — In, Out & Balance"
        rows={rows}
        currency={currency}
        formatPeriodLabel={formatPeriodLabel}
      />
    </div>
  );
}

export function AnimatedProductBreakdownCard({
  blockKey,
  label,
  badgeClass,
  accentClass,
  summary,
  formatAmount,
}: {
  blockKey: string;
  label: string;
  badgeClass: string;
  accentClass: string;
  summary: Summary;
  formatAmount: (value: number) => string;
}) {
  const inShare =
    summary.total_cash_in + summary.total_effective_cash_out > 0
      ? (summary.total_cash_in / (summary.total_cash_in + summary.total_effective_cash_out)) * 100
      : 0;

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm chart-animate-panel">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${badgeClass}`}>{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${accentClass} text-white chart-animate-icon`}>
          <Wallet className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="mb-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 chart-animate-fill"
          style={{
            width: `${Math.max(inShare, summary.total_cash_in > 0 ? 6 : 0)}%`,
            animationDelay: chartStaggerDelay(SOURCE_ORDER_INDEX(blockKey), 0.15),
          }}
        />
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-600">Cash In</span>
          <span className="font-bold tabular-nums text-emerald-700">{formatAmount(summary.total_cash_in)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-600">Cash Out</span>
          <span className="font-bold tabular-nums text-rose-700">{formatAmount(summary.total_effective_cash_out)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-violet-50 pt-2">
          <span className="font-semibold text-slate-700">Net Flow</span>
          <span className={`font-bold tabular-nums ${summary.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatAmount(summary.net_cash_flow)}
          </span>
        </div>
      </div>
    </div>
  );
}

function SOURCE_ORDER_INDEX(key: string): number {
  const order = ['finance', 'microfinance', 'mortgage', 'instant_loan'];
  const index = order.indexOf(key);
  return index >= 0 ? index : 0;
}
