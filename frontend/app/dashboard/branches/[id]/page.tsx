'use client';

import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Branch = {
  id: number;
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  website?: string;
  opening_asset?: string | number | null;
  manager?: {
    id?: number;
    name?: string;
    email?: string;
  } | null;
};

type BranchAccount = {
  id: number;
  company_id?: number;
  account_type?: string;
  account_name?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  opening_balance?: number;
  current_balance?: number;
  is_active?: boolean;
};

type BankAccountDraft = {
  account_name: string;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  opening_balance: string;
  notes: string;
};

type CashAccountDraft = {
  account_name: string;
  opening_balance: string;
  notes: string;
};

type ReportItem = {
  title: string;
  description: string;
  path?: string;
};

type ReportCategory = {
  key: string;
  title: string;
  icon: string;
  gradient: string;
  bg: string;
  reports: ReportItem[];
};

type AuthUser = {
  id?: number;
  designation?: { id?: number; name?: string } | null;
  roles?: Array<{ id?: number; name?: string }>;
};

export default function BranchDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const branchId = Number(params?.id || 0);

  const apiBase = getApiBaseUrl();

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [branchAccounts, setBranchAccounts] = useState<BranchAccount[]>([]);
  const [bankAccountModalOpen, setBankAccountModalOpen] = useState(false);
  const [cashAccountModalOpen, setCashAccountModalOpen] = useState(false);
  const [bankAccountRows, setBankAccountRows] = useState<BankAccountDraft[]>([
    {
      account_name: '',
      bank_name: '',
      bank_branch: '',
      account_number: '',
      opening_balance: '0',
      notes: '',
    },
  ]);
  const [bankAccountSaving, setBankAccountSaving] = useState(false);
  const [cashAccountSaving, setCashAccountSaving] = useState(false);
  const [cashAccountDraft, setCashAccountDraft] = useState<CashAccountDraft>({
    account_name: '',
    opening_balance: '0',
    notes: '',
  });
  const [bankAccountNotice, setBankAccountNotice] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });

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
    if (!token || !branchId) return;

    const loadBranch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${apiBase}/companies/${branchId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        setBranch(res.data?.data || res.data || null);
      } catch {
        setBranch(null);
      } finally {
        setLoading(false);
      }
    };

    loadBranch();
  }, [apiBase, token, branchId]);

  useEffect(() => {
    if (!token || !branchId) return;

    const loadBranchAccounts = async () => {
      setAccountsLoading(true);
      try {
        const res = await axios.get(`${apiBase}/companies/${branchId}/accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        const rows = Array.isArray(res.data?.accounts) ? res.data.accounts : [];
        setBranchAccounts(rows as BranchAccount[]);
      } catch {
        setBranchAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    };

    loadBranchAccounts();
  }, [apiBase, token, branchId]);

  const bankAccounts = useMemo(
    () => branchAccounts.filter((account) => String(account.account_type || '').toLowerCase() === 'bank'),
    [branchAccounts]
  );

  const cashAccount = useMemo(
    () =>
      branchAccounts.find(
        (account) => String(account.account_type || '').toLowerCase() === 'cash'
      ) || null,
    [branchAccounts]
  );

  const addBankAccountRow = () => {
    setBankAccountRows((prev) => [
      ...prev,
      {
        account_name: '',
        bank_name: '',
        bank_branch: '',
        account_number: '',
        opening_balance: '0',
        notes: '',
      },
    ]);
  };

  const removeBankAccountRow = (index: number) => {
    setBankAccountRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const updateBankAccountRow = (index: number, key: keyof BankAccountDraft, value: string) => {
    setBankAccountRows((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    );
  };

  const openBankAccountsModal = () => {
    setBankAccountRows([
      {
        account_name: '',
        bank_name: '',
        bank_branch: '',
        account_number: '',
        opening_balance: '0',
        notes: '',
      },
    ]);
    setBankAccountModalOpen(true);
  };

  const openCashAccountModal = () => {
    setCashAccountDraft({
      account_name: cashAccount?.account_name || '',
      opening_balance: '0',
      notes: '',
    });
    setCashAccountModalOpen(true);
  };

  const submitMultipleBankAccounts = async () => {
    if (!token || !branchId) return;

    const payloadRows = bankAccountRows
      .map((row) => ({
        account_type: 'bank',
        account_name: row.account_name.trim() || undefined,
        bank_name: row.bank_name.trim(),
        bank_branch: row.bank_branch.trim() || undefined,
        account_number: row.account_number.trim() || undefined,
        opening_balance: Number(row.opening_balance || 0),
        notes: row.notes.trim() || undefined,
      }))
      .filter((row) => row.bank_name.length > 0);

    if (payloadRows.length === 0) {
      setBankAccountNotice({
        open: true,
        title: 'Validation',
        message: 'Please add at least one row with a bank name.',
      });
      return;
    }

    if (payloadRows.some((row) => !Number.isFinite(row.opening_balance) || row.opening_balance < 0)) {
      setBankAccountNotice({
        open: true,
        title: 'Validation',
        message: 'Opening balance must be a valid non-negative number for all rows.',
      });
      return;
    }

    try {
      setBankAccountSaving(true);
      for (const row of payloadRows) {
        await axios.post(`${apiBase}/companies/${branchId}/accounts`, row, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
      }

      const refreshed = await axios.get(`${apiBase}/companies/${branchId}/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      const refreshedRows = Array.isArray(refreshed.data?.accounts) ? refreshed.data.accounts : [];
      setBranchAccounts(refreshedRows as BranchAccount[]);

      setBankAccountModalOpen(false);
      setBankAccountNotice({
        open: true,
        title: 'Success',
        message: `${payloadRows.length} branch bank account(s) created successfully.`,
      });
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Failed to create bank accounts. Please try again.';

      setBankAccountNotice({ open: true, title: 'Error', message });
    } finally {
      setBankAccountSaving(false);
    }
  };

  const submitCashAccount = async () => {
    if (!token || !branchId) return;

    const openingBalance = Number(cashAccountDraft.opening_balance || 0);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setBankAccountNotice({
        open: true,
        title: 'Validation',
        message: 'Opening balance must be a valid non-negative number.',
      });
      return;
    }

    try {
      setCashAccountSaving(true);

      await axios.post(
        `${apiBase}/companies/${branchId}/accounts`,
        {
          account_type: 'cash',
          account_name: cashAccountDraft.account_name.trim() || undefined,
          opening_balance: openingBalance,
          notes: cashAccountDraft.notes.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const refreshed = await axios.get(`${apiBase}/companies/${branchId}/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      const refreshedRows = Array.isArray(refreshed.data?.accounts) ? refreshed.data.accounts : [];
      setBranchAccounts(refreshedRows as BranchAccount[]);

      setCashAccountModalOpen(false);
      setBankAccountNotice({
        open: true,
        title: 'Success',
        message: 'Branch cash account created successfully.',
      });
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Failed to create cash account. Please try again.';

      setBankAccountNotice({ open: true, title: 'Error', message });
    } finally {
      setCashAccountSaving(false);
    }
  };

  const normalizeText = (value: string) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const designationName = normalizeText(String(authUser?.designation?.name || ''));
  const roleNames = (authUser?.roles || []).map((role) => normalizeText(String(role?.name || '')));
  const isCollectionOfficer =
    designationName.includes('collection officer') ||
    roleNames.some((role) => role.includes('collection officer'));

  const withBranch = (path: string) => {
    if (!branchId) return path;
    if (path.includes('?')) return `${path}&branch_id=${branchId}`;
    return `${path}?branch_id=${branchId}`;
  };

  const categories = useMemo<ReportCategory[]>(
    () => [
      {
        key: 'microfinance',
        title: 'Micro Finance Related Reports',
        icon: '🏦',
        gradient: 'from-cyan-500 to-blue-500',
        bg: 'from-cyan-50 to-blue-50',
        reports: [
          {
            title: 'Collection Report',
            description: 'Daily and range-wise collections with breakdown details.',
            path: withBranch('/dashboard/microfinance/reports/collection'),
          },
          {
            title: 'Field Officer Collection Report',
            description: 'Performance and totals by field officer.',
            path: withBranch('/dashboard/microfinance/reports/field-officer-collection'),
          },
          {
            title: 'Arrears Report',
            description: 'Overdue and arrears-focused loan analysis.',
            path: withBranch('/dashboard/microfinance/reports/arrears'),
          },
          {
            title: 'Active Member Report',
            description: 'Active borrowers and repayment visibility.',
            path: withBranch('/dashboard/microfinance/reports/active-members'),
          },
          {
            title: 'Blacklisted Customer Report',
            description: 'Risk profile and blacklisted customer exposure.',
            path: withBranch('/dashboard/microfinance/reports/blacklisted-customers'),
          },
          {
            title: 'Re-Payment Report',
            description: 'Repayment rate and pending amounts by account.',
            path: withBranch('/dashboard/microfinance/reports/repayment'),
          },
          {
            title: 'Recovery Report',
            description: 'Recovery priority and difficult portfolio tracking.',
            path: withBranch('/dashboard/microfinance/reports/recovery'),
          },
        ],
      },
      {
        key: 'mortgage',
        title: 'Mortgage Management Related Reports',
        icon: '🏠',
        gradient: 'from-indigo-500 to-violet-500',
        bg: 'from-indigo-50 to-violet-50',
        reports: [
          {
            title: 'Mortgage Collection Report',
            description: 'Track mortgage installment collections and dues.',
            path: withBranch('/dashboard/mortgages/reports/collection'),
          },
          {
            title: 'Mortgage Profit Report',
            description: 'Interest income and profit from mortgage collections.',
            path: withBranch('/dashboard/mortgages/reports/profit'),
          },
          {
            title: 'Mortgage Arrears Report',
            description: 'Identify overdue mortgage accounts and balances.',
            path: withBranch('/dashboard/mortgages/reports/arrears'),
          },
          {
            title: 'Mortgage Portfolio Report',
            description: 'Overall mortgage portfolio health and statuses.',
            path: withBranch('/dashboard/mortgages/reports/portfolio'),
          },
        ],
      },
      {
        key: 'savings',
        title: 'Savings and Deposit Related Reports',
        icon: '💸',
        gradient: 'from-amber-500 to-orange-500',
        bg: 'from-amber-50 to-orange-50',
        reports: [
          {
            title: 'Savings Ledger Report',
            description: 'Savings deposits, withdrawals, and balances by account.',
            path: withBranch('/dashboard/savings-deposits/reports/ledger'),
          },
          {
            title: 'Deposit Growth Report',
            description: 'Period-over-period savings and deposit growth summary.',
            path: withBranch('/dashboard/savings-deposits/reports/deposit-growth'),
          },
          {
            title: 'Maturity Report',
            description: 'Upcoming and completed deposit maturities.',
            path: withBranch('/dashboard/savings-deposits/reports/maturity'),
          },
        ],
      },
      {
        key: 'finance',
        title: 'Finance Management Related Reports',
        icon: '💰',
        gradient: 'from-emerald-500 to-teal-500',
        bg: 'from-emerald-50 to-teal-50',
        reports: [
          {
            title: 'Income and Expense Report',
            description: 'Track revenue, expenses, and profitability.',
            path: withBranch('/dashboard/reports/income-expense'),
          },
          {
            title: 'Cash Flow Report',
            description: 'Cash-in and cash-out summary over selected periods.',
            path: withBranch('/dashboard/reports/cash-flow'),
          },
          {
            title: 'General Ledger Snapshot',
            description: 'Account-wise ledger balances and movement.',
            path: withBranch('/dashboard/reports/general-ledger'),
          },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [branchId]
  );

  const collectionOfficerBlockedCategoryKeys = new Set(['mortgage', 'savings', 'finance']);
  const collectionOfficerBlockedMicrofinanceReportTitles = new Set([
    'Arrears Report',
    'Active Member Report',
    'Blacklisted Customer Report',
    'Re-Payment Report',
    'Recovery Report',
  ]);

  const visibleCategories = isCollectionOfficer
    ? categories
        .filter((category) => !collectionOfficerBlockedCategoryKeys.has(category.key))
        .map((category) => {
          if (category.key !== 'microfinance') {
            return category;
          }

          return {
            ...category,
            reports: category.reports.filter(
              (report) => !collectionOfficerBlockedMicrofinanceReportTitles.has(report.title)
            ),
          };
        })
        .filter((category) => category.reports.length > 0)
    : categories;

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-green-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-green-50 to-cyan-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      <nav className="relative z-10 bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/branches')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Branches</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Branch Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-green-500 rounded-xl flex items-center justify-center text-white text-xl">
                  🏢
                </div>
                {branch?.name || `Branch #${branchId || '-'}`}
              </h1>
              <p className="mt-2 text-gray-600">Branch reports and quick access</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
          </div>
        ) : !branch ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
            <p className="text-gray-700 font-semibold">Branch not found or you don’t have access.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Branch Details</h2>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>
                    <span className="font-semibold">Email:</span> {branch.email || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Phone:</span> {branch.phone || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Address:</span> {branch.address || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Opening Asset:</span>{' '}
                    {Number(branch.opening_asset || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Manager</h2>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>
                    <span className="font-semibold">Name:</span> {branch.manager?.name || 'Not assigned'}
                  </div>
                  <div>
                    <span className="font-semibold">Email:</span> {branch.manager?.email || '-'}
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Actions</h2>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={openBankAccountsModal}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-semibold shadow-sm hover:from-teal-700 hover:to-cyan-700"
                  >
                    Add Branch Bank Accounts
                  </button>
                  <button
                    type="button"
                    onClick={openCashAccountModal}
                    disabled={!!cashAccount}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold shadow-sm hover:from-amber-700 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {cashAccount ? 'Cash Account Created' : 'Create Branch Cash Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/reports/branch-performance?branch_id=${branchId}`)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-sm font-semibold shadow-sm hover:from-rose-700 hover:to-red-700"
                  >
                    Branch Performance Report
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/reports/branch-collection?branch_id=${branchId}`)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-semibold shadow-sm hover:from-orange-700 hover:to-amber-700"
                  >
                    Branch Collection Report
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/reports/branch-repayment?branch_id=${branchId}`)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold shadow-sm hover:from-violet-700 hover:to-purple-700"
                  >
                    Branch Repayment Report
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/branches/${branchId}#reports`)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold border border-gray-200 shadow-sm"
                  >
                    View All Branch Reports
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold border border-gray-200 shadow-sm"
                  >
                    Back to Main Dashboard
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="text-lg font-bold text-gray-900">Branch Bank Accounts</h2>
                <button
                  type="button"
                  onClick={openBankAccountsModal}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold border border-gray-200 shadow-sm"
                >
                  Add Multiple
                </button>
              </div>

              {accountsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : bankAccounts.length === 0 ? (
                <p className="text-sm text-gray-600">No bank accounts created for this branch yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Account Name</th>
                        <th className="px-4 py-2 font-semibold">Bank Name</th>
                        <th className="px-4 py-2 font-semibold">Branch</th>
                        <th className="px-4 py-2 font-semibold">Account Number</th>
                        <th className="px-4 py-2 font-semibold text-right">Current Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankAccounts.map((account) => (
                        <tr key={account.id} className="border-t border-gray-100">
                          <td className="px-4 py-2 font-semibold text-gray-900">{account.account_name || '-'}</td>
                          <td className="px-4 py-2">{account.bank_name || '-'}</td>
                          <td className="px-4 py-2">{account.bank_branch || '-'}</td>
                          <td className="px-4 py-2">{account.account_number || '-'}</td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900">
                            {Number(account.current_balance || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mb-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="text-lg font-bold text-gray-900">Branch Cash Account</h2>
                <button
                  type="button"
                  onClick={openCashAccountModal}
                  disabled={!!cashAccount}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold border border-gray-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {cashAccount ? 'Already Created' : 'Create Cash Account'}
                </button>
              </div>

              {!cashAccount ? (
                <p className="text-sm text-gray-600">No cash account created for this branch yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Account Name</th>
                        <th className="px-4 py-2 font-semibold">Type</th>
                        <th className="px-4 py-2 font-semibold text-right">Opening Balance</th>
                        <th className="px-4 py-2 font-semibold text-right">Current Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100">
                        <td className="px-4 py-2 font-semibold text-gray-900">{cashAccount.account_name || '-'}</td>
                        <td className="px-4 py-2 uppercase">{String(cashAccount.account_type || '-')}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                          {Number(cashAccount.opening_balance || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                          {Number(cashAccount.current_balance || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div id="reports" className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Branch Reports</h2>
              <p className="text-gray-600 mt-1">Same Reports Hub, auto-filtered by this branch.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {visibleCategories.map((category) => (
                <div
                  key={category.key}
                  className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-[0_20px_40px_-30px_rgba(8,47,73,0.85)] border border-white/50 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.bg} opacity-40`}></div>

                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-12 w-12 rounded-xl bg-gradient-to-r ${category.gradient} flex items-center justify-center text-2xl shadow-lg`}
                        >
                          {category.icon}
                        </div>
                        <div>
                          <h2 className="text-lg font-extrabold text-slate-900">{category.title}</h2>
                          <p className="text-xs text-slate-500">{category.reports.length} reports</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {category.reports.map((report) => (
                        <div
                          key={`${category.key}-${report.title}`}
                          className="rounded-xl border border-white/70 bg-white/75 p-3 flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{report.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{report.description}</p>
                          </div>

                          {report.path ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isCollectionOfficer && collectionOfficerBlockedCategoryKeys.has(category.key)) {
                                  return;
                                }

                                router.push(report.path as string);
                              }}
                              className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700"
                            >
                              Open
                            </button>
                          ) : (
                            <span className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold">
                              Coming Soon
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {bankAccountModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !bankAccountSaving && setBankAccountModalOpen(false)} />
          <div className="relative w-full max-w-5xl rounded-2xl border border-teal-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-teal-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Branch Bank Accounts</h3>
                <p className="mt-1 text-sm text-slate-600">Add multiple bank accounts for this branch in one step.</p>
              </div>
              <button
                onClick={() => !bankAccountSaving && setBankAccountModalOpen(false)}
                className="text-slate-500 hover:text-slate-800"
                disabled={bankAccountSaving}
              >
                ✕
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-4">
              {bankAccountRows.map((row, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Bank Account #{index + 1}</p>
                    {bankAccountRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBankAccountRow(index)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        disabled={bankAccountSaving}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Account Name</label>
                      <input
                        type="text"
                        value={row.account_name}
                        onChange={(e) => updateBankAccountRow(index, 'account_name', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-200"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Bank Name *</label>
                      <input
                        type="text"
                        value={row.bank_name}
                        onChange={(e) => updateBankAccountRow(index, 'bank_name', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-200"
                        placeholder="Required"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Bank Branch</label>
                      <input
                        type="text"
                        value={row.bank_branch}
                        onChange={(e) => updateBankAccountRow(index, 'bank_branch', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-200"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Account Number</label>
                      <input
                        type="text"
                        value={row.account_number}
                        onChange={(e) => updateBankAccountRow(index, 'account_number', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-200"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Opening Balance</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.opening_balance}
                        onChange={(e) => updateBankAccountRow(index, 'opening_balance', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Note</label>
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => updateBankAccountRow(index, 'notes', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-200"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addBankAccountRow}
                className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100"
                disabled={bankAccountSaving}
              >
                + Add Another Account
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setBankAccountModalOpen(false)}
                disabled={bankAccountSaving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitMultipleBankAccounts}
                disabled={bankAccountSaving}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:from-teal-600 hover:to-cyan-600 disabled:opacity-60"
              >
                {bankAccountSaving ? 'Saving...' : 'Create Accounts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bankAccountNotice.open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={() => setBankAccountNotice({ open: false, title: '', message: '' })} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">{bankAccountNotice.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{bankAccountNotice.message}</p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setBankAccountNotice({ open: false, title: '', message: '' })}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {cashAccountModalOpen && (
        <div className="fixed inset-0 z-[91] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !cashAccountSaving && setCashAccountModalOpen(false)} />
          <div className="relative w-full max-w-xl rounded-2xl border border-amber-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-amber-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Branch Cash Account</h3>
                <p className="mt-1 text-sm text-slate-600">Create a cash account for this branch.</p>
              </div>
              <button
                onClick={() => !cashAccountSaving && setCashAccountModalOpen(false)}
                className="text-slate-500 hover:text-slate-800"
                disabled={cashAccountSaving}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Account Name</label>
                <input
                  type="text"
                  value={cashAccountDraft.account_name}
                  onChange={(e) => setCashAccountDraft((prev) => ({ ...prev, account_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-200"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Opening Balance</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashAccountDraft.opening_balance}
                  onChange={(e) => setCashAccountDraft((prev) => ({ ...prev, opening_balance: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Note</label>
                <input
                  type="text"
                  value={cashAccountDraft.notes}
                  onChange={(e) => setCashAccountDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-200"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setCashAccountModalOpen(false)}
                disabled={cashAccountSaving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitCashAccount}
                disabled={cashAccountSaving}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
              >
                {cashAccountSaving ? 'Saving...' : 'Create Cash Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
