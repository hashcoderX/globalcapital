'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, UserPlus, PiggyBank, Wallet } from 'lucide-react';

type SavingsAccountRow = {
  id: number;
  account_number?: string | null;
  account_type?: 'savings' | 'current' | 'fixed_deposit' | null;
  opening_deposit?: number | string | null;
  balance?: number | string | null;
  interest_rate?: number | string | null;
  status?: string | null;
  opened_at?: string | null;
  customer?: CustomerSummary | null;
};

type CustomerSummary = {
  id: number;
  customer_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

function amount(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SavingsDepositsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<SavingsAccountRow[]>([]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }

    setToken(t);
  }, [router]);

  const loadAccounts = async (authToken: string) => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/savings-accounts', {
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

      setAccounts(rows);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadAccounts(token);
  }, [token]);

  const dashboardMetrics = useMemo(() => {
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter((row) => String(row.status || '').toLowerCase() === 'active').length;
    const totalBalances = accounts.reduce((sum, row) => {
      const n = Number(row.balance);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    const savingsAccounts = accounts.filter((row) => String(row.account_type || '').toLowerCase() === 'savings').length;

    return {
      totalAccounts,
      activeAccounts,
      totalBalances,
      savingsAccounts,
    };
  }, [accounts]);


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

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/90 rounded-3xl border border-orange-100 p-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">Savings & Deposits</p>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Savings & Deposits Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Use separate pages for customer registration, account opening, and deposit or withdrawal operations.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-xl bg-white border border-orange-200 text-orange-800 text-sm font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Main Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-orange-100 bg-white/90 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Accounts</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{dashboardMetrics.totalAccounts}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white/90 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Active Accounts</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{dashboardMetrics.activeAccounts}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white/90 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Balance</p>
            <p className="text-2xl font-extrabold text-orange-700 mt-1">{amount(dashboardMetrics.totalBalances)}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white/90 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Savings Accounts</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{dashboardMetrics.savingsAccounts}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard/savings-deposits/customers')}
            className="rounded-2xl border border-orange-200 bg-white hover:bg-orange-50 text-left p-5 transition-colors"
          >
            <UserPlus className="h-5 w-5 text-orange-700" />
            <p className="mt-2 text-sm font-bold text-slate-900">1. Register Customer</p>
            <p className="mt-1 text-xs text-slate-600">Customer onboarding details in a dedicated page.</p>
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/savings-deposits/accounts')}
            className="rounded-2xl border border-orange-200 bg-white hover:bg-orange-50 text-left p-5 transition-colors"
          >
            <PiggyBank className="h-5 w-5 text-orange-700" />
            <p className="mt-2 text-sm font-bold text-slate-900">2. Open Account</p>
            <p className="mt-1 text-xs text-slate-600">Open savings, current, or fixed-deposit accounts.</p>
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/savings-deposits/transactions')}
            className="rounded-2xl border border-orange-200 bg-white hover:bg-orange-50 text-left p-5 transition-colors"
          >
            <Wallet className="h-5 w-5 text-orange-700" />
            <p className="mt-2 text-sm font-bold text-slate-900">3. Deposit & Withdrawals</p>
            <p className="mt-1 text-xs text-slate-600">Post deposits and withdrawals in a separate operations page.</p>
          </button>
        </div>

        <div className="bg-white/90 rounded-3xl border border-orange-100 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Recent Accounts Overview</h2>
            <button
              type="button"
              onClick={() => router.push('/dashboard/savings-deposits/accounts')}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800"
            >
              Manage Accounts
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-sm text-slate-500">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-sm text-slate-500">No savings/deposit accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-orange-100">
                    <th className="py-2 pr-3">Account No</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Opening Deposit</th>
                    <th className="py-2 pr-3">Balance</th>
                    <th className="py-2 pr-3">Rate %</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.slice(0, 20).map((row) => (
                    <tr key={row.id} className="border-b border-orange-50 text-slate-700">
                      <td className="py-2 pr-3 font-semibold">{row.account_number || '-'}</td>
                      <td className="py-2 pr-3">{row.customer?.customer_code || '-'} - {row.customer?.first_name || ''} {row.customer?.last_name || ''}</td>
                      <td className="py-2 pr-3 capitalize">{String(row.account_type || '-').replace('_', ' ')}</td>
                      <td className="py-2 pr-3">{amount(row.opening_deposit)}</td>
                      <td className="py-2 pr-3">{amount(row.balance)}</td>
                      <td className="py-2 pr-3">{amount(row.interest_rate)}</td>
                      <td className="py-2 pr-3 capitalize">{row.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
