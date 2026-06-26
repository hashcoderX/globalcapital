'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

type CustomerSummary = {
  id: number;
  customer_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type SavingsAccountRow = {
  id: number;
  account_number?: string | null;
  balance?: number | string | null;
  customer?: CustomerSummary | null;
};

type SavingsTransactionRow = {
  id: number;
  transaction_type: 'deposit' | 'withdrawal' | 'interest_credit';
  amount?: number | string | null;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
  transaction_date?: string | null;
  reference_no?: string | null;
};

function amount(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SavingsTransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState('');
  const [accounts, setAccounts] = useState<SavingsAccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [transactions, setTransactions] = useState<SavingsTransactionRow[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [postingDeposit, setPostingDeposit] = useState(false);
  const [postingWithdrawal, setPostingWithdrawal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [transactionNote, setTransactionNote] = useState('');
  const widgetPrefix = 'savings_transactions_widget_';

  const fetchWidgetPreferences = async (authToken: string) => {
    try {
      const response = await axios.get('/api/dashboard/widgets', {
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
        '/api/dashboard/widgets',
        { widget_key: widgetKey, is_visible: isVisible },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch {
      return false;
    }
  };

  const hideWidget = async (widgetKey: string) => {
    setWidgetNotice('');
    const previous = new Set(hiddenWidgetKeys);
    const next = new Set(hiddenWidgetKeys);
    next.add(widgetKey);
    setHiddenWidgetKeys(next);
    const ok = await saveWidgetPreference(widgetKey, false);
    if (!ok) {
      setHiddenWidgetKeys(previous);
      setWidgetNotice('Failed to hide widget. Please try again.');
    }
  };

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }
    setToken(t);
    void fetchWidgetPreferences(t);
  }, [router]);

  const loadAccounts = async (authToken: string) => {
    try {
      const response = await axios.get('/api/savings-accounts', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        params: { per_page: 500 },
      });

      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      setAccounts(rows as SavingsAccountRow[]);
    } catch {
      setAccounts([]);
    }
  };

  const loadTransactions = async (authToken: string, accountId: number) => {
    setLoadingTransactions(true);
    try {
      const response = await axios.get(`/api/savings-accounts/${accountId}/transactions`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        params: { per_page: 100 },
      });

      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      setTransactions(rows as SavingsTransactionRow[]);
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadAccounts(token);
  }, [token]);

  useEffect(() => {
    const accountIdFromQuery = Number(searchParams.get('account_id') || 0);
    if (!Number.isInteger(accountIdFromQuery) || accountIdFromQuery <= 0) {
      return;
    }

    setSelectedAccountId(String(accountIdFromQuery));
  }, [searchParams]);

  useEffect(() => {
    if (!token || !selectedAccountId) {
      setTransactions([]);
      return;
    }

    const accountId = Number(selectedAccountId);
    if (!Number.isFinite(accountId) || accountId <= 0) {
      setTransactions([]);
      return;
    }

    loadTransactions(token, accountId);
  }, [token, selectedAccountId]);

  const selectedAccount = useMemo(() => {
    const accountId = Number(selectedAccountId);
    if (!Number.isFinite(accountId) || accountId <= 0) return null;
    return accounts.find((row) => row.id === accountId) || null;
  }, [accounts, selectedAccountId]);

  const showHeaderWidget = !hiddenWidgetKeys.has(`${widgetPrefix}header`);
  const showPostWidget = !hiddenWidgetKeys.has(`${widgetPrefix}post_transaction`);
  const showRecentWidget = !hiddenWidgetKeys.has(`${widgetPrefix}recent_transactions`);
  const transactionColumns = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'before', label: 'Before' },
    { key: 'after', label: 'After' },
    { key: 'reference', label: 'Reference' },
  ] as const;
  const visibleTransactionColumns = transactionColumns.filter(
    (col) => !hiddenWidgetKeys.has(`${widgetPrefix}col_${col.key}`)
  );
  const isAnyWidgetVisible = showHeaderWidget || showPostWidget || showRecentWidget;

  const postTransaction = async (type: 'deposit' | 'withdrawal') => {
    if (!token) return;

    const accountId = Number(selectedAccountId);
    if (!Number.isFinite(accountId) || accountId <= 0) {
      setErrorMessage('Please select an account first.');
      return;
    }

    const value = Number(transactionAmount);
    if (!Number.isFinite(value) || value <= 0) {
      setErrorMessage('Transaction amount must be a valid value greater than zero.');
      return;
    }

    try {
      if (type === 'deposit') setPostingDeposit(true);
      if (type === 'withdrawal') setPostingWithdrawal(true);
      setErrorMessage('');
      setSuccessMessage('');

      await axios.post(
        `/api/savings-accounts/${accountId}/${type === 'deposit' ? 'deposit' : 'withdraw'}`,
        {
          amount: value,
          transaction_date: transactionDate || undefined,
          reference_no: referenceNo.trim() || undefined,
          note: transactionNote.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      setSuccessMessage(type === 'deposit' ? 'Deposit posted successfully.' : 'Withdrawal posted successfully.');
      setTransactionAmount('');
      setReferenceNo('');
      setTransactionNote('');
      await Promise.all([loadAccounts(token), loadTransactions(token, accountId)]);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(String(error.response?.data?.message || 'Failed to post transaction.'));
      } else {
        setErrorMessage('Failed to post transaction.');
      }
    } finally {
      if (type === 'deposit') setPostingDeposit(false);
      if (type === 'withdrawal') setPostingWithdrawal(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-yellow-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-orange-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        {widgetNotice ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {widgetNotice}
          </div>
        ) : null}
        {!isAnyWidgetVisible ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            All widgets are hidden on this page. Restore hidden widgets from dashboard.
          </div>
        ) : null}

        {showHeaderWidget ? (
        <div className="bg-white/90 rounded-3xl border border-orange-100 p-6 flex items-start justify-between gap-3 flex-wrap relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}header`)}
              className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide header widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">Savings & Deposits</p>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Deposit & Withdrawals</h1>
            <p className="text-sm text-slate-600 mt-1">Separate transaction posting page.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/savings-deposits')}
            className="px-4 py-2 rounded-xl bg-white border border-orange-200 text-orange-800 text-sm font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Savings Dashboard
          </button>
        </div>
        ) : null}

        {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}
        {successMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}

        {showPostWidget ? (
        <div className="bg-white/90 rounded-3xl border border-orange-100 p-5 space-y-4 relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}post_transaction`)}
              className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide post transaction widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-700" />
            <h2 className="text-lg font-bold text-slate-900">Post Transaction</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="xl:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Select Account *</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Select account</option>
                {accounts.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.account_number} - {row.customer?.customer_code || '-'} - {row.customer?.first_name || ''} {row.customer?.last_name || ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Amount *</label>
              <input value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="0.00" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Transaction Date</label>
              <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Reference No</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>

            <div className="xl:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Note</label>
              <input value={transactionNote} onChange={(e) => setTransactionNote(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
          </div>

          {selectedAccount && (
            <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3 text-sm text-slate-700">
              Selected: <span className="font-semibold">{selectedAccount.account_number}</span> | Current Balance: <span className="font-semibold text-orange-700">{amount(selectedAccount.balance)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" disabled={postingDeposit} onClick={() => postTransaction('deposit')} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {postingDeposit ? 'Posting Deposit...' : 'Post Deposit'}
            </button>
            <button type="button" disabled={postingWithdrawal} onClick={() => postTransaction('withdrawal')} className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              {postingWithdrawal ? 'Posting Withdrawal...' : 'Post Withdrawal'}
            </button>
          </div>
        </div>
        ) : null}

        {showRecentWidget ? (
        <div className="bg-white/90 rounded-3xl border border-orange-100 p-5 space-y-4 relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}recent_transactions`)}
              className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide recent transactions widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>

          {!selectedAccount ? (
            <div className="py-6 text-sm text-slate-500">Choose an account to view its transactions.</div>
          ) : loadingTransactions ? (
            <div className="py-6 text-sm text-slate-500">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="py-6 text-sm text-slate-500">No transactions found for selected account.</div>
          ) : visibleTransactionColumns.length === 0 ? (
            <div className="py-6 text-sm text-amber-800">All table columns are hidden. Restore hidden widgets from dashboard.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-orange-100">
                    {visibleTransactionColumns.map((column) => (
                      <th key={column.key} className="py-2 pr-3 relative">
                        {column.label}
                        <WidgetCloseGate>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void hideWidget(`${widgetPrefix}col_${column.key}`);
                            }}
                            className="absolute right-0 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full border border-orange-200 bg-white text-[10px] font-bold text-orange-700 hover:bg-rose-50 hover:text-rose-700"
                            aria-label={`Hide ${column.label} column`}
                          >
                            ×
                          </button>
                        </WidgetCloseGate>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row) => (
                    <tr key={row.id} className="border-b border-orange-50 text-slate-700">
                      {visibleTransactionColumns.map((column) => {
                        if (column.key === 'date') {
                          return <td key={column.key} className="py-2 pr-3">{row.transaction_date || '-'}</td>;
                        }
                        if (column.key === 'type') {
                          return <td key={column.key} className="py-2 pr-3 capitalize">{String(row.transaction_type || '-').replace('_', ' ')}</td>;
                        }
                        if (column.key === 'amount') {
                          return <td key={column.key} className="py-2 pr-3 font-semibold">{amount(row.amount)}</td>;
                        }
                        if (column.key === 'before') {
                          return <td key={column.key} className="py-2 pr-3">{amount(row.balance_before)}</td>;
                        }
                        if (column.key === 'after') {
                          return <td key={column.key} className="py-2 pr-3">{amount(row.balance_after)}</td>;
                        }
                        return <td key={column.key} className="py-2 pr-3">{row.reference_no || '-'}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        ) : null}
      </div>
    </div>
  );
}
