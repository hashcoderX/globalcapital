'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../../_components/ModuleHeader';
import SectionCard from '../../_components/SectionCard';
import StatCard from '../../_components/StatCard';
import { CalendarDays, Banknote, PercentCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

export default function MortgageSchedule() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [mortgage, setMortgage] = useState<any>(null);
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState('');
  const id = params?.id as string;
  const widgetPrefix = 'mortgages_schedule_widget_';

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      fetchMortgage(t);
      fetchSchedule(t);
      void fetchWidgetPreferences(t);
    }
  }, [router]);

  const fetchSchedule = async (authToken: string) => {
    try {
      const res = await axios.get(`/api/mortgages/${id}/schedule`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = res.data.data || res.data;
      setSchedule(Array.isArray(data) ? data : []);
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
        { key: 'stat_requested', icon: <Banknote className="h-5 w-5" />, label: 'Requested', value: mortgage.requested_amount, tone: 'primary' as const },
        { key: 'stat_interest', icon: <PercentCircle className="h-5 w-5" />, label: 'Interest', value: `${mortgage.interest_rate}% (${mortgage.interest_type})`, tone: 'success' as const },
        { key: 'stat_tenure', icon: <CalendarDays className="h-5 w-5" />, label: 'Tenure', value: `${mortgage.tenure_months} months`, tone: 'warning' as const },
      ]
    : [];
  const visibleStatCards = statCards.filter((card) => !hiddenWidgetKeys.has(`${widgetPrefix}${card.key}`));

  const scheduleColumns: Array<{
    key: string;
    label: string;
    render: (row: any) => string | number;
  }> = [
    { key: 'installment', label: 'Installment', render: (s) => s.installment_no },
    { key: 'due_date', label: 'Due Date', render: (s) => s.due_date },
    { key: 'principal', label: 'Principal', render: (s) => s.principal },
    { key: 'interest', label: 'Interest', render: (s) => s.interest },
    { key: 'total', label: 'Total', render: (s) => s.total_amount },
    { key: 'status', label: 'Status', render: (s) => s.status },
  ];
  const visibleScheduleColumns = scheduleColumns.filter((column) => !hiddenWidgetKeys.has(`${widgetPrefix}column_${column.key}`));

  const showHeaderWidget = !hiddenWidgetKeys.has(`${widgetPrefix}header`);
  const showStatsWidget = !hiddenWidgetKeys.has(`${widgetPrefix}stats_section`);
  const showScheduleWidget = !hiddenWidgetKeys.has(`${widgetPrefix}schedule_table`);
  const showAnyWidget = showHeaderWidget || (showStatsWidget && visibleStatCards.length > 0) || showScheduleWidget;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showHeaderWidget ? (
          <ModuleHeader
            title="Repayment Schedule"
            subtitle={`Mortgage #${id}`}
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Mortgages', href: '/dashboard/mortgages' },
              { label: `#${id}`, href: `/dashboard/mortgages/${id}` },
              { label: 'Schedule' },
            ]}
            onHideWidget={() => void hideWidget(`${widgetPrefix}header`)}
            hideWidgetAriaLabel="Hide schedule header widget"
            actions={(
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/dashboard')} className="rounded-lg bg-gradient-to-r from-slate-600 to-gray-800 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Dashboard</button>
                <button onClick={() => router.push(`/dashboard/mortgages/${id}`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Details</button>
                <button onClick={() => router.push(`/dashboard/mortgages/${id}/payments`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Payments</button>
                <button onClick={() => router.push(`/dashboard/mortgages/${id}/documents`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Documents</button>
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
        {showScheduleWidget ? (
        <SectionCard
          title="Installment Schedule"
          onHideWidget={() => void hideWidget(`${widgetPrefix}schedule_table`)}
          hideWidgetAriaLabel="Hide installment schedule widget"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {visibleScheduleColumns.map((column) => (
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
                {schedule.map(s => (
                  <tr key={s.id}>
                    {visibleScheduleColumns.map((column) => (
                      <td key={column.key} className="px-6 py-4 text-sm">{column.render(s)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleScheduleColumns.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">All schedule columns are hidden.</p>
              </div>
            )}
            {schedule.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No schedule generated.</p>
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
