'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';

type AuthPermission = {
  id: number;
  name: string;
  module?: string | null;
};

type AuthRole = {
  id: number;
  name: string;
  permissions?: AuthPermission[];
};

type AuthUser = {
  id: number;
  email: string;
  designation?: { id?: number; name?: string } | null;
  roles?: AuthRole[];
};

type CreditModule = {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  path: string;
  requiredModules: string[];
  requiredPermissionKeywords: string[];
};

export default function CreditDashboardPage() {
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loadingPrivileges, setLoadingPrivileges] = useState(true);
  const router = useRouter();
  const apiBase = getApiBaseUrl();

  const normalizeText = (value: string) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const designationName = normalizeText(String(authUser?.designation?.name || ''));
  const roleNames = (authUser?.roles || []).map((role) => normalizeText(String(role?.name || '')));
  const isAdminUser =
    normalizeText(String(authUser?.email || '')) === 'superadmin softcodelk com' ||
    designationName.includes('admin') ||
    roleNames.some((name) => name.includes('admin'));
  const isCollectionOfficer =
    designationName.includes('collection officer') ||
    roleNames.some((name) => name.includes('collection officer'));

  const userPermissionNames = new Set(
    (authUser?.roles || [])
      .flatMap((role) => role.permissions || [])
      .map((permission) => permission.name.toLowerCase())
  );

  const userPermissionModules = new Set(
    (authUser?.roles || [])
      .flatMap((role) => role.permissions || [])
      .map((permission) => permission.module || '')
      .map((moduleName: string) => moduleName.toLowerCase().trim())
      .filter((moduleName: string) => moduleName.length > 0)
  );

  const hasModuleAccess = (requiredModules: string[]) =>
    requiredModules.some((moduleName) => userPermissionModules.has(moduleName.toLowerCase()));

  const hasPermissionKeywordAccess = (requiredKeywords: string[]) =>
    requiredKeywords.some((keyword) =>
      Array.from(userPermissionNames).some((permissionName) => permissionName.includes(keyword.toLowerCase()))
    );

  const canAccess = (requiredModules: string[], requiredPermissionKeywords: string[] = []) => {
    if (isAdminUser) {
      return true;
    }

    if (requiredModules.length === 0 && requiredPermissionKeywords.length === 0) {
      return true;
    }

    return hasModuleAccess(requiredModules) || hasPermissionKeywordAccess(requiredPermissionKeywords);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
    } else {
      setToken(storedToken);
      fetchAuthUser(storedToken);
    }
  }, [router]);

  const fetchAuthUser = async (authToken: string) => {
    setLoadingPrivileges(true);
    try {
      const response = await axios.get(`${apiBase}/user`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setAuthUser(response.data || null);
      localStorage.setItem('auth_user', JSON.stringify(response.data || null));
    } catch (error) {
      console.error('Failed to load user privileges:', error);
      const stored = localStorage.getItem('auth_user');
      setAuthUser(stored ? JSON.parse(stored) : null);
    } finally {
      setLoadingPrivileges(false);
    }
  };

  const modules: CreditModule[] = [
    {
      name: 'Loan Management',
      icon: '🧾',
      color: 'from-lime-500 to-emerald-500',
      bgColor: 'from-lime-50 to-emerald-50',
      path: '/dashboard/loan',
      requiredModules: ['loan requests', 'finance product types'],
      requiredPermissionKeywords: ['loan_requests', 'loan', 'loan_products'],
    },
    {
      name: 'Finance Management',
      icon: '💰',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
      path: '/dashboard/finance',
      requiredModules: ['finances', 'finance product types'],
      requiredPermissionKeywords: ['finance'],
    },
    {
      name: 'Microfinance (Micro Loans)',
      icon: '🏦',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50',
      path: '/dashboard/microfinance',
      requiredModules: ['microfinance'],
      requiredPermissionKeywords: ['microfinance'],
    },
    {
      name: 'Mortgage Management',
      icon: '🏠',
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'from-purple-50 to-indigo-50',
      path: '/dashboard/mortgages',
      requiredModules: ['mortgages'],
      requiredPermissionKeywords: ['mortgage', 'mortgages'],
    },
  ];

  const isBlockedForCollectionOfficer = (moduleName: string) => {
    if (!isCollectionOfficer) return false;
    return moduleName === 'Loan Management' || moduleName === 'Finance Management';
  };

  const canAccessModule = (module: CreditModule) => {
    if (isBlockedForCollectionOfficer(module.name)) {
      return false;
    }

    return canAccess(module.requiredModules, module.requiredPermissionKeywords);
  };

  const visibleModules = modules.filter((module) => canAccessModule(module));

  if (!token || loadingPrivileges) {
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

        <div
          className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 p-6 text-white shadow-lg cursor-pointer hover:opacity-95 transition"
          onClick={() => router.push('/dashboard/office-collections')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/office-collections');
          }}
          role="button"
          tabIndex={0}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-100">Office operations</p>
          <h2 className="mt-1 text-2xl font-extrabold">Collection Center</h2>
          <p className="text-sm text-indigo-50 mt-1 max-w-2xl">
            Collect installments for credit loans, finance, micro credit, and mortgages from one desk — built for branch office collection.
          </p>
          <span className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-700">
            Open Collection Center →
          </span>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white/85 backdrop-blur-sm p-6">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Section</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Credit Products</h2>
            <p className="text-sm text-slate-600 mt-1">Manage lending operations across all credit products.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleModules.map((module, index) => (
              <div
                key={index}
                onClick={() => {
                  if (!canAccessModule(module)) {
                    return;
                  }

                  router.push(module.path);
                }}
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

            {visibleModules.length === 0 && (
              <div className="col-span-full bg-white border border-emerald-100 rounded-2xl p-8 text-center">
                <p className="text-lg font-semibold text-slate-900">No Credit privileges assigned</p>
                <p className="text-sm text-slate-600 mt-2">Your account does not have permission to view Credit modules. Please contact an administrator.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
