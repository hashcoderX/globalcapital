'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Download, Filter, ShieldAlert } from 'lucide-react';

type ArrearsRow = {
  id: number;
  mortgage_type?: string | null;
  status?: string | null;
  due_date?: string | null;
  due_amount?: number | string | null;
  due_interest_amount?: number | string | null;
  arrears_amount?: number | string | null;
  days_overdue?: number;
  customer?: {
    customer_code?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    nic_passport?: string | null;
    phone?: string | null;
  } | null;
  asset?: {
    asset_type?: string | null;
    deed_number?: string | null;
    vehicle_reg_no?: string | null;
  } | null;
};

type ArrearsSummary = {
  arrears_accounts: number;
  total_arrears: number;
  total_due_principal: number;
  total_due_interest: number;
  overdue_accounts: number;
  high_risk_accounts: number;
};

type PaginatedResponse = {
  data: ArrearsRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: unknown): string {
  const amount = toNumber(value);
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: unknown): string {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, headers: string[], rows: Array<Array<string>>) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function MortgageArrearsReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const branchId = Number(searchParams.get('branch_id') || 0) || undefined;

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fromDueDate, setFromDueDate] = useState('');
  const [toDueDate, setToDueDate] = useState('');
  const [status, setStatus] = useState('all');
  const [mortgageType, setMortgageType] = useState('all');
  const [minArrears, setMinArrears] = useState('');

  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const [rows, setRows] = useState<ArrearsRow[]>([]);
  const [summary, setSummary] = useState<ArrearsSummary>({
    arrears_accounts: 0,
    total_arrears: 0,
    total_due_principal: 0,
    total_due_interest: 0,
    overdue_accounts: 0,
    high_risk_accounts: 0,
  });
  const [pagination, setPagination] = useState<PaginatedResponse>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const fetchReport = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/mortgages/reports/arrears`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          branch_id: branchId,
          from_due_date: fromDueDate || undefined,
          to_due_date: toDueDate || undefined,
          status: status === 'all' ? undefined : status,
          mortgage_type: mortgageType === 'all' ? undefined : mortgageType,
          search: search.trim() || undefined,
          min_arrears: minArrears.trim() || undefined,
          per_page: perPage,
          page,
        },
      });

      const payload = response.data || {};
      const paginated = payload.data || {};

      setSummary({
        arrears_accounts: Number(payload.summary?.arrears_accounts || 0),
        total_arrears: toNumber(payload.summary?.total_arrears),
        total_due_principal: toNumber(payload.summary?.total_due_principal),
        total_due_interest: toNumber(payload.summary?.total_due_interest),
        overdue_accounts: Number(payload.summary?.overdue_accounts || 0),
        high_risk_accounts: Number(payload.summary?.high_risk_accounts || 0),
      });

      const nextRows = Array.isArray(paginated.data) ? paginated.data : [];
      setRows(nextRows);

      setPagination({
        data: nextRows,
        current_page: Number(paginated.current_page || 1),
        last_page: Number(paginated.last_page || 1),
        per_page: Number(paginated.per_page || perPage),
        total: Number(paginated.total || nextRows.length),
      });
    } catch {
      setSummary({
        arrears_accounts: 0,
        total_arrears: 0,
        total_due_principal: 0,
        total_due_interest: 0,
        overdue_accounts: 0,
        high_risk_accounts: 0,
      });
      setRows([]);
      setPagination((prev) => ({ ...prev, data: [], total: 0, last_page: 1, current_page: 1 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, branchId]);

  const applyFilters = () => {
    setPage(1);
    fetchReport();
  };

  const resetFilters = () => {
    setSearch('');
    setFromDueDate('');
    setToDueDate('');
    setStatus('all');
    setMortgageType('all');
    setMinArrears('');
    setPage(1);
    setTimeout(() => {
      fetchReport();
    }, 0);
  };

  const exportCurrentPageCsv = () => {
    const headers = [
      'Mortgage ID',
      'Customer',
      'Customer Code',
      'Mortgage Type',
      'Status',
      'Due Date',
      'Days Overdue',
      'Arrears Amount',
      'Due Principal',
      'Due Interest',
      'Asset',
      'Reference',
    ];

    const data = rows.map((row) => {
      const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
      return [
        String(row.id),
        customerName || '-',
        String(row.customer?.customer_code || '-'),
        String(row.mortgage_type || '-'),
        String(row.status || '-'),
        formatDate(row.due_date),
        String(row.days_overdue || 0),
        formatAmount(row.arrears_amount),
        formatAmount(row.due_amount),
        formatAmount(row.due_interest_amount),
        String(row.asset?.asset_type || '-'),
        String(row.asset?.deed_number || row.asset?.vehicle_reg_no || '-'),
      ];
    });

    downloadCsv('mortgage-arrears-report.csv', headers, data);
  };

  const arrearsBadgeClass = (amount: number): string => {
    if (amount >= 50000) return 'bg-rose-50 text-rose-700 border border-rose-200';
    if (amount >= 10000) return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
  };

  const hasRows = useMemo(() => rows.length > 0, [rows]);

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
                Mortgage Reports
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Mortgage Arrears Report</h1>
              <p className="text-sm text-slate-600 mt-1">
                Complete overdue and arrears analysis with risk visibility and due-balance breakdown.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={exportCurrentPageCsv}
                disabled={!hasRows}
                className="px-4 py-2 rounded-xl bg-white hover:bg-cyan-50 text-cyan-800 text-sm font-semibold border border-cyan-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-200 shadow-sm inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Reports Hub
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Arrears Accounts</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.arrears_accounts}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Overdue Accounts</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{summary.overdue_accounts}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{'High Risk (50K+)'} </p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">{summary.high_risk_accounts}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Arrears</p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">{formatAmount(summary.total_arrears)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Due Principal</p>
              <p className="text-2xl font-extrabold text-cyan-700 mt-1">{formatAmount(summary.total_due_principal)}</p>
            </div>
            <div className="rounded-xl bg-white/90 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Due Interest</p>
              <p className="text-2xl font-extrabold text-violet-700 mt-1">{formatAmount(summary.total_due_interest)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-cyan-700" />
              <h2 className="text-sm font-bold text-slate-900">Filters</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-cyan-700 hover:to-blue-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, mortgage, ref"
              className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <input
              type="date"
              value={fromDueDate}
              onChange={(e) => setFromDueDate(e.target.value)}
              className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <input
              type="date"
              value={toDueDate}
              onChange={(e) => setToDueDate(e.target.value)}
              className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All Statuses</option>
              <option value="arrears">Arrears</option>
              <option value="active">Active</option>
              <option value="released">Released</option>
              <option value="approved">Approved</option>
              <option value="submitted">Submitted</option>
            </select>
            <select
              value={mortgageType}
              onChange={(e) => setMortgageType(e.target.value)}
              className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All Mortgage Types</option>
              <option value="land">Land</option>
              <option value="vehicle">Vehicle</option>
              <option value="property">Property</option>
              <option value="gold">Gold</option>
            </select>
            <input
              type="number"
              min="0"
              value={minArrears}
              onChange={(e) => setMinArrears(e.target.value)}
              placeholder="Min arrears"
              className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Arrears Accounts</h2>
              <p className="text-xs text-slate-600 mt-1">Focused list of mortgages with arrears exposure and overdue age.</p>
            </div>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
              {pagination.total} records
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">No arrears records found for the selected filters.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-cyan-100">
                <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                  <thead className="bg-cyan-50/70 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Mortgage</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Due Date</th>
                      <th className="px-3 py-2 font-semibold">Days Overdue</th>
                      <th className="px-3 py-2 font-semibold">Arrears</th>
                      <th className="px-3 py-2 font-semibold">Due Principal</th>
                      <th className="px-3 py-2 font-semibold">Due Interest</th>
                      <th className="px-3 py-2 font-semibold">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const customerName = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
                      const arrearsAmount = toNumber(row.arrears_amount);
                      return (
                        <tr key={row.id} className="border-b border-cyan-100 last:border-b-0">
                          <td className="px-3 py-2 font-semibold text-slate-900">#{row.id}</td>
                          <td className="px-3 py-2">
                            <div className="min-w-[180px]">
                              <p className="font-semibold text-slate-900">{customerName || '-'}</p>
                              <p className="text-xs text-slate-500">{row.customer?.customer_code || '-'}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2 capitalize">{row.mortgage_type || '-'}</td>
                          <td className="px-3 py-2 capitalize">{row.status || '-'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.due_date)}</td>
                          <td className="px-3 py-2 font-semibold text-amber-700">{row.days_overdue || 0} days</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${arrearsBadgeClass(arrearsAmount)}`}>
                              {formatAmount(arrearsAmount)}
                            </span>
                          </td>
                          <td className="px-3 py-2">{formatAmount(row.due_amount)}</td>
                          <td className="px-3 py-2">{formatAmount(row.due_interest_amount)}</td>
                          <td className="px-3 py-2">{row.asset?.deed_number || row.asset?.vehicle_reg_no || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-600">Page {pagination.current_page} of {pagination.last_page}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.current_page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => setPage((prev) => Math.min(pagination.last_page, prev + 1))}
                    className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-cyan-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <p className="font-bold text-slate-900">Overdue Monitoring</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Track how long each account remains overdue to prioritize field action.</p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-700" />
              <p className="font-bold text-slate-900">Risk Segmentation</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Instantly identify high-risk arrears accounts for recovery escalation.</p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-white/86 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-cyan-700" />
              <p className="font-bold text-slate-900">Targeted Filtering</p>
            </div>
            <p className="text-sm text-slate-600 mt-2">Slice arrears by date, type, status, and threshold for focused recovery work.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
