'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

type MortgageStatusRow = {
  id: number;
  status?: string | null;
};

type DashboardStats = {
  total: number;
  submitted: number;
  approved: number;
  active: number;
  arrears: number;
  settled: number;
};

export default function MortgagesDashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    submitted: 0,
    approved: 0,
    active: 0,
    arrears: 0,
    settled: 0,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadStats = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:8000/api/mortgages', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          params: { per_page: 1000 },
        });

        const rows = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];

        const normalized = rows as MortgageStatusRow[];
        setStats({
          total: normalized.length,
          submitted: normalized.filter((m) => String(m.status || '').toLowerCase() === 'submitted').length,
          approved: normalized.filter((m) => String(m.status || '').toLowerCase() === 'approved').length,
          active: normalized.filter((m) => String(m.status || '').toLowerCase() === 'active').length,
          arrears: normalized.filter((m) => String(m.status || '').toLowerCase() === 'arrears').length,
          settled: normalized.filter((m) => String(m.status || '').toLowerCase() === 'settled').length,
        });
      } catch {
        setStats({ total: 0, submitted: 0, approved: 0, active: 0, arrears: 0, settled: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [token]);

  const options = useMemo(
    () => [
      {
        title: 'Create Mortgage',
        description: 'Register a new mortgage request and collateral details.',
        icon: '📝',
        tag: 'Origination',
        color: 'from-blue-500 to-cyan-500',
        bg: 'from-blue-50 to-cyan-50',
        path: '/dashboard/mortgages/create',
      },
      {
        title: 'Mortgage Approvals',
        description: 'Review and process pending mortgage approvals.',
        icon: '✅',
        tag: 'Approval Desk',
        color: 'from-emerald-500 to-teal-500',
        bg: 'from-emerald-50 to-teal-50',
        path: '/dashboard/mortgages/approvals',
      },
      {
        title: 'Mortgage Portfolio',
        description: 'View all mortgages, filters, schedules, and collections.',
        icon: '📊',
        tag: 'Portfolio',
        color: 'from-indigo-500 to-violet-500',
        bg: 'from-indigo-50 to-violet-50',
        path: '/dashboard/mortgages/portfolio',
      },
      {
        title: 'Collection Management',
        description: 'Track due collections, post payments, and monitor arrears flow.',
        icon: '💳',
        tag: 'Collections',
        color: 'from-teal-500 to-cyan-600',
        bg: 'from-teal-50 to-cyan-50',
        path: '/dashboard/mortgages/collections',
      },
      {
        title: 'Mortgage Reports',
        description: 'View mortgage-only analytics, repayment insights, and status distribution.',
        icon: '📈',
        tag: 'Reports',
        color: 'from-rose-500 to-red-500',
        bg: 'from-rose-50 to-red-50',
        path: '/dashboard/mortgages/reports',
      },
    ],
    []
  );

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/82 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
                Mortgage Desk
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Mortgage Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">
                Access mortgage operations through separate pages for creation, approvals, portfolio, and dedicated mortgage reports.
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm"
            >
              Back
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{stats.submitted}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
              <p className="text-2xl font-extrabold text-cyan-700 mt-1">{stats.approved}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.active}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Arrears</p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">{stats.arrears}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Settled</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{stats.settled}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {options.map((option) => (
            <button
              key={option.title}
              type="button"
              onClick={() => router.push(option.path)}
              className="group relative text-left bg-white/80 backdrop-blur-sm rounded-3xl shadow-[0_20px_40px_-30px_rgba(8,47,73,0.85)] hover:shadow-[0_28px_55px_-28px_rgba(8,47,73,0.75)] transition-all duration-500 cursor-pointer border border-white/50 overflow-hidden transform hover:-translate-y-2"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${option.bg} opacity-40 group-hover:opacity-100 transition-opacity duration-500`}></div>

              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-14 w-14 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {option.icon}
                  </div>
                  <span className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-700">
                    {option.tag}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{option.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{option.description}</p>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                  Open Page
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-cyan-500 to-blue-500 group-hover:w-full transition-all duration-500"></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
