'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

type Company = {
  id: number;
  name: string;
  email: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  country?: string | null;
  currency?: string | null;
};

type CompanyTemplate = {
  id: number;
  template_type:
    | 'loan_agreement'
    | 'reminder_letter'
    | 'arrears_letter'
    | 'mortgage_agreement'
    | 'mortgage_reminder'
    | 'mortgage_legal_letter';
  original_name: string;
  is_active: boolean;
  created_at?: string;
  file_url?: string;
};

export default function CompanySettingsPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [templates, setTemplates] = useState<CompanyTemplate[]>([]);
  const [templateType, setTemplateType] = useState<CompanyTemplate['template_type']>('loan_agreement');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backingUpDatabase, setBackingUpDatabase] = useState(false);
  const [systemOnline, setSystemOnline] = useState(true);
  const [systemStatusLoading, setSystemStatusLoading] = useState(false);
  const [updatingSystemStatus, setUpdatingSystemStatus] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showResetCredentialsModal, setShowResetCredentialsModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resettingSystem, setResettingSystem] = useState(false);
  const [resetCredentials, setResetCredentials] = useState<{ email: string; password: string } | null>(null);
  const [deleteTemplateModal, setDeleteTemplateModal] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: '',
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const loadFormFromCompany = (company: Company | null) => {
    setName(company?.name || '');
    setEmail(company?.email || '');
    setAddress(company?.address || '');
    setPhone(company?.phone || '');
    setWebsite(company?.website || '');
    setCountry(company?.country || '');
    setCurrency(company?.currency || '');
  };

  const templateLabel = (type: CompanyTemplate['template_type']) => {
    if (type === 'loan_agreement') return 'Loan Agreement';
    if (type === 'reminder_letter') return 'Reminder Letter';
    if (type === 'arrears_letter') return 'Arrears Letter';
    if (type === 'mortgage_agreement') return 'Mortgage Agreement';
    if (type === 'mortgage_reminder') return 'Mortgage Reminder';
    return 'Mortgage Legal Letter';
  };

  const fetchTemplates = async (authToken: string, companyId: number) => {
    try {
      const response = await axios.get(`${API_URL}/api/companies/${companyId}/document-templates`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const rows = Array.isArray(response.data) ? response.data : [];
      setTemplates(rows);
    } catch {
      setTemplates([]);
    }
  };

  const fetchCompanies = async (authToken: string) => {
    setLoading(true);
    setNotice(null);

    try {
      const response = await axios.get(`${API_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setCompanies(rows);

      if (rows.length > 0) {
        const firstId = Number(rows[0].id);
        setSelectedCompanyId(firstId);
        loadFormFromCompany(rows[0]);
        await fetchTemplates(authToken, firstId);
      } else {
        setSelectedCompanyId(null);
        loadFormFromCompany(null);
        setTemplates([]);
      }
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.response?.data?.message || 'Failed to load company settings.' });
      setCompanies([]);
      setSelectedCompanyId(null);
      loadFormFromCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchCompanies(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchSystemStatus = async (authToken: string) => {
    setSystemStatusLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/system/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      setSystemOnline(Boolean(response.data?.is_online));
    } catch {
      // Ignore status fetch errors for non-admin users or unavailable endpoint.
    } finally {
      setSystemStatusLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchSystemStatus(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onCompanyChange = (companyId: number) => {
    setSelectedCompanyId(companyId);
    const company = companies.find((item) => item.id === companyId) || null;
    loadFormFromCompany(company);
    if (token && companyId) {
      fetchTemplates(token, companyId);
    } else {
      setTemplates([]);
    }
    setNotice(null);
  };

  const handleTemplateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCompanyId || !templateFile) {
      setNotice({ type: 'error', text: 'Select company, template type, and .docx file first.' });
      return;
    }

    setUploadingTemplate(true);
    setNotice(null);

    const formData = new FormData();
    formData.append('template_type', templateType);
    formData.append('template', templateFile);

    try {
      await axios.post(`${API_URL}/api/companies/${selectedCompanyId}/document-templates`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      await fetchTemplates(token, selectedCompanyId);
      setTemplateFile(null);
      setNotice({ type: 'success', text: `${templateLabel(templateType)} template uploaded successfully.` });
    } catch (error: any) {
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors) {
        const message = Object.values(validationErrors).flat().join(' ');
        setNotice({ type: 'error', text: message || 'Template upload failed.' });
      } else {
        setNotice({ type: 'error', text: error?.response?.data?.message || 'Template upload failed.' });
      }
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleTemplateView = async (templateId: number) => {
    if (!token || !selectedCompanyId) {
      setNotice({ type: 'error', text: 'Company or session is missing.' });
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/companies/${selectedCompanyId}/document-templates/${templateId}/view`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.response?.data?.message || 'Unable to open template file.' });
    }
  };

  const handleTemplateDelete = async (templateId: number) => {
    if (!token || !selectedCompanyId) {
      setNotice({ type: 'error', text: 'Company or session is missing.' });
      return;
    }

    setDeletingTemplateId(templateId);
    try {
      await axios.delete(
        `${API_URL}/api/companies/${selectedCompanyId}/document-templates/${templateId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await fetchTemplates(token, selectedCompanyId);
      setNotice({ type: 'success', text: 'Template deleted successfully.' });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.response?.data?.message || 'Failed to delete template.' });
    } finally {
      setDeletingTemplateId(null);
      setDeleteTemplateModal({ open: false, id: null, name: '' });
    }
  };

  const handleGetBackup = async () => {
    if (!token || !selectedCompanyId) {
      setNotice({ type: 'error', text: 'Please select a company first.' });
      return;
    }

    setBackingUp(true);
    setNotice(null);

    try {
      const response = await axios.get(`${API_URL}/api/companies/${selectedCompanyId}/backup`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/zip',
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const serverFileName = decodeURIComponent(fileNameMatch?.[1] || fileNameMatch?.[2] || '');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = serverFileName || `company_backup_${selectedCompanyId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setNotice({ type: 'success', text: 'Company backup downloaded successfully.' });
    } catch (error: any) {
      let message = 'Failed to download company backup.';
      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          // Keep default error
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      setNotice({ type: 'error', text: message });
    } finally {
      setBackingUp(false);
    }
  };

  const handleGetDatabaseBackup = async () => {
    if (!token || !selectedCompanyId) {
      setNotice({ type: 'error', text: 'Please select a company first.' });
      return;
    }

    setBackingUpDatabase(true);
    setNotice(null);

    try {
      const response = await axios.get(`${API_URL}/api/companies/${selectedCompanyId}/database-backup`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/sql',
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const serverFileName = decodeURIComponent(fileNameMatch?.[1] || fileNameMatch?.[2] || '');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = serverFileName || `database_backup_${selectedCompanyId}.sql`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setNotice({ type: 'success', text: 'Database backup downloaded successfully.' });
    } catch (error: any) {
      let message = 'Failed to download database backup.';
      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          // Keep default error
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      setNotice({ type: 'error', text: message });
    } finally {
      setBackingUpDatabase(false);
    }
  };

  const handleSetSystemStatus = async (nextOnline: boolean) => {
    if (!token) {
      setNotice({ type: 'error', text: 'Session is missing. Please login again.' });
      return;
    }

    setUpdatingSystemStatus(true);
    setNotice(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/system/status`,
        { is_online: nextOnline },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSystemOnline(Boolean(response.data?.is_online));
      setNotice({ type: 'success', text: response.data?.message || 'System status updated.' });
    } catch (error: any) {
      let message = 'Failed to update system status.';
      const responseData = error?.response?.data;
      if (responseData?.message) {
        message = responseData.message;
      }
      setNotice({ type: 'error', text: message });
    } finally {
      setUpdatingSystemStatus(false);
    }
  };

  const handleResetSystem = async () => {
    if (!token) {
      setNotice({ type: 'error', text: 'Session is missing. Please login again.' });
      return;
    }

    setResettingSystem(true);
    setNotice(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/system/reset`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const superAdmin = response.data?.super_admin || {};
      const emailValue = String(superAdmin?.email || 'superadmin@softcodelk.com');
      const passwordValue = String(superAdmin?.password || '');

      setResetCredentials({ email: emailValue, password: passwordValue });
      setShowResetConfirmModal(false);
      setResetConfirmText('');
      setShowResetCredentialsModal(true);
      setNotice({ type: 'success', text: 'System reset completed. Please store the new Super Admin credentials.' });
    } catch (error: any) {
      let message = 'Failed to reset system.';
      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          // Keep default error
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      setNotice({ type: 'error', text: message });
    } finally {
      setResettingSystem(false);
    }
  };

  const copyResetCredential = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ type: 'success', text: `${label} copied to clipboard.` });
    } catch {
      setNotice({ type: 'error', text: `Failed to copy ${label.toLowerCase()}.` });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setNotice(null);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      country: country.trim() || null,
      currency: currency.trim() || null,
    };

    try {
      if (selectedCompany) {
        const response = await axios.put(`${API_URL}/api/companies/${selectedCompany.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const updated = response.data as Company;
        const nextCompanies = companies.map((company) => (company.id === updated.id ? { ...company, ...updated } : company));
        setCompanies(nextCompanies);
        const refreshed = nextCompanies.find((company) => company.id === updated.id) || null;
        loadFormFromCompany(refreshed);
        setNotice({ type: 'success', text: 'Company details updated successfully.' });
      } else {
        const response = await axios.post(`${API_URL}/api/companies`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const created = response.data as Company;
        const nextCompanies = [created, ...companies];
        setCompanies(nextCompanies);
        setSelectedCompanyId(created.id);
        loadFormFromCompany(created);
        setNotice({ type: 'success', text: 'Company created successfully.' });
      }
    } catch (error: any) {
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors) {
        const message = Object.values(validationErrors).flat().join(' ');
        setNotice({ type: 'error', text: message || 'Validation failed.' });
      } else {
        setNotice({ type: 'error', text: error?.response?.data?.message || 'Failed to save company details.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
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

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
                Settings
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Company Settings</h1>
              <p className="text-sm text-slate-600 mt-1">Update company profile details used across the system.</p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleSetSystemStatus(!systemOnline)}
              disabled={systemStatusLoading || updatingSystemStatus}
              className={`px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed ${
                systemOnline
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                  : 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800'
              }`}
            >
              {systemStatusLoading
                ? 'Checking System...'
                : updatingSystemStatus
                  ? 'Updating System...'
                  : systemOnline
                    ? 'Set System Offline'
                    : 'Set System Online'}
            </button>
            <button
              type="button"
              onClick={handleGetBackup}
              disabled={backingUp || !selectedCompanyId}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {backingUp ? 'Preparing Backup...' : 'Get Backup'}
            </button>
            <button
              type="button"
              onClick={handleGetDatabaseBackup}
              disabled={backingUpDatabase || !selectedCompanyId}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {backingUpDatabase ? 'Preparing DB Backup...' : 'Get Database Backup'}
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirmModal(true)}
              disabled={resettingSystem}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resettingSystem ? 'Resetting System...' : 'Reset System'}
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-600">
            System Status:{' '}
            <span className={systemOnline ? 'text-emerald-700' : 'text-rose-700'}>
              {systemOnline ? 'ONLINE' : 'OFFLINE (Admins only)'}
            </span>
          </p>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.45)] p-5">
          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select Company</label>
                  <select
                    value={selectedCompanyId ?? ''}
                    onChange={(e) => onCompanyChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    disabled={companies.length === 0}
                  >
                    {companies.length === 0 ? (
                      <option value="">No company found - create first</option>
                    ) : (
                      companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Currency</label>
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="LKR"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : selectedCompany ? 'Update Company' : 'Create Company'}
                  </button>
                </div>
              </form>

              <div className="h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />

              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Documentation Templates</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Upload company .docx templates. On final loan approval, system generates Loan Agreement by replacing placeholders.
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Supported placeholders: customer_name, customer_no, issue_date, installment, principal, total_payable, loan_product, request_no, company_name.
                  </p>
                </div>

                <form onSubmit={handleTemplateUpload} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Template Type</label>
                    <select
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value as CompanyTemplate['template_type'])}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="loan_agreement">Loan Agreement</option>
                      <option value="reminder_letter">Reminder Letter</option>
                      <option value="arrears_letter">Arrears Letter</option>
                      <option value="mortgage_agreement">Mortgage Agreement</option>
                      <option value="mortgage_reminder">Mortgage Reminder</option>
                      <option value="mortgage_legal_letter">Mortgage Legal Letter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Template File (.doc/.docx)</label>
                    <input
                      type="file"
                      accept=".doc,.docx"
                      onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>

                  <div className="md:justify-self-end">
                    <button
                      type="submit"
                      disabled={uploadingTemplate}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {uploadingTemplate ? 'Uploading...' : 'Upload Template'}
                    </button>
                  </div>
                </form>

                <div className="rounded-xl border border-cyan-100 overflow-hidden">
                  <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                    <thead className="bg-cyan-50/70 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">File</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Uploaded</th>
                        <th className="px-3 py-2 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                            No templates uploaded yet.
                          </td>
                        </tr>
                      ) : (
                        templates.map((item) => (
                          <tr key={item.id} className="border-t border-cyan-100">
                            <td className="px-3 py-2">{templateLabel(item.template_type)}</td>
                            <td className="px-3 py-2">{item.original_name}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  item.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {item.is_active ? 'Active' : 'Archived'}
                              </span>
                            </td>
                            <td className="px-3 py-2">{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleTemplateView(item.id)}
                                  className="text-cyan-700 font-semibold hover:underline"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTemplateModal({
                                      open: true,
                                      id: item.id,
                                      name: item.original_name,
                                    })
                                  }
                                  disabled={deletingTemplateId === item.id}
                                  className="text-red-600 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deletingTemplateId === item.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {notice && (
            <div
              className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                notice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {notice.text}
            </div>
          )}
        </div>
      </div>

      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-[0_30px_70px_-30px_rgba(190,24,93,0.55)]">
            <h3 className="text-xl font-extrabold text-rose-700">Reset Entire System</h3>
            <p className="mt-3 text-sm text-slate-700">
              This action will permanently delete all records and uploaded files, rebuild the database, and create a fresh Super Admin account.
            </p>
            <p className="mt-2 text-sm font-semibold text-rose-700">Type RESET to continue.</p>

            <input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              className="mt-3 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-slate-900"
              placeholder="Type RESET"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (resettingSystem) return;
                  setShowResetConfirmModal(false);
                  setResetConfirmText('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetSystem}
                disabled={resettingSystem || resetConfirmText.trim().toUpperCase() !== 'RESET'}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resettingSystem ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetCredentialsModal && resetCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-emerald-200 bg-white p-6 shadow-[0_30px_70px_-30px_rgba(5,150,105,0.45)]">
            <h3 className="text-xl font-extrabold text-emerald-700">New Super Admin Credentials</h3>
            <p className="mt-3 text-sm text-slate-700">
              System reset completed. Use these credentials to sign in again.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] font-bold text-emerald-700">Email</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 break-all">{resetCredentials.email}</p>
                  <button
                    type="button"
                    onClick={() => copyResetCredential(resetCredentials.email, 'Email')}
                    className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-semibold text-emerald-700"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] font-bold text-amber-700">Password</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 break-all">{resetCredentials.password}</p>
                  <button
                    type="button"
                    onClick={() => copyResetCredential(resetCredentials.password, 'Password')}
                    className="px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-semibold text-amber-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetCredentialsModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('token');
                  setShowResetCredentialsModal(false);
                  router.push('/');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTemplateModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-[0_30px_70px_-30px_rgba(190,24,93,0.55)]">
            <h3 className="text-xl font-extrabold text-rose-700">Delete Template</h3>
            <p className="mt-3 text-sm text-slate-700">
              Are you sure you want to delete template "{deleteTemplateModal.name}"? This action cannot be undone and will also remove the stored file.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTemplateModal({ open: false, id: null, name: '' })}
                disabled={deletingTemplateId !== null}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTemplateModal.id !== null) {
                    handleTemplateDelete(deleteTemplateModal.id);
                  }
                }}
                disabled={deletingTemplateId !== null}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deletingTemplateId !== null ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
