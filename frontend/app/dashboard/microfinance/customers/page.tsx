'use client';

import axios from 'axios';
import { getApiBaseUrl, getBackendOrigin } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Customer = {
  id: number;
  branch_id?: number | string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  customer_code?: string;
  phone?: string;
  contact_number?: string;
  email?: string;
  nic_passport?: string;
  permanent_address?: string;
  current_address?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | string;
  nationality?: string;
  employment_type?: 'salaried' | 'self_employed' | 'business' | string;
  employer_name?: string;
  job_title?: string;
  monthly_income?: number | string;
  other_income_sources?: string;
  existing_loans?: boolean;
  monthly_loan_obligations?: number | string;
  credit_score?: number | string;
  status?: string;
};

type AuthUser = {
  id: number;
  branch_id?: number | null;
  designation?: { id: number; name: string } | null;
};

const API_BASE = getApiBaseUrl();

export default function MicrofinanceCustomersPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingWidgets, setLoadingWidgets] = useState(true);
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    nic_passport: '',
    email: '',
    date_of_birth: '',
    gender: 'other',
    marital_status: '',
    nationality: '',
    permanent_address: '',
    current_address: '',
    employment_type: '',
    employer_name: '',
    job_title: '',
    monthly_income: '',
    other_income_sources: '',
    existing_loans: false,
    monthly_loan_obligations: '',
    credit_score: '',
    status: 'active',
  });

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
    [token]
  );

  const designationName = String(authUser?.designation?.name || '').toLowerCase();
  const isFieldOfficer = designationName.includes('field') && designationName.includes('officer');

  const fetchWidgetPreferences = async (authToken: string) => {
    setLoadingWidgets(true);
    try {
      const response = await axios.get(`${API_BASE}/dashboard/widgets`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });
      const rows = Array.isArray(response.data?.widgets) ? response.data.widgets : [];
      const nextHidden = new Set<string>();
      for (const row of rows) {
        const key = String(row?.widget_key || '').trim();
        if (!key.startsWith('mf_customers_widget_')) continue;
        if (row?.is_visible === false) nextHidden.add(key);
      }
      setHiddenWidgetKeys(nextHidden);
    } catch {
      setHiddenWidgetKeys(new Set());
    } finally {
      setLoadingWidgets(false);
    }
  };

  const saveWidgetPreference = async (widgetKey: string, isVisible: boolean) => {
    if (!token) return false;
    try {
      await axios.patch(
        `${API_BASE}/dashboard/widgets`,
        { widget_key: widgetKey, is_visible: isVisible },
        { headers }
      );
      return true;
    } catch {
      return false;
    }
  };

  const hideWidget = async (widgetKey: string) => {
    const previous = new Set(hiddenWidgetKeys);
    const next = new Set(hiddenWidgetKeys);
    next.add(widgetKey);
    setHiddenWidgetKeys(next);

    const ok = await saveWidgetPreference(widgetKey, false);
    if (!ok) {
      setHiddenWidgetKeys(previous);
      setWidgetNotice({
        open: true,
        title: 'Widget Update Failed',
        message: 'Failed to hide this card. Please try again.',
      });
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
    void fetchWidgetPreferences(storedToken);

    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setAuthUser(JSON.parse(storedUser));
      } catch {
        setAuthUser(null);
      }
    }
  }, [router]);

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return customers.filter((customer) => {
      if (statusFilter !== 'all' && (customer.status || '').toLowerCase() !== statusFilter) {
        return false;
      }

      if (!keyword) return true;

      const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      const haystack = [
        customer.full_name || '',
        customer.name || '',
        fullName,
        customer.customer_code || '',
        customer.nic_passport || '',
        customer.phone || customer.contact_number || '',
        customer.current_address || '',
        customer.permanent_address || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [customers, query, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);

  const activeCount = useMemo(
    () => customers.filter((c) => (c.status || '').toLowerCase() === 'active').length,
    [customers]
  );

  const summaryCards = [
    {
      key: 'mf_customers_widget_total_customers',
      label: 'Total Customers',
      value: String(customers.length),
      valueClass: 'text-amber-600',
      borderClass: 'border-amber-100',
    },
    {
      key: 'mf_customers_widget_active_customers',
      label: 'Active Customers',
      value: String(activeCount),
      valueClass: 'text-cyan-600',
      borderClass: 'border-cyan-100',
    },
    {
      key: 'mf_customers_widget_showing_range',
      label: 'Showing',
      value:
        filteredCustomers.length === 0
          ? '0'
          : `${startIndex + 1}-${Math.min(startIndex + pageSize, filteredCustomers.length)}`,
      valueClass: 'text-blue-600',
      borderClass: 'border-blue-100',
    },
  ];

  const visibleSummaryCards = summaryCards.filter((card) => !hiddenWidgetKeys.has(card.key));
  const showFiltersPanel = !hiddenWidgetKeys.has('mf_customers_widget_filters_panel');
  const showExportButtons = !hiddenWidgetKeys.has('mf_customers_widget_export_buttons');
  const showPaginationControls = !hiddenWidgetKeys.has('mf_customers_widget_pagination_controls');

  const exportRows = useMemo(
    () =>
      filteredCustomers.map((customer) => {
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        return {
          id: customer.id,
          name: customer.full_name || customer.name || fullName || `Customer #${customer.id}`,
          customerNo: customer.customer_code || '',
          nic: customer.nic_passport || '',
          phone: customer.phone || customer.contact_number || '',
          status: customer.status || '',
          address: customer.current_address || customer.permanent_address || '',
        };
      }),
    [filteredCustomers]
  );

  const downloadCsv = () => {
    if (exportRows.length === 0) return;

    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '');
      if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const headersRow = ['ID', 'Customer Name', 'Customer No', 'NIC', 'Phone', 'Address', 'Status'];
    const bodyRows = exportRows.map((row) => [
      row.id,
      row.name,
      row.customerNo,
      row.nic,
      row.phone,
      row.address,
      row.status,
    ]);

    const csvContent = [headersRow, ...bodyRows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `microfinance-customers-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (exportRows.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const stamp = new Date().toISOString().slice(0, 10);

    doc.setFontSize(14);
    doc.text('Microfinance Customers', 40, 36);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Export Date: ${stamp}`, 40, 52);

    autoTable(doc, {
      startY: 64,
      head: [['ID', 'Customer Name', 'Customer No', 'NIC', 'Phone', 'Address', 'Status']],
      body: exportRows.map((row) => [
        row.id,
        row.name,
        row.customerNo,
        row.nic,
        row.phone,
        row.address,
        row.status,
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      margin: { left: 26, right: 26 },
    });

    doc.save(`microfinance-customers-${stamp}.pdf`);
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/customers`, {
        headers,
        params:
          isFieldOfficer && authUser?.branch_id
            ? { per_page: 1000, branch_id: authUser.branch_id }
            : { per_page: 1000 },
      });

      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      const scopedRows =
        isFieldOfficer && authUser?.branch_id
          ? rows.filter((row: Customer) => Number(row.branch_id || 0) === Number(authUser.branch_id || 0))
          : rows;

      setCustomers(scopedRows);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadCustomers();
  }, [token, isFieldOfficer, authUser?.branch_id]);

  const openProfileModal = async (customerId: number) => {
    setSelectedCustomerId(customerId);
    setProfileModalOpen(true);
    setProfileLoading(true);
    setProfileError('');

    try {
      const response = await axios.get(`${API_BASE}/customers/${customerId}`, { headers });
      const c = response.data || {};

      setProfileForm({
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        phone: c.phone || '',
        nic_passport: c.nic_passport || '',
        email: c.email || '',
        date_of_birth: c.date_of_birth ? String(c.date_of_birth).slice(0, 10) : '',
        gender: c.gender || 'other',
        marital_status: c.marital_status || '',
        nationality: c.nationality || '',
        permanent_address: c.permanent_address || '',
        current_address: c.current_address || '',
        employment_type: c.employment_type || '',
        employer_name: c.employer_name || '',
        job_title: c.job_title || '',
        monthly_income: c.monthly_income ?? '',
        other_income_sources: c.other_income_sources || '',
        existing_loans: Boolean(c.existing_loans),
        monthly_loan_obligations: c.monthly_loan_obligations ?? '',
        credit_score: c.credit_score ?? '',
        status: c.status || 'active',
      });
    } catch {
      setProfileError('Failed to load customer details.');
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setSelectedCustomerId(null);
    setProfileError('');
  };

  const handleProfileSave = async () => {
    if (!selectedCustomerId) return;

    setProfileSaving(true);
    setProfileError('');

    try {
      await axios.put(
        `${API_BASE}/customers/${selectedCustomerId}`,
        {
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          phone: profileForm.phone,
          nic_passport: profileForm.nic_passport,
          email: profileForm.email || null,
          date_of_birth: profileForm.date_of_birth || null,
          gender: profileForm.gender,
          marital_status: profileForm.marital_status || null,
          nationality: profileForm.nationality || null,
          permanent_address: profileForm.permanent_address,
          current_address: profileForm.current_address || null,
          employment_type: profileForm.employment_type || null,
          employer_name: profileForm.employer_name || null,
          job_title: profileForm.job_title || null,
          monthly_income: profileForm.monthly_income === '' ? null : Number(profileForm.monthly_income),
          other_income_sources: profileForm.other_income_sources || null,
          existing_loans: profileForm.existing_loans,
          monthly_loan_obligations:
            profileForm.monthly_loan_obligations === ''
              ? null
              : Number(profileForm.monthly_loan_obligations),
          credit_score: profileForm.credit_score === '' ? null : Number(profileForm.credit_score),
          status: profileForm.status || null,
        },
        { headers }
      );

      await loadCustomers();
      closeProfileModal();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to update customer profile.';
      setProfileError(message);
    } finally {
      setProfileSaving(false);
    }
  };

  if (!token || loading || loadingWidgets) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Microfinance Customers</h1>
            <p className="text-sm text-gray-600 mt-1">Manage customer profiles and quickly review key details.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/microfinance')}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
          >
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleSummaryCards.map((card) => (
            <div key={card.key} className={`relative rounded-xl bg-white/85 border ${card.borderClass} shadow-sm p-4`}>
              <WidgetCloseGate>
<button
                type="button"
                onClick={() => void hideWidget(card.key)}
                className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                aria-label={`Hide ${card.label} card`}
              >
                ×
              </button>
</WidgetCloseGate>
              <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.valueClass}`}>{card.value}</p>
            </div>
          ))}
        </div>
        {visibleSummaryCards.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            All customer summary cards are hidden. Restore from dashboard with admin approval.
          </div>
        )}

        {showFiltersPanel && (
          <div className="relative bg-white/90 rounded-2xl shadow-lg border border-amber-100 p-5 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 text-black">
            <WidgetCloseGate>
<button
              type="button"
              onClick={() => void hideWidget('mf_customers_widget_filters_panel')}
              className="absolute right-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide filter controls widget"
            >
              ×
            </button>
</WidgetCloseGate>
            <input
              className="px-3 py-2 rounded-lg border border-amber-100 text-sm"
              placeholder="Search name / NIC / code / phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="px-3 py-2 rounded-lg border border-amber-100 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
            <div className="md:col-span-1 lg:col-span-2"></div>
            <div className="flex items-center gap-2 justify-start lg:justify-end">
              <label className="text-sm text-gray-600">Rows:</label>
              <select
                className="px-2 py-1 rounded-md border border-amber-100 text-sm"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>
        )}
        {!showFiltersPanel && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Filter controls are hidden. Restore from dashboard with admin approval.
          </div>
        )}

        {showExportButtons && (
          <div className="relative flex flex-wrap items-center justify-end gap-2">
            <WidgetCloseGate>
<button
              type="button"
              onClick={() => void hideWidget('mf_customers_widget_export_buttons')}
              className="absolute -top-3 left-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide export buttons widget"
            >
              ×
            </button>
</WidgetCloseGate>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={exportRows.length === 0}
              className="px-3 py-2 rounded-lg border border-amber-200 bg-white text-amber-700 text-sm font-semibold hover:bg-amber-50 disabled:opacity-50"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={exportRows.length === 0}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
            >
              Download PDF
            </button>
          </div>
        )}
        {!showExportButtons && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Export buttons are hidden. Restore from dashboard with admin approval.
          </div>
        )}

        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-600">
            No customers found for current filters.
          </div>
        ) : (
          <div className="bg-white/90 rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-700">
                <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Customer Name</th>
                    <th className="px-4 py-3 font-semibold">Customer No</th>
                    <th className="px-4 py-3 font-semibold">NIC</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Address</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((customer) => {
                    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
                    const displayName = customer.full_name || customer.name || fullName || `Customer #${customer.id}`;
                    const phone = customer.phone || customer.contact_number || 'N/A';
                    const address = customer.current_address || customer.permanent_address || 'N/A';
                    const status = (customer.status || 'unknown').toLowerCase();

                    return (
                      <tr key={customer.id} className="border-b border-amber-100 last:border-b-0 hover:bg-amber-50/40">
                        <td className="px-4 py-3 font-medium text-gray-900">{customer.id}</td>
                        <td className="px-4 py-3">{displayName}</td>
                        <td className="px-4 py-3">{customer.customer_code || 'N/A'}</td>
                        <td className="px-4 py-3">{customer.nic_passport || 'N/A'}</td>
                        <td className="px-4 py-3">{phone}</td>
                        <td className="px-4 py-3 min-w-[220px]">{address}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold ${
                              status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : status === 'inactive'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => openProfileModal(customer.id)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:from-amber-600 hover:to-orange-600"
                          >
                            Complete Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredCustomers.length > 0 && showPaginationControls && (
          <div className="relative flex items-center justify-center gap-2 pt-2">
            <WidgetCloseGate>
<button
              type="button"
              onClick={() => void hideWidget('mf_customers_widget_pagination_controls')}
              className="absolute left-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
              aria-label="Hide pagination controls widget"
            >
              ×
            </button>
</WidgetCloseGate>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg border border-amber-100 bg-white text-sm text-gray-700 disabled:opacity-50"
            >
              Prev
            </button>

            <span className="px-3 py-1.5 rounded-lg bg-white border border-amber-100 text-sm text-gray-700">
              Page {safePage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-amber-100 bg-white text-sm text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
        {filteredCustomers.length > 0 && !showPaginationControls && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Pagination controls are hidden. Restore from dashboard with admin approval.
          </div>
        )}

        {profileModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
            <div className="w-full max-w-5xl mx-auto rounded-3xl bg-white shadow-[0_25px_80px_-30px_rgba(15,23,42,0.7)] border border-amber-200 overflow-hidden">
              <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 px-6 py-6 text-white">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl"></div>
                <div className="absolute left-16 -bottom-10 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/80">Microfinance Customer Desk</p>
                    <h3 className="text-2xl font-extrabold mt-1">Complete Customer Profile</h3>
                    <p className="text-sm text-white/85 mt-1">Fill missing fields and keep the profile complete for approvals and collections.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-semibold border border-white/30"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-5 md:p-6 max-h-[72vh] overflow-y-auto bg-gradient-to-b from-amber-50/30 to-white">

              {profileLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
                </div>
              ) : (
                <>
                  {profileError && (
                    <div className="mt-1 mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {profileError}
                    </div>
                  )}

                  <div className="space-y-4 text-black">
                    <div className="rounded-2xl border border-amber-100 bg-white p-4">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-amber-700">Basic Information</h4>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">First Name</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.first_name} onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Last Name</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.last_name} onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Customer Phone</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">NIC / Passport</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.nic_passport} onChange={(e) => setProfileForm((p) => ({ ...p, nic_passport: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Email</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Date of Birth</label>
                          <input type="date" className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.date_of_birth} onChange={(e) => setProfileForm((p) => ({ ...p, date_of_birth: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Gender</label>
                          <select className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.gender} onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))}>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Marital Status</label>
                          <select className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.marital_status} onChange={(e) => setProfileForm((p) => ({ ...p, marital_status: e.target.value }))}>
                            <option value="">Select</option>
                            <option value="single">Single</option>
                            <option value="married">Married</option>
                            <option value="divorced">Divorced</option>
                            <option value="widowed">Widowed</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Nationality</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.nationality} onChange={(e) => setProfileForm((p) => ({ ...p, nationality: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Status</label>
                          <select className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200" value={profileForm.status} onChange={(e) => setProfileForm((p) => ({ ...p, status: e.target.value }))}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="blacklisted">Blacklisted</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-cyan-700">Address Information</h4>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold uppercase text-slate-600">Permanent Address</label>
                          <textarea className="mt-1 w-full px-3 py-2 rounded-xl border border-cyan-100 bg-cyan-50/30 focus:outline-none focus:ring-2 focus:ring-cyan-200" rows={2} value={profileForm.permanent_address} onChange={(e) => setProfileForm((p) => ({ ...p, permanent_address: e.target.value }))}></textarea>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold uppercase text-slate-600">Current Address</label>
                          <textarea className="mt-1 w-full px-3 py-2 rounded-xl border border-cyan-100 bg-cyan-50/30 focus:outline-none focus:ring-2 focus:ring-cyan-200" rows={2} value={profileForm.current_address} onChange={(e) => setProfileForm((p) => ({ ...p, current_address: e.target.value }))}></textarea>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-white p-4">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-indigo-700">Employment & Finance</h4>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Employment Type</label>
                          <select className="mt-1 w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={profileForm.employment_type} onChange={(e) => setProfileForm((p) => ({ ...p, employment_type: e.target.value }))}>
                            <option value="">Select</option>
                            <option value="salaried">Salaried</option>
                            <option value="self_employed">Self Employed</option>
                            <option value="business">Business</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Employer Name</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={profileForm.employer_name} onChange={(e) => setProfileForm((p) => ({ ...p, employer_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Job Title</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={profileForm.job_title} onChange={(e) => setProfileForm((p) => ({ ...p, job_title: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Monthly Income</label>
                          <input type="number" min="0" step="0.01" className="mt-1 w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={profileForm.monthly_income} onChange={(e) => setProfileForm((p) => ({ ...p, monthly_income: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Other Income Sources</label>
                          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={profileForm.other_income_sources} onChange={(e) => setProfileForm((p) => ({ ...p, other_income_sources: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Monthly Loan Obligations</label>
                          <input type="number" min="0" step="0.01" className="mt-1 w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={profileForm.monthly_loan_obligations} onChange={(e) => setProfileForm((p) => ({ ...p, monthly_loan_obligations: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-slate-600">Credit Score</label>
                          <input type="number" min="0" step="1" className="mt-1 w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={profileForm.credit_score} onChange={(e) => setProfileForm((p) => ({ ...p, credit_score: e.target.value }))} />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-2">
                          <input
                            id="existing_loans"
                            type="checkbox"
                            checked={profileForm.existing_loans}
                            onChange={(e) => setProfileForm((p) => ({ ...p, existing_loans: e.target.checked }))}
                            className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor="existing_loans" className="text-sm text-slate-700">Customer has existing loans</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 mt-5 bg-white/95 backdrop-blur-sm border-t border-amber-100 pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeProfileModal}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleProfileSave}
                      disabled={profileSaving || profileLoading}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold disabled:opacity-60 shadow-lg shadow-amber-300/40"
                    >
                      {profileSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        )}

        {widgetNotice.open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
              onClick={() => setWidgetNotice({ open: false, title: '', message: '' })}
            />
            <div className="relative w-full max-w-sm rounded-2xl border border-amber-100 bg-white p-5 shadow-xl">
              <h3 className="text-base font-bold text-slate-900">{widgetNotice.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{widgetNotice.message}</p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWidgetNotice({ open: false, title: '', message: '' })}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
