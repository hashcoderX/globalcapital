'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Eye,
  FileText,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import CompanyAccountingPanel from '@/app/components/accounting/CompanyAccountingPanel';

type SettingsSection = 'profile' | 'accounting' | 'templates' | 'holidays' | 'system';

const inputClass =
  'w-full rounded-xl border border-cyan-200/80 bg-white px-3.5 py-2.5 text-sm text-black shadow-sm transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200/80 placeholder:text-slate-400 [color-scheme:light]';

const labelClass = 'block text-xs font-bold text-slate-700 mb-1.5';

const SECTION_TABS: { key: SettingsSection; label: string; icon: typeof Building2 }[] = [
  { key: 'profile', label: 'Company profile', icon: Building2 },
  { key: 'accounting', label: 'Company accounting', icon: Wallet },
  { key: 'templates', label: 'Document templates', icon: FileText },
  { key: 'holidays', label: 'Global holidays', icon: CalendarDays },
  { key: 'system', label: 'System admin', icon: Settings },
];

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

type MFHoliday = {
  id: number;
  holiday_date: string;
  name: string;
  note?: string | null;
  is_active: boolean;
};

export default function CompanySettingsPage() {
  const router = useRouter();

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
  const [resetPassword, setResetPassword] = useState('');
  const [resettingSystem, setResettingSystem] = useState(false);
  const [resetCredentials, setResetCredentials] = useState<{ email: string; password: string } | null>(null);
  const [deleteTemplateModal, setDeleteTemplateModal] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: '',
  });
  const [holidays, setHolidays] = useState<MFHoliday[]>([]);
  const [holidayForm, setHolidayForm] = useState({ id: 0, holiday_date: '', name: '', note: '', is_active: true });
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

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

  const activeTemplates = useMemo(
    () => templates.filter((item) => item.is_active).length,
    [templates]
  );

  const activeHolidays = useMemo(
    () => holidays.filter((item) => item.is_active).length,
    [holidays]
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

  const formatDate = (value?: string | null) => {
    const raw = String(value || '').slice(0, 10);
    if (!raw) return '-';
    const parsed = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return raw;
    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(parsed);
  };

  const resetHolidayForm = () => setHolidayForm({ id: 0, holiday_date: '', name: '', note: '', is_active: true });

  const fetchTemplates = async (authToken: string, companyId: number) => {
    try {
      const response = await axios.get(`/api/companies/${companyId}/document-templates`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const rows = Array.isArray(response.data) ? response.data : [];
      setTemplates(rows);
    } catch {
      setTemplates([]);
    }
  };

  const fetchHolidays = async (authToken: string) => {
    try {
      const response = await axios.get(`/api/microfinance/settings/holidays`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const rows = Array.isArray(response.data) ? response.data : [];
      setHolidays(rows);
    } catch {
      setHolidays([]);
    }
  };

  const fetchCompanies = async (authToken: string) => {
    setLoading(true);
    setNotice(null);

    try {
      const response = await axios.get(`/api/companies`, {
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
    fetchHolidays(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchSystemStatus = async (authToken: string) => {
    setSystemStatusLoading(true);
    try {
      const response = await axios.get(`/api/system/status`, {
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
      await axios.post(`/api/companies/${selectedCompanyId}/document-templates`, formData, {
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
        `/api/companies/${selectedCompanyId}/document-templates/${templateId}/view`,
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
        `/api/companies/${selectedCompanyId}/document-templates/${templateId}`,
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
      const response = await axios.get(`/api/companies/${selectedCompanyId}/backup`, {
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
      const response = await axios.get(`/api/companies/${selectedCompanyId}/database-backup`, {
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
        `/api/system/status`,
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
        `/api/system/reset`,
        { password: resetPassword },
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
      setResetPassword('');
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
        const response = await axios.put(`/api/companies/${selectedCompany.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const updated = response.data as Company;
        const nextCompanies = companies.map((company) => (company.id === updated.id ? { ...company, ...updated } : company));
        setCompanies(nextCompanies);
        const refreshed = nextCompanies.find((company) => company.id === updated.id) || null;
        loadFormFromCompany(refreshed);
        setNotice({ type: 'success', text: 'Company details updated successfully.' });
      } else {
        const response = await axios.post(`/api/companies`, payload, {
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

  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setHolidaySaving(true);
    setNotice(null);

    try {
      const payload = {
        holiday_date: holidayForm.holiday_date,
        name: holidayForm.name,
        note: holidayForm.note || null,
        is_active: holidayForm.is_active,
      };

      let message = 'Holiday saved successfully.';
      if (holidayForm.id) {
        const response = await axios.put(
          `/api/microfinance/settings/holidays/${holidayForm.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message = response.data?.message || message;
      } else {
        const response = await axios.post(`/api/microfinance/settings/holidays`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message = response.data?.message || message;
      }

      await fetchHolidays(token);
      resetHolidayForm();
      setNotice({ type: 'success', text: message });
    } catch (error: any) {
      setNotice({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save holiday. Date may already be marked.',
      });
    } finally {
      setHolidaySaving(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/60 to-indigo-50 p-4 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-20 left-0 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl" />
        <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-300/25 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl backdrop-blur-xl">
          <div className="bg-gradient-to-r from-slate-700 via-cyan-700 to-indigo-700 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                  <Settings className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100">Administration</p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">Company Settings</h1>
                  <p className="text-sm text-cyan-50/95 mt-1 max-w-2xl">
                    Manage company profile, document templates, global holidays, and system controls from one place.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (token) {
                      fetchCompanies(token);
                      fetchHolidays(token);
                      fetchSystemStatus(token);
                    }
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
              </div>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Companies', value: companies.length, sub: selectedCompany?.name || 'No company', icon: Building2, accent: 'from-cyan-500 to-blue-600' },
            { label: 'Templates', value: templates.length, sub: `${activeTemplates} active`, icon: FileText, accent: 'from-indigo-500 to-violet-600' },
            { label: 'Holidays', value: holidays.length, sub: `${activeHolidays} active`, icon: CalendarDays, accent: 'from-emerald-500 to-teal-600' },
            {
              label: 'System',
              value: systemStatusLoading ? '…' : systemOnline ? 'Online' : 'Offline',
              sub: systemOnline ? 'All users can sign in' : 'Admins only',
              icon: Power,
              accent: systemOnline ? 'from-emerald-500 to-green-600' : 'from-rose-500 to-red-600',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900 truncate">{item.value}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 truncate">{item.sub}</p>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notice */}
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

        {/* Section tabs */}
        <div className="rounded-3xl border border-white/80 bg-white/90 shadow-lg overflow-hidden">
          <div className="border-b border-slate-100 px-4 sm:px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {SECTION_TABS.map((tab) => {
                const active = activeSection === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveSection(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                      active
                        ? 'bg-gradient-to-r from-slate-700 to-cyan-700 text-white shadow-md'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600" />
                <p className="text-sm font-medium text-slate-600">Loading settings…</p>
              </div>
            ) : (
              <>
                {activeSection === 'profile' && (
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50/80 to-indigo-50/50 px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">Company profile</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Details shown on receipts, agreements, and reports across all modules.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Select company</label>
                        <select
                          value={selectedCompanyId ?? ''}
                          onChange={(e) => onCompanyChange(Number(e.target.value))}
                          className={inputClass}
                          disabled={companies.length === 0}
                        >
                          {companies.length === 0 ? (
                            <option value="">No company found — create first</option>
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
                        <label className={labelClass}>Company name *</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} pl-10`} required />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Email *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} pl-10`} required />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Phone</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} pl-10`} />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Website</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={`${inputClass} pl-10`} placeholder="https://example.com" />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Country</label>
                        <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
                      </div>

                      <div>
                        <label className={labelClass}>Currency</label>
                        <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass} placeholder="LKR" />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className={`${inputClass} pl-10`} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving…' : selectedCompany ? 'Update company' : 'Create company'}
                      </button>
                    </div>
                  </form>
                )}

                {activeSection === 'accounting' && (
                  <>
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-xs text-slate-600">Accounting is also available as a standalone module from the main dashboard.</p>
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/accounting/accounts')}
                        className="text-xs font-bold text-violet-700 hover:text-violet-900 whitespace-nowrap"
                      >
                        Open Accounting module →
                      </button>
                    </div>
                    <CompanyAccountingPanel
                      token={token}
                      companyId={selectedCompanyId}
                      currency={currency || 'LKR'}
                      onNotice={setNotice}
                      emptyMessage="Create a company profile first"
                    />
                  </>
                )}

                {activeSection === 'templates' && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-cyan-50/50 px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">Documentation templates</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Upload .docx templates. On loan approval, the system fills placeholders automatically.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2 font-mono">
                        Placeholders: customer_name, customer_no, issue_date, installment, principal, total_payable, loan_product, request_no, company_name
                      </p>
                    </div>

                    <form onSubmit={handleTemplateUpload} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end rounded-2xl border border-cyan-100 bg-slate-50/50 p-4">
                      <div>
                        <label className={labelClass}>Template type</label>
                        <select
                          value={templateType}
                          onChange={(e) => setTemplateType(e.target.value as CompanyTemplate['template_type'])}
                          className={inputClass}
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
                        <label className={labelClass}>Template file (.doc / .docx)</label>
                        <input
                          type="file"
                          accept=".doc,.docx"
                          onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-cyan-800`}
                        />
                      </div>

                      <div className="lg:justify-self-end">
                        <button
                          type="submit"
                          disabled={uploadingTemplate}
                          className="inline-flex w-full lg:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingTemplate ? 'Uploading…' : 'Upload template'}
                        </button>
                      </div>
                    </form>

                    <div className="overflow-x-auto rounded-2xl border border-cyan-100">
                      <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                        <thead className="bg-cyan-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">File</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Uploaded</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-50">
                          {templates.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center">
                                <FileText className="h-8 w-8 text-cyan-400 mx-auto" />
                                <p className="mt-2 text-sm font-semibold text-slate-700">No templates uploaded yet</p>
                              </td>
                            </tr>
                          ) : (
                            templates.map((item) => (
                              <tr key={item.id} className="hover:bg-cyan-50/40 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-900">{templateLabel(item.template_type)}</td>
                                <td className="px-4 py-3">{item.original_name}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                      item.is_active
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {item.is_active ? 'Active' : 'Archived'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleTemplateView(item.id)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-800 hover:bg-cyan-100"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
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
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {deletingTemplateId === item.id ? '…' : 'Delete'}
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
                )}

                {activeSection === 'holidays' && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-cyan-50/50 px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">Global holiday management</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Holidays apply across Microfinance, Finance, and Mortgage loan scheduling.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <form onSubmit={handleHolidaySubmit} className="rounded-2xl border border-cyan-100 bg-white p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-cyan-700" />
                          <h3 className="text-base font-bold text-slate-900">{holidayForm.id ? 'Edit holiday' : 'Mark holiday'}</h3>
                        </div>
                        <div>
                          <label className={labelClass}>Date *</label>
                          <input
                            type="date"
                            value={holidayForm.holiday_date}
                            onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                            className={inputClass}
                            required
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Holiday name *</label>
                          <input
                            value={holidayForm.name}
                            onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                            placeholder="e.g. Vesak Full Moon Poya"
                            className={inputClass}
                            required
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Note</label>
                          <input
                            value={holidayForm.note}
                            onChange={(e) => setHolidayForm({ ...holidayForm, note: e.target.value })}
                            placeholder="Optional note"
                            className={inputClass}
                          />
                        </div>
                        <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={holidayForm.is_active}
                            onChange={(e) => setHolidayForm({ ...holidayForm, is_active: e.target.checked })}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <span className="text-sm font-medium text-slate-700">Active holiday</span>
                        </label>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={holidaySaving}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {holidaySaving ? 'Saving…' : holidayForm.id ? 'Update holiday' : 'Mark holiday'}
                          </button>
                          <button
                            type="button"
                            onClick={resetHolidayForm}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Clear
                          </button>
                        </div>
                      </form>

                      <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
                        <h3 className="text-base font-bold text-slate-900 mb-3">Holiday list</h3>
                        <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                          {holidays.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-cyan-100 bg-gradient-to-r from-white to-cyan-50/30 p-3 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                                <p className="text-xs text-slate-600 mt-0.5">
                                  {formatDate(item.holiday_date)} •{' '}
                                  <span className={item.is_active ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                                    {item.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                  {item.note ? ` • ${item.note}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setHolidayForm({
                                    id: item.id,
                                    holiday_date: String(item.holiday_date || '').slice(0, 10),
                                    name: item.name,
                                    note: item.note || '',
                                    is_active: item.is_active,
                                  })
                                }
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            </div>
                          ))}
                          {holidays.length === 0 && (
                            <div className="py-10 text-center">
                              <CalendarDays className="h-8 w-8 text-emerald-400 mx-auto" />
                              <p className="mt-2 text-sm text-slate-500">No holidays marked yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'system' && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/40 px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">System administration</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Control online access, download backups, or reset the entire system. Use with caution.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Power className="h-5 w-5 text-cyan-700" />
                          <h3 className="font-bold text-slate-900">System access</h3>
                        </div>
                        <p className="text-sm text-slate-600">
                          Current status:{' '}
                          <span className={`font-bold ${systemOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {systemStatusLoading ? 'Checking…' : systemOnline ? 'ONLINE' : 'OFFLINE (Admins only)'}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSetSystemStatus(!systemOnline)}
                          disabled={systemStatusLoading || updatingSystemStatus}
                          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${
                            systemOnline
                              ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95'
                              : 'bg-gradient-to-r from-emerald-600 to-green-700 hover:opacity-95'
                          }`}
                        >
                          <Power className="h-4 w-4" />
                          {updatingSystemStatus
                            ? 'Updating…'
                            : systemOnline
                              ? 'Set system offline'
                              : 'Set system online'}
                        </button>
                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Download className="h-5 w-5 text-emerald-700" />
                          <h3 className="font-bold text-slate-900">Backups</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">Download company files or a full database export.</p>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={handleGetBackup}
                            disabled={backingUp || !selectedCompanyId}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                          >
                            <Download className="h-4 w-4" />
                            {backingUp ? 'Preparing backup…' : 'Company backup (.zip)'}
                          </button>
                          <button
                            type="button"
                            onClick={handleGetDatabaseBackup}
                            disabled={backingUpDatabase || !selectedCompanyId}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                          >
                            <Database className="h-4 w-4" />
                            {backingUpDatabase ? 'Preparing DB backup…' : 'Database backup (.sql)'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50/50 p-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-bold text-rose-900">Danger zone — reset entire system</h3>
                          <p className="text-sm text-rose-800 mt-1">
                            Permanently deletes all records and uploaded files, then rebuilds the database. Departments, designations, and Super Admin are preserved.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowResetConfirmModal(true)}
                            disabled={resettingSystem}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            {resettingSystem ? 'Resetting…' : 'Reset system'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 px-6 py-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-white shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xl font-extrabold text-white">Reset entire system</h3>
                  <p className="text-sm text-rose-100 mt-1">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (resettingSystem) return;
                  setShowResetConfirmModal(false);
                  setResetConfirmText('');
                  setResetPassword('');
                }}
                className="rounded-lg border border-white/30 bg-white/10 p-2 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700">
                This will permanently delete all records and uploaded files, and rebuild the database.
                Department data, Designation data, and the Super Admin user will be preserved.
              </p>
              <p className="mt-3 text-sm font-semibold text-rose-700">Type RESET to continue.</p>

              <input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className={`${inputClass} mt-3 border-rose-200 bg-rose-50/50`}
                placeholder="Type RESET"
              />

              <label className={`${labelClass} mt-4`}>Enter your password</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className={`${inputClass} border-rose-200 bg-rose-50/50`}
                placeholder="Current password"
              />

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (resettingSystem) return;
                    setShowResetConfirmModal(false);
                    setResetConfirmText('');
                    setResetPassword('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetSystem}
                  disabled={
                    resettingSystem ||
                    resetConfirmText.trim().toUpperCase() !== 'RESET' ||
                    resetPassword.trim() === ''
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white text-sm font-bold disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {resettingSystem ? 'Resetting…' : 'Confirm reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetCredentialsModal && resetCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-emerald-200 bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-white" />
                <h3 className="text-xl font-extrabold text-white">New Super Admin credentials</h3>
              </div>
              <p className="text-sm text-emerald-50 mt-1">System reset completed. Store these credentials securely.</p>
            </div>

            <div className="p-6 space-y-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Email</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 break-all">{resetCredentials.email}</p>
                  <button
                    type="button"
                    onClick={() => copyResetCredential(resetCredentials.email, 'Email')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Password</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 break-all font-mono">{resetCredentials.password}</p>
                  <button
                    type="button"
                    onClick={() => copyResetCredential(resetCredentials.password, 'Password')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-bold text-amber-700 hover:bg-amber-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold"
                >
                  Go to login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTemplateModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 px-6 py-4 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-white" />
              <h3 className="text-xl font-extrabold text-white">Delete template</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete &quot;{deleteTemplateModal.name}&quot;? This action cannot be undone and will also remove the stored file.
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white text-sm font-bold disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingTemplateId !== null ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
