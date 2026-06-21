'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle2, HandCoins, Landmark, Plus, RefreshCw, Search, Sparkles, Trash2, Wallet, X } from 'lucide-react';
import {
  accountingInputClass,
  accountingLabelClass,
  formatMoney,
  type AccountingCompany,
} from '@/app/components/accounting/companyAccountingUtils';

type RefundRow = {
  id: number;
  company_id: number;
  refund_date: string;
  title: string;
  amount: number | string;
  payment_method: 'cash' | 'bank';
  reference_no?: string | null;
  notes?: string | null;
  created_at?: string;
};

type RefundForm = {
  refund_date: string;
  title: string;
  amount: string;
  payment_method: 'cash' | 'bank';
  reference_no: string;
  notes: string;
};

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function emptyForm(mode: RefundForm['payment_method'] = 'cash'): RefundForm {
  return {
    refund_date: todayIso(),
    title: '',
    amount: '',
    payment_method: mode,
    reference_no: '',
    notes: '',
  };
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

export default function AccountingRefundsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<AccountingCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'bank'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<RefundForm>(emptyForm());
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );
  const currency = selectedCompany?.currency || 'LKR';

  const cashTotal = useMemo(
    () => refunds.reduce((sum, row) => sum + (row.payment_method === 'cash' ? Number(row.amount || 0) : 0), 0),
    [refunds]
  );
  const bankTotal = useMemo(
    () => refunds.reduce((sum, row) => sum + (row.payment_method === 'bank' ? Number(row.amount || 0) : 0), 0),
    [refunds]
  );

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

  const fetchRefunds = async () => {
    if (!token || !selectedCompanyId) {
      setRefunds([]);
      setTotalAmount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const response = await axios.get(`/api/companies/${selectedCompanyId}/refunds`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          payment_method: paymentFilter === 'all' ? undefined : paymentFilter,
          search: search.trim() || undefined,
        },
      });
      setRefunds(Array.isArray(response.data?.refunds) ? response.data.refunds : []);
      setTotalAmount(Number(response.data?.summary?.total_amount || 0));
    } catch (error: unknown) {
      setRefunds([]);
      setTotalAmount(0);
      if (axios.isAxiosError(error)) {
        setNotice({
          type: 'error',
          text:
            (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
            'Failed to load refunds.',
        });
      } else {
        setNotice({ type: 'error', text: 'Failed to load refunds.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void fetchCompanies(token);
  }, [token]);

  useEffect(() => {
    if (!token || loadingCompanies) return;
    void fetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCompanyId, loadingCompanies]);

  const openAddModal = (mode: RefundForm['payment_method'] = 'cash') => {
    setForm(emptyForm(mode));
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
        `/api/companies/${selectedCompanyId}/refunds`,
        {
          refund_date: form.refund_date,
          title: form.title.trim(),
          amount: Number(form.amount),
          payment_method: form.payment_method,
          reference_no: form.reference_no.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotice({ type: 'success', text: 'Refund recorded successfully.' });
      setShowAddModal(false);
      setForm(emptyForm());
      await fetchRefunds();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setNotice({
          type: 'error',
          text:
            (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
            'Failed to record refund.',
        });
      } else {
        setNotice({ type: 'error', text: 'Failed to record refund.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (refundId: number) => {
    if (!token || !selectedCompanyId) return;
    if (!window.confirm('Delete this refund record?')) return;

    setNotice(null);
    try {
      await axios.delete(`/api/companies/${selectedCompanyId}/refunds/${refundId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotice({ type: 'success', text: 'Refund deleted.' });
      await fetchRefunds();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setNotice({
          type: 'error',
          text:
            (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
            'Failed to delete refund.',
        });
      } else {
        setNotice({ type: 'error', text: 'Failed to delete refund.' });
      }
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100 p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-0 h-80 w-80 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-br from-[#0f766e] via-[#0e7490] to-[#0369a1] p-6 text-white shadow-[0_30px_80px_-24px_rgba(8,145,178,0.65)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,243,208,0.3),transparent_45%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-100">
                <Wallet className="h-3.5 w-3.5" />
                Refund Workspace
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Refunds (Cash & Bank)</h1>
              <p className="mt-2 text-sm leading-relaxed text-teal-50/95">
                Rich refund operations with separate cash and bank tracking. Entries are independent from expenses and fully filterable by period and mode.
              </p>
              {selectedCompany ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <Building2 className="h-3.5 w-3.5" />
                  {selectedCompany.name} · {currency}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openAddModal('cash')}
                disabled={!selectedCompanyId}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/90 px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-900/20 transition hover:brightness-110 disabled:opacity-60"
              >
                <HandCoins className="h-4 w-4" />
                Add Cash Refund
              </button>
              <button
                type="button"
                onClick={() => openAddModal('bank')}
                disabled={!selectedCompanyId}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-300/90 px-4 py-2.5 text-sm font-bold text-cyan-950 shadow-lg shadow-cyan-900/20 transition hover:brightness-110 disabled:opacity-60"
              >
                <Landmark className="h-4 w-4" />
                Add Bank Refund
              </button>
              <button
                type="button"
                onClick={() => void fetchRefunds()}
                disabled={loading || !selectedCompanyId}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/accounting')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Accounting
              </button>
            </div>
          </div>
        </section>

        {notice ? (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
              {notice.text}
            </span>
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Total Refunds',
              value: formatMoney(totalAmount, currency),
              icon: Wallet,
              accent: 'from-teal-500 to-cyan-600',
              tone: 'text-teal-800',
            },
            {
              label: 'Cash Refunds',
              value: formatMoney(cashTotal, currency),
              icon: HandCoins,
              accent: 'from-emerald-500 to-teal-600',
              tone: 'text-emerald-800',
            },
            {
              label: 'Bank Refunds',
              value: formatMoney(bankTotal, currency),
              icon: Landmark,
              accent: 'from-cyan-500 to-sky-600',
              tone: 'text-cyan-800',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-teal-100/80 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                    <p className={`mt-2 text-2xl font-black ${item.tone}`}>{item.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border border-teal-100/80 bg-white/90 p-5 shadow-sm backdrop-blur space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-900">Filter Refund Records</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
              <label className={accountingLabelClass}>Refund mode</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'cash' | 'bank')}
                className={accountingInputClass}
              >
                <option value="all">All modes</option>
                {PAYMENT_OPTIONS.map((option) => (
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
              onClick={() => void fetchRefunds()}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setFromDate(monthStartIso());
                setToDate(todayIso());
                setPaymentFilter('all');
                setSearch('');
              }}
              className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-50"
            >
              Reset Filters
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-teal-100/80 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Refund Records</h2>
              <p className="text-xs text-slate-600 mt-1">Dedicated refund ledger for cash and bank payout tracking.</p>
            </div>
            <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
              {refunds.length} records
            </span>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
            </div>
          ) : !selectedCompanyId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">Select a branch</p>
              <p className="text-xs text-amber-800 mt-1">Choose a company or branch to manage refunds.</p>
            </div>
          ) : refunds.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-amber-900">No refunds found</p>
              <p className="text-xs text-amber-800 mt-1">Use Add Cash Refund or Add Bank Refund to create a record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-teal-100">
              <table className="min-w-full text-xs text-slate-900">
                <thead className="bg-teal-50/70 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-left">Title</th>
                    <th className="px-3 py-3 text-left">Mode</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3 text-left">Reference</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-50 bg-white">
                  {refunds.map((row) => (
                    <tr key={row.id} className="hover:bg-teal-50/35">
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold">{formatDate(row.refund_date)}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold">{row.title}</p>
                        {row.notes ? <p className="text-[10px] text-slate-500 mt-0.5">{row.notes}</p> : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            row.payment_method === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-cyan-100 text-cyan-800'
                          }`}
                        >
                          {paymentLabel(row.payment_method)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">
                        {formatMoney(row.amount, currency)}
                      </td>
                      <td className="px-3 py-2.5">{row.reference_no || '—'}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 backdrop-blur-md" onClick={closeAddModal}>
          <div
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-t-3xl bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-teal-100">
                    <Sparkles className="h-3 w-3" />
                    New refund record
                  </p>
                  <h2 className="text-lg font-extrabold text-white">Add Refund</h2>
                  {selectedCompany ? (
                    <p className="mt-0.5 text-sm text-teal-50">
                      {selectedCompany.name} · {currency}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="rounded-lg border border-white/30 bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={accountingLabelClass}>Refund date *</label>
                  <input
                    type="date"
                    required
                    value={form.refund_date}
                    onChange={(e) => setForm((current) => ({ ...current, refund_date: e.target.value }))}
                    className={accountingInputClass}
                  />
                </div>
                <div>
                  <label className={accountingLabelClass}>Refund mode *</label>
                  <select
                    required
                    value={form.payment_method}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        payment_method: e.target.value as RefundForm['payment_method'],
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
                <div>
                  <label className={accountingLabelClass}>Reference no.</label>
                  <input
                    value={form.reference_no}
                    onChange={(e) => setForm((current) => ({ ...current, reference_no: e.target.value }))}
                    placeholder="Voucher or receipt number"
                    className={accountingInputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={accountingLabelClass}>Title / description *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                    placeholder="e.g. Customer overpayment refund"
                    className={accountingInputClass}
                  />
                </div>
                <div className="sm:col-span-2">
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

              <div className="flex flex-wrap gap-2 border-t border-teal-100 pt-4">
                <button
                  type="submit"
                  disabled={saving || !selectedCompanyId}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Refund'}
                </button>
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="rounded-xl border border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-800 transition hover:bg-teal-50 disabled:opacity-60"
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
