'use client';

import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import {
  accountingInputClass,
  accountingLabelClass,
  formatMoney,
  type AccountingCompany,
} from '@/app/components/accounting/companyAccountingUtils';

type ExpenseRow = {
  id: number;
  company_id: number;
  expense_date: string;
  category: string;
  title: string;
  amount: number | string;
  payment_method: 'cash' | 'bank' | 'main';
  reference_no?: string | null;
  notes?: string | null;
  created_at?: string;
};

type ExpenseForm = {
  expense_date: string;
  category: string;
  title: string;
  amount: string;
  payment_method: 'cash' | 'bank' | 'main';
  reference_no: string;
  notes: string;
};

const CATEGORY_OPTIONS = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'transport', label: 'Transport' },
  { value: 'office_supplies', label: 'Office supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'main', label: 'Main account' },
];

const PER_PAGE_OPTIONS = [10, 15, 25, 50] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function emptyForm(): ExpenseForm {
  return {
    expense_date: todayIso(),
    category: 'other',
    title: '',
    amount: '',
    payment_method: 'cash',
    reference_no: '',
    notes: '',
  };
}

function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value.replace(/_/g, ' ');
}

function paymentLabel(value: string): string {
  return PAYMENT_OPTIONS.find((item) => item.value === value)?.label || value;
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export default function AccountingExpensesPage() {
  const router = useRouter();
  const widgetPrefix = 'accounting_expenses_widget_';

  const [token, setToken] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<AccountingCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(emptyForm());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<string[]>([]);
  const [widgetNotice, setWidgetNotice] = useState('');

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const currency = selectedCompany?.currency || 'LKR';

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

  const fetchExpenses = async () => {
    if (!token || !selectedCompanyId) {
      setExpenses([]);
      setTotalAmount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const response = await axios.get(`/api/companies/${selectedCompanyId}/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          search: search.trim() || undefined,
        },
      });

      setExpenses(Array.isArray(response.data?.expenses) ? response.data.expenses : []);
      setTotalAmount(Number(response.data?.summary?.total_amount || 0));
    } catch (error: unknown) {
      setExpenses([]);
      setTotalAmount(0);
      if (axios.isAxiosError(error)) {
        setNotice({
          type: 'error',
          text:
            (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
            'Failed to load expenses.',
        });
      } else {
        setNotice({ type: 'error', text: 'Failed to load expenses.' });
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
    fetchExpenses();
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

  useEffect(() => {
    setCurrentPage(1);
  }, [expenses, pageSize, selectedCompanyId, fromDate, toDate, categoryFilter, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(expenses.length / pageSize)), [expenses.length, pageSize]);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return expenses.slice(startIndex, startIndex + pageSize);
  }, [expenses, currentPage, pageSize]);
  const paginationStart = expenses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const paginationEnd = Math.min(currentPage * pageSize, expenses.length);
  const statCards = [
    {
      key: 'total_expenses',
      label: 'Total Expenses',
      value: formatMoney(totalAmount, currency),
      icon: Wallet,
      accent: 'from-rose-500 to-red-600',
      valueClass: 'text-rose-700',
    },
    {
      key: 'records',
      label: 'Records',
      value: String(expenses.length),
      icon: Building2,
      accent: 'from-violet-500 to-purple-600',
      valueClass: 'text-black',
    },
    {
      key: 'period',
      label: 'Period',
      value: `${formatDate(fromDate)} – ${formatDate(toDate)}`,
      icon: Wallet,
      accent: 'from-cyan-500 to-blue-600',
      valueClass: 'text-black text-xs',
    },
  ];
  const tableColumns = [
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'title', label: 'Title' },
    { key: 'amount', label: 'Amount' },
    { key: 'payment', label: 'Payment' },
    { key: 'reference', label: 'Reference' },
    { key: 'action', label: 'Action' },
  ];
  const showHeroWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}hero`);
  const showNoticeWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}notice`);
  const showStatsWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}stats`);
  const showFiltersWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}filters`);
  const showRecordsWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}records`);
  const visibleStatCards = statCards.filter((card) => !hiddenWidgetKeys.includes(`${widgetPrefix}stat_${card.key}`));
  const visibleTableColumns = tableColumns.filter((column) => !hiddenWidgetKeys.includes(`${widgetPrefix}col_${column.key}`));
  const showAnyWidget = showHeroWidget || showNoticeWidget || showStatsWidget || showFiltersWidget || showRecordsWidget;

  const openAddModal = () => {
    setForm(emptyForm());
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;
    setShowAddModal(false);
    setForm(emptyForm());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedCompanyId) return;

    setSaving(true);
    setNotice(null);

    try {
      await axios.post(
        `/api/companies/${selectedCompanyId}/expenses`,
        {
          expense_date: form.expense_date,
          category: form.category,
          title: form.title.trim(),
          amount: Number(form.amount),
          payment_method: form.payment_method,
          reference_no: form.reference_no.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotice({ type: 'success', text: 'Expense added successfully.' });
      setForm(emptyForm());
      setShowAddModal(false);
      await fetchExpenses();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setNotice({
          type: 'error',
          text:
            (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
            'Failed to add expense.',
        });
      } else {
        setNotice({ type: 'error', text: 'Failed to add expense.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expenseId: number) => {
    if (!token || !selectedCompanyId) return;
    if (!window.confirm('Delete this expense record?')) return;

    setNotice(null);

    try {
      await axios.delete(`/api/companies/${selectedCompanyId}/expenses/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotice({ type: 'success', text: 'Expense deleted.' });
      await fetchExpenses();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setNotice({
          type: 'error',
          text:
            (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
            'Failed to delete expense.',
        });
      } else {
        setNotice({ type: 'error', text: 'Failed to delete expense.' });
      }
    }
  };

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
              aria-label="Hide expenses hero widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-100">Accounting</p>
              <h1 className="text-2xl font-extrabold mt-1">Expenses</h1>
              <p className="text-sm text-violet-50 mt-1">
                Record branch operating expenses and review totals for the selected period.
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
                onClick={openAddModal}
                disabled={!selectedCompanyId}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </button>
              <button
                type="button"
                onClick={() => fetchExpenses()}
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

        {notice && showNoticeWidget ? (
          <div
            className={`relative rounded-2xl border px-4 py-3 text-sm font-semibold ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <WidgetCloseGate>
              <button
                type="button"
                onClick={() => void hideWidget(`${widgetPrefix}notice`)}
                className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current/20 bg-white/70 text-current hover:bg-white"
                aria-label="Hide expenses notice widget"
              >
                ×
              </button>
            </WidgetCloseGate>
            <span className="inline-flex items-center gap-2">
              {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
              {notice.text}
            </span>
          </div>
        ) : null}

        {showStatsWidget ? (
          <div className="relative">
            <WidgetCloseGate>
              <button
                type="button"
                onClick={() => void hideWidget(`${widgetPrefix}stats`)}
                className="absolute right-2 -top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                aria-label="Hide expense stats widget"
              >
                ×
              </button>
            </WidgetCloseGate>
            {visibleStatCards.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {visibleStatCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="relative rounded-2xl border border-violet-100 bg-white/90 p-3.5 shadow-sm">
                      <WidgetCloseGate>
                        <button
                          type="button"
                          onClick={() => void hideWidget(`${widgetPrefix}stat_${item.key}`)}
                          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                          aria-label={`Hide ${item.label} stat widget`}
                        >
                          ×
                        </button>
                      </WidgetCloseGate>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                          <p className={`mt-1 text-sm font-bold truncate tabular-nums leading-snug ${item.valueClass}`}>{item.value}</p>
                        </div>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.accent} text-white`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm font-medium text-violet-900">
                All expense stat cards are hidden.
              </div>
            )}
          </div>
        ) : null}

        {showFiltersWidget ? (
        <div className="relative rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}filters`)}
              className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
              aria-label="Hide expense filters widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
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
              <label className={accountingLabelClass}>From date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={accountingInputClass} />
            </div>
            <div>
              <label className={accountingLabelClass}>To date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={accountingInputClass} />
            </div>
            <div>
              <label className={accountingLabelClass}>Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={accountingInputClass}>
                <option value="all">All categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={accountingLabelClass}>Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, reference, notes"
                className={accountingInputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchExpenses()}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                const nextFrom = monthStartIso();
                const nextTo = todayIso();
                setFromDate(nextFrom);
                setToDate(nextTo);
                setCategoryFilter('all');
                setSearch('');
              }}
              className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50"
            >
              Reset Filters
            </button>
          </div>
        </div>
        ) : null}

        {showRecordsWidget ? (
        <div className="relative rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}records`)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
              aria-label="Hide expense records widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-black">Expense Records</h2>
              <p className="text-xs text-slate-600 mt-1">Manual branch expenses recorded through accounting.</p>
            </div>
            <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
              {expenses.length} records
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
          ) : !selectedCompanyId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">Select a branch</p>
              <p className="text-xs text-amber-800 mt-1">Choose a company or branch to manage expenses.</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">No expenses found</p>
              <p className="text-xs text-amber-800 mt-1">Use Add Expense to record the first expense for this branch.</p>
            </div>
          ) : visibleTableColumns.length === 0 ? (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-violet-900">All expense table columns are hidden.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-violet-100">
                <table className="min-w-full text-xs text-black">
                  <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider text-black">
                    <tr>
                      {visibleTableColumns.map((column) => (
                        <th
                          key={column.key}
                          className={`px-3 py-3 ${column.key === 'amount' || column.key === 'action' ? 'text-right' : 'text-left'}`}
                        >
                          <div className={`inline-flex items-center gap-2 ${column.key === 'amount' || column.key === 'action' ? 'justify-end w-full' : ''}`}>
                            <span>{column.label}</span>
                            <WidgetCloseGate>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void hideWidget(`${widgetPrefix}col_${column.key}`);
                                }}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                                aria-label={`Hide ${column.label} column`}
                              >
                                ×
                              </button>
                            </WidgetCloseGate>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50 bg-white">
                    {paginatedRows.map((row) => (
                      <tr key={row.id} className="hover:bg-violet-50/40">
                        {visibleTableColumns.map((column) => {
                          if (column.key === 'date') {
                            return <td key={column.key} className="px-3 py-2.5 whitespace-nowrap font-semibold">{formatDate(row.expense_date)}</td>;
                          }
                          if (column.key === 'category') {
                            return <td key={column.key} className="px-3 py-2.5">{categoryLabel(row.category)}</td>;
                          }
                          if (column.key === 'title') {
                            return (
                              <td key={column.key} className="px-3 py-2.5">
                                <p className="font-semibold">{row.title}</p>
                                {row.notes ? <p className="text-[10px] text-slate-500 mt-0.5">{row.notes}</p> : null}
                              </td>
                            );
                          }
                          if (column.key === 'amount') {
                            return (
                              <td key={column.key} className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">
                                {formatMoney(row.amount, currency)}
                              </td>
                            );
                          }
                          if (column.key === 'payment') {
                            return <td key={column.key} className="px-3 py-2.5">{paymentLabel(row.payment_method)}</td>;
                          }
                          if (column.key === 'reference') {
                            return <td key={column.key} className="px-3 py-2.5">{row.reference_no || '—'}</td>;
                          }
                          return (
                            <td key={column.key} className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDelete(row.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-violet-100 pt-4">
                <p className="text-xs text-slate-600">
                  Showing {paginationStart} to {paginationEnd} of {expenses.length} records
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    Rows
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value) || 15)}
                      className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-black"
                    >
                      {PER_PAGE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        ) : null}
      </div>

      {showAddModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/55 backdrop-blur-md"
          onClick={closeAddModal}
        >
          <div
            className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 px-5 py-4 rounded-t-3xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-100">New record</p>
                  <h2 className="text-lg font-extrabold text-white">Add Expense</h2>
                  {selectedCompany ? (
                    <p className="text-sm text-violet-50 mt-0.5">
                      {selectedCompany.name} · {currency}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="rounded-lg border border-white/30 bg-white/10 p-2 text-white disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={accountingLabelClass}>Expense date *</label>
                  <input
                    type="date"
                    required
                    value={form.expense_date}
                    onChange={(e) => setForm((current) => ({ ...current, expense_date: e.target.value }))}
                    className={accountingInputClass}
                  />
                </div>
                <div>
                  <label className={accountingLabelClass}>Category *</label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
                    className={accountingInputClass}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={accountingLabelClass}>Payment method *</label>
                  <select
                    required
                    value={form.payment_method}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        payment_method: e.target.value as ExpenseForm['payment_method'],
                      }))
                    }
                    className={accountingInputClass}
                  >
                    {PAYMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={accountingLabelClass}>Amount *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
                    placeholder="0.00"
                    className={accountingInputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={accountingLabelClass}>Title / description *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                    placeholder="e.g. Office electricity bill"
                    className={accountingInputClass}
                  />
                </div>
                <div>
                  <label className={accountingLabelClass}>Reference no.</label>
                  <input
                    value={form.reference_no}
                    onChange={(e) => setForm((current) => ({ ...current, reference_no: e.target.value }))}
                    placeholder="Invoice or receipt number"
                    className={accountingInputClass}
                  />
                </div>
                <div>
                  <label className={accountingLabelClass}>Notes</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                    placeholder="Optional notes"
                    className={accountingInputClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-violet-100 pt-4">
                <button
                  type="submit"
                  disabled={saving || !selectedCompanyId}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Expense'}
                </button>
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="rounded-xl border border-violet-200 bg-white px-5 py-2.5 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
