'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthUser = {
    designation?: { name?: string } | null;
    roles?: Array<{ name?: string | null }> | null;
};

export default function LoanManagementPage() {
    const [token, setToken] = useState('');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();

    const normalizeText = (value: string) =>
        String(value || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const designationName = normalizeText(String(authUser?.designation?.name || ''));
    const roleNames = (authUser?.roles || []).map((role) => normalizeText(String(role?.name || '')));
    const isFieldOfficer =
        designationName.includes('field officer') ||
        roleNames.some((role) => role.includes('field officer'));

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
            } else {
                setAuthUser(null);
            }
        }
    }, [router]);

    const options = [
        {
            title: 'Request Loan',
            description: 'Create and submit new loan requests for customers.',
            icon: '📝',
            color: 'from-emerald-500 to-green-500',
            bgColor: 'from-emerald-50 to-green-50',
            accent: 'bg-emerald-500',
            tag: 'Origination',
            path: '/dashboard/microfinance/loans/request',
        },
        {
            title: 'Loan Approvals',
            description: 'Review pending approvals and approve or reject loans.',
            icon: '🔎',
            color: 'from-amber-500 to-orange-500',
            bgColor: 'from-amber-50 to-orange-50',
            accent: 'bg-amber-500',
            tag: 'Decision Desk',
            path: '/dashboard/microfinance/loans/approvals',
        },
        {
            title: 'View Released Loans',
            description: 'View all disbursed/released loans with status details.',
            icon: '✅',
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'from-blue-50 to-cyan-50',
            accent: 'bg-cyan-500',
            tag: 'Portfolio',
            path: '/dashboard/microfinance/loans/released',
        },
    ];
    const visibleOptions = options.filter((option) => !(isFieldOfficer && option.title === 'Loan Approvals'));

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-emerald-100 px-4 py-8 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute -top-14 left-10 h-72 w-72 rounded-full bg-cyan-300/70 blur-3xl"></div>
                <div className="absolute top-24 right-8 h-80 w-80 rounded-full bg-emerald-300/70 blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-300/70 blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_24px_60px_-28px_rgba(8,47,73,0.65)] border border-white/50 p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-700 uppercase">
                                Credit Operations Hub
                            </span>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-3 tracking-tight">Loan Management</h1>
                            <p className="text-sm md:text-base text-slate-600 mt-2 max-w-2xl">
                                Orchestrate the full loan lifecycle from origination to approval and released portfolio monitoring in one workspace.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/microfinance')}
                            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm"
                        >
                            Back
                        </button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-cyan-100 bg-white/90 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Workspaces</p>
                            <p className="text-2xl font-extrabold text-slate-900 mt-1">{visibleOptions.length}</p>
                        </div>
                        <div className="rounded-xl border border-cyan-100 bg-white/90 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                            <p className="text-2xl font-extrabold text-emerald-700 mt-1">Ready</p>
                        </div>
                        <div className="rounded-xl border border-cyan-100 bg-white/90 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Mode</p>
                            <p className="text-2xl font-extrabold text-slate-900 mt-1">Production</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {visibleOptions.map((option, index) => (
                        <button
                            key={option.title}
                            type="button"
                            onClick={() => router.push(option.path)}
                            className="group relative text-left bg-white/80 backdrop-blur-sm rounded-3xl shadow-[0_20px_40px_-30px_rgba(8,47,73,0.85)] hover:shadow-[0_28px_55px_-28px_rgba(8,47,73,0.75)] transition-all duration-500 cursor-pointer border border-white/50 overflow-hidden transform hover:-translate-y-2 hover:scale-[1.01]"
                            style={{ animationDelay: `${index * 70}ms` }}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${option.bgColor} opacity-40 group-hover:opacity-100 transition-opacity duration-500`}></div>
                            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/50 blur-2xl"></div>

                            <div className="relative p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`h-14 w-14 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        {option.icon}
                                    </div>
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-700">
                                        <span className={`h-2 w-2 rounded-full ${option.accent}`}></span>
                                        {option.tag}
                                    </span>
                                </div>

                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{option.title}</h3>
                                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{option.description}</p>

                                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                                    Open Workspace
                                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>

                                <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:w-full transition-all duration-500"></div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
