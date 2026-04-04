'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreditDashboardPage() {
  const [token, setToken] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
    } else {
      setToken(storedToken);
    }
  }, [router]);

  const modules = [
    { name: 'Loan Management', icon: '🧾', color: 'from-lime-500 to-emerald-500', bgColor: 'from-lime-50 to-emerald-50', path: '/dashboard/loan' },
    { name: 'Finance Management', icon: '💰', color: 'from-green-500 to-emerald-500', bgColor: 'from-green-50 to-emerald-50', path: '/dashboard/finance' },
    { name: 'Microfinance (Micro Loans)', icon: '🏦', color: 'from-blue-500 to-cyan-500', bgColor: 'from-blue-50 to-cyan-50', path: '/dashboard/microfinance' },
    { name: 'Mortgage Management', icon: '🏠', color: 'from-purple-500 to-indigo-500', bgColor: 'from-purple-50 to-indigo-50', path: '/dashboard/mortgages' },
  ];

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white/85 backdrop-blur-sm rounded-3xl border border-emerald-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Section</p>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Credit</h1>
            <p className="text-sm text-slate-600 mt-1">Manage all credit products from one place.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-sm font-semibold hover:bg-emerald-50"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white/85 backdrop-blur-sm p-6">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Section</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Loan Management</h2>
            <p className="text-sm text-slate-600 mt-1">Manage lending operations across all credit products.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => (
              <div
                key={index}
                onClick={() => router.push(module.path)}
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-white/30 overflow-hidden transform hover:-translate-y-2 hover:scale-105"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${module.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-r ${module.color} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {module.icon}
                    </div>
                    <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                      Open module and manage credit operations.
                    </p>
                  </div>

                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 group-hover:w-full transition-all duration-500"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
