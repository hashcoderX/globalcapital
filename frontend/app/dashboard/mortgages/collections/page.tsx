'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Banknote, Clock3, Eye, ReceiptText, Search } from 'lucide-react';

type MortgageRow = {
  id: number;
  due_date?: string | null;
  arrears_amount?: number | string | null;
  due_amount?: number | string | null;
  due_interest_amount?: number | string | null;
  created_at?: string | null;
  mortgage_type?: string | null;
  requested_amount?: number | string | null;
  approved_amount?: number | string | null;
  installment_amount?: number | string | null;
  installment_frequency?: string | null;
  interest_rate?: number | string | null;
  interest_type?: string | null;
  tenure_months?: number | string | null;
  status?: string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    nic_passport?: string;
  } | null;
  asset?: {
    deed_number?: string | null;
    vehicle_reg_no?: string | null;
    description?: string | null;
  } | null;
};

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function formatAmount(v: unknown): string {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(v: unknown): string {
  if (!v) return '-';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function frequencyLabel(frequency: unknown): string {
  const f = String(frequency || 'monthly').toLowerCase();
  if (f === 'daily') return 'Daily';
  if (f === 'weekly') return 'Weekly';
  if (f === 'monthly') return 'Monthly';
  if (f === 'quarterly') return 'Quarterly';
  if (f === 'yearly') return 'Yearly';
  return 'Monthly';
}

export default function MortgageCollectionsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MortgageRow[]>([]);
  const [query, setQuery] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentRow, setPaymentRow] = useState<MortgageRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsRow, setDetailsRow] = useState<MortgageRow | null>(null);
  const [billOpen, setBillOpen] = useState(false);
  const [billData, setBillData] = useState<{
    billNo: string;
    paymentId: number;
    mortgageId: number;
    paidDate: string;
    customerName: string;
    amount: number;
    paymentMethod: string;
    remarks?: string;
    interestPaid?: number;
    principalPaid?: number;
    dueAmount?: number;
    dueInterestAmount?: number;
    arrearsAmount?: number;
  } | null>(null);

  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustRow, setAdjustRow] = useState<MortgageRow | null>(null);
  const [adjustMode, setAdjustMode] = useState<'waive' | 'add'>('waive');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  const openToast = (kind: 'success' | 'error', message: string) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }
    setToken(t);
  }, [router]);

  const fetchRows = async (authToken: string) => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/mortgages', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        params: { per_page: 1000 },
      });

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      const allowed = new Set(['approved', 'active', 'arrears', 'released']);
      setRows(data.filter((row: MortgageRow) => allowed.has(String(row.status || '').toLowerCase())));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchRows(token);
  }, [token]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
      const haystack = [
        row.id,
        row.mortgage_type || '',
        row.status || '',
        customerName,
        row.customer?.phone || '',
        row.customer?.nic_passport || '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesText = !q || haystack.includes(q);

      const dueDateRaw = row.due_date ? new Date(String(row.due_date)) : null;
      const hasValidDue = !!dueDateRaw && !Number.isNaN(dueDateRaw.getTime());

      const fromDate = dueFrom ? new Date(`${dueFrom}T00:00:00`) : null;
      const toDate = dueTo ? new Date(`${dueTo}T23:59:59`) : null;

      const matchesDueFrom = !fromDate || (hasValidDue && (dueDateRaw as Date) >= fromDate);
      const matchesDueTo = !toDate || (hasValidDue && (dueDateRaw as Date) <= toDate);

      return matchesText && matchesDueFrom && matchesDueTo;
    });
  }, [rows, query, dueFrom, dueTo]);

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const arrears = filteredRows.filter((row) => String(row.status || '').toLowerCase() === 'arrears').length;
    const installmentBook = filteredRows.reduce((sum, row) => {
      const value = toNumber(row.installment_amount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return { total, arrears, installmentBook };
  }, [filteredRows]);

  const openPaymentModal = (row: MortgageRow) => {
    setPaymentRow(row);
    setPaymentAmount('');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setPaymentDate(`${yyyy}-${mm}-${dd}`);
    setPaymentMethod('cash');
    setPaymentNote('');
    setPaymentOpen(true);
  };

  const openAdjustModal = (row: MortgageRow) => {
    setAdjustRow(row);
    setAdjustMode('waive');
    setAdjustAmount('');
    setAdjustNote('');
    setAdjustOpen(true);
  };

  const openDetailsModal = async (row: MortgageRow) => {
    setDetailsRow(row);
    setDetailsOpen(true);

    if (!token) return;

    try {
      setDetailsLoading(true);
      const response = await axios.get(`http://localhost:8000/api/mortgages/${row.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = response?.data;
      if (data && typeof data === 'object') {
        setDetailsRow((prev) => ({ ...(prev || row), ...data }));
      }
    } catch {
      openToast('error', `Failed to load full details for mortgage #${row.id}.`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!token || !paymentRow) return;

    const amount = toNumber(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      openToast('error', 'Enter a valid collection amount.');
      return;
    }

    try {
      setSavingPayment(true);
      const response = await axios.post(
        `http://localhost:8000/api/mortgages/${paymentRow.id}/payments`,
        {
          mortgage_id: paymentRow.id,
          branch_id: null,
          user_id: null,
          schedule_id: null,
          paid_date: paymentDate,
          amount,
          payment_method: paymentMethod,
          remarks: paymentNote.trim() || undefined,
          collected_by: null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const resData = response?.data || {};
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');

      const customerName = `${paymentRow.customer?.first_name || ''} ${paymentRow.customer?.last_name || ''}`.trim() || 'N/A';
      const paymentId = Number(resData.id || 0);
      const billNo = `BILL-MTG-${paymentRow.id}-${paymentId || `${yyyy}${mm}${dd}`}`;

      setBillData({
        billNo,
        paymentId,
        mortgageId: paymentRow.id,
        paidDate: paymentDate,
        customerName,
        amount,
        paymentMethod,
        remarks: paymentNote.trim() || undefined,
        interestPaid: Number(resData.interest_paid || 0),
        principalPaid: Number(resData.principal_paid || 0),
        dueAmount: Number(resData.due_amount || 0),
        dueInterestAmount: Number(resData.due_interest_amount || 0),
        arrearsAmount: Number(resData.arrears_amount || 0),
      });

      // Immediate UI sync for due fields/status, then reload authoritative backend state.
      setRows((prev) => prev
        .map((r) => {
          if (r.id !== paymentRow.id) return r;
          return {
            ...r,
            due_amount: Number(resData.due_amount ?? r.due_amount ?? 0),
            due_interest_amount: Number(resData.due_interest_amount ?? r.due_interest_amount ?? 0),
            arrears_amount: Number(resData.arrears_amount ?? r.arrears_amount ?? 0),
            due_date: (resData.due_date ?? r.due_date ?? null) as string | null,
            status: String(resData.mortgage_status || r.status || 'active'),
          };
        })
        .filter((r) => {
          const allowed = new Set(['approved', 'active', 'arrears', 'released']);
          return allowed.has(String(r.status || '').toLowerCase());
        })
      );

      await fetchRows(token);

      setPaymentOpen(false);
      setBillOpen(true);
      openToast('success', `Collection recorded for mortgage #${paymentRow.id}.`);
    } catch {
      openToast('error', 'Failed to record collection.');
    } finally {
      setSavingPayment(false);
    }
  };

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const printBill = () => {
    if (!billData) return;

    const content = `
      <html>
        <head>
          <title>Mortgage Bill ${billData.billNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            .meta { margin-bottom: 18px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #f1f5f9; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Mortgage Collection Bill</h1>
          <div class="meta">
            <div>Bill No: ${billData.billNo}</div>
            <div>Payment ID: ${billData.paymentId || '-'}</div>
            <div>Date: ${formatDate(billData.paidDate)}</div>
            <div>Mortgage ID: #${billData.mortgageId}</div>
            <div>Customer: ${billData.customerName}</div>
          </div>

          <table>
            <tr><th>Description</th><th>Amount</th></tr>
            <tr><td>Collected Amount</td><td>${formatAmount(billData.amount)}</td></tr>
            <tr><td>Interest Paid (Profit)</td><td>${formatAmount(billData.interestPaid ?? 0)}</td></tr>
            <tr><td>Principal Paid</td><td>${formatAmount(billData.principalPaid ?? 0)}</td></tr>
            <tr><td>Remaining Due Principal</td><td>${formatAmount(billData.dueAmount ?? 0)}</td></tr>
            <tr><td>Next Due Interest</td><td>${formatAmount(billData.dueInterestAmount ?? 0)}</td></tr>
            <tr><td>Arrears</td><td>${formatAmount(billData.arrearsAmount ?? 0)}</td></tr>
            <tr><td>Payment Method</td><td>${billData.paymentMethod}</td></tr>
            <tr><td>Remarks</td><td>${billData.remarks || '-'}</td></tr>
          </table>
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(content);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/82 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
                Collection Desk
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Mortgage Collection Management</h1>
              <p className="text-sm text-slate-600 mt-1">Manage collection posting for running mortgages and track arrears-sensitive accounts.</p>
            </div>

            <button
              onClick={() => router.push('/dashboard/mortgages')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-cyan-50 text-cyan-800 text-sm font-semibold border border-cyan-200 shadow-sm"
            >
              Back
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Running Accounts</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Arrears Accounts</p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">{stats.arrears}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Installment Book</p>
              <p className="text-2xl font-extrabold text-cyan-700 mt-1">{formatAmount(stats.installmentBook)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Collection-Eligible Mortgages</h2>
            <div className="flex items-end gap-2 flex-wrap justify-end">
              <div className="relative min-w-[270px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                  placeholder="Search by id, customer, NIC, phone"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due From</label>
                <input
                  type="date"
                  value={dueFrom}
                  onChange={(e) => setDueFrom(e.target.value)}
                  className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due To</label>
                <input
                  type="date"
                  value={dueTo}
                  onChange={(e) => setDueTo(e.target.value)}
                  className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setDueFrom('');
                  setDueTo('');
                }}
                className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100">
            <table className="min-w-full text-sm text-left text-slate-700 bg-white">
              <thead className="bg-cyan-50/70 text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">ID</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="px-3 py-2 font-semibold">Phone</th>
                  <th className="px-3 py-2 font-semibold">NIC</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Requested</th>
                  <th className="px-3 py-2 font-semibold">Approved</th>
                  <th className="px-3 py-2 font-semibold">Interest</th>
                  <th className="px-3 py-2 font-semibold">Tenure</th>
                  <th className="px-3 py-2 font-semibold">Asset Ref</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Installment</th>
                  <th className="px-3 py-2 font-semibold">Frequency</th>
                  <th className="px-3 py-2 font-semibold">Due Date</th>
                  <th className="px-3 py-2 font-semibold">Arrears</th>
                  <th className="px-3 py-2 font-semibold">Due Principal</th>
                  <th className="px-3 py-2 font-semibold">Due Interest</th>
                  <th className="px-3 py-2 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
                  return (
                    <tr key={row.id} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                      <td className="px-3 py-2 font-semibold text-slate-900">#{row.id}</td>
                      <td className="px-3 py-2">{formatDate(row.created_at)}</td>
                      <td className="px-3 py-2">{customerName || '-'}</td>
                      <td className="px-3 py-2">{row.customer?.phone || '-'}</td>
                      <td className="px-3 py-2">{row.customer?.nic_passport || '-'}</td>
                      <td className="px-3 py-2 capitalize">{row.mortgage_type || '-'}</td>
                      <td className="px-3 py-2">{formatAmount(row.requested_amount)}</td>
                      <td className="px-3 py-2">{formatAmount(row.approved_amount)}</td>
                      <td className="px-3 py-2">{Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}% (${row.interest_type || '-'})` : '-'}</td>
                      <td className="px-3 py-2">{row.tenure_months || '-'} mo</td>
                      <td className="px-3 py-2">{row.asset?.vehicle_reg_no || row.asset?.deed_number || row.asset?.description || '-'}</td>
                      <td className="px-3 py-2 capitalize">{row.status || '-'}</td>
                      <td className="px-3 py-2 font-semibold text-cyan-700">{formatAmount(row.installment_amount)}</td>
                      <td className="px-3 py-2">{frequencyLabel(row.installment_frequency)}</td>
                      <td className="px-3 py-2">{formatDate(row.due_date)}</td>
                      <td className="px-3 py-2 font-semibold text-rose-700">{formatAmount(row.arrears_amount ?? 0)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{formatAmount(row.due_amount ?? 0)}</td>
                      <td className="px-3 py-2 font-semibold text-amber-700">{formatAmount(row.due_interest_amount ?? 0)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetailsModal(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => openPaymentModal(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-xs font-semibold border border-cyan-200"
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Collect
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/mortgages/${row.id}/payments`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-semibold border border-indigo-200"
                          >
                            <ReceiptText className="h-3.5 w-3.5" />
                            History
                          </button>
                          <button
                            type="button"
                            onClick={() => openAdjustModal(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200"
                          >
                            <Clock3 className="h-3.5 w-3.5" />
                            Adjust Interest
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRows.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-600">No collection-eligible mortgages found.</div>
            )}
          </div>
        </div>
      </div>

      {detailsOpen && detailsRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white border border-cyan-100 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-slate-50 to-cyan-50 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mortgage Details #{detailsRow.id}</h3>
                <p className="text-sm text-slate-600 mt-1">View full mortgage information without leaving collections.</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto">
              {detailsLoading && (
                <div className="text-sm font-medium text-cyan-700">Loading full details...</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 capitalize">{detailsRow.status || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(detailsRow.due_date)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Arrears</p>
                  <p className="mt-1 text-sm font-bold text-rose-700">{formatAmount(detailsRow.arrears_amount ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Due Principal</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatAmount(detailsRow.due_amount ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Due Interest</p>
                  <p className="mt-1 text-sm font-bold text-amber-700">{formatAmount(detailsRow.due_interest_amount ?? 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide font-semibold text-cyan-800">Customer</p>
                  <p className="text-sm text-slate-800">
                    {(detailsRow.customer?.first_name || detailsRow.customer?.last_name)
                      ? `${detailsRow.customer?.first_name ?? ''} ${detailsRow.customer?.last_name ?? ''}`.trim()
                      : '-'}
                  </p>
                  <p className="text-sm text-slate-700">Phone: {detailsRow.customer?.phone || '-'}</p>
                  <p className="text-sm text-slate-700">NIC: {detailsRow.customer?.nic_passport || '-'}</p>
                </div>

                <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide font-semibold text-cyan-800">Loan Terms</p>
                  <p className="text-sm text-slate-700">Type: <span className="capitalize">{detailsRow.mortgage_type || '-'}</span></p>
                  <p className="text-sm text-slate-700">Requested: {formatAmount(detailsRow.requested_amount)}</p>
                  <p className="text-sm text-slate-700">Approved: {formatAmount(detailsRow.approved_amount)}</p>
                  <p className="text-sm text-slate-700">Installment: {formatAmount(detailsRow.installment_amount)}</p>
                  <p className="text-sm text-slate-700">Frequency: {frequencyLabel(detailsRow.installment_frequency)}</p>
                  <p className="text-sm text-slate-700">Interest: {Number.isFinite(toNumber(detailsRow.interest_rate)) ? `${toNumber(detailsRow.interest_rate).toFixed(2)}% (${detailsRow.interest_type || '-'})` : '-'}</p>
                  <p className="text-sm text-slate-700">Tenure: {detailsRow.tenure_months || '-'} months</p>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-100 bg-white p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide font-semibold text-cyan-800">Asset</p>
                <p className="text-sm text-slate-700">Reference: {detailsRow.asset?.vehicle_reg_no || detailsRow.asset?.deed_number || '-'}</p>
                <p className="text-sm text-slate-700">Description: {detailsRow.asset?.description || '-'}</p>
                <p className="text-sm text-slate-700">Created: {formatDate(detailsRow.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentOpen && paymentRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-cyan-100 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
              <h3 className="text-lg font-bold text-slate-900">Record Collection</h3>
              <p className="text-sm text-slate-600 mt-1">Mortgage #{paymentRow.id} • Installment {formatAmount(paymentRow.installment_amount)}</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Amount</label>
                <input
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="e.g. 25000"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="transfer">Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Note</label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Optional collection note"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-cyan-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPayment}
                disabled={savingPayment}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingPayment ? 'Saving...' : 'Record Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustOpen && adjustRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-amber-100 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <h3 className="text-lg font-bold text-slate-900">Manual Interest Adjustment</h3>
              <p className="text-sm text-slate-600 mt-1">Mortgage #{adjustRow.id} 
                
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Action</label>
                  <select
                    value={adjustMode}
                    onChange={(e) => setAdjustMode(e.target.value as 'waive' | 'add')}
                    className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="waive">Waive / Cutoff Interest</option>
                    <option value="add">Add Special Interest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Amount</label>
                  <input
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Note</label>
                <textarea
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Reason for manual interest adjustment"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-amber-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustOpen(false)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAdjust}
                onClick={async () => {
                  if (!token || !adjustRow) return;
                  const value = toNumber(adjustAmount);
                  if (!Number.isFinite(value) || value <= 0) {
                    openToast('error', 'Enter a valid adjustment amount.');
                    return;
                  }
                  try {
                    setSavingAdjust(true);
                    const response = await axios.post(
                      `http://localhost:8000/api/mortgages/${adjustRow.id}/interest-adjustments`,
                      {
                        mode: adjustMode,
                        amount: value,
                        note: adjustNote.trim() || undefined,
                      },
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                          Accept: 'application/json',
                        },
                      }
                    );

                    const data = response?.data || {};

                    setRows((prev) => prev.map((r) => {
                      if (r.id !== adjustRow.id) return r;
                      return {
                        ...r,
                        due_interest_amount: Number(data.due_interest_amount ?? r.due_interest_amount ?? 0),
                        arrears_amount: Number(data.arrears_amount ?? r.arrears_amount ?? 0),
                        status: String(data.status || r.status || 'active'),
                      };
                    }));

                    openToast('success', 'Interest adjusted successfully.');
                    setAdjustOpen(false);
                  } catch {
                    openToast('error', 'Failed to adjust interest.');
                  } finally {
                    setSavingAdjust(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingAdjust ? 'Saving...' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {billOpen && billData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-cyan-100 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-emerald-50 to-cyan-50">
              <h3 className="text-lg font-bold text-slate-900">Collection Bill Generated</h3>
              <p className="text-sm text-slate-600 mt-1">Bill No: {billData.billNo}</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Mortgage:</span> <span className="font-semibold">#{billData.mortgageId}</span></div>
              <div><span className="text-slate-500">Date:</span> <span className="font-semibold">{formatDate(billData.paidDate)}</span></div>
              <div><span className="text-slate-500">Customer:</span> <span className="font-semibold">{billData.customerName}</span></div>
              <div><span className="text-slate-500">Method:</span> <span className="font-semibold capitalize">{billData.paymentMethod}</span></div>
              <div><span className="text-slate-500">Collected:</span> <span className="font-semibold">{formatAmount(billData.amount)}</span></div>
              <div><span className="text-slate-500">Interest (Profit):</span> <span className="font-semibold text-emerald-700">{formatAmount(billData.interestPaid ?? 0)}</span></div>
              <div><span className="text-slate-500">Principal Paid:</span> <span className="font-semibold">{formatAmount(billData.principalPaid ?? 0)}</span></div>
              <div><span className="text-slate-500">Due Principal:</span> <span className="font-semibold">{formatAmount(billData.dueAmount ?? 0)}</span></div>
              <div><span className="text-slate-500">Due Interest:</span> <span className="font-semibold">{formatAmount(billData.dueInterestAmount ?? 0)}</span></div>
              <div><span className="text-slate-500">Arrears:</span> <span className="font-semibold text-rose-700">{formatAmount(billData.arrearsAmount ?? 0)}</span></div>
              <div className="md:col-span-2"><span className="text-slate-500">Remarks:</span> <span className="font-semibold">{billData.remarks || '-'}</span></div>
            </div>

            <div className="px-5 py-4 border-t border-cyan-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBillOpen(false)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={printBill}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold"
              >
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-xl border ${toast.kind === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {toast.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
