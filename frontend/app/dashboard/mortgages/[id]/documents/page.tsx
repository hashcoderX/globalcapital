'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../../_components/ModuleHeader';
import SectionCard from '../../_components/SectionCard';
import StatCard from '../../_components/StatCard';
import { FileText, Banknote, CalendarDays } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

export default function MortgageDocuments() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [mortgage, setMortgage] = useState<any>(null);
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState('');
  const id = params?.id as string;
  const widgetPrefix = 'mortgages_documents_widget_';

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      fetchMortgage(t);
      fetchDocuments(t);
      void fetchWidgetPreferences(t);
    }
  }, [router]);

  const fetchDocuments = async (authToken: string) => {
    try {
      const res = await axios.get(`/api/mortgages/${id}/documents`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = res.data.data || res.data;
      setDocuments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMortgage = async (authToken: string) => {
    try {
      const res = await axios.get(`/api/mortgages/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setMortgage(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  async function fetchWidgetPreferences(authToken: string) {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/dashboard/widgets`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const rows = Array.isArray(response.data?.widgets) ? response.data.widgets : [];
      const nextHidden = new Set<string>();
      for (const row of rows) {
        const key = String(row?.widget_key || '').trim();
        if (!key.startsWith(widgetPrefix)) continue;
        if (row?.is_visible === false) nextHidden.add(key);
      }
      setHiddenWidgetKeys(nextHidden);
    } catch {
      setHiddenWidgetKeys(new Set());
    }
  }

  const saveWidgetPreference = useCallback(async (widgetKey: string, isVisible: boolean) => {
    if (!token) return false;
    try {
      await axios.patch(
        `${getApiBaseUrl()}/dashboard/widgets`,
        { widget_key: widgetKey, is_visible: isVisible },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch {
      return false;
    }
  }, [token]);

  const hideWidget = useCallback(async (widgetKey: string) => {
    setWidgetNotice('');
    const previous = new Set(hiddenWidgetKeys);
    const next = new Set(hiddenWidgetKeys);
    next.add(widgetKey);
    setHiddenWidgetKeys(next);
    const ok = await saveWidgetPreference(widgetKey, false);
    if (!ok) {
      setHiddenWidgetKeys(previous);
      setWidgetNotice('Failed to hide widget. Please try again.');
    }
  }, [hiddenWidgetKeys, saveWidgetPreference]);

  const statCards = mortgage
    ? [
        { key: 'documents_count', icon: <FileText className="h-5 w-5" />, label: 'Documents', value: documents.length, tone: 'primary' as const },
        { key: 'requested_amount', icon: <Banknote className="h-5 w-5" />, label: 'Requested', value: mortgage.requested_amount, tone: 'success' as const },
        { key: 'tenure', icon: <CalendarDays className="h-5 w-5" />, label: 'Tenure', value: `${mortgage.tenure_months} months`, tone: 'warning' as const },
      ]
    : [];
  const visibleStatCards = statCards.filter((card) => !hiddenWidgetKeys.has(`${widgetPrefix}${card.key}`));

  const documentColumns: Array<{
    key: string;
    label: string;
    render: (row: any) => string;
  }> = [
    { key: 'type', label: 'Type', render: (d) => String(d.document_type ?? '—') },
    { key: 'file', label: 'File', render: (d) => String(d.original_name || d.file_path || '—') },
    { key: 'uploaded', label: 'Uploaded', render: (d) => String(d.created_at ?? '—') },
  ];
  const visibleDocumentColumns = documentColumns.filter((column) => !hiddenWidgetKeys.has(`${widgetPrefix}column_${column.key}`));

  const showHeaderWidget = !hiddenWidgetKeys.has(`${widgetPrefix}header`);
  const showStatsWidget = !hiddenWidgetKeys.has(`${widgetPrefix}stats_section`);
  const showDocumentsWidget = !hiddenWidgetKeys.has(`${widgetPrefix}documents_table`);
  const showAnyWidget = showHeaderWidget || (showStatsWidget && visibleStatCards.length > 0) || showDocumentsWidget;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showHeaderWidget ? (
          <ModuleHeader
            title="Mortgage Documents"
            subtitle={`Mortgage #${id}`}
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Mortgages', href: '/dashboard/mortgages' },
              { label: `#${id}`, href: `/dashboard/mortgages/${id}` },
              { label: 'Documents' },
            ]}
            onHideWidget={() => void hideWidget(`${widgetPrefix}header`)}
            hideWidgetAriaLabel="Hide documents header widget"
            actions={(
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/dashboard')} className="rounded-lg bg-gradient-to-r from-slate-600 to-gray-800 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Dashboard</button>
                <button onClick={() => router.push(`/dashboard/mortgages/${id}`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Details</button>
                <button onClick={() => router.push(`/dashboard/mortgages/${id}/payments`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Payments</button>
                <button onClick={() => router.push(`/dashboard/mortgages/${id}/schedule`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Schedule</button>
                <button onClick={() => router.back()} className="rounded-lg bg-gradient-to-r from-gray-500 to-zinc-700 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Back</button>
              </div>
            )}
          />
        ) : null}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {widgetNotice ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {widgetNotice}
          </div>
        ) : null}

        {!showAnyWidget ? (
          <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600">
            All widgets are hidden. Use Restore Hidden Widgets from the dashboard to bring them back.
          </div>
        ) : null}

        {mortgage && showStatsWidget ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6">
            {visibleStatCards.map((card) => (
              <StatCard
                key={card.key}
                icon={card.icon}
                label={card.label}
                value={card.value}
                tone={card.tone}
                onHideWidget={() => void hideWidget(`${widgetPrefix}${card.key}`)}
                hideWidgetAriaLabel={`Hide ${card.label} widget`}
              />
            ))}
            {visibleStatCards.length === 0 ? (
              <div className="md:col-span-3 rounded-xl border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-600">
                All summary cards are hidden.
              </div>
            ) : null}
          </div>
        ) : null}
        {showDocumentsWidget ? (
        <SectionCard
          title="Document List"
          onHideWidget={() => void hideWidget(`${widgetPrefix}documents_table`)}
          hideWidgetAriaLabel="Hide documents table widget"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {visibleDocumentColumns.map((column) => (
                    <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center justify-between gap-2">
                        <span>{column.label}</span>
                        <WidgetCloseGate>
                          <button
                            type="button"
                            onClick={() => void hideWidget(`${widgetPrefix}column_${column.key}`)}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                            aria-label={`Hide ${column.label} column`}
                          >
                            ×
                          </button>
                        </WidgetCloseGate>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map(d => (
                  <tr key={d.id}>
                    {visibleDocumentColumns.map((column) => (
                      <td key={column.key} className="px-6 py-4 text-sm">{column.render(d)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleDocumentColumns.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">All document columns are hidden.</p>
              </div>
            )}
            {documents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No documents uploaded.</p>
                {mortgage && (
                  <p className="mt-2 text-sm text-gray-400">Status {mortgage.status}</p>
                )}
              </div>
            )}
          </div>
        </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
