'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import { AlertTriangle, ArrowLeft, Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

type CompanyProfileState = 'loading' | 'missing' | 'incomplete' | 'ready';

type CompanyRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
};

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400';

function isCompanyComplete(company: CompanyRow | null | undefined): boolean {
  if (!company) return false;
  return (
    String(company.name || '').trim() !== '' &&
    String(company.email || '').trim() !== '' &&
    String(company.address || '').trim() !== '' &&
    String(company.phone || '').trim() !== ''
  );
}

function extractApiMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;
  if (typeof data === 'string') {
    return sanitizeMessage(data, fallback);
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return sanitizeMessage(record.message, fallback);
    }
    if (typeof record.error === 'string') {
      return sanitizeMessage(record.error, fallback);
    }
    if (record.errors && typeof record.errors === 'object') {
      const first = Object.values(record.errors as Record<string, unknown>)[0];
      if (Array.isArray(first) && typeof first[0] === 'string') {
        return sanitizeMessage(first[0], fallback);
      }
    }
  }

  return fallback;
}

function sanitizeMessage(raw: string, fallback: string): string {
  const message = raw.trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();
  if (
    lower.includes('sqlstate') ||
    lower.includes('integrity constraint violation') ||
    lower.includes('foreign key constraint') ||
    lower.includes('duplicate entry') ||
    lower.includes('connection: mysql') ||
    lower.includes('insert into')
  ) {
    return fallback;
  }

  return message;
}

export default function Departments() {
  const router = useRouter();
  const apiBase = getApiBaseUrl();

  const [token, setToken] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [companyProfileState, setCompanyProfileState] = useState<CompanyProfileState>('loading');
  const [companyProfileMessage, setCompanyProfileMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteDepartmentId, setPendingDeleteDepartmentId] = useState<number | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('Notice');
  const [noticeMessage, setNoticeMessage] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const canManageDepartments = companyProfileState === 'ready';

  const filteredDepartments = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return departments;

    return departments.filter(
      (department) =>
        department.name?.toLowerCase().includes(keyword) ||
        String(department.description || '').toLowerCase().includes(keyword)
    );
  }, [departments, searchTerm]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredDepartments.length);
  const paginatedDepartments = filteredDepartments.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const checkCompanyProfile = useCallback(
    async (authToken: string) => {
      try {
        const response = await axios.get(`${apiBase}/companies`, {
          headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
        });
        const rows = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
        const company = (rows as CompanyRow[])[0] || null;

        if (!company) {
          setCompanyProfileState('missing');
          setCompanyProfileMessage(
            'No company profile found. Register your company in Company Settings before creating departments.'
          );
          return;
        }

        if (!isCompanyComplete(company)) {
          setCompanyProfileState('incomplete');
          setCompanyProfileMessage(
            'Company profile is incomplete. Add name, email, address, and phone in Company Settings before creating departments.'
          );
          return;
        }

        setCompanyProfileState('ready');
        setCompanyProfileMessage('');
      } catch {
        setCompanyProfileState('missing');
        setCompanyProfileMessage(
          'Unable to verify company profile. Complete Company Settings before creating departments.'
        );
      }
    },
    [apiBase]
  );

  const fetchDepartments = useCallback(
    async (authToken?: string) => {
      const tokenToUse = authToken || token;
      if (!tokenToUse) return;

      try {
        const response = await axios.get(`${apiBase}/hr/departments`, {
          headers: { Authorization: `Bearer ${tokenToUse}`, Accept: 'application/json' },
        });
        setDepartments(response.data.data || []);
        setCurrentPage(1);
        setApiError(null);
      } catch (error) {
        setApiError(extractApiMessage(error, 'Failed to load departments. Please try again.'));
      }
    },
    [apiBase, token]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
    setApiError(null);
    checkCompanyProfile(storedToken);
    fetchDepartments(storedToken);
  }, [router, checkCompanyProfile, fetchDepartments]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingDepartment(null);
  };

  const openNotice = (title: string, message: string) => {
    setNoticeTitle(title);
    setNoticeMessage(message);
    setNoticeOpen(true);
  };

  const closeNotice = () => {
    setNoticeOpen(false);
    setNoticeTitle('Notice');
    setNoticeMessage('');
  };

  const openCreateForm = () => {
    if (!canManageDepartments) {
      openNotice('Company profile required', companyProfileMessage);
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageDepartments) {
      openNotice('Company profile required', companyProfileMessage);
      return;
    }

    setLoading(true);

    const departmentData = { name: name.trim(), description: description.trim() || null };

    try {
      if (editingDepartment) {
        await axios.put(`${apiBase}/hr/departments/${editingDepartment.id}`, departmentData, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
      } else {
        await axios.post(`${apiBase}/hr/departments`, departmentData, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
      }
      await fetchDepartments();
      setShowForm(false);
      resetForm();
      openNotice('Success', editingDepartment ? 'Department updated successfully.' : 'Department created successfully.');
    } catch (error) {
      openNotice(
        'Save failed',
        extractApiMessage(
          error,
          'Failed to save department. Complete your company profile in Company Settings and try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setName(department.name);
    setDescription(department.description);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setPendingDeleteDepartmentId(id);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setPendingDeleteDepartmentId(null);
  };

  const confirmDeleteDepartment = async () => {
    if (!pendingDeleteDepartmentId) return;

    try {
      await axios.delete(`${apiBase}/hr/departments/${pendingDeleteDepartmentId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      await fetchDepartments();
      closeConfirm();
    } catch (error) {
      openNotice('Delete failed', extractApiMessage(error, 'Failed to delete department. Please try again.'));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl" />
      </div>

      <nav className="relative z-10 bg-white/85 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/hrm')}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to HRM
          </button>
          <div className="inline-flex items-center gap-2 text-gray-900 font-semibold">
            <Building2 className="h-5 w-5 text-blue-600" />
            Department Management
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-3xl border border-white/80 bg-white/90 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-6 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Human resources</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Departments</h1>
              <p className="text-sm text-blue-50 mt-1">Organize teams and structure before assigning employees.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-center min-w-[100px]">
                <p className="text-2xl font-extrabold text-white">{departments.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-blue-100">Total</p>
              </div>
              <button
                type="button"
                onClick={openCreateForm}
                disabled={!canManageDepartments}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                <Plus className="h-4 w-4" />
                Add department
              </button>
            </div>
          </div>
        </div>

        {!canManageDepartments && companyProfileState !== 'loading' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">Company profile required</p>
                <p className="text-sm text-amber-800 mt-1">{companyProfileMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/company-settings')}
              className="shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition"
            >
              Open Company Settings
            </button>
          </div>
        )}

        {apiError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{apiError}</div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {editingDepartment ? 'Edit department' : 'Add department'}
                    </h3>
                    <p className="text-white/85 text-sm mt-1">
                      {editingDepartment ? 'Update department details' : 'Create a department for your company'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl text-white hover:bg-white/30"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Department name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-5 py-2.5 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold disabled:opacity-50"
                    >
                      {loading ? 'Saving…' : editingDepartment ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={closeConfirm} />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-900">Confirm delete</h3>
              <p className="mt-2 text-sm text-gray-700">Are you sure you want to delete this department?</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={closeConfirm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">
                  Cancel
                </button>
                <button type="button" onClick={confirmDeleteDepartment} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {noticeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/30" onClick={closeNotice} />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-900">{noticeTitle}</h3>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">{noticeMessage}</p>
              <div className="mt-5 flex justify-end gap-2">
                {(noticeTitle === 'Save failed' || noticeTitle === 'Company profile required') &&
                  !canManageDepartments && (
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/company-settings')}
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Company Settings
                    </button>
                  )}
                <button type="button" onClick={closeNotice} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">Department list</h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search departments…"
                className={`${inputClass} pl-10 py-2.5`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                      {searchTerm ? 'No departments match your search.' : 'No departments yet.'}
                    </td>
                  </tr>
                ) : (
                  paginatedDepartments.map((department) => (
                    <tr key={department.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{department.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{department.description || 'No description'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(department.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(department)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(department.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:border-rose-300 hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-600">
              Showing {filteredDepartments.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredDepartments.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
