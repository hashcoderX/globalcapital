'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, RefreshCcw } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

type PendingDeposit = {
  id: number;
  amount?: number;
  deposit_date?: string;
  note?: string | null;
  created_at?: string;
  employee?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    employee_code?: string;
    wallet?: {
      wallet_no?: string;
      current_balance?: number;
    } | null;
  } | null;
  bank_account?: {
    id?: number;
    account_name?: string;
    bank_name?: string;
    account_number?: string;
    current_balance?: number;
  } | null;
};

type PendingHandover = {
  id: number;
  amount?: number;
  handover_date?: string;
  note?: string | null;
  received_by?: string | null;
  created_at?: string;
  employee?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    employee_code?: string;
    wallet?: {
      wallet_no?: string;
      current_balance?: number;
    } | null;
  } | null;
  manager_employee?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    employee_code?: string;
    wallet?: {
      wallet_no?: string;
      current_balance?: number;
    } | null;
  } | null;
  cash_account?: {
    id?: number;
    account_name?: string;
    bank_name?: string;
    account_number?: string;
    current_balance?: number;
  } | null;
  branch_cash_transferred_at?: string | null;
};

const formatLkr = (value: number) =>
  `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function PaymentReceivePage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [handovers, setHandovers] = useState<PendingHandover[]>([]);
  const [acceptedHandovers, setAcceptedHandovers] = useState<PendingHandover[]>([]);
  const [transferredHandovers, setTransferredHandovers] = useState<PendingHandover[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/');
    }
  }, [router, token]);

  const loadPending = useCallback(async (authToken: string, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await axios.get(`${apiBaseUrl}/hr/wallet/pending-transactions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      setDeposits(Array.isArray(response.data?.deposits) ? (response.data.deposits as PendingDeposit[]) : []);
      setHandovers(Array.isArray(response.data?.handovers) ? (response.data.handovers as PendingHandover[]) : []);
      setAcceptedHandovers(
        Array.isArray(response.data?.accepted_handovers)
          ? (response.data.accepted_handovers as PendingHandover[])
          : []
      );
      setTransferredHandovers(
        Array.isArray(response.data?.transferred_handovers)
          ? (response.data.transferred_handovers as PendingHandover[])
          : []
      );
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Failed to load pending wallet transactions.';
      setNotice({ type: 'error', message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!token) return;
    void loadPending(token);
  }, [token, loadPending]);

  const approveTransaction = async (type: 'deposit' | 'handover', id: number) => {
    if (!token) return;

    const key = `${type}-${id}`;
    try {
      setBusyKey(key);
      setNotice(null);

      const response = await axios.post(
        `${apiBaseUrl}/hr/wallet/pending-transactions/${type}/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotice({ type: 'success', message: response.data?.message || 'Transaction approved successfully.' });
      await loadPending(token, true);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Failed to approve pending transaction.';
      setNotice({ type: 'error', message });
    } finally {
      setBusyKey(null);
    }
  };

  const transferAcceptedHandover = async (id: number) => {
    if (!token) return;

    const key = `transfer-${id}`;
    try {
      setBusyKey(key);
      setNotice(null);

      const response = await axios.post(
        `${apiBaseUrl}/hr/wallet/accepted-handovers/${id}/transfer-cash`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotice({
        type: 'success',
        message: response.data?.message || 'Accepted handover transferred to branch cash account.',
      });
      await loadPending(token, true);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Failed to transfer accepted handover to branch cash account.';
      setNotice({ type: 'error', message });
    } finally {
      setBusyKey(null);
    }
  };

  const stats = useMemo(() => ({
    deposits: deposits.length,
    handovers: handovers.length,
    acceptedHandovers: acceptedHandovers.length,
    transferredHandovers: transferredHandovers.length,
    total: deposits.length + handovers.length,
  }), [deposits.length, handovers.length, acceptedHandovers.length, transferredHandovers.length]);

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <section className="rounded-3xl border border-amber-100 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Accounting Approval Desk</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">Payment Receive and Transfer</h1>
              <p className="mt-1 text-sm text-slate-600">
                Review pending wallet transactions, accept payments, then transfer accepted handovers to branch cash account.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/dashboard/accounting')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Accounting
              </button>
              <button
                type="button"
                onClick={() => void loadPending(token, true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-amber-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending Deposits</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.deposits}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Pending Handovers</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.handovers}</p>
          </div>
          <div className="rounded-2xl border border-yellow-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Total Pending</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Accepted Handovers</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.acceptedHandovers}</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Transferred History</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.transferredHandovers}</p>
          </div>
        </section>

        {notice && (
          <section className={`rounded-2xl border p-4 ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
            <p className="text-sm font-semibold">{notice.message}</p>
          </section>
        )}

        <section className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Pending Wallet Deposits</h2>
          {deposits.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No pending deposit requests.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-700">
                <thead className="bg-emerald-50 text-emerald-800">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold">Collection Officer</th>
                    <th className="px-4 py-2 font-semibold">Officer Wallet</th>
                    <th className="px-4 py-2 font-semibold">Branch Bank Account</th>
                    <th className="px-4 py-2 font-semibold">Bank Balance</th>
                    <th className="px-4 py-2 font-semibold text-right">Amount</th>
                    <th className="px-4 py-2 font-semibold">Note</th>
                    <th className="px-4 py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((row) => {
                    const rowKey = `deposit-${row.id}`;
                    return (
                      <tr key={row.id} className="border-t border-emerald-100">
                        <td className="px-4 py-3">{formatDate(row.deposit_date || row.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{`${row.employee?.first_name || ''} ${row.employee?.last_name || ''}`.trim() || '-'}</div>
                          <div className="text-xs text-slate-500">{row.employee?.employee_code || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.employee?.wallet?.wallet_no || '-'}</div>
                          <div className="text-xs text-slate-500">Balance: {formatLkr(Number(row.employee?.wallet?.current_balance || 0))}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.bank_account?.account_name || '-'}</div>
                          <div className="text-xs text-slate-500">{row.bank_account?.bank_name || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatLkr(Number(row.bank_account?.current_balance || 0))}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatLkr(Number(row.amount || 0))}</td>
                        <td className="px-4 py-3 text-slate-600">{row.note || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void approveTransaction('deposit', row.id)}
                            disabled={busyKey === rowKey}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {busyKey === rowKey ? 'Accepting...' : 'Accept'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Pending Cash Handovers</h2>
          {handovers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No pending cash handover requests.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-700">
                <thead className="bg-orange-50 text-orange-800">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold">Collection Officer</th>
                    <th className="px-4 py-2 font-semibold">Officer Wallet</th>
                    <th className="px-4 py-2 font-semibold">Target Manager</th>
                    <th className="px-4 py-2 font-semibold">Manager Wallet</th>
                    <th className="px-4 py-2 font-semibold">Branch Account</th>
                    <th className="px-4 py-2 font-semibold">Branch Account Balance</th>
                    <th className="px-4 py-2 font-semibold text-right">Amount</th>
                    <th className="px-4 py-2 font-semibold">Note</th>
                    <th className="px-4 py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {handovers.map((row) => {
                    const rowKey = `handover-${row.id}`;
                    return (
                      <tr key={row.id} className="border-t border-orange-100">
                        <td className="px-4 py-3">{formatDate(row.handover_date || row.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{`${row.employee?.first_name || ''} ${row.employee?.last_name || ''}`.trim() || '-'}</div>
                          <div className="text-xs text-slate-500">{row.employee?.employee_code || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.employee?.wallet?.wallet_no || '-'}</div>
                          <div className="text-xs text-slate-500">Balance: {formatLkr(Number(row.employee?.wallet?.current_balance || 0))}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{`${row.manager_employee?.first_name || ''} ${row.manager_employee?.last_name || ''}`.trim() || '-'}</div>
                          <div className="text-xs text-slate-500">{row.manager_employee?.employee_code || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.manager_employee?.wallet?.wallet_no || '-'}</div>
                          <div className="text-xs text-slate-500">Balance: {formatLkr(Number(row.manager_employee?.wallet?.current_balance || 0))}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.cash_account?.account_name || '-'}</div>
                          <div className="text-xs text-slate-500">{row.cash_account?.bank_name || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatLkr(Number(row.cash_account?.current_balance || 0))}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatLkr(Number(row.amount || 0))}</td>
                        <td className="px-4 py-3 text-slate-600">{row.note || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void approveTransaction('handover', row.id)}
                            disabled={busyKey === rowKey}
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {busyKey === rowKey ? 'Accepting...' : 'Accept'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Accepted Payments (After Pending Cash Handovers)</h2>
          {acceptedHandovers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No accepted handovers waiting for transfer.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-700">
                <thead className="bg-sky-50 text-sky-800">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Accepted Date</th>
                    <th className="px-4 py-2 font-semibold">Collection Officer</th>
                    <th className="px-4 py-2 font-semibold">Manager Wallet</th>
                    <th className="px-4 py-2 font-semibold">Branch Cash Account</th>
                    <th className="px-4 py-2 font-semibold text-right">Amount</th>
                    <th className="px-4 py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedHandovers.map((row) => {
                    const rowKey = `transfer-${row.id}`;
                    return (
                      <tr key={row.id} className="border-t border-sky-100">
                        <td className="px-4 py-3">{formatDate(row.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{`${row.employee?.first_name || ''} ${row.employee?.last_name || ''}`.trim() || '-'}</div>
                          <div className="text-xs text-slate-500">{row.employee?.employee_code || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.manager_employee?.wallet?.wallet_no || '-'}</div>
                          <div className="text-xs text-slate-500">Balance: {formatLkr(Number(row.manager_employee?.wallet?.current_balance || 0))}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.cash_account?.account_name || '-'}</div>
                          <div className="text-xs text-slate-500">Balance: {formatLkr(Number(row.cash_account?.current_balance || 0))}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatLkr(Number(row.amount || 0))}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void transferAcceptedHandover(row.id)}
                            disabled={busyKey === rowKey}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {busyKey === rowKey ? 'Transferring...' : 'Transfer to Branch Cash Account'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-indigo-100 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Transferred History</h2>
          {transferredHandovers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No transferred handovers yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-700">
                <thead className="bg-indigo-50 text-indigo-800">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Transferred Date</th>
                    <th className="px-4 py-2 font-semibold">Collection Officer</th>
                    <th className="px-4 py-2 font-semibold">Target Manager</th>
                    <th className="px-4 py-2 font-semibold">Branch Cash Account</th>
                    <th className="px-4 py-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transferredHandovers.map((row) => (
                    <tr key={row.id} className="border-t border-indigo-100">
                      <td className="px-4 py-3">{formatDate(row.branch_cash_transferred_at || row.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{`${row.employee?.first_name || ''} ${row.employee?.last_name || ''}`.trim() || '-'}</div>
                        <div className="text-xs text-slate-500">{row.employee?.employee_code || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{`${row.manager_employee?.first_name || ''} ${row.manager_employee?.last_name || ''}`.trim() || '-'}</div>
                        <div className="text-xs text-slate-500">{row.manager_employee?.employee_code || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{row.cash_account?.account_name || '-'}</div>
                        <div className="text-xs text-slate-500">{row.cash_account?.bank_name || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatLkr(Number(row.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
