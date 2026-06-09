'use client';

import type { ReactNode } from 'react';
import {
  accountingInputClass,
  accountingLabelClass,
  type AccountingCompany,
} from '@/app/components/accounting/companyAccountingUtils';

export type CompanyOption = AccountingCompany;

export function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function amount(value: unknown): string {
  return toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((line) => line.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AccountingReportShell({
  badge,
  title,
  description,
  actions,
  error,
  children,
}: {
  badge: string;
  title: string;
  description: string;
  actions?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-violet-300 blur-3xl" />
        <div className="absolute top-24 right-8 h-80 w-80 rounded-full bg-purple-300 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-100">{badge}</p>
              <h1 className="text-2xl font-extrabold mt-1">{title}</h1>
              <p className="text-sm text-violet-50 mt-1">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}

export function ReportFilters({
  companies,
  selectedCompanyId,
  onCompanyChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onApply,
  onReset,
  loadingCompanies,
  extraFilters,
}: {
  companies: CompanyOption[];
  selectedCompanyId: number | null;
  onCompanyChange: (value: number | null) => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  loadingCompanies?: boolean;
  extraFilters?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4 chart-animate-panel">
      <h2 className="text-sm font-bold text-black">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div>
          <label className={accountingLabelClass}>Branch</label>
          <select
            value={selectedCompanyId ?? ''}
            onChange={(e) => onCompanyChange(Number(e.target.value) || null)}
            disabled={loadingCompanies}
            className={accountingInputClass}
          >
            {companies.length === 0 ? <option value="">No branches</option> : null}
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={accountingLabelClass}>From date</label>
          <input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} className={accountingInputClass} />
        </div>
        <div>
          <label className={accountingLabelClass}>To date</label>
          <input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className={accountingInputClass} />
        </div>
        {extraFilters}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApply}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function ReportTable({
  title,
  subtitle,
  countLabel,
  loading,
  emptyTitle,
  emptyMessage,
  hasData,
  children,
}: {
  title: string;
  subtitle?: string;
  countLabel?: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  hasData: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm chart-animate-panel">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-black">{title}</h2>
          {subtitle ? <p className="text-xs text-black mt-1">{subtitle}</p> : null}
        </div>
        {countLabel ? (
          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
            {countLabel}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      ) : !hasData ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-amber-900">{emptyTitle || 'No data'}</p>
          {emptyMessage ? <p className="text-xs text-amber-800 mt-1">{emptyMessage}</p> : null}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function SummaryCards({
  items,
}: {
  items: Array<{ label: string; value: string; valueClass?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-violet-100 bg-white/90 p-3.5 shadow-sm chart-animate-panel">
          <p className="text-[9px] font-bold uppercase tracking-wider text-black">{item.label}</p>
          <p className={`mt-1 text-sm font-bold truncate tabular-nums leading-snug ${item.valueClass || 'text-black'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
