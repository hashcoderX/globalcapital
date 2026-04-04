'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { CheckCircle2, Clock3, FileSearch, Search, ShieldAlert, XCircle } from 'lucide-react';

type MortgageApprovalRow = {
  id: number;
  due_date?: string | null;
  mortgage_type?: string | null;
  requested_amount?: number | string | null;
  approved_amount?: number | string | null;
  installment_amount?: number | string | null;
  installment_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | string | null;
  interest_rate?: number | string | null;
  interest_type?: 'fixed' | 'reducing' | string | null;
  tenure_months?: number | string | null;
  status?: string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    nic_passport?: string;
  } | null;
};

type ActionType = 'approve' | 'reject';

type MortgageDetail = MortgageApprovalRow & {
  created_at?: string | null;
  processing_fee?: number | string | null;
  penalty_rate?: number | string | null;
  customer_id?: number | string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    nic_passport?: string;
    email?: string;
    address?: string;
  } | null;
  asset?: {
    asset_type?: string | null;
    deed_number?: string | null;
    vehicle_reg_no?: string | null;
    description?: string | null;
    estimated_value?: number | string | null;
  } | null;
};

type CustomerDetail = {
  id: number;
  customer_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  nic_passport?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  nationality?: string | null;
  permanent_address?: string | null;
  current_address?: string | null;
  employment_type?: string | null;
  employer_name?: string | null;
  job_title?: string | null;
  monthly_income?: number | string | null;
  existing_loans?: boolean | number | string | null;
  monthly_loan_obligations?: number | string | null;
  credit_score?: number | string | null;
  status?: string | null;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function formatAmount(value: unknown): string {
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) return '-';
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: unknown): string {
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) return '-';
  return `${numeric.toFixed(2)}%`;
}

function formatDate(value: unknown): string {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function formatYesNo(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const lowered = String(value ?? '').toLowerCase();
  if (lowered === '1' || lowered === 'true' || lowered === 'yes') return 'Yes';
  if (lowered === '0' || lowered === 'false' || lowered === 'no') return 'No';
  return '-';
}

function getInstallmentCount(tenureMonths: unknown, frequency: unknown): number {
  const tenure = toNumber(tenureMonths);
  if (!Number.isFinite(tenure) || tenure <= 0) return 0;

  const perYearMap: Record<string, number> = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    yearly: 1,
  };

  const perYear = perYearMap[String(frequency || 'monthly').toLowerCase()] ?? 12;
  const years = tenure / 12;
  return Math.max(1, Math.round(years * perYear));
}

function calculateRefundAmount(row: MortgageApprovalRow | MortgageDetail): number {
  const installment = toNumber(row.installment_amount);
  const count = getInstallmentCount(row.tenure_months, row.installment_frequency);
  if (!Number.isFinite(installment) || count <= 0) return NaN;
  return installment * count;
}

export default function MortgageApprovals() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<MortgageApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('approve');
  const [actionRow, setActionRow] = useState<MortgageApprovalRow | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRow, setDetailRow] = useState<MortgageDetail | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

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

  useEffect(() => {
    if (!token) return;
    fetchApprovals(token);
  }, [token]);

  const fetchApprovals = async (authToken: string) => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/mortgages', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        params: { status: 'submitted', per_page: 200 },
      });

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      setRows(data);
    } catch {
      setRows([]);
      openToast('error', 'Failed to load submitted mortgages.');
    } finally {
      setLoading(false);
    }
  };

  const mortgageTypes = useMemo(() => {
    const values = Array.from(
      new Set(rows.map((row) => String(row.mortgage_type || '').toLowerCase()).filter((v) => v !== ''))
    );
    return values.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return rows.filter((row) => {
      const type = String(row.mortgage_type || '').toLowerCase();
      if (typeFilter !== 'all' && type !== typeFilter) return false;

      if (!keyword) return true;

      const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
      const haystack = [
        row.id,
        type,
        customerName,
        row.customer?.phone || '',
        row.customer?.nic_passport || '',
        row.interest_type || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [rows, query, typeFilter]);

  const stats = useMemo(() => {
    const requestedTotal = filteredRows.reduce((sum, row) => {
      const amount = toNumber(row.requested_amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const averageRate = filteredRows.length
      ? filteredRows.reduce((sum, row) => {
          const rate = toNumber(row.interest_rate);
          return sum + (Number.isFinite(rate) ? rate : 0);
        }, 0) / filteredRows.length
      : 0;

    const reducingCount = filteredRows.filter((row) => String(row.interest_type || '').toLowerCase() === 'reducing').length;

    return {
      pending: filteredRows.length,
      requestedTotal,
      averageRate,
      reducingCount,
    };
  }, [filteredRows]);

  const openActionModal = (type: ActionType, row: MortgageApprovalRow) => {
    setActionType(type);
    setActionRow(row);
    setActionNote('');
    setActionModalOpen(true);
  };

  const runStatusAction = async (type: ActionType, row: MortgageApprovalRow, note?: string) => {
    if (!token) return;

    try {
      setActionLoading(true);
      await axios.post(
        `http://localhost:8000/api/mortgages/${row.id}/status`,
        {
          action: type,
          note: note?.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setActionModalOpen(false);
      setDetailModalOpen(false);
      openToast('success', `Mortgage #${row.id} ${type === 'approve' ? 'approved' : 'rejected'} successfully.`);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Action failed. Please try again.';
      openToast('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailModal = async (id: number) => {
    if (!token) return;

    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailRow(null);
    setCustomerDetail(null);
    setCustomerLoading(false);

    try {
      const response = await axios.get(`http://localhost:8000/api/mortgages/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const payload = response.data?.data ?? response.data;
      setDetailRow(payload || null);

      const customerId = payload?.customer_id;
      if (customerId) {
        setCustomerLoading(true);

        try {
          const customerResponse = await axios.get(`http://localhost:8000/api/customers/${customerId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });

          const customerPayload = customerResponse.data?.data ?? customerResponse.data;
          setCustomerDetail(customerPayload || null);
        } catch {
          setCustomerDetail(null);
        } finally {
          setCustomerLoading(false);
        }
      }
    } catch {
      setDetailRow(null);
      openToast('error', 'Failed to load mortgage details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitAction = async () => {
    if (!actionRow) return;
    await runStatusAction(actionType, actionRow, actionNote);
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

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/82 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
                Mortgage Approval Desk
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Pending Mortgage Approvals</h1>
              <p className="text-sm text-slate-600 mt-1">Review submitted mortgage applications and approve or reject with clear decision tracking.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard/mortgages')}
                className="px-4 py-2 rounded-xl bg-white hover:bg-cyan-50 text-cyan-800 text-sm font-semibold border border-cyan-200 shadow-sm"
              >
                Back
              </button>
              <button
                onClick={() => fetchApprovals(token)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold shadow-md"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.pending}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Requested Total</p>
              <p className="text-2xl font-extrabold text-cyan-700 mt-1">{formatAmount(stats.requestedTotal)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Avg Interest Rate</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{formatPercent(stats.averageRate)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Reducing Type</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.reducingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Submitted Mortgage Requests</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[250px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
                  placeholder="Search by id, customer, NIC, phone"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-slate-900"
              >
                <option value="all">All Types</option>
                {mortgageTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-100/60 to-teal-100/40 p-8 text-sm text-slate-700 text-center">
              No submitted mortgages found.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">ID</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Contact</th>
                    <th className="px-3 py-2 font-semibold">NIC</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Requested</th>
                    <th className="px-3 py-2 font-semibold">Installment</th>
                    <th className="px-3 py-2 font-semibold">Refund Amount</th>
                    <th className="px-3 py-2 font-semibold">Rate</th>
                    <th className="px-3 py-2 font-semibold">Tenure</th>
                    <th className="px-3 py-2 font-semibold">Due Date</th>
                    <th className="px-3 py-2 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
                    const refundAmount = calculateRefundAmount(row);

                    return (
                      <tr key={row.id} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-900">#{row.id}</td>
                        <td className="px-3 py-2">{customerName || '-'}</td>
                        <td className="px-3 py-2">{row.customer?.phone || '-'}</td>
                        <td className="px-3 py-2">{row.customer?.nic_passport || '-'}</td>
                        <td className="px-3 py-2 capitalize">{row.mortgage_type || '-'}</td>
                        <td className="px-3 py-2 font-semibold text-cyan-700">{formatAmount(row.requested_amount)}</td>
                        <td className="px-3 py-2 font-semibold text-indigo-700">{formatAmount(row.installment_amount)}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-700">{formatAmount(refundAmount)}</td>
                        <td className="px-3 py-2">{formatPercent(row.interest_rate)} ({row.interest_type || '-'})</td>
                        <td className="px-3 py-2">{row.tenure_months || '-'} months</td>
                        <td className="px-3 py-2">{formatDate(row.due_date)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openActionModal('approve', row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-xs font-semibold border border-cyan-200"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal('reject', row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-semibold border border-indigo-200"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => openDetailModal(row.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-semibold border border-teal-200"
                            >
                              <FileSearch className="h-3.5 w-3.5" />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {detailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white border border-cyan-100 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mortgage Details</h3>
                <p className="text-sm text-slate-600 mt-1">Comprehensive view of selected mortgage request.</p>
              </div>
              <div className="flex items-center gap-2">
                {detailRow && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        openActionModal('reject', detailRow);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-800 text-sm font-semibold"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openActionModal('approve', detailRow);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold"
                    >
                      Accept
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto">
              {detailLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
                </div>
              ) : !detailRow ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                  Unable to load mortgage detail.
                </div>
              ) : (
                (() => {
                  const refundAmount = calculateRefundAmount(detailRow);
                  const installmentCount = getInstallmentCount(detailRow.tenure_months, detailRow.installment_frequency);
                  return (
                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Mortgage #{detailRow.id}</p>
                        <p className="text-lg font-bold text-slate-900 capitalize mt-1">{detailRow.mortgage_type || '-'}</p>
                      </div>
                      <p className="inline-flex rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-800">
                        {detailRow.status || '-'}
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-cyan-100 bg-white p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Requested</p>
                        <p className="font-bold text-slate-900 mt-1">{formatAmount(detailRow.requested_amount)}</p>
                      </div>
                      <div className="rounded-lg border border-cyan-100 bg-white p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Approved</p>
                        <p className="font-bold text-slate-900 mt-1">{formatAmount(detailRow.approved_amount)}</p>
                      </div>
                      <div className="rounded-lg border border-cyan-100 bg-white p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Installment</p>
                        <p className="font-bold text-indigo-700 mt-1">{formatAmount(detailRow.installment_amount)}</p>
                      </div>
                      <div className="rounded-lg border border-cyan-100 bg-white p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Refund Amount</p>
                        <p className="font-bold text-emerald-700 mt-1">{formatAmount(refundAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-7 space-y-4">
                      <div className="rounded-xl border border-cyan-100 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">Financial Terms</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <p className="text-slate-700">Interest: <span className="font-semibold">{formatPercent(detailRow.interest_rate)} ({detailRow.interest_type || '-'})</span></p>
                          <p className="text-slate-700">Tenure: <span className="font-semibold">{detailRow.tenure_months || '-'} months</span></p>
                          <p className="text-slate-700">Due Date: <span className="font-semibold">{formatDate(detailRow.due_date)}</span></p>
                          <p className="text-slate-700">Processing Fee: <span className="font-semibold">{formatAmount(detailRow.processing_fee)}</span></p>
                          <p className="text-slate-700">Penalty Rate: <span className="font-semibold">{formatPercent(detailRow.penalty_rate)}</span></p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-cyan-100 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">Repayment Summary</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <p className="text-slate-700">Installment Amount: <span className="font-semibold">{formatAmount(detailRow.installment_amount)}</span></p>
                          <p className="text-slate-700">Installment Count: <span className="font-semibold">{installmentCount || '-'}</span></p>
                          <p className="text-slate-700">Refund Frequency: <span className="font-semibold capitalize">{detailRow.installment_frequency || '-'}</span></p>
                          <p className="text-slate-700">Refund Amount: <span className="font-semibold">{formatAmount(refundAmount)}</span></p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-cyan-100 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Asset</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <p className="text-slate-700">Type: <span className="font-semibold capitalize">{detailRow.asset?.asset_type || '-'}</span></p>
                          <p className="text-slate-700">Deed No: <span className="font-semibold">{detailRow.asset?.deed_number || '-'}</span></p>
                          <p className="text-slate-700">Vehicle No: <span className="font-semibold">{detailRow.asset?.vehicle_reg_no || '-'}</span></p>
                          <p className="text-slate-700">Estimated Value: <span className="font-semibold">{formatAmount(detailRow.asset?.estimated_value)}</span></p>
                          <p className="text-slate-700 md:col-span-2">Description: <span className="font-semibold">{detailRow.asset?.description || '-'}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="xl:col-span-5">
                      <div className="rounded-xl border border-cyan-100 p-4 h-full">
                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Customer Profile</p>
                    <p className="text-slate-700">
                      Name: <span className="font-semibold">{`${customerDetail?.first_name || detailRow.customer?.first_name || ''} ${customerDetail?.last_name || detailRow.customer?.last_name || ''}`.trim() || '-'}</span>
                    </p>
                    <p className="text-slate-700">Phone: <span className="font-semibold">{customerDetail?.phone || detailRow.customer?.phone || '-'}</span></p>
                    <p className="text-slate-700">NIC: <span className="font-semibold">{customerDetail?.nic_passport || detailRow.customer?.nic_passport || '-'}</span></p>
                    <p className="text-slate-700">Email: <span className="font-semibold">{customerDetail?.email || detailRow.customer?.email || '-'}</span></p>
                    <p className="text-slate-700">Customer Code: <span className="font-semibold">{customerDetail?.customer_code || '-'}</span></p>
                    <p className="text-slate-700">DOB: <span className="font-semibold">{formatDate(customerDetail?.date_of_birth)}</span></p>
                    <p className="text-slate-700">Gender: <span className="font-semibold capitalize">{customerDetail?.gender || '-'}</span></p>
                    <p className="text-slate-700">Marital Status: <span className="font-semibold capitalize">{customerDetail?.marital_status || '-'}</span></p>
                    <p className="text-slate-700">Nationality: <span className="font-semibold">{customerDetail?.nationality || '-'}</span></p>
                    <p className="text-slate-700">Employment: <span className="font-semibold capitalize">{customerDetail?.employment_type || '-'}</span></p>
                    <p className="text-slate-700">Employer: <span className="font-semibold">{customerDetail?.employer_name || '-'}</span></p>
                    <p className="text-slate-700">Job Title: <span className="font-semibold">{customerDetail?.job_title || '-'}</span></p>
                    <p className="text-slate-700">Monthly Income: <span className="font-semibold">{formatAmount(customerDetail?.monthly_income)}</span></p>
                    <p className="text-slate-700">Existing Loans: <span className="font-semibold">{formatYesNo(customerDetail?.existing_loans)}</span></p>
                    <p className="text-slate-700">Loan Obligations: <span className="font-semibold">{formatAmount(customerDetail?.monthly_loan_obligations)}</span></p>
                    <p className="text-slate-700">Credit Score: <span className="font-semibold">{customerDetail?.credit_score || '-'}</span></p>
                    <p className="text-slate-700">Status: <span className="font-semibold capitalize">{customerDetail?.status || '-'}</span></p>
                    <p className="text-slate-700">Permanent Address: <span className="font-semibold">{customerDetail?.permanent_address || '-'}</span></p>
                    <p className="text-slate-700">Current Address: <span className="font-semibold">{customerDetail?.current_address || detailRow.customer?.address || '-'}</span></p>
                    {customerLoading && <p className="text-xs text-cyan-700 mt-2">Loading full customer profile...</p>}
                      </div>
                    </div>
                  </div>
                </div>
                  );
                })()
              )}
            </div>

            {detailRow && (
              <div className="px-5 py-4 border-t border-cyan-100 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openActionModal('reject', detailRow);
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-800 text-sm font-semibold"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openActionModal('approve', detailRow);
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold"
                >
                  Accept
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {actionModalOpen && actionRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-cyan-100 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {actionType === 'approve' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-rose-600" />}
                {actionType === 'approve' ? 'Approve Mortgage' : 'Reject Mortgage'}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Mortgage #{actionRow.id} | Requested: {formatAmount(actionRow.requested_amount)}
              </p>
            </div>

            <div className="p-5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={4}
                placeholder={actionType === 'approve' ? 'Approval note' : 'Reason for rejection'}
                className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="px-5 py-4 border-t border-cyan-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAction}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-md ${
                  actionType === 'approve'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
                    : 'bg-gradient-to-r from-indigo-600 to-slate-700 hover:from-indigo-700 hover:to-slate-800'
                } disabled:opacity-60`}
              >
                {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-xl border ${
              toast.kind === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
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
