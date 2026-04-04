'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoanRequest = {
  id: number;
  customer_no: string;
  customer_name: string;
  loan_scope: 'route_loan' | 'center_loan' | 'direct_loan';
  loan_amount: string | number;
  refundable_amount: string | number;
  installment_amount: string | number;
  interest_type: 'flat' | 'reducing';
  interest_rate: string | number;
  terms_count: number;
  refund_option: 'day' | 'week' | 'month';
  status: string;
  route?: { id: number; name: string; code: string } | null;
  center?: { id: number; name: string; code: string } | null;
  group?: { id: number; name: string; code: string } | null;
  loan_request_date: string;
  documents_requested?: boolean;
  document_request_note?: string | null;
  document_requested_at?: string | null;
};

const API_BASE = 'http://localhost:8000/api';

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDateByRefundOption = (refundOption: LoanRequest['refund_option'], steps = 1) => {
  const base = new Date();
  base.setHours(12, 0, 0, 0);

  if (refundOption === 'day') {
    base.setDate(base.getDate() + steps);
    return toInputDate(base);
  }

  if (refundOption === 'week') {
    base.setDate(base.getDate() + 7 * steps);
    return toInputDate(base);
  }

  base.setMonth(base.getMonth() + steps);
  return toInputDate(base);
};

export default function LoanApprovalsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; onClose?: () => void }>({
    open: false,
    title: '',
    message: '',
  });

  const openModal = (message: string, title = 'Notice', onClose?: () => void) => {
    setModal({ open: true, title, message, onClose });
  };

  const closeModal = () => {
    const callback = modal.onClose;
    setModal({ open: false, title: '', message: '' });
    if (callback) callback();
  };

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
    [token]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const loadRequests = async (authHeaders: { Authorization: string; Accept: string }) => {
    const response = await axios.get(`${API_BASE}/microfinance/loan-requests`, {
      headers: authHeaders,
      params: { status: 'requested' },
    });
    const rows: LoanRequest[] = Array.isArray(response.data) ? response.data : [];
    setRequests(rows);
  };

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      setPageLoading(true);
      try {
        await loadRequests(headers);
      } catch {
        openModal('Failed to load requested loans.', 'Error');
      } finally {
        setPageLoading(false);
      }
    };

    run();
  }, [token, headers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [requests.length, pageSize, query, scopeFilter, routeFilter, fromDate, toDate]);

  const routeOptions = useMemo(() => {
    const routeMap = new Map<number, string>();

    requests.forEach((loan) => {
      if (loan.route?.id && loan.route?.name) {
        routeMap.set(loan.route.id, loan.route.name);
      }
    });

    return Array.from(routeMap.entries()).map(([id, name]) => ({ id, name }));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const selectedRouteId = routeFilter === 'all' ? null : Number(routeFilter);

    return requests.filter((loan) => {
      if (scopeFilter !== 'all' && loan.loan_scope !== scopeFilter) return false;
      if (selectedRouteId && loan.route?.id !== selectedRouteId) return false;
      if (fromDate && loan.loan_request_date < fromDate) return false;
      if (toDate && loan.loan_request_date > toDate) return false;

      if (!keyword) return true;

      const haystack = [
        loan.customer_no,
        loan.customer_name,
        loan.route?.name || '',
        loan.center?.name || '',
        loan.group?.name || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [requests, query, scopeFilter, routeFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);

  const handleApprove = async (loanId: number) => {
    if (!token) return;

    setActionLoadingId(loanId);
    try {
      await axios.post(
        `${API_BASE}/microfinance/loan-requests/${loanId}/approve`,
        {},
        { headers }
      );
      setRequests((prev) => prev.filter((loan) => loan.id !== loanId));
      openModal('Loan approved successfully.', 'Success');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to approve loan.';
      openModal(message, 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (loanId: number) => {
    if (!token) return;

    setActionLoadingId(loanId);
    try {
      await axios.post(
        `${API_BASE}/microfinance/loan-requests/${loanId}/reject`,
        {},
        { headers }
      );
      setRequests((prev) => prev.filter((loan) => loan.id !== loanId));
      openModal('Loan rejected successfully.', 'Success');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to reject loan.';
      openModal(message, 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDocumentRequest = async (loanId: number) => {
    if (!token) return;

    setActionLoadingId(loanId);
    try {
      await axios.post(
        `${API_BASE}/microfinance/loan-requests/${loanId}/request-documents`,
        {},
        { headers }
      );

      setRequests((prev) =>
        prev.map((loan) =>
          loan.id === loanId
            ? {
                ...loan,
                documents_requested: true,
                document_requested_at: new Date().toISOString(),
              }
            : loan
        )
      );

      openModal('Document request marked for this loan.', 'Success');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to request documents.';
      openModal(message, 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadAgreement = async (loanId: number, customerNo: string) => {
    if (!token) return;

    setActionLoadingId(loanId);
    try {
      const response = await axios.get(
        `${API_BASE}/microfinance/loan-requests/${loanId}/download-agreement`,
        {
          headers,
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `loan_agreement_${customerNo || loanId}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      openModal('Agreement downloaded successfully.', 'Success');
    } catch (error: any) {
      let message = 'Failed to download agreement.';
      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          // Keep default message.
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      openModal(message, 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!token || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Loan Approvals</h1>
            <p className="text-sm text-gray-600 mt-1">
              Assistant Manager can approve amounts under 10000. Manager can approve amounts up to 10000.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Late payment penalty is calculated after a 2-day free grace period from the due date.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/microfinance/loans')}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
          >
            Back
          </button>
        </div>

        <div className="bg-white/90 rounded-2xl shadow-lg border border-orange-100 p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-black">
          <input
            className="px-3 py-2 rounded-lg border border-orange-100 text-sm text-black"
            placeholder="Search customer / loan code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="px-3 py-2 rounded-lg border border-orange-100 text-sm text-black" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
            <option value="all">All Scopes</option>
            <option value="center_loan">Center Loan</option>
            <option value="route_loan">Route Loan</option>
            <option value="direct_loan">Direct Loan</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-orange-100 text-sm text-black" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}>
            <option value="all">All Routes</option>
            {routeOptions.map((route) => (
              <option key={route.id} value={route.id}>{route.name}</option>
            ))}
          </select>
          <input className="px-3 py-2 rounded-lg border border-orange-100 text-sm text-black" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="px-3 py-2 rounded-lg border border-orange-100 text-sm text-black" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing {filteredRequests.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, filteredRequests.length)} of {filteredRequests.length}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows:</label>
            <select
              className="px-2 py-1 rounded-md border border-orange-100 text-sm text-black"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-600">
            No requested loans found for selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedRequests.map((loan) => (
              <div key={loan.id} className="bg-white/90 rounded-2xl shadow-lg border border-orange-100 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">{loan.customer_name}</h2>
                    <p className="text-sm text-gray-600">Loan Code: {loan.customer_no}</p>
                    {loan.documents_requested && (
                      <p className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        Documents Requested
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      Scope: {loan.loan_scope === 'center_loan' ? 'Center Loan' : loan.loan_scope === 'route_loan' ? 'Route Loan' : 'Direct Loan'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Route: {loan.route?.name || '-'} | Center: {loan.center?.name || '-'} | Group: {loan.group?.name || '-'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">Loan Amount</p>
                    <p className="text-xl font-extrabold text-orange-700">{Number(loan.loan_amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {loan.interest_type} | {Number(loan.interest_rate || 0)}% | {loan.terms_count} {loan.refund_option}(s)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Refundable</p>
                    <p className="text-sm font-bold text-gray-900">{Number(loan.refundable_amount || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Installment</p>
                    <p className="text-sm font-bold text-gray-900">{Number(loan.installment_amount || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Request Date</p>
                    <p className="text-sm font-bold text-gray-900">{loan.loan_request_date}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-600 mb-1">Approval Date</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Schedule will be generated from this approval date.
                    </p>
                    <div className="w-full px-3 py-2 rounded-lg border border-orange-100 text-sm text-black bg-white">
                      {toInputDate(new Date())}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-600 mb-1">Auto Next Payment Date</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Calculated using refund option.
                    </p>
                    <div className="w-full px-3 py-2 rounded-lg border border-orange-100 text-sm text-black bg-white font-semibold">
                      {shiftDateByRefundOption(loan.refund_option, 1)}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-wide text-gray-600 mb-1">Auto Loan End Date</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Calculated from approval date + terms count using refund option.
                    </p>
                    <div className="w-full px-3 py-2 rounded-lg border border-orange-100 text-sm text-black bg-white font-semibold">
                      {shiftDateByRefundOption(loan.refund_option, Math.max(Number(loan.terms_count || 1), 1))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDownloadAgreement(loan.id, loan.customer_no);
                      }}
                      disabled={actionLoadingId === loan.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow disabled:opacity-70"
                    >
                      {actionLoadingId === loan.id ? 'Processing...' : 'Download Agreement'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleReject(loan.id);
                      }}
                      disabled={actionLoadingId === loan.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold shadow disabled:opacity-70"
                    >
                      {actionLoadingId === loan.id ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApprove(loan.id);
                      }}
                      disabled={actionLoadingId === loan.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow disabled:opacity-70"
                    >
                      {actionLoadingId === loan.id && (
                        <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                      )}
                      {actionLoadingId === loan.id ? 'Accepting...' : 'Accept'}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg border border-orange-100 bg-white text-sm text-gray-700 disabled:opacity-50"
              >
                Prev
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-white border border-orange-100 text-sm text-gray-700">
                Page {safePage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-orange-100 bg-white text-sm text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-orange-100">
            <h3 className="text-lg font-bold text-slate-900">{modal.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{modal.message}</p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
