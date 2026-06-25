'use client';

import axios from 'axios';
import { getApiBaseUrl, getBackendOrigin } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type LoanRow = {
  id: number;
  loan_code?: string | null;
  customer_no?: string | null;
  customer_name?: string | null;
  field_officer?: string | null;
};

type CollectionRow = {
  id: number;
  mf_loan_request_id: number | string;
  collection_date?: string | null;
  created_at?: string | null;
  collected_amount?: number | string;
  capital_amount?: number | string;
  interest_amount?: number | string;
  penalty_amount?: number | string;
  payment_type?: string | null;
  payment_reference?: string | null;
};

type ReportRow = {
  id: number;
  date: string;
  loanCode: string;
  customerNo: string;
  customerName: string;
  fieldOfficer: string;
  collected: number;
  capital: number;
  interest: number;
  penalty: number;
  paymentType: string;
  reference: string;
};

const API_BASE = getApiBaseUrl();

export default function MicrofinanceCollectionReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branch_id') || '';
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');


  const fetchWidgetPreferences = async (authToken: string) => {
    setLoadingWidgets(true);
    try {
      const response = await axios.get(`${API_BASE}/dashboard/widgets`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });
      const list = Array.isArray(response.data?.widgets) ? response.data.widgets : [];
      const nextHidden = new Set<string>();
      for (const row of list) {
        const key = String(row?.widget_key || '').trim();
        if (!key.startsWith('mf_collection_widget_')) continue;
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
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
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
        message: 'Failed to hide this item. Please try again.',
      });
    }
  };

  const handleBack = () => router.back();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
    void fetchWidgetPreferences(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadReport = async () => {
      setLoading(true);
      try {
        const [loanRes, collectionRes] = await Promise.all([
          axios.get(`${API_BASE}/microfinance/loan-requests`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            params: {
              branch_id: branchId,
            },
          }),
          axios.get(`${API_BASE}/microfinance/collections`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            params: {
              branch_id: branchId,
            },
          }),
        ]);

        const loans: LoanRow[] = Array.isArray(loanRes.data) ? loanRes.data : [];
        const collections: CollectionRow[] = Array.isArray(collectionRes.data) ? collectionRes.data : [];

        const loanMap = new Map<number, LoanRow>();
        loans.forEach((loan) => {
          loanMap.set(Number(loan.id), loan);
        });

        const mapped: ReportRow[] = collections
          .map((collection) => {
            const loanId = Number(collection.mf_loan_request_id || 0);
            const loan = loanMap.get(loanId);

            return {
              id: Number(collection.id),
              date: String(collection.collection_date || collection.created_at || ''),
              loanCode: String(loan?.loan_code || `LR-${loanId || 0}`),
              customerNo: String(loan?.customer_no || '-'),
              customerName: String(loan?.customer_name || '-'),
              fieldOfficer: String(loan?.field_officer || 'Unassigned'),
              collected: Number(collection.collected_amount || 0),
              capital: Number(collection.capital_amount || 0),
              interest: Number(collection.interest_amount || 0),
              penalty: Number(collection.penalty_amount || 0),
              paymentType: String(collection.payment_type || '-').replace('_', ' '),
              reference: String(collection.payment_reference || '-'),
            };
          })
          .sort((a, b) => {
            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();
            return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
          });

        setRows(mapped);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [token, branchId]);

  const filteredRows = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return rows.filter((row) => {
      const rowDate = row.date ? new Date(row.date) : null;

      if (from && rowDate && !Number.isNaN(rowDate.getTime()) && rowDate < from) {
        return false;
      }

      if (to && rowDate && !Number.isNaN(rowDate.getTime()) && rowDate > to) {
        return false;
      }

      return true;
    });
  }, [rows, fromDate, toDate]);

  const summary = useMemo(() => {
    let totalCollected = 0;
    let totalCapital = 0;
    let totalInterest = 0;
    let totalPenalty = 0;

    const today = new Date().toISOString().slice(0, 10);
    let todayCollected = 0;

    const officers = new Set<string>();

    filteredRows.forEach((row) => {
      totalCollected += row.collected;
      totalCapital += row.capital;
      totalInterest += row.interest;
      totalPenalty += row.penalty;

      if (String(row.date).slice(0, 10) === today) {
        todayCollected += row.collected;
      }

      if (row.fieldOfficer && row.fieldOfficer !== 'Unassigned') {
        officers.add(row.fieldOfficer);
      }
    });

    return {
      totalCollected,
      totalCapital,
      totalInterest,
      totalPenalty,
      todayCollected,
      transactionCount: filteredRows.length,
      officerCount: officers.size,
    };
  }, [filteredRows]);

  const summaryCards = [
    { key: 'mf_collection_widget_summary_transactions', label: 'Transactions', value: String(summary.transactionCount), style: 'text-slate-900' },
    {
      key: 'mf_collection_widget_summary_total_collected',
      label: 'Total Collected',
      value: new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.totalCollected),
      style: 'text-emerald-700',
    },
    {
      key: 'mf_collection_widget_summary_capital',
      label: 'Capital',
      value: new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.totalCapital),
      style: 'text-slate-900',
    },
    {
      key: 'mf_collection_widget_summary_interest',
      label: 'Interest',
      value: new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.totalInterest),
      style: 'text-slate-900',
    },
    {
      key: 'mf_collection_widget_summary_penalty',
      label: 'Penalty',
      value: new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.totalPenalty),
      style: 'text-rose-700',
    },
    {
      key: 'mf_collection_widget_summary_today_officers',
      label: 'Today / Officers',
      value: `${new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(summary.todayCollected)} / ${summary.officerCount}`,
      style: 'text-cyan-800',
    },
  ];
  const visibleSummaryCards = summaryCards.filter((card) => !hiddenWidgetKeys.has(card.key));
  const showHeaderBack = !hiddenWidgetKeys.has('mf_collection_widget_header_back');
  const showToolbar = !hiddenWidgetKeys.has('mf_collection_widget_toolbar');
  const showMobileCards = !hiddenWidgetKeys.has('mf_collection_widget_mobile_cards');
  const tableColumns = [
    { key: 'date', label: 'Date & Time' },
    { key: 'loanCode', label: 'Loan Code' },
    { key: 'customerNo', label: 'Customer No' },
    { key: 'customer', label: 'Customer' },
    { key: 'fieldOfficer', label: 'Field Officer' },
    { key: 'paymentType', label: 'Payment Type' },
    { key: 'reference', label: 'Reference' },
    { key: 'collected', label: 'Collected' },
    { key: 'capital', label: 'Capital' },
    { key: 'interest', label: 'Interest' },
    { key: 'penalty', label: 'Penalty' },
  ];
  const visibleTableColumns = tableColumns.filter((column) => !hiddenWidgetKeys.has(`mf_collection_widget_col_${column.key}`));

  const formatDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value || '-';
    }

    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(parsed);
  };

  const formatMoney = (value: number) => Number(value || 0).toFixed(2);

  const getReportFileDate = () => new Date().toISOString().slice(0, 10);

  const handleDownloadCsv = () => {
    const headers = [
      'Date & Time',
      'Loan Code',
      'Customer No',
      'Customer',
      'Field Officer',
      'Payment Type',
      'Reference',
      'Collected',
      'Capital',
      'Interest',
      'Penalty',
    ];

    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const body = filteredRows.map((row) => [
      formatDateTime(row.date),
      row.loanCode,
      row.customerNo,
      row.customerName,
      row.fieldOfficer,
      row.paymentType,
      row.reference,
      formatMoney(row.collected),
      formatMoney(row.capital),
      formatMoney(row.interest),
      formatMoney(row.penalty),
    ]);

    const csv = [headers, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `collection-report-${getReportFileDate()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const generatedAt = new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());

    const dateFilterText =
      fromDate || toDate
        ? `Range: ${fromDate || 'Start'} to ${toDate || 'End'}`
        : 'Range: All Dates';

    doc.setFontSize(16);
    doc.text('Collection Report', 40, 40);
    doc.setFontSize(10);
    doc.text(`${dateFilterText} | Generated: ${generatedAt}`, 40, 58);

    autoTable(doc, {
      startY: 72,
      head: [[
        'Date & Time',
        'Loan Code',
        'Customer No',
        'Customer',
        'Field Officer',
        'Payment Type',
        'Reference',
        'Collected',
        'Capital',
        'Interest',
        'Penalty',
      ]],
      body: filteredRows.map((row) => [
        formatDateTime(row.date),
        row.loanCode,
        row.customerNo,
        row.customerName,
        row.fieldOfficer,
        row.paymentType,
        row.reference,
        formatMoney(row.collected),
        formatMoney(row.capital),
        formatMoney(row.interest),
        formatMoney(row.penalty),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [8, 145, 178],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [241, 250, 252],
      },
      margin: { left: 24, right: 24, top: 72, bottom: 24 },
      theme: 'striped',
    });

    doc.save(`collection-report-${getReportFileDate()}.pdf`);
  };

  if (!token || loading || loadingWidgets) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-emerald-50 px-3 py-4 sm:px-4 sm:py-6 md:px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-sky-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-300 blur-3xl"></div>
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(14,116,144,0.38)_1px,transparent_1px)] [background-size:24px_24px]">
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/82 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100 shadow-sm">
                Reports Desk
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mt-3 tracking-tight">Collection Report</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">Period-wise collection performance with capital, interest, and penalty breakdown.</p>
            </div>
            {showHeaderBack && (
              <div className="relative">
                <WidgetCloseGate>
<button
                  type="button"
                  onClick={() => void hideWidget('mf_collection_widget_header_back')}
                  className="absolute -top-2 -left-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                  aria-label="Hide back button"
                >
                  ×
                </button>
</WidgetCloseGate>
                <button
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm w-full sm:w-auto"
                >
                  Back
                </button>
                </div>
              )}
              {!showMobileCards && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 lg:hidden">
                  Mobile cards are hidden. Restore from dashboard with admin approval.
                </div>
              )}
          </div>

          <div className="mt-5 h-1.5 w-40 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500"></div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {visibleSummaryCards.map((card) => (
              <div key={card.key} className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/60 to-sky-50/70 p-4 shadow-sm">
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
                <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className={`text-sm sm:text-base font-bold mt-1 break-words [overflow-wrap:anywhere] ${card.style}`}>
                  {card.value}
                </p>
              </div>
            ))}
          {visibleSummaryCards.length === 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              All summary cards are hidden. Restore from dashboard with admin approval.
            </div>
          )}
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Collection Transactions</h2>
            {showToolbar && (
              <div className="relative flex flex-col sm:flex-row sm:items-end gap-2 w-full lg:w-auto lg:flex-wrap">
              <WidgetCloseGate>
<button
                type="button"
                onClick={() => void hideWidget('mf_collection_widget_toolbar')}
                className="absolute -top-2 -left-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                aria-label="Hide toolbar"
              >
                ×
              </button>
</WidgetCloseGate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-3 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-semibold border border-emerald-200"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-2.5 rounded-xl bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-sm font-semibold border border-cyan-200"
                >
                  Download PDF
                </button>
              </div>
              </div>
            )}
          {!showToolbar && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Toolbar controls are hidden. Restore from dashboard with admin approval.
            </div>
          )}

          <div className="mt-3 rounded-xl border border-cyan-100 bg-gradient-to-r from-cyan-50/80 via-sky-50/70 to-emerald-50/70 px-3 py-2 text-xs sm:text-sm text-slate-600">
            Showing <span className="font-bold text-slate-800">{filteredRows.length}</span> transaction(s)
            {fromDate || toDate ? ` for ${fromDate || 'Start'} to ${toDate || 'End'}` : ' for all dates'}.
          </div>

          {filteredRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-100/60 to-teal-100/40 p-8 text-sm text-slate-700 text-center">
              No collection data found for selected period.
            </div>
          ) : (
            <>
              {showMobileCards && (
                <div className="relative mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                <WidgetCloseGate>
<button
                  type="button"
                  onClick={() => void hideWidget('mf_collection_widget_mobile_cards')}
                  className="absolute -top-2 -left-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                  aria-label="Hide mobile cards"
                >
                  ×
                </button>
</WidgetCloseGate>
                {filteredRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-cyan-100 bg-white/90 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Date & Time</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDateTime(row.date)}</p>
                      </div>
                      <span className="rounded-full bg-cyan-50 border border-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                        {row.loanCode}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <p className="text-slate-500">Loan Code</p>
                      <p className="font-semibold text-slate-900 text-right">{row.loanCode}</p>

                      <p className="text-slate-500">Customer No</p>
                      <p className="font-semibold text-slate-900 text-right">{row.customerNo}</p>

                      <p className="text-slate-500">Customer</p>
                      <p className="font-semibold text-slate-900 text-right">{row.customerName}</p>

                      <p className="text-slate-500">Officer</p>
                      <p className="text-slate-800 text-right">{row.fieldOfficer}</p>

                      <p className="text-slate-500">Payment</p>
                      <p className="capitalize text-slate-800 text-right">{row.paymentType}</p>

                      <p className="text-slate-500">Reference</p>
                      <p className="text-slate-800 text-right break-words [overflow-wrap:anywhere]">{row.reference}</p>
                    </div>

                    <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/40 p-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Collected</p>
                        <p className="font-bold text-emerald-700">{formatMoney(row.collected)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Capital</p>
                        <p className="font-semibold text-slate-900">{formatMoney(row.capital)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Interest</p>
                        <p className="font-semibold text-slate-900">{formatMoney(row.interest)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Penalty</p>
                        <p className="font-semibold text-rose-700">{formatMoney(row.penalty)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}

              <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100 hidden lg:block">
                <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                  <thead className="bg-cyan-50/70 text-slate-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date & Time</th>
                      <th className="px-3 py-2 font-semibold">Loan Code</th>
                      <th className="px-3 py-2 font-semibold">Customer No</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Field Officer</th>
                      <th className="px-3 py-2 font-semibold">Payment Type</th>
                      <th className="px-3 py-2 font-semibold">Reference</th>
                      <th className="px-3 py-2 font-semibold">Collected</th>
                      <th className="px-3 py-2 font-semibold">Capital</th>
                      <th className="px-3 py-2 font-semibold">Interest</th>
                      <th className="px-3 py-2 font-semibold">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                        <td className="px-3 py-2">{formatDateTime(row.date)}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{row.loanCode}</td>
                        <td className="px-3 py-2">{row.customerNo}</td>
                        <td className="px-3 py-2">{row.customerName}</td>
                        <td className="px-3 py-2">{row.fieldOfficer}</td>
                        <td className="px-3 py-2 capitalize">{row.paymentType}</td>
                        <td className="px-3 py-2">{row.reference}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-700">{formatMoney(row.collected)}</td>
                        <td className="px-3 py-2">{formatMoney(row.capital)}</td>
                        <td className="px-3 py-2">{formatMoney(row.interest)}</td>
                        <td className="px-3 py-2">{formatMoney(row.penalty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
