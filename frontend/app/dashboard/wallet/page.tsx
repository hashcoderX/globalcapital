'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api';

type WalletSummary = {
  id?: number;
  wallet_no?: string;
  cash_in_hand?: number;
  total_deposited?: number;
  total_handed_over?: number;
  opening_balance?: number;
  status?: string;
};

type WalletBankAccount = {
  id: number;
  account_name?: string;
  bank_name?: string;
  account_number?: string;
  current_balance?: number;
};

type WalletManager = {
  employee_id: number;
  name: string;
  employee_code?: string;
};

type WalletDepositHistory = {
  id: number;
  amount?: number;
  deposit_date?: string;
  note?: string | null;
  bank_account?: {
    account_name?: string;
    bank_name?: string;
  } | null;
};

type WalletCashHandoverHistory = {
  id: number;
  amount?: number;
  handover_date?: string;
  received_by?: string | null;
  note?: string | null;
  manager_employee?: {
    first_name?: string;
    last_name?: string;
    employee_code?: string;
  } | null;
};

export default function WalletPage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [walletBankAccounts, setWalletBankAccounts] = useState<WalletBankAccount[]>([]);
  const [walletManagers, setWalletManagers] = useState<WalletManager[]>([]);
  const [walletRecentDeposits, setWalletRecentDeposits] = useState<WalletDepositHistory[]>([]);
  const [walletRecentHandovers, setWalletRecentHandovers] = useState<WalletCashHandoverHistory[]>([]);
  const [walletNotice, setWalletNotice] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });
  const [depositModal, setDepositModal] = useState<{
    open: boolean;
    amount: string;
    bankAccountId: string;
    depositDate: string;
    note: string;
    saving: boolean;
  }>({
    open: false,
    amount: '',
    bankAccountId: '',
    depositDate: new Date().toISOString().slice(0, 10),
    note: '',
    saving: false,
  });
  const [handoverModal, setHandoverModal] = useState<{
    open: boolean;
    amount: string;
    managerEmployeeId: string;
    handoverDate: string;
    receivedBy: string;
    note: string;
    saving: boolean;
  }>({
    open: false,
    amount: '',
    managerEmployeeId: '',
    handoverDate: new Date().toISOString().slice(0, 10),
    receivedBy: '',
    note: '',
    saving: false,
  });

  const formatLkr = (value: number) =>
    `LKR ${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const fetchWalletData = async (authToken: string) => {
    setLoading(true);
    try {
      const walletResponse = await axios.get(`${apiBaseUrl}/hr/wallet/my`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      setWalletSummary((walletResponse.data?.wallet || null) as WalletSummary | null);
      setWalletBankAccounts(
        Array.isArray(walletResponse.data?.bank_accounts)
          ? (walletResponse.data.bank_accounts as WalletBankAccount[])
          : []
      );
      setWalletManagers(
        Array.isArray(walletResponse.data?.managers)
          ? (walletResponse.data.managers as WalletManager[])
          : []
      );
      setWalletRecentDeposits(
        Array.isArray(walletResponse.data?.recent_deposits)
          ? (walletResponse.data.recent_deposits as WalletDepositHistory[])
          : []
      );
      setWalletRecentHandovers(
        Array.isArray(walletResponse.data?.recent_handovers)
          ? (walletResponse.data.recent_handovers as WalletCashHandoverHistory[])
          : []
      );
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Failed to load wallet details.';
      setWalletSummary(null);
      setWalletBankAccounts([]);
      setWalletManagers([]);
      setWalletRecentDeposits([]);
      setWalletRecentHandovers([]);
      setWalletNotice({ open: true, title: 'Wallet', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
    void fetchWalletData(storedToken);
  }, [router]);

  const cashInHand = Number(walletSummary?.cash_in_hand ?? 0);
  const totalDeposited = Number(walletSummary?.total_deposited ?? 0);
  const totalHandedOver = Number(walletSummary?.total_handed_over ?? 0);
  const hasWallet = Boolean(walletSummary?.wallet_no);
  const portfolioTotal = Math.max(cashInHand + totalDeposited + totalHandedOver, 1);
  const cashShare = Math.min((cashInHand / portfolioTotal) * 100, 100);
  const depositShare = Math.min((totalDeposited / portfolioTotal) * 100, 100);
  const handoverShare = Math.min((totalHandedOver / portfolioTotal) * 100, 100);

  const recentDepositBars = walletRecentDeposits.slice(0, 6);
  const maxDepositBarAmount = Math.max(
    1,
    ...recentDepositBars.map((row) => Number(row.amount || 0))
  );
  const recentHandoverBars = walletRecentHandovers.slice(0, 6);
  const maxHandoverBarAmount = Math.max(
    1,
    ...recentHandoverBars.map((row) => Number(row.amount || 0))
  );

  const openDepositModal = () => {
    const defaultBankId = walletBankAccounts[0]?.id ? String(walletBankAccounts[0].id) : '';
    setDepositModal({
      open: true,
      amount: '',
      bankAccountId: defaultBankId,
      depositDate: new Date().toISOString().slice(0, 10),
      note: '',
      saving: false,
    });
  };

  const closeDepositModal = () => {
    if (depositModal.saving) return;
    setDepositModal((prev) => ({ ...prev, open: false }));
  };

  const openHandoverModal = () => {
    const defaultManagerId = walletManagers[0]?.employee_id ? String(walletManagers[0].employee_id) : '';
    setHandoverModal({
      open: true,
      amount: '',
      managerEmployeeId: defaultManagerId,
      handoverDate: new Date().toISOString().slice(0, 10),
      receivedBy: '',
      note: '',
      saving: false,
    });
  };

  const closeHandoverModal = () => {
    if (handoverModal.saving) return;
    setHandoverModal((prev) => ({ ...prev, open: false }));
  };

  const submitWalletDeposit = async () => {
    const amount = Number(depositModal.amount || 0);
    const bankAccountId = Number(depositModal.bankAccountId || 0);

    if (amount <= 0) {
      setWalletNotice({ open: true, title: 'Validation', message: 'Please enter a valid deposit amount.' });
      return;
    }
    if (amount > cashInHand) {
      setWalletNotice({ open: true, title: 'Validation', message: 'Deposit amount cannot exceed cash in hand.' });
      return;
    }
    if (bankAccountId <= 0) {
      setWalletNotice({ open: true, title: 'Validation', message: 'Please select a branch bank account.' });
      return;
    }

    try {
      setDepositModal((prev) => ({ ...prev, saving: true }));
      const response = await axios.post(
        `${apiBaseUrl}/hr/wallet/my/deposit-bank`,
        {
          amount,
          bank_account_id: bankAccountId,
          deposit_date: depositModal.depositDate,
          note: depositModal.note.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchWalletData(token);
      setWalletNotice({
        open: true,
        title: 'Success',
        message: response.data?.message || 'Wallet deposit posted successfully.',
      });
      setDepositModal((prev) => ({ ...prev, open: false, saving: false }));
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response?.data?.message
          : 'Failed to deposit wallet amount to bank. Please try again.';
      setWalletNotice({ open: true, title: 'Deposit Error', message });
      setDepositModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const submitWalletHandover = async () => {
    const amount = Number(handoverModal.amount || 0);
    const managerEmployeeId = Number(handoverModal.managerEmployeeId || 0);

    if (amount <= 0) {
      setWalletNotice({ open: true, title: 'Validation', message: 'Please enter a valid handover amount.' });
      return;
    }
    if (amount > cashInHand) {
      setWalletNotice({ open: true, title: 'Validation', message: 'Handover amount cannot exceed cash in hand.' });
      return;
    }
    if (managerEmployeeId <= 0) {
      setWalletNotice({ open: true, title: 'Validation', message: 'Please select a manager.' });
      return;
    }

    try {
      setHandoverModal((prev) => ({ ...prev, saving: true }));
      const response = await axios.post(
        `${apiBaseUrl}/hr/wallet/my/cash-handover`,
        {
          amount,
          manager_employee_id: managerEmployeeId,
          handover_date: handoverModal.handoverDate,
          received_by: handoverModal.receivedBy.trim() || undefined,
          note: handoverModal.note.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchWalletData(token);
      setWalletNotice({
        open: true,
        title: 'Success',
        message: response.data?.message || 'Cash handover posted successfully.',
      });
      setHandoverModal((prev) => ({ ...prev, open: false, saving: false }));
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response?.data?.message
          : 'Failed to complete cash handover. Please try again.';
      setWalletNotice({ open: true, title: 'Handover Error', message });
      setHandoverModal((prev) => ({ ...prev, saving: false }));
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-white to-cyan-50 p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-xl backdrop-blur sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Wallet Control Center
              </p>
              <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Employee Wallet</h1>
              <p className="mt-1 text-sm text-slate-600">Track balance, bank deposits, and cash handovers in one place.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/80 bg-white/80 p-10 text-center text-slate-500 shadow-lg backdrop-blur">
            Loading wallet...
          </div>
        ) : !hasWallet ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            No wallet is linked to this account yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Wallet No</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{walletSummary?.wallet_no || '-'}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Cash In Hand</p>
                <p className="mt-2 text-lg font-bold text-emerald-800">{formatLkr(cashInHand)}</p>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-cyan-700">Total Deposited</p>
                <p className="mt-2 text-lg font-bold text-cyan-800">{formatLkr(totalDeposited)}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-amber-700">Total Handed Over</p>
                <p className="mt-2 text-lg font-bold text-amber-800">{formatLkr(totalHandedOver)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur xl:col-span-1">
                <h3 className="text-sm font-semibold text-slate-900">Wallet Distribution</h3>
                <p className="mt-1 text-xs text-slate-500">Visual split of current wallet movement.</p>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-emerald-700">
                      <span>Cash In Hand</span>
                      <span>{cashShare.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-emerald-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${cashShare}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-cyan-700">
                      <span>Total Deposited</span>
                      <span>{depositShare.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-cyan-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400" style={{ width: `${depositShare}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-amber-700">
                      <span>Total Handed Over</span>
                      <span>{handoverShare.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-amber-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: `${handoverShare}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur xl:col-span-1">
                <h3 className="text-sm font-semibold text-slate-900">Recent Deposits Graph</h3>
                <p className="mt-1 text-xs text-slate-500">Last six deposit transactions.</p>
                <div className="mt-4 flex h-36 items-end gap-2">
                  {recentDepositBars.length === 0 ? (
                    <p className="text-sm text-slate-500">No deposit data.</p>
                  ) : (
                    recentDepositBars.map((row) => {
                      const value = Number(row.amount || 0);
                      const heightPct = Math.max((value / maxDepositBarAmount) * 100, 8);
                      return (
                        <div key={`dep-bar-${row.id}`} className="flex flex-1 flex-col items-center">
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-cyan-500 to-cyan-300"
                            style={{ height: `${heightPct}%` }}
                            title={`${formatDate(row.deposit_date)} - ${formatLkr(value)}`}
                          />
                          <span className="mt-2 text-[10px] font-medium text-slate-500">{formatDate(row.deposit_date)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur xl:col-span-1">
                <h3 className="text-sm font-semibold text-slate-900">Recent Handovers Graph</h3>
                <p className="mt-1 text-xs text-slate-500">Last six cash handovers.</p>
                <div className="mt-4 flex h-36 items-end gap-2">
                  {recentHandoverBars.length === 0 ? (
                    <p className="text-sm text-slate-500">No handover data.</p>
                  ) : (
                    recentHandoverBars.map((row) => {
                      const value = Number(row.amount || 0);
                      const heightPct = Math.max((value / maxHandoverBarAmount) * 100, 8);
                      return (
                        <div key={`han-bar-${row.id}`} className="flex flex-1 flex-col items-center">
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-amber-500 to-amber-300"
                            style={{ height: `${heightPct}%` }}
                            title={`${formatDate(row.handover_date)} - ${formatLkr(value)}`}
                          />
                          <span className="mt-2 text-[10px] font-medium text-slate-500">{formatDate(row.handover_date)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
              <button
                onClick={openDepositModal}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-600"
              >
                Deposit to Bank
              </button>
              <button
                onClick={openHandoverModal}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:from-amber-600 hover:to-orange-600"
              >
                Cash Handover
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-lg backdrop-blur">
                <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
                  <h4 className="text-sm font-semibold text-slate-900">Recent Deposits</h4>
                </div>
                {walletRecentDeposits.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No deposits yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-slate-700">
                      <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Date</th>
                          <th className="px-5 py-3 font-semibold">Bank Account</th>
                          <th className="px-5 py-3 text-right font-semibold">Amount</th>
                          <th className="px-5 py-3 font-semibold">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletRecentDeposits.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                            <td className="px-5 py-3">{formatDate(row.deposit_date)}</td>
                            <td className="px-5 py-3">
                              <div className="font-medium text-slate-900">{row.bank_account?.account_name || '-'}</div>
                              <div className="text-xs text-slate-500">{row.bank_account?.bank_name || ''}</div>
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatLkr(Number(row.amount || 0))}</td>
                            <td className="px-5 py-3 text-slate-600">{row.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-lg backdrop-blur">
                <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
                  <h4 className="text-sm font-semibold text-slate-900">Recent Cash Handovers</h4>
                </div>
                {walletRecentHandovers.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No cash handovers yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-slate-700">
                      <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Date</th>
                          <th className="px-5 py-3 font-semibold">Manager</th>
                          <th className="px-5 py-3 font-semibold">Received By</th>
                          <th className="px-5 py-3 text-right font-semibold">Amount</th>
                          <th className="px-5 py-3 font-semibold">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletRecentHandovers.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                            <td className="px-5 py-3">{formatDate(row.handover_date)}</td>
                            <td className="px-5 py-3">
                              <div className="font-medium text-slate-900">
                                {row.manager_employee
                                  ? `${row.manager_employee.first_name || ''} ${row.manager_employee.last_name || ''}`.trim() || '-'
                                  : '-'}
                              </div>
                              <div className="text-xs text-slate-500">{row.manager_employee?.employee_code || ''}</div>
                            </td>
                            <td className="px-5 py-3 text-slate-600">{row.received_by || '-'}</td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatLkr(Number(row.amount || 0))}</td>
                            <td className="px-5 py-3 text-slate-600">{row.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {depositModal.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={closeDepositModal} />
          <div className="relative w-full max-w-lg rounded-2xl border border-emerald-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-emerald-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Deposit to Bank</h3>
                <p className="mt-1 text-sm text-slate-600">Move collected cash from your wallet to a bank account.</p>
              </div>
              <button onClick={closeDepositModal} className="text-slate-500 hover:text-slate-800" disabled={depositModal.saving}>✕</button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-semibold">Cash in Hand: {formatLkr(cashInHand)}</p>
                <p className="mt-1">Total Deposited: {formatLkr(totalDeposited)}</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositModal.amount}
                  onChange={(e) => setDepositModal((prev) => ({ ...prev, amount: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Bank Account</label>
                <select
                  value={depositModal.bankAccountId}
                  onChange={(e) => setDepositModal((prev) => ({ ...prev, bankAccountId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">Select bank account</option>
                  {walletBankAccounts.map((account) => (
                    <option key={account.id} value={String(account.id)}>
                      {account.account_name || '-'}
                      {account.bank_name ? ` - ${account.bank_name}` : ''}
                      {account.account_number ? ` (${account.account_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Deposit Date</label>
                <input
                  type="date"
                  value={depositModal.depositDate}
                  onChange={(e) => setDepositModal((prev) => ({ ...prev, depositDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Note</label>
                <textarea
                  rows={3}
                  value={depositModal.note}
                  onChange={(e) => setDepositModal((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="Optional note"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeDepositModal}
                disabled={depositModal.saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitWalletDeposit}
                disabled={depositModal.saving || walletBankAccounts.length === 0}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60"
              >
                {depositModal.saving ? 'Posting...' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {handoverModal.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={closeHandoverModal} />
          <div className="relative w-full max-w-lg rounded-2xl border border-amber-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-amber-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cash Handover</h3>
                <p className="mt-1 text-sm text-slate-600">Handover collected cash from your wallet to cash/main account.</p>
              </div>
              <button onClick={closeHandoverModal} className="text-slate-500 hover:text-slate-800" disabled={handoverModal.saving}>✕</button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Cash in Hand: {formatLkr(cashInHand)}</p>
                <p className="mt-1">Total Handed Over: {formatLkr(totalHandedOver)}</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={handoverModal.amount}
                  onChange={(e) => setHandoverModal((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Manager</label>
                <select
                  value={handoverModal.managerEmployeeId}
                  onChange={(e) => {
                    const selectedManager = walletManagers.find((manager) => String(manager.employee_id) === e.target.value);
                    setHandoverModal((prev) => ({
                      ...prev,
                      managerEmployeeId: e.target.value,
                      receivedBy: selectedManager?.name || prev.receivedBy,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value="">Select manager</option>
                  {walletManagers.map((manager) => (
                    <option key={manager.employee_id} value={String(manager.employee_id)}>
                      {manager.name}
                      {manager.employee_code ? ` (${manager.employee_code})` : ''}
                    </option>
                  ))}
                </select>
                {walletManagers.length === 0 && (
                  <p className="mt-2 text-xs text-rose-600">
                    No managers found for this branch. Please assign a branch manager in branch settings.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Handover Date</label>
                <input
                  type="date"
                  value={handoverModal.handoverDate}
                  onChange={(e) => setHandoverModal((prev) => ({ ...prev, handoverDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Received By</label>
                <input
                  type="text"
                  value={handoverModal.receivedBy}
                  onChange={(e) => setHandoverModal((prev) => ({ ...prev, receivedBy: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Receiver name (optional)"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Note</label>
                <textarea
                  rows={3}
                  value={handoverModal.note}
                  onChange={(e) => setHandoverModal((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Optional note"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeHandoverModal}
                disabled={handoverModal.saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitWalletHandover}
                disabled={handoverModal.saving || walletManagers.length === 0}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
              >
                {handoverModal.saving ? 'Posting...' : 'Cash Handover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {walletNotice.open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setWalletNotice({ open: false, title: '', message: '' })} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{walletNotice.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{walletNotice.message}</p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setWalletNotice({ open: false, title: '', message: '' })}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
