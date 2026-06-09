'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';

type AuthPermission = {
  id: number;
  name: string;
  module?: string | null;
  description?: string | null;
};

type AuthRole = {
  id: number;
  name: string;
  permissions?: AuthPermission[];
};

type AuthUser = {
  id: number;
  name?: string;
  email: string;
  role?: string;
  roles?: AuthRole[];
};

type DashboardModule = {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  path: string;
  requiredModules: string[];
  requiredPermissionKeywords?: string[];
};

type DashboardSetting = {
  icon: string;
  title: string;
  desc: string;
  color: string;
  path: string;
  requiredModules: string[];
  requiredPermissionKeywords?: string[];
};

export default function Dashboard() {
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loadingPrivileges, setLoadingPrivileges] = useState(true);
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const normalizeText = (value: string) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const roleNames = (authUser?.roles || []).map((role) => normalizeText(role.name));

  const displayName = String(authUser?.name || authUser?.email || 'User').trim();
  const primaryRoleRaw =
    authUser?.roles?.[0]?.name ||
    authUser?.role ||
    (roleNames.some((roleName) => roleName.includes('admin')) ? 'Super Admin' : 'User');
  const primaryRoleName = String(primaryRoleRaw || 'User').trim();

  const isSuperAdmin =
    authUser?.email === 'superadmin@softcodelk.com' ||
    roleNames.some((roleName) =>
      ['super admin', 'superadmin', 'admin', 'system admin', 'md'].some((adminKey) => roleName.includes(adminKey))
    );

  const userPermissionNames = new Set(
    (authUser?.roles || [])
      .flatMap((role) => role.permissions || [])
      .map((permission) => normalizeText(permission.name))
  );

  const userPermissionModules = new Set(
    (authUser?.roles || [])
      .flatMap((role) => role.permissions || [])
      .map((permission) => permission.module || '')
      .map((moduleName: string) => normalizeText(moduleName))
      .filter((moduleName: string) => moduleName.length > 0)
  );

  const userPermissionTexts = (authUser?.roles || [])
    .flatMap((role) => role.permissions || [])
    .map((permission) =>
      normalizeText(`${permission.name || ''} ${permission.module || ''} ${permission.description || ''}`)
    )
    .filter(Boolean);

  const moduleAliases: Record<string, string[]> = {
    hrm: ['hr', 'hrm', 'human resource management', 'employee', 'employees', 'department', 'designation', 'attendance', 'leave', 'payroll', 'candidate'],
    credit: ['credit', 'finance', 'finances', 'finance product types', 'loan requests', 'loan request', 'microfinance', 'mortgages', 'mortgage', 'customers', 'customer'],
    savings: ['savings', 'savings accounts', 'deposit', 'deposits'],
    branches: ['branch', 'branches', 'company', 'companies'],
    accounting: ['accounting', 'account', 'accounts', 'ledger', 'general ledger', 'chart of accounts'],
    reports: ['report', 'reports', 'ledger', 'snapshot', 'arrears', 'portfolio'],
  };

  const moduleMatches = (requiredModule: string, assignedModule: string) => {
    const required = normalizeText(requiredModule);
    const assigned = normalizeText(assignedModule);
    if (!required || !assigned) return false;

    if (assigned === required || assigned.includes(required) || required.includes(assigned)) {
      return true;
    }

    const aliasTokens = moduleAliases[required] || [];
    if (aliasTokens.some((alias) => assigned.includes(alias))) {
      return true;
    }

    return false;
  };

  const hasModuleAccess = (requiredModules: string[]) =>
    requiredModules.some((moduleName) =>
      Array.from(userPermissionModules).some((assignedModule) => moduleMatches(moduleName, assignedModule))
    );

  const hasPermissionKeywordAccess = (requiredKeywords: string[]) =>
    requiredKeywords.some((keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      const singularKeyword = normalizedKeyword.endsWith('s')
        ? normalizedKeyword.slice(0, -1)
        : normalizedKeyword;

      return Array.from(userPermissionNames).some((permissionName) =>
        permissionName.includes(normalizedKeyword) ||
        permissionName.includes(singularKeyword)
      );
    });

  const hasPermissionTokenAccess = (tokens: string[]) =>
    tokens.some((token) => {
      const normalizedToken = normalizeText(token);
      if (!normalizedToken) return false;

      const singularToken = normalizedToken.endsWith('s')
        ? normalizedToken.slice(0, -1)
        : normalizedToken;

      return userPermissionTexts.some((text) =>
        text.includes(normalizedToken) || text.includes(singularToken)
      );
    });

  const canAccess = (requiredModules: string[], requiredPermissionKeywords: string[] = []) => {
    if (isSuperAdmin) {
      return true;
    }

    if (requiredModules.length === 0 && requiredPermissionKeywords.length === 0) {
      return true;
    }

    return (
      hasModuleAccess(requiredModules) ||
      hasPermissionKeywordAccess(requiredPermissionKeywords) ||
      hasPermissionTokenAccess([...requiredModules, ...requiredPermissionKeywords])
    );
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
      const response = await axios.get(`${apiBaseUrl}/user`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setAuthUser(response.data || null);
      localStorage.setItem('auth_user', JSON.stringify(response.data || null));
    } catch (error) {
      console.error('Failed to load user privileges:', error);
      const stored = localStorage.getItem('auth_user');
      const cached = stored ? JSON.parse(stored) : null;
      setAuthUser(cached);

      // Avoid stale/no-data cache causing false "No Module Access Assigned".
      if (!cached) {
        localStorage.removeItem('auth_user');
      }
    } finally {
      setLoadingPrivileges(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const allModules: DashboardModule[] = [
    {
      name: 'Credit',
      icon: '💳',
      color: 'from-emerald-500 to-cyan-500',
      bgColor: 'from-emerald-50 to-cyan-50',
      path: '/dashboard/credit',
      requiredModules: ['finances', 'finance product types', 'loan requests', 'microfinance', 'mortgages', 'customers'],
      requiredPermissionKeywords: ['credit', 'finance', 'loan_requests', 'loan request', 'microfinance', 'mortgages', 'customer', 'customers'],
    },
    {
      name: 'Office Collection Center',
      icon: '🏛️',
      color: 'from-indigo-500 to-violet-500',
      bgColor: 'from-indigo-50 to-violet-50',
      path: '/dashboard/office-collections',
      requiredModules: ['finances', 'finance product types', 'loan requests', 'microfinance', 'mortgages', 'customers'],
      requiredPermissionKeywords: [
        'collection',
        'collections',
        'collect',
        'office',
        'credit',
        'finance',
        'loan_requests',
        'microfinance',
        'mortgage',
        'mortgages',
      ],
    },
    {
      name: 'HRM (Human Resource Management)',
      icon: '👥',
      color: 'from-red-500 to-pink-500',
      bgColor: 'from-red-50 to-pink-50',
      path: '/dashboard/hrm',
      requiredModules: [
        'hrm',
        'hr',
        'employee management',
        'department management',
        'attendance management',
        'leave management',
        'payroll management',
        'candidate management',
        'roles',
        'permissions',
        'role management',
        'permission management',
        'users',
        'user management',
      ],
      requiredPermissionKeywords: ['hrm', 'employee', 'employees', 'department', 'departments', 'attendance', 'leave', 'leaves', 'payroll', 'candidate', 'candidates', 'roles', 'permissions'],
    },
    {
      name: 'Savings & Deposits',
      icon: '💸',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'from-yellow-50 to-orange-50',
      path: '/dashboard/savings-deposits',
      requiredModules: ['savings accounts'],
      requiredPermissionKeywords: ['savings', 'savings_accounts', 'deposit', 'withdraw'],
    },
    {
      name: 'Branch Management',
      icon: '🏢',
      color: 'from-teal-500 to-green-500',
      bgColor: 'from-teal-50 to-green-50',
      path: '/dashboard/branches',
      requiredModules: ['branches'],
      requiredPermissionKeywords: ['branch', 'branches', 'company', 'companies'],
    },
    {
      name: 'Accounting',
      icon: '📒',
      color: 'from-violet-500 to-purple-500',
      bgColor: 'from-violet-50 to-purple-50',
      path: '/dashboard/accounting',
      requiredModules: ['accounting', 'branches', 'companies', 'finance', 'reports'],
      requiredPermissionKeywords: ['accounting', 'account', 'accounts', 'ledger', 'company', 'companies', 'branch', 'branches'],
    },
    {
      name: 'Reports',
      icon: '📈',
      color: 'from-rose-500 to-red-500',
      bgColor: 'from-rose-50 to-red-50',
      path: '/dashboard/reports',
      requiredModules: ['reports'],
      requiredPermissionKeywords: ['report', 'reports', 'ledger', 'snapshot'],
    },
  ];

  const otherModules = allModules.filter((module) =>
    canAccess(module.requiredModules, module.requiredPermissionKeywords || [])
  );

  const settings: DashboardSetting[] = [
    {
      icon: '🏢',
      title: 'Company Settings',
      desc: 'Manage company information',
      color: 'from-blue-500 to-cyan-500',
      path: '/dashboard/company-settings',
      requiredModules: ['branches', 'companies'],
      requiredPermissionKeywords: ['view_branches', 'edit_branches', 'view_companies', 'edit_companies', 'document_templates'],
    },
  ].filter((setting) => canAccess(setting.requiredModules, setting.requiredPermissionKeywords || []));

  const handleModuleClick = (moduleName: string) => {
    const module = allModules.find((item) => item.name === moduleName);
    if (module) {
      router.push(module.path);
    }
  };

  if (!token || loadingPrivileges) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Modern Navigation */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-3 sm:h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DOF</span>
                </div>
                <h1 className="text-gray-900 text-base sm:text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent truncate max-w-[180px] sm:max-w-none">
                  Desk of Finance
                </h1>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Online</span>
              </div>
              <div className="hidden sm:flex items-center rounded-full border border-red-100 bg-white/80 px-3 py-1.5 text-left">
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-slate-900">{displayName}</p>
                  <p className="text-[11px] font-medium text-slate-500">{primaryRoleName}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
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
          <div className="inline-block p-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mb-6">
            <div className="bg-white rounded-full p-4">
              <span className="text-3xl sm:text-4xl">🚀</span>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Desk of Finance</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Transform your business operations with our comprehensive management suite.
            Streamline processes, boost productivity, and drive growth with intelligent automation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center mt-6 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>All Systems Operational</span>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Real-time Updates</span>
            </div>
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {otherModules.map((module, index) => (
            <div
              key={index}
              onClick={() => handleModuleClick(module.name)}
              className={`group relative bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-white/20 overflow-hidden transform hover:-translate-y-2 hover:scale-105 ${
                module.name === 'HRM (Human Resource Management)' ? 'ring-2 ring-red-500/50' : ''
              }`}
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
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">
                    {module.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                    {module.name === 'HRM (Human Resource Management)'
                      ? 'Manage your workforce efficiently'
                      : 'Access comprehensive management tools'
                    }
                  </p>
                </div>

                {/* Hover Effect Line */}
                <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-red-500 to-pink-500 group-hover:w-full transition-all duration-500"></div>
              </div>

              {/* Floating Particles Effect */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 animate-ping"></div>
              <div className="absolute top-8 right-6 w-1 h-1 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 animate-ping animation-delay-300"></div>
            </div>
          ))}
        </div>

        {otherModules.length === 0 && (
          <div className="mb-16 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <h3 className="text-lg font-semibold text-amber-800">No Module Access Assigned</h3>
            <p className="text-amber-700 mt-2">
              Your account currently has no dashboard module privileges. Please contact an administrator to assign permissions.
            </p>
          </div>
        )}

        {/* Settings & Configuration Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                ⚙️
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Settings & System Configuration</h3>
                <p className="text-sm sm:text-base text-white/80">Configure and customize your system preferences</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {settings.map((setting, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (setting.path) router.push(setting.path);
                  }}
                  className="group bg-white/50 hover:bg-white/80 rounded-xl p-4 border border-white/30 hover:border-white/50 transition-all duration-300 cursor-pointer transform hover:scale-105"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${setting.color} rounded-lg flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {setting.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">
                        {setting.title}
                      </h4>
                      <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                        {setting.desc}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}