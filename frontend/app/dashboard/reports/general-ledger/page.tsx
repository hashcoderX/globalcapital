'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Download,
  Filter,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  buildSimpleLedgerModel,
  PreviewModeToggle,
  SimpleLedgerPreview,
  type LedgerLine,
  type PreviewMode,
} from '@/app/components/accounting/GeneralLedgerViews';

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

type CompanyOption = {
  id: number;
  name: string;
  currency?: string | null;
};

type AuthUser = {
  id?: number;
  role?: string;
  designation?: { id?: number; name?: string } | null;
  roles?: Array<{ id?: number; name?: string }>;
};

const inputClass =
  'w-full rounded-xl border border-violet-200/80 bg-white px-3.5 py-2.5 text-sm text-black shadow-sm transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200/80 placeholder:text-slate-400 [color-scheme:light]';

const labelClass = 'block text-xs font-bold text-slate-700 mb-1.5';

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

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sourceLabel(source?: string | null): string {
  if (source === 'company_account') return 'Setup';
  if (source === 'finance') return 'Finance';
  if (source === 'accounting') return 'Accounting';
  if (source === 'wallet') return 'Wallet';
  return 'Mixed';
}

function sourceBadgeClass(source?: string | null): string {
  if (source === 'company_account') return 'border-violet-200 bg-violet-50 text-violet-800';
  if (source === 'finance') return 'border-indigo-200 bg-indigo-50 text-indigo-800';
  if (source === 'accounting') return 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800';
  if (source === 'wallet') return 'border-cyan-200 bg-cyan-50 text-cyan-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function GeneralLedgerSnapshotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCompanyId = Number(searchParams.get('branch_id') || searchParams.get('company_id') || 0) || null;

  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(initialCompanyId);
  const [companyMeta, setCompanyMeta] = useState<{ id: number; name: string; currency: string } | null>(null);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
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
  const [previewMode, setPreviewMode] = useState<PreviewMode>('simple');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const normalizeText = (value: string) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const designationName = normalizeText(String(authUser?.designation?.name || ''));
  const roleNames = (authUser?.roles || []).map((role) => normalizeText(String(role?.name || '')));
  const directRoleName = normalizeText(String(authUser?.role || ''));
  const roleSignals = [designationName, directRoleName, ...roleNames].filter(Boolean);

  const canUseAccountantPreview = roleSignals.some((signal) =>
    [
      'super admin',
      'system admin',
      'admin',
      'accountant',
      'senior accountant',
      'auditor',
      'finance manager',
      'branch manager',
      'manager',
    ].some((keyword) => signal.includes(keyword))
  );

  const currency = companyMeta?.currency || selectedCompany?.currency || 'LKR';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);

    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setAuthUser(JSON.parse(storedUser));
      } catch {
        setAuthUser(null);
      }
    } else {
      setAuthUser(null);
    }
  }, [router]);

  useEffect(() => {
    if (!canUseAccountantPreview && previewMode === 'accountant') {
      setPreviewMode('simple');
    }
  }, [canUseAccountantPreview, previewMode]);

  const fetchCompanies = async (authToken: string) => {
    setLoadingCompanies(true);
    try {
      const response = await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setCompanies(rows);

      if (rows.length > 0) {
        setSelectedCompanyId((current) => {
          if (current && rows.some((row: CompanyOption) => row.id === current)) {
            return current;
          }
          return Number(rows[0].id);
        });
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

  const fetchReport = async (overrides?: {
    from_date?: string;
    to_date?: string;
    product_type?: string;
    status?: string;
  }) => {
    if (!token) return;

    setLoading(true);
    setError('');

    const effectiveFromDate = overrides?.from_date ?? fromDate;
    const effectiveToDate = overrides?.to_date ?? toDate;
    const effectiveProductType = overrides?.product_type ?? productType;
    const effectiveStatus = overrides?.status ?? status;

    try {
      const response = await axios.get('/api/finances/reports/general-ledger', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          branch_id: selectedCompanyId || undefined,
          company_id: selectedCompanyId || undefined,
          from_date: effectiveFromDate || undefined,
          to_date: effectiveToDate || undefined,
          product_type: effectiveProductType === 'all' ? undefined : effectiveProductType,
          status: effectiveStatus === 'all' ? undefined : effectiveStatus,
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
      setCompanyMeta(payload.company || null);
    } catch (fetchError: any) {
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
      setError(fetchError?.response?.data?.message || 'Failed to load general ledger data.');
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
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCompanyId, loadingCompanies]);

  const applyFilters = () => {
    fetchReport();
  };

  const resetFilters = () => {
    const nextFrom = monthStartIso();
    const nextTo = todayIso();
    setFromDate(nextFrom);
    setToDate(nextTo);
    setProductType('all');
    setStatus('all');
    fetchReport({
      from_date: nextFrom,
      to_date: nextTo,
      product_type: 'all',
      status: 'all',
    });
  };

  const exportCsv = () => {
    if (previewMode === 'simple') {
      const model = buildSimpleLedgerModel(lines);
      const headers = ['Section', 'Account', 'At Start', 'Came In', 'Went Out', 'Current', 'Change'];
      const data = model.flat.map((row) => [
        row.group,
        row.title,
        amount(row.atStart),
        amount(row.cameIn),
        amount(row.wentOut),
        amount(row.current),
        amount(row.change),
      ]);
      const csv = [headers, ...data].map((line) => line.map(csvEscape).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `general-ledger-simple-${selectedCompanyId || 'all'}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const headers = [
      'Account Code',
      'Account Name',
      'Source',
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
      sourceLabel(line.source),
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
    link.download = `general-ledger-${selectedCompanyId || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasLines = useMemo(() => lines.length > 0, [lines]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(lines.length / pageSize)), [lines.length, pageSize]);

  const paginatedLines = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return lines.slice(startIndex, startIndex + pageSize);
  }, [lines, currentPage, pageSize]);

  const paginationStart = lines.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const paginationEnd = Math.min(currentPage * pageSize, lines.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [lines, pageSize, selectedCompanyId, fromDate, toDate, productType, status]);

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
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-300 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-100">Accounting</p>
              <h1 className="text-2xl font-extrabold mt-1">General Ledger</h1>
              <p className="text-sm text-violet-50 mt-1">
                {previewMode === 'simple'
                  ? 'See branch money, receivables, income, and spending in plain language.'
                  : 'Full debit and credit ledger detail for accountants and auditors.'}
              </p>
              {companyMeta ? (
                <p className="text-xs text-violet-100 mt-2 inline-flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {companyMeta.name} · {currency}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!hasLines}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => fetchReport()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/reports')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Reports Hub
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}

        {canUseAccountantPreview ? (
          <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />
        ) : (
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs font-semibold text-cyan-900">
            Role-based preview: your account can view the simple ledger preview only.
          </div>
        )}

        {previewMode === 'accountant' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: 'Opening Debit / Credit',
              value: `${amount(summary.opening_debits)} / ${amount(summary.opening_credits)}`,
              icon: BookOpen,
              accent: 'from-violet-500 to-purple-600',
            },
            {
              label: 'Period Debit / Credit',
              value: `${amount(summary.period_debits)} / ${amount(summary.period_credits)}`,
              icon: TrendingUp,
              accent: 'from-indigo-500 to-blue-600',
            },
            {
              label: 'Closing Debit / Credit',
              value: `${amount(summary.closing_debits)} / ${amount(summary.closing_credits)}`,
              icon: Scale,
              accent: 'from-cyan-500 to-teal-600',
            },
            {
              label: 'Net Period Movement',
              value: amount(summary.net_period_movement),
              icon: summary.net_period_movement >= 0 ? TrendingUp : TrendingDown,
              accent: summary.net_period_movement >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600',
              valueClass: summary.net_period_movement >= 0 ? 'text-emerald-700' : 'text-rose-700',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-violet-100 bg-white/90 p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className={`mt-1 text-sm font-bold truncate tabular-nums leading-snug ${item.valueClass || 'text-black'}`}>{item.value}</p>
                  </div>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.accent} text-white`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        ) : null}

        <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-violet-700" />
              <h2 className="text-sm font-bold text-black">Filters</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div>
              <label className={labelClass}>Company / Branch</label>
              <select
                value={selectedCompanyId ?? ''}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)}
                disabled={loadingCompanies || companies.length === 0}
                className={inputClass}
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
              <label className={labelClass}>From date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>To date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Product type</label>
              <select value={productType} onChange={(e) => setProductType(e.target.value)} className={inputClass}>
                <option value="all">All products</option>
                <option value="hire-purchase">Hire purchase</option>
                <option value="lease">Lease</option>
                <option value="loan">Loan</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Finance status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending_approval">Pending approval</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-black">
                {previewMode === 'simple' ? 'Easy Account Summary' : 'Ledger Lines'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {previewMode === 'simple'
                  ? 'Grouped by what the money means, not accounting codes.'
                  : 'Branch account setup merged with finance activity for the selected period.'}
              </p>
            </div>
            <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
              {summary.accounts_count} accounts
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
          ) : lines.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">No ledger data found</p>
              <p className="text-xs text-amber-800 mt-1">
                Select a branch with account setup, or widen your date filters.
              </p>
            </div>
          ) : previewMode === 'simple' ? (
            <SimpleLedgerPreview lines={lines} currency={currency} />
          ) : (
            <>
            <div className="overflow-x-auto rounded-xl border border-violet-100">
              <table className="min-w-full text-sm text-black">
                <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider text-black">
                  <tr>
                    <th className="px-3 py-3 text-left">Code</th>
                    <th className="px-3 py-3 text-left">Account</th>
                    <th className="px-3 py-3 text-left">Source</th>
                    <th className="px-3 py-3 text-right">Opening Dr</th>
                    <th className="px-3 py-3 text-right">Opening Cr</th>
                    <th className="px-3 py-3 text-right">Period Dr</th>
                    <th className="px-3 py-3 text-right">Period Cr</th>
                    <th className="px-3 py-3 text-right">Movement</th>
                    <th className="px-3 py-3 text-right">Closing Dr</th>
                    <th className="px-3 py-3 text-right">Closing Cr</th>
                    <th className="px-3 py-3 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50 bg-white">
                  {paginatedLines.map((line) => (
                    <tr key={`${line.account_code}-${line.account_name}`} className="hover:bg-violet-50/40">
                      <td className="px-3 py-3 font-semibold tabular-nums">{line.account_code}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold">{line.account_name}</p>
                        {line.account_type ? <p className="text-[11px] capitalize">{line.account_type.replace(/_/g, ' ')}</p> : null}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${sourceBadgeClass(line.source)}`}>
                          {sourceLabel(line.source)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{amount(line.opening_debit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{amount(line.opening_credit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{amount(line.period_debit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{amount(line.period_credit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold">{amount(line.period_movement)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{amount(line.closing_debit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{amount(line.closing_credit)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${line.closing_side === 'debit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {amount(Math.abs(line.closing_balance))} {line.closing_side.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-violet-100 pt-4">
              <p className="text-xs text-slate-600">
                Showing {paginationStart} to {paginationEnd} of {lines.length} accounts
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  Rows
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                    className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-black"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
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
      </div>
    </div>
  );
}
