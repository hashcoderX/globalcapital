'use client';

import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import {
  accountingInputClass,
  accountingLabelClass,
  formatMoney,
  type AccountingCompany,
} from '@/app/components/accounting/companyAccountingUtils';
import { OverviewCharts, type ChartSlice } from '@/app/components/accounting/OverviewChartPanels';

type OverviewSection = Record<string, number>;

type OverviewPayload = {
  company?: { id: number; name: string; currency: string };
  filters?: { from_date?: string; to_date?: string };
  assets?: OverviewSection;
  liabilities?: OverviewSection;
  income?: OverviewSection;
  expenses?: OverviewSection;
  profit?: OverviewSection;
  breakdown?: {
    loan_receivable?: OverviewSection;
    wallet_income_preview?: OverviewSection;
  };
};

type LineItem = {
  key: string;
  label: string;
  totalKey?: string;
  accent?: string;
};

const SECTIONS: Array<{
  title: string;
  icon: typeof Wallet;
  dataKey: keyof OverviewPayload;
  lines: LineItem[];
  headerClass: string;
}> = [
  {
    title: 'Assets',
    icon: Wallet,
    dataKey: 'assets',
    headerClass: 'from-emerald-600 to-teal-600',
    lines: [
      { key: 'cash_in_hand', label: 'Cash in Hand' },
      { key: 'bank_balance', label: 'Bank Balance' },
      { key: 'loan_receivable', label: 'Loan Receivable' },
      { key: 'total_assets', label: 'Total Assets', totalKey: 'total_assets', accent: 'text-emerald-700' },
    ],
  },
  {
    title: 'Liabilities',
    icon: TrendingDown,
    dataKey: 'liabilities',
    headerClass: 'from-amber-600 to-orange-600',
    lines: [
      { key: 'investor_deposits', label: 'Investor Deposits' },
      { key: 'borrowed_funds', label: 'Borrowed Funds' },
      { key: 'total_liabilities', label: 'Total Liabilities', totalKey: 'total_liabilities', accent: 'text-amber-700' },
    ],
  },
  {
    title: 'Income',
    icon: TrendingUp,
    dataKey: 'income',
    headerClass: 'from-cyan-600 to-blue-600',
    lines: [
      { key: 'interest_income', label: 'Interest Income' },
      { key: 'processing_fees', label: 'Processing Fees' },
      { key: 'penalty_income', label: 'Penalty Income' },
      { key: 'other_income', label: 'Other Income' },
      { key: 'collector_bank_deposits_preview', label: 'Collector Bank Deposits (Preview)' },
      { key: 'cash_handovers_preview', label: 'Cash Handovers (Preview)' },
      { key: 'branch_cash_transfers_preview', label: 'Branch Cash Transfers (Preview)' },
      { key: 'wallet_income_preview_total', label: 'Wallet Income Preview Total', accent: 'text-cyan-700' },
      { key: 'total_income', label: 'Total Income', totalKey: 'total_income', accent: 'text-cyan-700' },
    ],
  },
  {
    title: 'Expenses',
    icon: TrendingDown,
    dataKey: 'expenses',
    headerClass: 'from-rose-600 to-red-600',
    lines: [
      { key: 'salaries', label: 'Salaries' },
      { key: 'office_expenses', label: 'Office Expenses' },
      { key: 'fuel_expenses', label: 'Fuel Expenses' },
      { key: 'marketing_expenses', label: 'Marketing Expenses' },
      { key: 'refund_expenses', label: 'Refund Expenses' },
      { key: 'total_expenses', label: 'Total Expenses', totalKey: 'total_expenses', accent: 'text-rose-700' },
    ],
  },
  {
    title: 'Profit',
    icon: TrendingUp,
    dataKey: 'profit',
    headerClass: 'from-violet-600 to-purple-600',
    lines: [
      { key: 'period_profit', label: 'Period Profit' },
      { key: 'monthly_profit', label: 'Monthly Profit' },
      { key: 'yearly_profit', label: 'Yearly Profit', accent: 'text-violet-700' },
    ],
  },
];

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export default function AccountingOverviewPage() {
  const router = useRouter();
  const widgetPrefix = 'accounting_overview_widget_';

  const [token, setToken] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<AccountingCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState('');
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<string[]>([]);
  const [widgetNotice, setWidgetNotice] = useState('');

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const currency = overview?.company?.currency || selectedCompany?.currency || 'LKR';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const fetchCompanies = async (authToken: string) => {
    setLoadingCompanies(true);
    try {
      const response = await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const list = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setCompanies(list);

      if (list.length > 0) {
        setSelectedCompanyId((current) => current ?? Number(list[0].id));
      } else {
        setSelectedCompanyId(null);
      }
    } catch {
      setCompanies([]);
      setSelectedCompanyId(null);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchOverview = async (overrides?: { from_date?: string; to_date?: string }) => {
    if (!token || !selectedCompanyId) {
      setOverview(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const effectiveFrom = overrides?.from_date ?? fromDate;
    const effectiveTo = overrides?.to_date ?? toDate;

    try {
      const response = await axios.get(`/api/companies/${selectedCompanyId}/accounting-overview`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          from_date: effectiveFrom || undefined,
          to_date: effectiveTo || undefined,
        },
      });

      setOverview(response.data || null);
    } catch (fetchError: unknown) {
      setOverview(null);
      if (axios.isAxiosError(fetchError)) {
        setError(
          (typeof fetchError.response?.data?.message === 'string' && fetchError.response.data.message) ||
            'Failed to load financial overview.'
        );
      } else {
        setError('Failed to load financial overview.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchCompanies(token);
  }, [token]);

  useEffect(() => {
    if (!token || loadingCompanies) return;
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCompanyId, loadingCompanies]);

  const fetchWidgetPreferences = useCallback(async (authToken: string) => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/dashboard/widgets`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });
      const widgets = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data?.widgets)
          ? response.data.widgets
          : [];
      const hidden = widgets
        .filter(
          (item: { widget_key?: unknown; is_visible?: unknown }) =>
            typeof item.widget_key === 'string' &&
            item.widget_key.startsWith(widgetPrefix) &&
            (item.is_visible === false || Number(item.is_visible) === 0)
        )
        .map((item: { widget_key: string }) => item.widget_key);
      setHiddenWidgetKeys(hidden);
    } catch {
      setWidgetNotice('Failed to load widget preferences.');
    }
  }, []);

  const saveWidgetPreference = useCallback(
    async (widgetKey: string, isVisible: boolean) => {
      if (!token) return;
      const normalizedKey = String(widgetKey || '').trim();
      if (!normalizedKey || normalizedKey.length > 120) {
        setWidgetNotice('Failed to save widget preference.');
        return;
      }
      try {
        await axios.patch(
          `${getApiBaseUrl()}/dashboard/widgets`,
          { widget_key: normalizedKey, is_visible: Boolean(isVisible) },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );
        setWidgetNotice('');
      } catch {
        setWidgetNotice('Failed to save widget preference.');
      }
    },
    [token]
  );

  const hideWidget = useCallback(
    async (widgetKey: string) => {
      setHiddenWidgetKeys((prev) => (prev.includes(widgetKey) ? prev : [...prev, widgetKey]));
      await saveWidgetPreference(widgetKey, false);
    },
    [saveWidgetPreference]
  );

  useEffect(() => {
    if (!token) return;
    void fetchWidgetPreferences(token);
  }, [token, fetchWidgetPreferences]);

  const getValue = (sectionKey: keyof OverviewPayload, lineKey: string): number => {
    const section = overview?.[sectionKey];
    if (!section || typeof section !== 'object') return 0;
    return Number((section as OverviewSection)[lineKey] || 0);
  };

  const chartData = useMemo(() => {
    const assets: ChartSlice[] = [
      { key: 'cash_in_hand', label: 'Cash in Hand', value: getValue('assets', 'cash_in_hand'), color: '#10b981' },
      { key: 'bank_balance', label: 'Bank Balance', value: getValue('assets', 'bank_balance'), color: '#06b6d4' },
      { key: 'loan_receivable', label: 'Loan Receivable', value: getValue('assets', 'loan_receivable'), color: '#6366f1' },
    ];

    const liabilities: ChartSlice[] = [
      { key: 'investor_deposits', label: 'Investor Deposits', value: getValue('liabilities', 'investor_deposits'), color: '#f59e0b' },
      { key: 'borrowed_funds', label: 'Borrowed Funds', value: getValue('liabilities', 'borrowed_funds'), color: '#f97316' },
    ];

    const income: ChartSlice[] = [
      { key: 'interest_income', label: 'Interest Income', value: getValue('income', 'interest_income'), color: '#0891b2' },
      { key: 'processing_fees', label: 'Processing Fees', value: getValue('income', 'processing_fees'), color: '#0284c7' },
      { key: 'penalty_income', label: 'Penalty Income', value: getValue('income', 'penalty_income'), color: '#2563eb' },
      { key: 'other_income', label: 'Other Income', value: getValue('income', 'other_income'), color: '#4f46e5' },
      {
        key: 'collector_bank_deposits_preview',
        label: 'Collector Deposits (Preview)',
        value: getValue('income', 'collector_bank_deposits_preview'),
        color: '#0ea5e9',
      },
      {
        key: 'cash_handovers_preview',
        label: 'Cash Handovers (Preview)',
        value: getValue('income', 'cash_handovers_preview'),
        color: '#06b6d4',
      },
      {
        key: 'branch_cash_transfers_preview',
        label: 'Branch Cash Transfers (Preview)',
        value: getValue('income', 'branch_cash_transfers_preview'),
        color: '#22d3ee',
      },
    ];

    const expenses: ChartSlice[] = [
      { key: 'salaries', label: 'Salaries', value: getValue('expenses', 'salaries'), color: '#f43f5e' },
      { key: 'office_expenses', label: 'Office Expenses', value: getValue('expenses', 'office_expenses'), color: '#e11d48' },
      { key: 'fuel_expenses', label: 'Fuel Expenses', value: getValue('expenses', 'fuel_expenses'), color: '#db2777' },
      { key: 'marketing_expenses', label: 'Marketing Expenses', value: getValue('expenses', 'marketing_expenses'), color: '#c026d3' },
      { key: 'refund_expenses', label: 'Refund Expenses', value: getValue('expenses', 'refund_expenses'), color: '#9333ea' },
    ];

    const profitBars: ChartSlice[] = [
      {
        key: 'total_income',
        label: 'Total Income',
        value: getValue('income', 'total_income'),
        color: 'linear-gradient(to top, #0891b2, #06b6d4)',
      },
      {
        key: 'total_expenses',
        label: 'Total Expenses',
        value: getValue('expenses', 'total_expenses'),
        color: 'linear-gradient(to top, #e11d48, #f43f5e)',
      },
      {
        key: 'period_profit',
        label: 'Period Profit',
        value: getValue('profit', 'period_profit'),
        color: 'linear-gradient(to top, #7c3aed, #8b5cf6)',
      },
    ];

    const loanReceivable: ChartSlice[] = [
      {
        key: 'finance',
        label: 'Finance',
        value: Number(overview?.breakdown?.loan_receivable?.finance || 0),
        color: '#3b82f6',
      },
      {
        key: 'microfinance',
        label: 'Microfinance',
        value: Number(overview?.breakdown?.loan_receivable?.microfinance || 0),
        color: '#14b8a6',
      },
      {
        key: 'instant_loans',
        label: 'Instant Loans',
        value: Number(overview?.breakdown?.loan_receivable?.instant_loans || 0),
        color: '#a855f7',
      },
      {
        key: 'mortgages',
        label: 'Mortgages',
        value: Number(overview?.breakdown?.loan_receivable?.mortgages || 0),
        color: '#f59e0b',
      },
    ];

    return { assets, liabilities, income, expenses, profitBars, loanReceivable };
  }, [overview]);

  const showHeroWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}hero`);
  const showErrorWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}error`);
  const showFiltersWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}filters`);
  const showChartsWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}charts`);
  const showSectionsWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}sections`);
  const showBreakdownWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}breakdown`);
  const visibleSections = SECTIONS.filter((section) => !hiddenWidgetKeys.includes(`${widgetPrefix}section_${section.dataKey}`));
  const breakdownItems = [
    { key: 'finance', label: 'Finance' },
    { key: 'microfinance', label: 'Microfinance' },
    { key: 'instant_loans', label: 'Instant Loans' },
    { key: 'mortgages', label: 'Mortgages' },
  ];
  const visibleBreakdownItems = breakdownItems.filter(
    (item) => !hiddenWidgetKeys.includes(`${widgetPrefix}breakdown_${item.key}`)
  );
  const showAnyWidget =
    showHeroWidget || showErrorWidget || showFiltersWidget || showChartsWidget || showSectionsWidget || showBreakdownWidget;

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-violet-300 blur-3xl" />
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-purple-300 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {widgetNotice ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {widgetNotice}
          </div>
        ) : null}

        {!showAnyWidget ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-5 text-sm font-semibold text-violet-900">
            All widgets are currently hidden. Use `Restore Hidden Widgets` from the main dashboard to show them again.
          </div>
        ) : null}

        {showHeroWidget ? (
        <div className="relative rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-6 text-white shadow-lg">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}hero`)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20"
              aria-label="Hide accounting overview hero widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-100">Accounting</p>
              <h1 className="text-2xl font-extrabold mt-1">Financial Overview</h1>
              <p className="text-sm text-violet-50 mt-1">
                Assets, liabilities, income, expenses, and profit for the selected branch and period.
              </p>
              {selectedCompany ? (
                <p className="text-xs text-violet-100 mt-2 inline-flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {selectedCompany.name} · {currency}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fetchOverview()}
                disabled={loading || !selectedCompanyId}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/accounting')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Accounting Home
              </button>
            </div>
          </div>
        </div>
        ) : null}

        {error && showErrorWidget ? (
          <div className="relative rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            <WidgetCloseGate>
              <button
                type="button"
                onClick={() => void hideWidget(`${widgetPrefix}error`)}
                className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
                aria-label="Hide overview error widget"
              >
                ×
              </button>
            </WidgetCloseGate>
            {error}
          </div>
        ) : null}

        {showFiltersWidget ? (
        <div className="relative rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}filters`)}
              className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
              aria-label="Hide overview filters widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <label className={accountingLabelClass}>Company / Branch *</label>
              <select
                value={selectedCompanyId ?? ''}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)}
                disabled={loadingCompanies || companies.length === 0}
                className={accountingInputClass}
              >
                {companies.length === 0 ? (
                  <option value="">No branches found</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className={accountingLabelClass}>Income / expense from</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={accountingInputClass} />
            </div>
            <div>
              <label className={accountingLabelClass}>Income / expense to</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={accountingInputClass} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => fetchOverview()}
                disabled={loading || !selectedCompanyId}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
              >
                Apply Period
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Assets and liabilities are current balances. Income and expenses use{' '}
            <span className="font-semibold text-black">
              {formatDateLabel(fromDate)} – {formatDateLabel(toDate)}
            </span>
            . Wallet preview lines show approved collector deposits and handovers/transfers for super admin visibility; they do not replace core `total_income`. Monthly and yearly profit use the calendar month and year.
          </p>
        </div>
        ) : null}

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
          </div>
        ) : !selectedCompanyId ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-amber-900">Select a branch</p>
          </div>
        ) : (
          <>
            {showChartsWidget ? (
              <div className="relative">
                <WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => void hideWidget(`${widgetPrefix}charts`)}
                    className="absolute right-2 -top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    aria-label="Hide overview charts widget"
                  >
                    ×
                  </button>
                </WidgetCloseGate>
                <OverviewCharts
                  currency={currency}
                  assets={chartData.assets}
                  liabilities={chartData.liabilities}
                  income={chartData.income}
                  expenses={chartData.expenses}
                  profitBars={chartData.profitBars}
                  loanReceivable={chartData.loanReceivable}
                />
              </div>
            ) : null}

            {showSectionsWidget ? (
            <div className="relative grid grid-cols-1 xl:grid-cols-2 gap-4">
              <WidgetCloseGate>
                <button
                  type="button"
                  onClick={() => void hideWidget(`${widgetPrefix}sections`)}
                  className="absolute right-0 -top-4 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                  aria-label="Hide overview section cards widget"
                >
                  ×
                </button>
              </WidgetCloseGate>
              {visibleSections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.title} className="relative rounded-3xl border border-violet-100 bg-white/90 shadow-sm overflow-hidden">
                    <WidgetCloseGate>
                      <button
                        type="button"
                        onClick={() => void hideWidget(`${widgetPrefix}section_${section.dataKey}`)}
                        className="absolute right-3 top-3 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                        aria-label={`Hide ${section.title} section widget`}
                      >
                        ×
                      </button>
                    </WidgetCloseGate>
                    <div className={`bg-gradient-to-r ${section.headerClass} px-5 py-3 flex items-center gap-2`}>
                      <Icon className="h-4 w-4 text-white" />
                      <h2 className="text-sm font-extrabold text-white">{section.title}</h2>
                    </div>
                    <div className="divide-y divide-violet-50">
                      {section.lines.map((line) => {
                        const value = getValue(section.dataKey, line.key);
                        const isTotal = Boolean(line.totalKey);
                        return (
                          <div
                            key={line.key}
                            className={`flex items-center justify-between gap-3 px-5 py-3 ${isTotal ? 'bg-violet-50/60' : ''}`}
                          >
                            <span className={`text-sm ${isTotal ? 'font-bold text-black' : 'text-slate-700'}`}>{line.label}</span>
                            <span
                              className={`text-sm font-bold tabular-nums ${line.accent || (isTotal ? 'text-black' : 'text-black')} ${
                                section.dataKey === 'profit' && value < 0 ? 'text-rose-700' : ''
                              } ${section.dataKey === 'profit' && value >= 0 ? 'text-emerald-700' : ''}`}
                            >
                              {formatMoney(value, currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            ) : null}

            {overview?.breakdown?.loan_receivable && showBreakdownWidget ? (
              <div className="relative rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm">
                <WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => void hideWidget(`${widgetPrefix}breakdown`)}
                    className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    aria-label="Hide loan receivable breakdown widget"
                  >
                    ×
                  </button>
                </WidgetCloseGate>
                <h3 className="text-sm font-bold text-black mb-3">Loan Receivable Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {visibleBreakdownItems.length > 0 ? (
                    visibleBreakdownItems.map((item) => (
                      <div key={item.key} className="relative rounded-2xl border border-violet-100 bg-violet-50/40 p-3.5">
                        <WidgetCloseGate>
                          <button
                            type="button"
                            onClick={() => void hideWidget(`${widgetPrefix}breakdown_${item.key}`)}
                            className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                            aria-label={`Hide ${item.label} breakdown widget`}
                          >
                            ×
                          </button>
                        </WidgetCloseGate>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-black">
                          {formatMoney(overview.breakdown?.loan_receivable?.[item.key] || 0, currency)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm font-medium text-violet-900">
                      All breakdown cards are hidden.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
