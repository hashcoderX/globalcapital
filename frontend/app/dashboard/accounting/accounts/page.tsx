'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Building2, CheckCircle2, RefreshCw } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import CompanyAccountingPanel from '@/app/components/accounting/CompanyAccountingPanel';
import type { AccountingCompany } from '@/app/components/accounting/companyAccountingUtils';

export default function AccountingAccountsPage() {
  const router = useRouter();
  const widgetPrefix = 'accounting_accounts_widget_';
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<AccountingCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<string[]>([]);
  const [widgetNotice, setWidgetNotice] = useState('');

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const fetchCompanies = async (authToken: string) => {
    setLoading(true);
    setNotice(null);

    try {
      const response = await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setCompanies(rows);

      if (rows.length > 0) {
        setSelectedCompanyId((current) => current ?? Number(rows[0].id));
      } else {
        setSelectedCompanyId(null);
      }
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.response?.data?.message || 'Failed to load companies.' });
      setCompanies([]);
      setSelectedCompanyId(null);
    } finally {
      setLoading(false);
    }
  };

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
    fetchCompanies(token);
  }, [token]);

  const fetchWidgetPreferences = useCallback(async (authToken: string) => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/dashboard/widgets`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });
      const widgets = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data?.widgets)
          ? response.data.widgets
          : [];
      const hidden = widgets
        .filter(
          (item: { widget_key?: unknown; is_visible?: unknown }) =>
            typeof item.widget_key === 'string' &&
            item.widget_key.startsWith(widgetPrefix) &&
            (item.is_visible === false || Number(item.is_visible) === 0)
        )
        .map((item: { widget_key: string }) => item.widget_key);
      setHiddenWidgetKeys(hidden);
    } catch {
      setWidgetNotice('Failed to load widget preferences.');
    }
  }, []);

  const saveWidgetPreference = useCallback(
    async (widgetKey: string, isVisible: boolean) => {
      if (!token) return;
      const normalizedKey = String(widgetKey || '').trim();
      if (!normalizedKey || normalizedKey.length > 120) {
        setWidgetNotice('Failed to save widget preference.');
        return;
      }
      try {
        await axios.patch(
          `${getApiBaseUrl()}/dashboard/widgets`,
          { widget_key: normalizedKey, is_visible: Boolean(isVisible) },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );
        setWidgetNotice('');
      } catch {
        setWidgetNotice('Failed to save widget preference.');
      }
    },
    [token]
  );

  const hideWidget = useCallback(
    async (widgetKey: string) => {
      setHiddenWidgetKeys((prev) => (prev.includes(widgetKey) ? prev : [...prev, widgetKey]));
      await saveWidgetPreference(widgetKey, false);
    },
    [saveWidgetPreference]
  );

  useEffect(() => {
    if (!token) return;
    void fetchWidgetPreferences(token);
  }, [token, fetchWidgetPreferences]);

  const showHeroWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}hero`);
  const showNoticeWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}notice`);
  const showPanelWidget = !hiddenWidgetKeys.includes(`${widgetPrefix}panel`);
  const showAnyWidget = showHeroWidget || showNoticeWidget || showPanelWidget;

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-violet-300 blur-3xl" />
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-purple-300 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {widgetNotice ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {widgetNotice}
          </div>
        ) : null}

        {!showAnyWidget ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-5 text-sm font-semibold text-violet-900">
            All widgets are currently hidden. Use `Restore Hidden Widgets` from the main dashboard to show them again.
          </div>
        ) : null}

        {showHeroWidget ? (
        <div className="relative rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-6 text-white shadow-lg">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}hero`)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20"
              aria-label="Hide account setup hero widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-100">Accounting</p>
              <h1 className="text-2xl font-extrabold mt-1">Account Setup</h1>
              <p className="text-sm text-violet-50 mt-1">Main, cash, and bank accounts with opening balances per branch</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => token && fetchCompanies(token)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/accounting')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Accounting Home
              </button>
            </div>
          </div>
        </div>
        ) : null}

        {notice && showNoticeWidget ? (
          <div
            className={`relative rounded-2xl border px-4 py-3 text-sm font-semibold ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <WidgetCloseGate>
              <button
                type="button"
                onClick={() => void hideWidget(`${widgetPrefix}notice`)}
                className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current/20 bg-white/70 text-current hover:bg-white"
                aria-label="Hide account setup notice widget"
              >
                ×
              </button>
            </WidgetCloseGate>
            <span className="inline-flex items-center gap-2">
              {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
              {notice.text}
            </span>
          </div>
        ) : null}

        {showPanelWidget ? (
        <div className="relative rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-5">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => void hideWidget(`${widgetPrefix}panel`)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
              aria-label="Hide account setup panel widget"
            >
              ×
            </button>
          </WidgetCloseGate>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Company / Branch</label>
              <select
                value={selectedCompanyId ?? ''}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)}
                disabled={loading || companies.length === 0}
                className="w-full rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200/80"
              >
                {companies.length === 0 ? (
                  <option value="">No companies found</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedCompany ? (
              <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-2.5 text-sm text-slate-700 inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-700" />
                Currency: <span className="font-bold">{selectedCompany.currency || 'LKR'}</span>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
          ) : (
            <CompanyAccountingPanel
              token={token}
              companyId={selectedCompanyId}
              currency={selectedCompany?.currency || 'LKR'}
              onNotice={setNotice}
              emptyMessage="Create a company or branch first, then configure accounting accounts here."
            />
          )}
        </div>
        ) : null}
      </div>
    </div>
  );
}
