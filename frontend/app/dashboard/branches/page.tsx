'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Coins,
  Globe,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserCircle2,
  Wallet,
  X,
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  email: string;
  address: string;
  phone: string;
  website: string;
  manager_user_id?: number | null;
  opening_asset?: string | number | null;
  manager?: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

const inputClass =
  'w-full rounded-xl border border-teal-200/80 bg-white px-3.5 py-2.5 text-sm text-black shadow-sm transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200/80 placeholder:text-slate-400 [color-scheme:light]';

const labelClass = 'block text-xs font-bold text-slate-700 mb-1.5';

function formatMoney(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function extractMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (typeof data === 'object' && data && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return fallback;
}

type BankFormRow = {
  key: string;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  account_name: string;
  opening_balance: string;
};

function newBankRow(): BankFormRow {
  return {
    key: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bank_name: '',
    bank_branch: '',
    account_number: '',
    account_name: '',
    opening_balance: '0',
  };
}

export default function Branches() {
  const router = useRouter();

  const [token, setToken] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; company: Company | null }>({
    open: false,
    company: null,
  });
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [managerUserId, setManagerUserId] = useState('');
  const [openingAsset, setOpeningAsset] = useState('0');
  const [cashOpeningBalance, setCashOpeningBalance] = useState('0');
  const [bankRows, setBankRows] = useState<BankFormRow[]>([newBankRow()]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
    fetchCompanies(storedToken);
    fetchUsers(storedToken);
  }, [router]);

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((company) => {
      const haystack = [
        company.name,
        company.email,
        company.phone,
        company.address,
        company.manager?.name,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, searchQuery]);

  const stats = useMemo(() => {
    const totalOpening = companies.reduce((sum, c) => sum + Number(c.opening_asset || 0), 0);
    const withManager = companies.filter((c) => c.manager?.name).length;
    return {
      total: companies.length,
      withManager,
      totalOpening,
    };
  }, [companies]);

  const fetchUsers = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;

    try {
      const response = await axios.get(`/api/manager-candidates`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      setUsers(
        rows.map((user: { id: number; name?: string; email?: string }) => ({
          id: Number(user.id),
          name: String(user.name || 'Unknown User'),
          email: String(user.email || ''),
        }))
      );
    } catch {
      setUsers([]);
    }
  };

  const fetchCompanies = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;

    setListLoading(true);
    try {
      const response = await axios.get(`/api/companies`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setCompanies(response.data.data || response.data || []);
    } catch {
      setCompanies([]);
      setNotice({ type: 'error', text: 'Failed to load branches.' });
    } finally {
      setListLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setAddress('');
    setPhone('');
    setWebsite('');
    setManagerUserId('');
    setOpeningAsset('0');
    setCashOpeningBalance('0');
    setBankRows([newBankRow()]);
    setEditingCompany(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);

    const formData: Record<string, unknown> = {
      name,
      email,
      address,
      phone,
      website,
      manager_user_id: managerUserId ? Number(managerUserId) : null,
      opening_asset: openingAsset ? Number(openingAsset) : 0,
    };

    if (!editingCompany) {
      formData.cash_opening_balance = cashOpeningBalance ? Number(cashOpeningBalance) : 0;

      const bankAccounts = bankRows
        .filter((row) => row.bank_name.trim())
        .map((row) => ({
          bank_name: row.bank_name.trim(),
          bank_branch: row.bank_branch.trim() || null,
          account_number: row.account_number.trim() || null,
          account_name: row.account_name.trim() || null,
          opening_balance: row.opening_balance ? Number(row.opening_balance) : 0,
        }));

      if (bankAccounts.length > 0) {
        formData.bank_accounts = bankAccounts;
      }
    }

    try {
      if (editingCompany) {
        await axios.put(`/api/companies/${editingCompany.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotice({ type: 'success', text: 'Branch updated successfully.' });
      } else {
        await axios.post(`/api/companies`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotice({ type: 'success', text: 'Branch created with main, cash, and bank account(s).' });
      }
      await fetchCompanies();
      setShowForm(false);
      resetForm();
    } catch (error) {
      setNotice({
        type: 'error',
        text: extractMessage(error, 'Failed to save branch. Please try again.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setName(company.name);
    setEmail(company.email);
    setAddress(company.address || '');
    setPhone(company.phone || '');
    setWebsite(company.website || '');
    setManagerUserId(company.manager_user_id ? String(company.manager_user_id) : '');
    setOpeningAsset(String(company.opening_asset ?? 0));
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!deleteModal.company) return;

    setDeleting(true);
    setNotice(null);

    try {
      await axios.delete(`/api/companies/${deleteModal.company.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotice({ type: 'success', text: 'Branch deleted successfully.' });
      setDeleteModal({ open: false, company: null });
      await fetchCompanies();
    } catch (error) {
      setNotice({
        type: 'error',
        text: extractMessage(error, 'Failed to delete branch. It may be linked to other records.'),
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/60 to-emerald-50 p-4 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-20 left-0 h-80 w-80 rounded-full bg-teal-300/40 blur-3xl" />
        <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl backdrop-blur-xl">
          <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-100">Organization</p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">Branch Management</h1>
                  <p className="text-sm text-teal-50/95 mt-1 max-w-2xl">
                    Create branches with opening main, cash, and bank accounts. Open a branch to access its module dashboard.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fetchCompanies()}
                  disabled={listLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-50 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add branch
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total branches', value: stats.total, sub: 'Active locations', icon: Building2, accent: 'from-teal-500 to-emerald-600' },
            { label: 'With manager', value: stats.withManager, sub: 'Assigned leadership', icon: UserCircle2, accent: 'from-blue-500 to-indigo-600' },
            { label: 'Opening assets', value: formatMoney(stats.totalOpening), sub: 'Combined main balances', icon: Landmark, accent: 'from-violet-500 to-purple-600' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{item.value}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{item.sub}</p>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {notice ? (
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <div className="flex items-start gap-2">
              {notice.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{notice.text}</span>
            </div>
            <button type="button" onClick={() => setNotice(null)} className="rounded-lg p-1 hover:bg-black/5">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {/* Search + grid */}
        <div className="rounded-3xl border border-white/80 bg-white/90 shadow-lg overflow-hidden">
          <div className="border-b border-teal-100 px-4 sm:px-6 py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500/70" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branch name, email, manager…"
                className="w-full rounded-xl border border-teal-100 bg-white py-2.5 pl-10 pr-3 text-sm text-black focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {listLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
                <p className="text-sm font-medium text-slate-600">Loading branches…</p>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="h-10 w-10 text-teal-500 mx-auto" />
                <p className="mt-3 text-lg font-bold text-slate-900">
                  {companies.length === 0 ? 'No branches yet' : 'No matching branches'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {companies.length === 0
                    ? 'Create your first branch with opening accounting balances.'
                    : 'Try a different search term.'}
                </p>
                {companies.length === 0 ? (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add branch
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/dashboard/branches/${company.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/branches/${company.id}`);
                      }
                    }}
                    className="group rounded-2xl border border-teal-100 bg-white hover:border-teal-200 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(company);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({ open: true, company });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-teal-800 transition-colors">
                        {company.name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {company.email}
                      </p>

                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        {company.phone ? (
                          <p className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                            {company.phone}
                          </p>
                        ) : null}
                        {company.address ? (
                          <p className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-600 mt-0.5" />
                            <span className="line-clamp-2">{company.address}</span>
                          </p>
                        ) : null}
                        {company.website ? (
                          <p className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                            <span className="truncate text-teal-700">{company.website}</span>
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-4 pt-4 border-t border-teal-50 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase text-slate-500">Manager</p>
                          <p className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                            {company.manager?.name || 'Not assigned'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-teal-50/70 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase text-teal-700">Main opening</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">
                            {formatMoney(company.opening_asset)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-[11px] font-semibold text-teal-700">Open branch dashboard →</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/55 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[94vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 px-5 py-4 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-100">
                    {editingCompany ? 'Update branch' : 'New branch setup'}
                  </p>
                  <h2 className="text-xl font-extrabold text-white mt-0.5">
                    {editingCompany ? editingCompany.name : 'Add branch'}
                  </h2>
                  {!editingCompany ? (
                    <p className="text-sm text-teal-50 mt-1">Profile details + starting accounting accounts</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-white/30 bg-white/10 p-2 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="rounded-2xl border border-teal-100 bg-teal-50/40 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">Branch profile</p>
                <p className="text-xs text-slate-600 mt-0.5">Contact and location information</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Branch name *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Branch manager</label>
                  <select value={managerUserId} onChange={(e) => setManagerUserId(e.target.value)} className={inputClass}>
                    <option value="">Not assigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-3">
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-violet-700" />
                  Opening accounting
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {editingCompany
                    ? 'Adjust balances in Accounting → Account Setup.'
                    : 'Main, cash, and optional bank accounts are created automatically.'}
                </p>
              </div>

              <div>
                <label className={labelClass}>Main account opening balance (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAsset}
                  onChange={(e) => setOpeningAsset(e.target.value)}
                  className={inputClass}
                />
              </div>

              {!editingCompany ? (
                <>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                    <p className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      Cash account
                    </p>
                    <div>
                      <label className={labelClass}>Cash opening amount *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashOpeningBalance}
                        onChange={(e) => setCashOpeningBalance(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Bank accounts (optional)
                      </p>
                      <button
                        type="button"
                        onClick={() => setBankRows((rows) => [...rows, newBankRow()])}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add another bank
                      </button>
                    </div>

                    <div className="space-y-4">
                      {bankRows.map((row, index) => (
                        <div key={row.key} className="rounded-xl border border-blue-100 bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
                              Bank account {index + 1}
                            </p>
                            {bankRows.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => setBankRows((rows) => rows.filter((item) => item.key !== row.key))}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove
                              </button>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                              <label className={labelClass}>Bank name</label>
                              <input
                                value={row.bank_name}
                                onChange={(e) =>
                                  setBankRows((rows) =>
                                    rows.map((item) =>
                                      item.key === row.key ? { ...item, bank_name: e.target.value } : item
                                    )
                                  )
                                }
                                className={inputClass}
                                placeholder="Commercial Bank"
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Branch</label>
                              <input
                                value={row.bank_branch}
                                onChange={(e) =>
                                  setBankRows((rows) =>
                                    rows.map((item) =>
                                      item.key === row.key ? { ...item, bank_branch: e.target.value } : item
                                    )
                                  )
                                }
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Account number</label>
                              <input
                                value={row.account_number}
                                onChange={(e) =>
                                  setBankRows((rows) =>
                                    rows.map((item) =>
                                      item.key === row.key ? { ...item, account_number: e.target.value } : item
                                    )
                                  )
                                }
                                className={inputClass}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={labelClass}>Display name</label>
                              <input
                                value={row.account_name}
                                onChange={(e) =>
                                  setBankRows((rows) =>
                                    rows.map((item) =>
                                      item.key === row.key ? { ...item, account_name: e.target.value } : item
                                    )
                                  )
                                }
                                className={inputClass}
                                placeholder="Operations current account"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={labelClass}>Opening balance (LKR)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.opening_balance}
                                onChange={(e) =>
                                  setBankRows((rows) =>
                                    rows.map((item) =>
                                      item.key === row.key ? { ...item, opening_balance: e.target.value } : item
                                    )
                                  )
                                }
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-blue-800/80">
                      Leave bank name empty to skip a row. You can add more banks later in Accounting → Account Setup.
                    </p>
                  </div>
                </>
              ) : null}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : editingCompany ? 'Update branch' : 'Create branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete modal */}
      {deleteModal.open && deleteModal.company ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 px-5 py-4 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-white" />
              <h3 className="text-lg font-extrabold text-white">Delete branch</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete <span className="font-bold">{deleteModal.company.name}</span>? This cannot
                be undone if the branch has linked records.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, company: null })}
                  disabled={deleting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
