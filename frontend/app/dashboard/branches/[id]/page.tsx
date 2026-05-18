'use client';

import axios from 'axios';
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

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
        const res = await axios.get(`${API_URL}/api/companies/${branchId}`, {
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
  }, [API_URL, token, branchId]);

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
            path: withBranch('/dashboard/finance/reports/income-expense'),
          },
          {
            title: 'Cash Flow Report',
            description: 'Cash-in and cash-out summary over selected periods.',
            path: withBranch('/dashboard/finance/reports/cash-flow'),
          },
          {
            title: 'General Ledger Snapshot',
            description: 'Account-wise ledger balances and movement.',
            path: withBranch('/dashboard/finance/reports/general-ledger'),
          },
        ],
      },
      {
        key: 'branch',
        title: 'Branch Management Related Reports',
        icon: '🏢',
        gradient: 'from-rose-500 to-red-500',
        bg: 'from-rose-50 to-red-50',
        reports: [
          {
            title: 'Branch Performance Report',
            description: 'Operational and financial KPI comparison by branch.',
          },
          {
            title: 'Branch Collection Report',
            description: 'Collections and pending balances per branch.',
          },
          {
            title: 'Branch Staff Productivity Report',
            description: 'Team-level work output and service delivery metrics.',
          },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [branchId]
  );

  const collectionOfficerBlockedCategoryKeys = new Set(['mortgage', 'savings', 'finance', 'branch']);
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
                    onClick={() => router.push(`/dashboard/branches/${branchId}#reports`)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold border border-gray-200 shadow-sm"
                  >
                    View Branch Reports
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
    </div>
  );
}
