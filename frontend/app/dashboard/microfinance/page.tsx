'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

type LoanStatRow = {
  id: number;
  status?: string;
  branch_id?: number | string | null;
  field_officer?: string | null;
  field_officer_id?: number | string | null;
  due_date?: string | null;
  loan_amount?: number | string;
  refundable_amount?: number | string;
  arrears_balance?: number | string;
};

type CollectionStatRow = {
  mf_loan_request_id: number | string;
  collection_date?: string | null;
  collected_amount: number | string;
  interest_amount?: number | string;
  penalty_amount?: number | string;
};

type AuthUser = {
  id: number;
  name?: string;
  email?: string;
  branch_id?: number | null;
  designation_id?: number | null;
  designation?: { id: number; name: string } | null;
  employee?: { id: number; first_name?: string; last_name?: string; email?: string } | null;
  roles?: Array<{
    id?: number;
    name?: string;
    permissions?: Array<{
      id?: number;
      name?: string;
      module?: string | null;
      description?: string | null;
    }>;
  }>;
};

export default function MicrofinanceDashboard() {
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState({
    activeLoans: 0,
    totalCollections: 0,
    pendingPayments: 0,
    defaultRate: 0,
  });
  const [summaryStats, setSummaryStats] = useState({
    totalOutstandingAmount: 0,
    assetValueTotal: 0,
    todayCollection: 0,
    monthCollection: 0,
    imagineProfit: 0,
    todayProfit: 0,
    monthProfit: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const normalizedApiBase = API_URL.replace(/\/+$/, '');
  const withApiPrefix = normalizedApiBase.endsWith('/api')
    ? normalizedApiBase
    : `${normalizedApiBase}/api`;

  const normalizeText = (value: string) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const designationName = normalizeText(String(authUser?.designation?.name || ''));
  const roleNames = (authUser?.roles || []).map((role) => normalizeText(String(role?.name || '')));
  const permissionTexts = (authUser?.roles || [])
    .flatMap((role) => role.permissions || [])
    .map((permission) =>
      normalizeText(
        `${permission?.name || ''} ${permission?.module || ''} ${permission?.description || ''}`
      )
    )
    .filter(Boolean);
  const permissionNames = new Set(
    (authUser?.roles || [])
      .flatMap((role) => role.permissions || [])
      .map((permission) => String(permission?.name || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const hasAnyPermissionToken = (tokens: string[]) =>
    tokens.some((token) => {
      const normalizedToken = normalizeText(token);
      if (!normalizedToken) return false;

      return permissionTexts.some((text) => text.includes(normalizedToken));
    });

  const hasAnyPermissionName = (names: string[]) =>
    names.some((name) => permissionNames.has(String(name || '').trim().toLowerCase()));

  const isFieldOfficer = designationName.includes('field officer') || roleNames.some((role) => role.includes('field officer'));
  const isCollectionOfficer = designationName.includes('collection officer') || roleNames.some((role) => role.includes('collection officer'));
  const isAdminUser =
    normalizeText(String(authUser?.email || '')) === 'superadmin softcodelk com' ||
    designationName.includes('admin') ||
    roleNames.some((role) => role.includes('admin'));

  const hasFullDataAccess =
    normalizeText(String(authUser?.email || '')) === 'superadmin softcodelk com' ||
    designationName.includes('admin') ||
    designationName.includes('branch manager') ||
    designationName.includes('finance manager') ||
    roleNames.some((role) =>
      role.includes('admin') || role.includes('branch manager') || role.includes('finance manager')
    );

  const isScopedUser = !hasFullDataAccess;

  const hasMicrofinanceSettingsAccess =
    isAdminUser ||
    hasAnyPermissionToken([
      '/dashboard/microfinance/settings',
      'settings workspace',
      'microfinance settings',
      'create route',
      'create center',
      'create group',
      'mark holiday',
      'initial penalty rate',
      'loan hold',
      'loan close',
    ]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
    } else {
      setToken(storedToken);
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          setAuthUser(JSON.parse(storedUser));
        } catch {
          setAuthUser(null);
        }
      }
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const fetchAuthUser = async () => {
      try {
        const response = await axios.get(`${withApiPrefix}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAuthUser(response.data || null);
        localStorage.setItem('auth_user', JSON.stringify(response.data || null));
      } catch {
        // Fallback to cached auth_user if API call fails.
      }
    };

    fetchAuthUser();
  }, [token, withApiPrefix]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  const microfinanceModules = [
    { name: 'Loan Management', icon: '💰', color: 'from-green-500 to-emerald-500', bgColor: 'from-green-50 to-emerald-50', description: 'Manage micro loans and applications' },
    { name: 'Collection Management', icon: '📊', color: 'from-blue-500 to-cyan-500', bgColor: 'from-blue-50 to-cyan-50', description: 'Handle loan collections and repayments' },
    { name: 'Payments', icon: '💳', color: 'from-purple-500 to-indigo-500', bgColor: 'from-purple-50 to-indigo-50', description: 'Process payments and transactions' },
    { name: 'Customers', icon: '👤', color: 'from-amber-500 to-orange-500', bgColor: 'from-amber-50 to-orange-50', description: 'View and manage microfinance customers' },
    { name: 'Settings', icon: '⚙️', color: 'from-gray-500 to-slate-500', bgColor: 'from-gray-50 to-slate-50', description: 'Configure microfinance settings' },
  ];

  const visibleModules = microfinanceModules.filter((module) => {
    if (module.name === 'Settings') {
      return hasMicrofinanceSettingsAccess;
    }

    if (isFieldOfficer) {
      return module.name !== 'Loan Management';
    }

    return true;
  });

  const reportModules = [
    {
      name: 'Collection Report',
      icon: '📘',
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'from-cyan-50 to-blue-50',
      description: 'Summarize daily and period-wise collection performance.',
      path: '/dashboard/microfinance/reports/collection',
      permissionTokens: ['collection report', 'micro finance related reports', '/dashboard/microfinance/reports/collection'],
    },
    {
      name: 'Field Officer Collection Report',
      icon: '🧭',
      color: 'from-sky-500 to-cyan-500',
      bgColor: 'from-sky-50 to-cyan-50',
      description: 'Track collection efficiency by each field officer.',
      path: '/dashboard/microfinance/reports/field-officer-collection',
      permissionTokens: ['field officer collection report', '/dashboard/microfinance/reports/field-officer-collection'],
    },
    {
      name: 'Arrears Report',
      icon: '⚠️',
      color: 'from-amber-500 to-orange-500',
      bgColor: 'from-amber-50 to-orange-50',
      description: 'Identify overdue and arrears-heavy accounts quickly.',
      path: '/dashboard/microfinance/reports/arrears',
      permissionTokens: ['arrears report', '/dashboard/microfinance/reports/arrears'],
    },
    {
      name: 'Active Member Report',
      icon: '🧑‍🤝‍🧑',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'from-emerald-50 to-teal-50',
      description: 'View active members and their current loan activity.',
      path: '/dashboard/microfinance/reports/active-members',
      permissionTokens: ['active member report', '/dashboard/microfinance/reports/active-members'],
    },
    {
      name: 'Blacklisted Customer Report',
      icon: '⛔',
      color: 'from-rose-500 to-red-500',
      bgColor: 'from-rose-50 to-red-50',
      description: 'Review blacklisted customers and related risk data.',
      path: '/dashboard/microfinance/reports/blacklisted-customers',
      permissionTokens: ['blacklisted customer report', '/dashboard/microfinance/reports/blacklisted-customers'],
    },
    {
      name: 'Re-Payment Report',
      icon: '💸',
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'from-indigo-50 to-blue-50',
      description: 'Analyze repayment patterns across customer segments.',
      path: '/dashboard/microfinance/reports/repayment',
      permissionTokens: ['re-payment report', 'repayment report', '/dashboard/microfinance/reports/repayment'],
    },
    {
      name: 'Recovery Report',
      icon: '🛟',
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'from-teal-50 to-cyan-50',
      description: 'Monitor recovery progress for difficult loan portfolios.',
      path: '/dashboard/microfinance/reports/recovery',
      permissionTokens: ['recovery report', '/dashboard/microfinance/reports/recovery'],
    },
    {
      name: 'Not Paid Customer Report',
      icon: '📋',
      color: 'from-rose-500 to-orange-500',
      bgColor: 'from-rose-50 to-orange-50',
      description: 'List customers with pending loan balances and unpaid installments.',
      path: '/dashboard/microfinance/reports/not-paid-customers',
      permissionTokens: ['not paid customer report', '/dashboard/microfinance/reports/not-paid-customers'],
    },
    {
      name: 'Year End Summary Report',
      icon: '🗓️',
      color: 'from-violet-500 to-indigo-500',
      bgColor: 'from-violet-50 to-indigo-50',
      description: 'View Jan to Dec monthly totals for collection, capital collection, and profit.',
      path: '/dashboard/microfinance/reports/year-end-summary',
      permissionTokens: ['year end summary report', '/dashboard/microfinance/reports/year-end-summary'],
    },
    {
      name: 'Customer Payment History Report',
      icon: '🧾',
      color: 'from-fuchsia-500 to-pink-500',
      bgColor: 'from-fuchsia-50 to-pink-50',
      description: 'Track payment history by customer with capital, interest, and penalty details.',
      path: '/dashboard/microfinance/reports/customer-payment-history',
      permissionTokens: ['customer payment history report', '/dashboard/microfinance/reports/customer-payment-history'],
    },
  ];

  const visibleReportModules = reportModules.filter((report) =>
    isAdminUser || hasAnyPermissionToken(report.permissionTokens)
  );

  const summaryReportCards = [
    {
      label: 'Total Outstanding Amount',
      value: statsLoading
        ? '...'
        : new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summaryStats.totalOutstandingAmount),
      tone: 'from-amber-500 to-orange-500',
      permissionNames: [
        'credit_summary_report_workspace_summary_report_total_outstanding_amount',
        'credit_general_summary_report_total_outstanding_amount',
      ],
    },
    {
      label: 'Today Collection',
      value: statsLoading
        ? '...'
        : new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summaryStats.todayCollection),
      tone: 'from-blue-500 to-cyan-500',
      permissionNames: [
        'credit_summary_report_workspace_summary_report_today_collection',
        'credit_general_summary_report_today_collection',
      ],
    },
    {
      label: 'Asset Value Total',
      value: statsLoading
        ? '...'
        : new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summaryStats.assetValueTotal),
      tone: 'from-lime-500 to-emerald-500',
      permissionNames: [
        'credit_summary_report_workspace_summary_report_asset_value_total',
        'credit_general_summary_report_asset_value_total',
      ],
    },
    {
      label: 'Month Collection',
      value: statsLoading
        ? '...'
        : new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summaryStats.monthCollection),
      tone: 'from-indigo-500 to-blue-500',
      permissionNames: [
        'credit_summary_report_workspace_summary_report_month_collection',
        'credit_general_summary_report_month_collection',
      ],
    },
    {
      label: 'Imagine Profit',
      value: statsLoading
        ? '...'
        : new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summaryStats.imagineProfit),
      tone: 'from-emerald-500 to-green-500',
      permissionNames: [
        'credit_summary_report_workspace_summary_report_imagine_profit',
        'credit_general_summary_report_imagine_profit',
      ],
    },
    {
      label: 'Today Profit',
      value: statsLoading
        ? '...'
        : new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summaryStats.todayProfit),
      tone: 'from-teal-500 to-cyan-500',
      permissionNames: [
        'credit_summary_report_workspace_summary_report_today_profit',
        'credit_general_summary_report_today_profit',
      ],
    },
    {
      label: 'Month Profit',
      value: statsLoading
        ? '...'
        : new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summaryStats.monthProfit),
      tone: 'from-sky-500 to-blue-500',
      permissionNames: [
        'credit_summary_report_workspace_summary_report_month_profit',
        'credit_general_summary_report_month_profit',
      ],
    },
  ];

  const visibleSummaryReportCards = summaryReportCards.filter((item) =>
    isAdminUser || hasAnyPermissionName(item.permissionNames)
  );

  useEffect(() => {
    if (!token) return;

    const loadDashboardStats = async () => {
      setStatsLoading(true);
      try {
        const [loanRes, collectionRes] = await Promise.all([
          axios.get('http://localhost:8000/api/microfinance/loan-requests', {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
          axios.get('http://localhost:8000/api/microfinance/collections', {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
        ]);

        const allLoans: LoanStatRow[] = Array.isArray(loanRes.data) ? loanRes.data : [];
        const allCollections: CollectionStatRow[] = Array.isArray(collectionRes.data) ? collectionRes.data : [];

        const authOfficerId = Number(authUser?.employee?.id || 0);
        const branchId = Number(authUser?.branch_id || 0);

        const officerNameCandidates = [
          String(authUser?.name || '').trim().toLowerCase(),
          [authUser?.employee?.first_name || '', authUser?.employee?.last_name || ''].join(' ').trim().toLowerCase(),
          String(authUser?.email || '').trim().toLowerCase(),
          String(authUser?.employee?.email || '').trim().toLowerCase(),
        ].filter((v, i, arr) => v !== '' && arr.indexOf(v) === i);

        const scopedLoans = !isScopedUser
          ? allLoans
          : allLoans.filter((loan) => {
              const loanBranchId = Number(loan.branch_id || 0);
              const loanOfficerId = Number(loan.field_officer_id || 0);
              const loanOfficer = String(loan.field_officer || '').trim().toLowerCase();

              const isBranchMatch = branchId > 0 ? loanBranchId === branchId : true;
              const isOfficerIdMatch = authOfficerId > 0 && loanOfficerId > 0 ? loanOfficerId === authOfficerId : false;
              const isOfficerNameMatch = loanOfficer !== '' ? officerNameCandidates.includes(loanOfficer) : false;

              return isBranchMatch && (isOfficerIdMatch || isOfficerNameMatch);
            });

        const scopedLoanIds = new Set(scopedLoans.map((loan) => Number(loan.id)));
        const scopedCollections = allCollections.filter((row) => scopedLoanIds.has(Number(row.mf_loan_request_id || 0)));

        const paidByLoan = new Map<number, number>();
        const principalPaidByLoan = new Map<number, number>();
        scopedCollections.forEach((row) => {
          const loanId = Number(row.mf_loan_request_id || 0);
          if (!loanId) return;

          const collected = Number(row.collected_amount || 0);
          const interest = Number(row.interest_amount || 0);
          const penalty = Number(row.penalty_amount || 0);
          const principalPortion = Math.max(collected - interest - penalty, 0);

          paidByLoan.set(loanId, (paidByLoan.get(loanId) || 0) + collected);
          principalPaidByLoan.set(loanId, (principalPaidByLoan.get(loanId) || 0) + principalPortion);
        });

        const activeLoans = scopedLoans.filter((loan) => {
          const status = String(loan.status || '').toLowerCase();
          return status === 'approved' || status === 'released';
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pendingPayments = activeLoans.filter((loan) => {
          const dueDateText = String(loan.due_date || '').slice(0, 10);
          if (!dueDateText) return false;
          const dueDate = new Date(`${dueDateText}T00:00:00`);
          if (Number.isNaN(dueDate.getTime()) || dueDate > today) return false;

          const totalPayable = Number(loan.refundable_amount || 0);
          const paid = paidByLoan.get(Number(loan.id)) || 0;
          return totalPayable - paid > 0;
        }).length;

        const defaultedCount = activeLoans.filter((loan) => {
          const arrears = Number(loan.arrears_balance || 0);
          if (arrears > 0) return true;

          const dueDateText = String(loan.due_date || '').slice(0, 10);
          if (!dueDateText) return false;
          const dueDate = new Date(`${dueDateText}T00:00:00`);
          if (Number.isNaN(dueDate.getTime()) || dueDate >= today) return false;

          const totalPayable = Number(loan.refundable_amount || 0);
          const paid = paidByLoan.get(Number(loan.id)) || 0;
          return totalPayable - paid > 0;
        }).length;

        const totalCollections = scopedCollections.reduce(
          (sum, row) => sum + Number(row.collected_amount || 0),
          0
        );

        const defaultRate = activeLoans.length > 0 ? (defaultedCount / activeLoans.length) * 100 : 0;

        const todayKey = new Date().toISOString().slice(0, 10);
        const monthKey = todayKey.slice(0, 7);

        const totalOutstandingAmount = activeLoans.reduce((sum, loan) => {
          const refundable = Number(loan.refundable_amount || 0);
          const paid = paidByLoan.get(Number(loan.id)) || 0;
          return sum + Math.max(refundable - paid, 0);
        }, 0);

        const assetValueTotal = activeLoans.reduce((sum, loan) => {
          const principal = Number(loan.loan_amount || 0);
          const principalPaid = principalPaidByLoan.get(Number(loan.id)) || 0;
          return sum + Math.max(principal - principalPaid, 0);
        }, 0);

        const todayCollection = scopedCollections.reduce((sum, row) => {
          const dateKey = String(row.collection_date || '').slice(0, 10);
          if (dateKey !== todayKey) return sum;
          return sum + Number(row.collected_amount || 0);
        }, 0);

        const monthCollection = scopedCollections.reduce((sum, row) => {
          const dateKey = String(row.collection_date || '').slice(0, 7);
          if (dateKey !== monthKey) return sum;
          return sum + Number(row.collected_amount || 0);
        }, 0);

        const imagineProfit = activeLoans.reduce((sum, loan) => {
          const refundable = Number(loan.refundable_amount || 0);
          const loanAmount = Number(loan.loan_amount || 0);
          return sum + Math.max(refundable - loanAmount, 0);
        }, 0);

        const todayProfit = scopedCollections.reduce((sum, row) => {
          const dateKey = String(row.collection_date || '').slice(0, 10);
          if (dateKey !== todayKey) return sum;
          return sum + Number(row.interest_amount || 0) + Number(row.penalty_amount || 0);
        }, 0);

        const monthProfit = scopedCollections.reduce((sum, row) => {
          const dateKey = String(row.collection_date || '').slice(0, 7);
          if (dateKey !== monthKey) return sum;
          return sum + Number(row.interest_amount || 0) + Number(row.penalty_amount || 0);
        }, 0);

        setStats({
          activeLoans: activeLoans.length,
          totalCollections,
          pendingPayments,
          defaultRate,
        });

        setSummaryStats({
          totalOutstandingAmount,
          assetValueTotal,
          todayCollection,
          monthCollection,
          imagineProfit,
          todayProfit,
          monthProfit,
        });
      } catch {
        setStats({
          activeLoans: 0,
          totalCollections: 0,
          pendingPayments: 0,
          defaultRate: 0,
        });
        setSummaryStats({
          totalOutstandingAmount: 0,
          assetValueTotal: 0,
          todayCollection: 0,
          monthCollection: 0,
          imagineProfit: 0,
          todayProfit: 0,
          monthProfit: 0,
        });
      } finally {
        setStatsLoading(false);
      }
    };

    loadDashboardStats();
  }, [token, isScopedUser, authUser]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Modern Navigation */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DOF</span>
                </div>
                <h1 className="text-gray-900 text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Microfinance Management
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300"
              >
                ← Back to Dashboard
              </button>
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Online</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block p-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mb-6">
            <div className="bg-white rounded-full p-4">
              <span className="text-4xl">🏦</span>
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Microfinance <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Management</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Empower communities with accessible micro loans. Manage applications, collections, payments, and configurations efficiently.
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {visibleModules.map((module, index) => (
            <div
              key={index}
              onClick={() => {
                if (module.name === 'Loan Management') {
                  router.push('/dashboard/microfinance/loans');
                } else if (module.name === 'Collection Management') {
                  router.push('/dashboard/microfinance/collections');
                } else if (module.name === 'Payments') {
                  router.push('/dashboard/microfinance/payments');
                } else if (module.name === 'Customers') {
                  router.push('/dashboard/microfinance/customers');
                } else if (module.name === 'Settings') {
                  router.push('/dashboard/microfinance/settings');
                }
              }}
              className="group relative bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-white/20 overflow-hidden transform hover:-translate-y-2 hover:scale-105"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

              {/* Content */}
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-r ${module.color} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {module.icon}
                  </div>
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">
                    {module.name}
                  </h3>
                  <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                    {module.description}
                  </p>
                </div>

                {/* Hover Effect Line */}
                <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 group-hover:w-full transition-all duration-500"></div>
              </div>

              {/* Floating Particles Effect */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 animate-ping"></div>
              <div className="absolute top-8 right-6 w-1 h-1 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 animate-ping animation-delay-300"></div>
            </div>
          ))}
        </div>

        {/* Reports Section */}
        <div className="mt-14">
          <div className="text-center mb-8">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
              Reports <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Center</span>
            </h3>
            <p className="text-base text-gray-600 mt-2 max-w-2xl mx-auto">
              Generate and monitor operational reports for collections, arrears, recovery, and customer performance.
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-cyan-100 bg-white/80 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-lg font-bold text-slate-900">Summary Report</h4>
              <span className="text-xs font-semibold text-cyan-700 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1">Live Snapshot</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleSummaryReportCards.map((item) => (
                <div key={item.label} className="rounded-xl border border-cyan-100 bg-white p-4">
                  <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${item.tone} mb-3`}></div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">{item.value}</p>
                </div>
              ))}
            </div>
            {visibleSummaryReportCards.length === 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                No summary cards are available for your current permissions.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleReportModules.map((report, index) => (
              <div
                key={index}
                className="group relative bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/20 overflow-hidden transform hover:-translate-y-2"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${report.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-r ${report.color} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {report.icon}
                    </div>
                    <span className="rounded-full bg-white/70 border border-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      Report
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">
                      {report.name}
                    </h4>
                    <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                      {report.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-700">Ready to build</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (report.path) {
                          router.push(report.path);
                        }
                      }}
                      disabled={!report.path}
                      className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                    >
                      {report.path ? 'Open' : 'Coming Soon'}
                    </button>
                  </div>

                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 group-hover:w-full transition-all duration-500"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
          {[
            {
              label: 'Active Loans',
              value: statsLoading ? '...' : stats.activeLoans.toLocaleString(),
              icon: '💰',
              color: 'from-green-500 to-emerald-500',
            },
            {
              label: 'Total Collections',
              value: statsLoading
                ? '...'
                : new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(
                    stats.totalCollections
                  ),
              icon: '📊',
              color: 'from-blue-500 to-cyan-500',
            },
            {
              label: 'Pending Payments',
              value: statsLoading ? '...' : stats.pendingPayments.toLocaleString(),
              icon: '⏳',
              color: 'from-yellow-500 to-orange-500',
            },
            {
              label: 'Default Rate',
              value: statsLoading ? '...' : `${stats.defaultRate.toFixed(2)}%`,
              icon: '📉',
              color: 'from-red-500 to-pink-500',
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white/75 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-5 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm md:text-[15px] leading-5 font-medium text-gray-600">{stat.label}</p>
                  <p className="mt-1 text-lg sm:text-xl lg:text-[1.35rem] leading-tight font-bold text-gray-900 break-words [overflow-wrap:anywhere]">{stat.value}</p>
                </div>
                <div
                  className={`h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 shrink-0 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center text-lg sm:text-xl`}
                >
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}