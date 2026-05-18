'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function ReportsHubPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

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
            path: '/dashboard/microfinance/reports/collection',
          },
          {
            title: 'Field Officer Collection Report',
            description: 'Performance and totals by field officer.',
            path: '/dashboard/microfinance/reports/field-officer-collection',
          },
          {
            title: 'Arrears Report',
            description: 'Overdue and arrears-focused loan analysis.',
            path: '/dashboard/microfinance/reports/arrears',
          },
          {
            title: 'Active Member Report',
            description: 'Active borrowers and repayment visibility.',
            path: '/dashboard/microfinance/reports/active-members',
          },
          {
            title: 'Blacklisted Customer Report',
            description: 'Risk profile and blacklisted customer exposure.',
            path: '/dashboard/microfinance/reports/blacklisted-customers',
          },
          {
            title: 'Re-Payment Report',
            description: 'Repayment rate and pending amounts by account.',
            path: '/dashboard/microfinance/reports/repayment',
          },
          {
            title: 'Recovery Report',
            description: 'Recovery priority and difficult portfolio tracking.',
            path: '/dashboard/microfinance/reports/recovery',
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
            path: '/dashboard/mortgages/reports/collection',
          },
          {
            title: 'Mortgage Arrears Report',
            description: 'Identify overdue mortgage accounts and balances.',
            path: '/dashboard/mortgages/reports/arrears',
          },
          {
            title: 'Mortgage Portfolio Report',
            description: 'Overall mortgage portfolio health and statuses.',
            path: '/dashboard/mortgages/reports/portfolio',
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
            path: '/dashboard/savings-deposits/reports/ledger',
          },
          {
            title: 'Deposit Growth Report',
            description: 'Period-over-period savings and deposit growth summary.',
            path: '/dashboard/savings-deposits/reports/deposit-growth',
          },
          {
            title: 'Maturity Report',
            description: 'Upcoming and completed deposit maturities.',
            path: '/dashboard/savings-deposits/reports/maturity',
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
            path: '/dashboard/finance/reports/income-expense',
          },
          {
            title: 'Cash Flow Report',
            description: 'Cash-in and cash-out summary over selected periods.',
            path: '/dashboard/finance/reports/cash-flow',
          },
          {
            title: 'General Ledger Snapshot',
            description: 'Account-wise ledger balances and movement.',
            path: '/dashboard/finance/reports/general-ledger',
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
    []
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
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute top-24 right-8 h-80 w-80 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
                Reports Center
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">All Reports Hub</h1>
              <p className="text-sm text-slate-600 mt-1">
                View all report domains in one place: Micro Finance, Mortgage Management, Savings and Deposits, Finance Management, and Branch Management.
              </p>
            </div>

            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm"
            >
              Back
            </button>
          </div>
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
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-r ${category.gradient} flex items-center justify-center text-2xl shadow-lg`}>
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
      </div>
    </div>
  );
}
