'use client';

import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type IssuedLoanRow = {
  id: number;
  loanCode: string;
  customerNo: string;
  customerName: string;
  fieldOfficer: string;
  status: string;
  issueAmount: number;
  issueDate: string;
};

type CollectionRow = {
  id: number;
  mf_loan_request_id: number | string;
  collection_date?: string | null;
  created_at?: string | null;
  collected_amount?: number | string | null;
  capital_amount?: number | string | null;
  interest_amount?: number | string | null;
  penalty_amount?: number | string | null;
  payment_type?: string | null;
  payment_reference?: string | null;
};

type HistoryRow = {
  id: number;
  date: string;
  loanId: number;
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
const ISSUED_STATUSES = new Set(['approved', 'released']);

const formatMoney = (value: number) => Number(value || 0).toFixed(2);

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

const formatDisplayDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(parsed);
};

const mapCollectionToHistory = (collection: CollectionRow, loan: IssuedLoanRow): HistoryRow => {
  const loanId = Number(collection.mf_loan_request_id || loan.id);

  return {
    id: Number(collection.id || 0),
    date: String(collection.collection_date || collection.created_at || ''),
    loanId,
    loanCode: loan.loanCode,
    customerNo: loan.customerNo,
    customerName: loan.customerName,
    fieldOfficer: loan.fieldOfficer,
    collected: Number(collection.collected_amount || 0),
    capital: Number(collection.capital_amount || 0),
    interest: Number(collection.interest_amount || 0),
    penalty: Number(collection.penalty_amount || 0),
    paymentType: String(collection.payment_type || '-').replace('_', ' '),
    reference: String(collection.payment_reference || '-'),
  };
};

export default function CustomerPaymentHistoryReportPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loadingWidgets, setLoadingWidgets] = useState(true);
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<Set<string>>(new Set());
  const [widgetNotice, setWidgetNotice] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });
  const [loansLoading, setLoansLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [issuedLoans, setIssuedLoans] = useState<IssuedLoanRow[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<HistoryRow[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [loanSearch, setLoanSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
    [token]
  );

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
        if (!key.startsWith('mf_customer_history_widget_')) continue;
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
        message: 'Failed to hide this item. Please try again.',
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
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadIssuedLoans = async () => {
      setLoansLoading(true);
      try {
        const loanRes = await axios.get(`${API_BASE}/microfinance/loan-requests`, { headers });
        const loansRaw = Array.isArray(loanRes.data) ? loanRes.data : [];

        const mapped: IssuedLoanRow[] = loansRaw
          .filter((loan) => ISSUED_STATUSES.has(String(loan.status || '').toLowerCase()))
          .map((loan) => {
            const id = Number(loan.id || 0);
            const loanCode = String(loan.loan_code || loan.customer_no || '').trim() || `LR-${id}`;

            return {
              id,
              loanCode,
              customerNo: String(loan.customer_no || '-'),
              customerName: String(loan.customer_name || '-'),
              fieldOfficer: String(loan.field_officer || 'Unassigned'),
              status: String(loan.status || '-'),
              issueAmount: Number(loan.net_disbursed_amount || loan.loan_amount || 0),
              issueDate: String(loan.loan_request_date || loan.created_at || ''),
            };
          })
          .sort((a, b) => b.id - a.id);

        setIssuedLoans(mapped);
      } catch {
        setIssuedLoans([]);
      } finally {
        setLoansLoading(false);
      }
    };

    loadIssuedLoans();
  }, [token, headers]);

  const selectedLoan = useMemo(
    () => issuedLoans.find((loan) => loan.id === selectedLoanId) || null,
    [issuedLoans, selectedLoanId]
  );

  const loadPaymentHistory = useCallback(
    async (loan: IssuedLoanRow) => {
      if (!token) return;

      setSelectedLoanId(loan.id);
      setHistoryLoading(true);
      setPaymentHistory([]);

      try {
        const collectionRes = await axios.get(`${API_BASE}/microfinance/collections`, {
          headers,
          params: { loan_request_id: loan.id },
        });

        const collections: CollectionRow[] = Array.isArray(collectionRes.data) ? collectionRes.data : [];

        const mapped = collections
          .map((collection) => mapCollectionToHistory(collection, loan))
          .sort((a, b) => {
            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();
            return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
          });

        setPaymentHistory(mapped);
      } catch {
        setPaymentHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [token, headers]
  );

  const filteredLoans = useMemo(() => {
    const keyword = loanSearch.trim().toLowerCase();
    if (!keyword) return issuedLoans;

    return issuedLoans.filter((loan) => {
      const haystack = [loan.loanCode, loan.customerNo, loan.customerName, loan.fieldOfficer, loan.status]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [issuedLoans, loanSearch]);

  const filteredHistory = useMemo(() => {
    const keyword = historySearch.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return paymentHistory.filter((row) => {
      const rowDate = row.date ? new Date(row.date) : null;

      if (from && rowDate && !Number.isNaN(rowDate.getTime()) && rowDate < from) {
        return false;
      }

      if (to && rowDate && !Number.isNaN(rowDate.getTime()) && rowDate > to) {
        return false;
      }

      if (!keyword) return true;

      const haystack = [row.customerNo, row.customerName, row.loanCode, row.fieldOfficer, row.reference, row.paymentType]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [paymentHistory, historySearch, fromDate, toDate]);

  const historySummary = useMemo(() => {
    return filteredHistory.reduce(
      (acc, row) => {
        acc.transactions += 1;
        acc.collected += row.collected;
        acc.capital += row.capital;
        acc.interest += row.interest;
        acc.penalty += row.penalty;
        return acc;
      },
      { transactions: 0, collected: 0, capital: 0, interest: 0, penalty: 0 }
    );
  }, [filteredHistory]);

  const chartData = useMemo(() => {
    const componentRows = [
      { key: 'collected', label: 'Collected', value: historySummary.collected, color: 'from-cyan-600 to-cyan-400' },
      { key: 'capital', label: 'Capital', value: historySummary.capital, color: 'from-emerald-600 to-emerald-400' },
      { key: 'interest', label: 'Interest', value: historySummary.interest, color: 'from-indigo-600 to-indigo-400' },
      { key: 'penalty', label: 'Penalty', value: historySummary.penalty, color: 'from-rose-600 to-rose-400' },
    ];

    const maxComponent = componentRows.reduce((max, row) => Math.max(max, row.value), 0) || 1;

    const timelineRows = [...filteredHistory]
      .sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
      })
      .slice(-12)
      .map((row, index) => {
        const parsed = new Date(row.date);
        const label = Number.isNaN(parsed.getTime())
          ? `P${index + 1}`
          : new Intl.DateTimeFormat('en-LK', { month: 'short', day: '2-digit' }).format(parsed);

        return {
          label,
          amount: row.collected,
        };
      });

    const maxTimeline = timelineRows.reduce((max, row) => Math.max(max, row.amount), 0) || 1;

    return {
      componentRows,
      maxComponent,
      timelineRows,
      maxTimeline,
    };
  }, [filteredHistory, historySummary]);

  const timelinePoints = useMemo(() => {
    const rows = chartData.timelineRows;
    if (rows.length === 0) return '';

    const width = 760;
    const height = 220;
    const left = 30;
    const right = 24;
    const top = 20;
    const bottom = 26;
    const usableWidth = width - left - right;
    const usableHeight = height - top - bottom;

    return rows
      .map((row, index) => {
        const x = left + (index / Math.max(rows.length - 1, 1)) * usableWidth;
        const y = top + (1 - row.amount / chartData.maxTimeline) * usableHeight;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [chartData]);

  const showHeaderBack = !hiddenWidgetKeys.has('mf_customer_history_widget_header_back');
  const showLoanSearch = !hiddenWidgetKeys.has('mf_customer_history_widget_loan_search');
  const showLoanTable = !hiddenWidgetKeys.has('mf_customer_history_widget_loan_table');
  const showHistoryFilters = !hiddenWidgetKeys.has('mf_customer_history_widget_history_filters');
  const showGraphPreview = !hiddenWidgetKeys.has('mf_customer_history_widget_graph_preview');

  const historySummaryCards = [
    { key: 'mf_customer_history_widget_summary_transactions', label: 'Transactions', value: String(historySummary.transactions), className: 'text-fuchsia-700' },
    { key: 'mf_customer_history_widget_summary_collected', label: 'Collected', value: formatMoney(historySummary.collected), className: 'text-cyan-700' },
    { key: 'mf_customer_history_widget_summary_capital', label: 'Capital', value: formatMoney(historySummary.capital), className: 'text-emerald-700' },
    { key: 'mf_customer_history_widget_summary_interest', label: 'Interest', value: formatMoney(historySummary.interest), className: 'text-indigo-700' },
    { key: 'mf_customer_history_widget_summary_penalty', label: 'Penalty', value: formatMoney(historySummary.penalty), className: 'text-rose-700' },
  ];
  const visibleHistorySummaryCards = historySummaryCards.filter((card) => !hiddenWidgetKeys.has(card.key));

  const loanTableColumns = [
    { key: 'loanCode', label: 'Loan Code' },
    { key: 'customerNo', label: 'Customer No' },
    { key: 'customer', label: 'Customer' },
    { key: 'fieldOfficer', label: 'Field Officer' },
    { key: 'status', label: 'Status' },
    { key: 'issueDate', label: 'Issue Date' },
    { key: 'issueAmount', label: 'Issue Amount' },
    { key: 'action', label: 'Action' },
  ];
  const visibleLoanTableColumns = loanTableColumns.filter((column) => !hiddenWidgetKeys.has(`mf_customer_history_widget_loan_col_${column.key}`));

  const historyTableColumns = [
    { key: 'date', label: 'Date & Time' },
    { key: 'payType', label: 'Pay Type' },
    { key: 'reference', label: 'Reference' },
    { key: 'collected', label: 'Collected' },
    { key: 'capital', label: 'Capital' },
    { key: 'interest', label: 'Interest' },
    { key: 'penalty', label: 'Penalty' },
  ];
  const visibleHistoryTableColumns = historyTableColumns.filter((column) => !hiddenWidgetKeys.has(`mf_customer_history_widget_history_col_${column.key}`));

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-pink-50 to-rose-100 p-5 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-fuchsia-100 bg-white/85 p-5 shadow-[0_20px_50px_-30px_rgba(217,70,239,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="inline-flex rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-700">
                Report Center
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900">Customer Payment History Report</h1>
              <p className="mt-1 text-sm text-slate-600">
                Select an issued loan to load its full payment history.
              </p>
            </div>
            {showHeaderBack && (
              <div className="relative">
                <WidgetCloseGate>
<button
                  type="button"
                  onClick={() => void hideWidget('mf_customer_history_widget_header_back')}
                  className="absolute -top-2 -left-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                  aria-label="Hide back button"
                >
                  ×
                </button>
</WidgetCloseGate>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-fuchsia-100 bg-white/90 p-5 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(217,70,239,0.4)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Issued Loans</h2>
            <p className="text-sm text-slate-600">{filteredLoans.length} loan(s)</p>
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search Loans</label>
            <input
              value={loanSearch}
              onChange={(e) => setLoanSearch(e.target.value)}
              placeholder="Loan code, customer no, name, field officer"
              className="mt-1 w-full rounded-xl border border-fuchsia-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
            />
          </div>

          {loansLoading ? (
            <p className="py-8 text-center text-slate-600">Loading issued loans...</p>
          ) : filteredLoans.length === 0 ? (
            <p className="py-8 text-center text-slate-600">No issued loans found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-fuchsia-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-fuchsia-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Loan Code</th>
                    <th className="px-3 py-2 font-semibold">Customer No</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Field Officer</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Issue Date</th>
                    <th className="px-3 py-2 font-semibold">Issue Amount</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map((loan) => {
                    const isSelected = selectedLoanId === loan.id;

                    return (
                      <tr
                        key={loan.id}
                        onClick={() => loadPaymentHistory(loan)}
                        className={`border-b border-fuchsia-100 last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-fuchsia-100/70' : 'hover:bg-fuchsia-50/50'
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold text-slate-900">{loan.loanCode}</td>
                        <td className="px-3 py-2">{loan.customerNo}</td>
                        <td className="px-3 py-2">{loan.customerName}</td>
                        <td className="px-3 py-2">{loan.fieldOfficer}</td>
                        <td className="px-3 py-2 capitalize">{loan.status}</td>
                        <td className="px-3 py-2">{formatDisplayDate(loan.issueDate)}</td>
                        <td className="px-3 py-2 font-semibold text-cyan-700">{formatMoney(loan.issueAmount)}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadPaymentHistory(loan);
                            }}
                            className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:from-fuchsia-600 hover:to-rose-600"
                          >
                            Payment History
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-fuchsia-100 bg-white/90 p-5 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(217,70,239,0.4)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
              {selectedLoan ? (
                <p className="mt-1 text-sm text-slate-600">
                  {selectedLoan.loanCode} | {selectedLoan.customerNo} | {selectedLoan.customerName}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">Click a loan row or Payment History button to load payments.</p>
              )}
            </div>
          </div>

          {selectedLoan && (
            <>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search Payments</label>
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Reference, pay type, officer"
                    className="mt-1 w-full rounded-xl border border-fuchsia-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-fuchsia-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-fuchsia-100 bg-white px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/70 p-3">
                  <p className="text-xs text-fuchsia-700 uppercase tracking-wide">Transactions</p>
                  <p className="mt-1 text-xl font-extrabold text-fuchsia-700">{historySummary.transactions}</p>
                </div>
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
                  <p className="text-xs text-cyan-700 uppercase tracking-wide">Collected</p>
                  <p className="mt-1 text-xl font-extrabold text-cyan-700">{formatMoney(historySummary.collected)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <p className="text-xs text-emerald-700 uppercase tracking-wide">Capital</p>
                  <p className="mt-1 text-xl font-extrabold text-emerald-700">{formatMoney(historySummary.capital)}</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                  <p className="text-xs text-indigo-700 uppercase tracking-wide">Interest</p>
                  <p className="mt-1 text-xl font-extrabold text-indigo-700">{formatMoney(historySummary.interest)}</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                  <p className="text-xs text-rose-700 uppercase tracking-wide">Penalty</p>
                  <p className="mt-1 text-xl font-extrabold text-rose-700">{formatMoney(historySummary.penalty)}</p>
                </div>
              </div>

              {filteredHistory.length > 0 && (
                <div className="mt-4 rounded-2xl border border-fuchsia-100 bg-white">
                  <div className="border-b border-fuchsia-100 bg-gradient-to-r from-fuchsia-50/80 via-pink-50/80 to-rose-50/80 px-4 py-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Graphical Preview</h3>
                    <p className="mt-1 text-xs text-slate-500">Compare payment components and review collected amount trend for latest transactions.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">Amount Components</p>
                      <div className="mt-3 space-y-3">
                        {chartData.componentRows.map((row) => {
                          const width = Math.max((row.value / chartData.maxComponent) * 100, row.value > 0 ? 3 : 0);
                          return (
                            <div key={row.key}>
                              <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                                <span className="font-semibold">{row.label}</span>
                                <span>{formatMoney(row.value)}</span>
                              </div>
                              <div className="h-3 rounded-full bg-white">
                                <div className={`h-3 rounded-full bg-gradient-to-r ${row.color}`} style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-100 bg-cyan-50/35 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Collected Trend</p>
                        <p className="text-xs text-slate-500">Latest {chartData.timelineRows.length} payments</p>
                      </div>
                      <svg viewBox="0 0 760 220" className="h-44 w-full">
                        <rect x="0" y="0" width="760" height="220" fill="transparent" />
                        {[0, 1, 2, 3, 4].map((step) => {
                          const y = 20 + (step / 4) * (220 - 46);
                          return <line key={`h-grid-${step}`} x1="30" y1={y} x2="736" y2={y} stroke="#bae6fd" strokeWidth="1" />;
                        })}
                        <polyline
                          points={timelinePoints}
                          fill="none"
                          stroke="#0891b2"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {chartData.timelineRows.map((row, index) => {
                          const x = 30 + (index / Math.max(chartData.timelineRows.length - 1, 1)) * (760 - 30 - 24);
                          const y = 20 + (1 - row.amount / chartData.maxTimeline) * (220 - 20 - 26);
                          return (
                            <g key={`timeline-point-${index}`}>
                              <circle cx={x} cy={y} r="4" fill="#06b6d4" />
                              <text x={x} y={212} textAnchor="middle" fontSize="10" fill="#475569">
                                {row.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedLoan ? (
            <p className="py-8 text-center text-slate-600">Select a loan to view payment history.</p>
          ) : historyLoading ? (
            <p className="py-8 text-center text-slate-600">Loading payment history...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="py-8 text-center text-slate-600">No payment history found for this loan.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-fuchsia-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-fuchsia-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date & Time</th>
                    <th className="px-3 py-2 font-semibold">Pay Type</th>
                    <th className="px-3 py-2 font-semibold">Reference</th>
                    <th className="px-3 py-2 font-semibold">Collected</th>
                    <th className="px-3 py-2 font-semibold">Capital</th>
                    <th className="px-3 py-2 font-semibold">Interest</th>
                    <th className="px-3 py-2 font-semibold">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row) => (
                    <tr key={row.id} className="border-b border-fuchsia-100 last:border-b-0 hover:bg-fuchsia-50/40">
                      <td className="px-3 py-2">{formatDateTime(row.date)}</td>
                      <td className="px-3 py-2 capitalize">{row.paymentType}</td>
                      <td className="px-3 py-2">{row.reference}</td>
                      <td className="px-3 py-2 text-cyan-700 font-semibold">{formatMoney(row.collected)}</td>
                      <td className="px-3 py-2 text-emerald-700 font-semibold">{formatMoney(row.capital)}</td>
                      <td className="px-3 py-2">{formatMoney(row.interest)}</td>
                      <td className="px-3 py-2">{formatMoney(row.penalty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
