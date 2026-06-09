'use client';

import type { ReactNode } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { formatMoney } from '@/app/components/accounting/companyAccountingUtils';
import { chartStaggerDelay } from '@/app/components/accounting/chartAnimationUtils';

export type ChartSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  title: string;
  slices: ChartSlice[];
  currency: string;
  size?: number;
};

type BarChartProps = {
  title: string;
  bars: ChartSlice[];
  currency: string;
  showSign?: boolean;
};

type HorizontalBarChartProps = {
  title: string;
  bars: ChartSlice[];
  currency: string;
};

function filterPositiveSlices(slices: ChartSlice[]): ChartSlice[] {
  return slices.filter((slice) => slice.value > 0);
}

export function DonutChart({ title, slices, currency, size = 168 }: DonutChartProps) {
  const positiveSlices = filterPositiveSlices(slices);
  const total = positiveSlices.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) {
    return (
      <ChartPanel title={title} icon={PieChart}>
        <p className="text-xs text-slate-500 py-8 text-center">No chart data for this section.</p>
      </ChartPanel>
    );
  }

  let cumulative = 0;
  const gradientStops = positiveSlices
    .map((slice) => {
      const pct = (slice.value / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return `${slice.color} ${start}% ${cumulative}%`;
    })
    .join(', ');

  return (
    <ChartPanel title={title} icon={PieChart}>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <div
            className="h-full w-full rounded-full shadow-inner chart-animate-donut"
            style={{ background: `conic-gradient(${gradientStops})` }}
          />
          <div
            className="absolute inset-0 m-auto flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm"
            style={{ width: size * 0.58, height: size * 0.58 }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total</p>
            <p className="text-[11px] font-extrabold tabular-nums text-black leading-tight px-2 chart-animate-icon">
              {formatMoney(total, currency)}
            </p>
          </div>
        </div>

        <ul className="w-full space-y-2">
          {positiveSlices.map((slice, index) => {
            const pct = (slice.value / total) * 100;
            return (
              <li
                key={slice.key}
                className="rounded-xl border border-violet-50 bg-violet-50/40 px-3 py-2"
                style={{ animationDelay: chartStaggerDelay(index, 0.12) }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full chart-animate-dot"
                      style={{ backgroundColor: slice.color, animationDelay: chartStaggerDelay(index, 0.2) }}
                    />
                    <span className="text-xs font-semibold text-black truncate">{slice.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 tabular-nums">{pct.toFixed(1)}%</span>
                </div>
                <p className="mt-1 text-xs font-bold tabular-nums text-black pl-4">{formatMoney(slice.value, currency)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartPanel>
  );
}

export function VerticalBarChart({ title, bars, currency, showSign = false }: BarChartProps) {
  const chartBars = bars.filter((bar) => Math.abs(bar.value) > 0);
  const maxValue = Math.max(...chartBars.map((bar) => Math.abs(bar.value)), 1);

  if (chartBars.length === 0) {
    return (
      <ChartPanel title={title} icon={BarChart3}>
        <p className="text-xs text-slate-500 py-8 text-center">No chart data for this section.</p>
      </ChartPanel>
    );
  }

  return (
    <ChartPanel title={title} icon={BarChart3}>
      <div className="flex items-end justify-center gap-4 sm:gap-6 h-52 pt-2">
        {chartBars.map((bar, index) => {
          const height = Math.max(8, (Math.abs(bar.value) / maxValue) * 100);
          const negative = bar.value < 0;

          return (
            <div key={bar.key} className="flex flex-col items-center justify-end gap-2 flex-1 max-w-[88px]">
              <p className="text-[10px] font-bold tabular-nums text-black text-center leading-tight">
                {showSign && negative ? '−' : ''}
                {formatMoney(Math.abs(bar.value), currency)}
              </p>
              <div className="w-full flex items-end justify-center h-36">
                <div
                  className={`w-full max-w-[52px] rounded-t-xl shadow-sm chart-animate-bar chart-animate-fill ${negative ? 'bg-gradient-to-t from-rose-600 to-rose-400' : ''}`}
                  style={{
                    height: `${height}%`,
                    background: negative ? undefined : bar.color,
                    animationDelay: chartStaggerDelay(index, 0.22),
                  }}
                />
              </div>
              <p className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{bar.label}</p>
            </div>
          );
        })}
      </div>
    </ChartPanel>
  );
}

export function HorizontalBarChart({ title, bars, currency }: HorizontalBarChartProps) {
  const chartBars = filterPositiveSlices(bars);
  const maxValue = Math.max(...chartBars.map((bar) => bar.value), 1);

  if (chartBars.length === 0) {
    return (
      <ChartPanel title={title} icon={BarChart3}>
        <p className="text-xs text-slate-500 py-8 text-center">No chart data for this section.</p>
      </ChartPanel>
    );
  }

  return (
    <ChartPanel title={title} icon={BarChart3}>
      <div className="space-y-3">
        {chartBars.map((bar, index) => {
          const width = (bar.value / maxValue) * 100;
          return (
            <div key={bar.key}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-black">{bar.label}</span>
                <span className="text-xs font-bold tabular-nums text-black">{formatMoney(bar.value, currency)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full chart-animate-fill"
                  style={{
                    width: `${width}%`,
                    backgroundColor: bar.color,
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

type OverviewChartsProps = {
  currency: string;
  assets: ChartSlice[];
  liabilities: ChartSlice[];
  income: ChartSlice[];
  expenses: ChartSlice[];
  profitBars: ChartSlice[];
  loanReceivable: ChartSlice[];
};

export function OverviewCharts({
  currency,
  assets,
  liabilities,
  income,
  expenses,
  profitBars,
  loanReceivable,
}: OverviewChartsProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">Visual Summary</p>
        <h2 className="text-lg font-extrabold text-black mt-1">Charts & Breakdowns</h2>
        <p className="text-xs text-slate-600 mt-1">Graphical preview of assets, liabilities, income, expenses, and profit.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DonutChart title="Assets Composition" slices={assets} currency={currency} />
        <DonutChart title="Liabilities Composition" slices={liabilities} currency={currency} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DonutChart title="Income Mix" slices={income} currency={currency} />
        <DonutChart title="Expense Mix" slices={expenses} currency={currency} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <VerticalBarChart title="Income vs Expenses vs Profit" bars={profitBars} currency={currency} showSign />
        <DonutChart title="Loan Receivable by Product" slices={loanReceivable} currency={currency} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HorizontalBarChart title="Income Breakdown" bars={income} currency={currency} />
        <HorizontalBarChart title="Expense Breakdown" bars={expenses} currency={currency} />
      </div>
    </div>
  );
}
