"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, ExternalLink, FileText, X, XCircle } from "lucide-react";

type AlertModalState = {
  open: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning";
};

type LoanRequestSummary = {
  id: number;
  request_no: string;
  loan_product: string;
  customer_full_name: string | null;
  customer_no: string | null;
  status: string;
  approval_level: number;
  required_approval_level: number;
};

type LoanRequestDocument = {
  id: number;
  document_type: string;
  file_path: string;
  original_name: string;
};

type LoanRequestDetail = LoanRequestSummary & {
  principal: number;
  annual_rate: number;
  tenure_months: number;
  installment_frequency: string;
  installments: number;
  installment_amount: number;
  total_payable: number;
  customer_nic?: string | null;
  customer_mobile?: string | null;
  customer_address?: string | null;
  customer_details?: {
    incomeSource?: string;
    monthlyIncome?: string | number;
    additionalIncome?: string | number;
    businessName?: string;
  };
  guarantor_details?: Array<{
    fullName?: string;
    nic?: string;
    mobile?: string;
    relation?: string;
    address?: string;
    monthlyIncome?: string | number;
  }> | null;
  documents?: LoanRequestDocument[];
};

export default function LoanRequestsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<LoanRequestSummary[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewLoan, setReviewLoan] = useState<LoanRequestDetail | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    open: false,
    title: "",
    message: "",
    type: "success",
  });
  const router = useRouter();

  const openAlertModal = (type: AlertModalState["type"], title: string, message: string) => {
    setAlertModal({ open: true, type, title, message });
  };

  const closeAlertModal = () => {
    setAlertModal((prev) => ({ ...prev, open: false }));
  };

  const formatAmount = (value: unknown): string => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const documentUrl = (filePath: string): string => {
    if (!filePath) return "#";
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
    return `${API_URL}/storage/${filePath}`;
  };

  const fetchRequests = async (authToken: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/api/loan-requests?per_page=25`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
        },
      });

      const data = response.data?.data?.data || response.data?.data || [];
      setRequests(
        Array.isArray(data)
          ? data.map((item: any) => ({
              id: item.id,
              request_no: item.request_no,
              loan_product: item.loan_product,
              customer_full_name: item.customer_full_name ?? null,
              customer_no: item.customer_no ?? null,
              status: item.status,
              approval_level: Number(item.approval_level ?? 1),
              required_approval_level: Number(item.required_approval_level ?? 1),
            }))
          : []
      );
    } catch {
      const message = "Unable to load loan requests.";
      setError(message);
      openAlertModal("error", "Load Failed", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/");
      return;
    }
    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetchRequests(token);
  }, [API_URL, token]);

  const openReviewModal = async (loanRequestId: number) => {
    if (!token) return;

    setReviewOpen(true);
    setReviewLoading(true);
    setReviewLoan(null);
    setReviewNote("");
    setReviewConfirmed(false);

    try {
      const response = await axios.get(`${API_URL}/api/loan-requests/${loanRequestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = response.data?.data || response.data;
      setReviewLoan({
        id: Number(data?.id),
        request_no: data?.request_no || "-",
        loan_product: data?.loan_product || "-",
        customer_full_name: data?.customer_full_name ?? null,
        customer_no: data?.customer_no ?? null,
        status: data?.status || "pending_approval",
        approval_level: Number(data?.approval_level ?? 1),
        required_approval_level: Number(data?.required_approval_level ?? 1),
        principal: Number(data?.principal ?? 0),
        annual_rate: Number(data?.annual_rate ?? 0),
        tenure_months: Number(data?.tenure_months ?? 0),
        installment_frequency: data?.installment_frequency || "-",
        installments: Number(data?.installments ?? 0),
        installment_amount: Number(data?.installment_amount ?? 0),
        total_payable: Number(data?.total_payable ?? 0),
        customer_nic: data?.customer_nic ?? null,
        customer_mobile: data?.customer_mobile ?? null,
        customer_address: data?.customer_address ?? null,
        customer_details: data?.customer_details ?? {},
        guarantor_details: Array.isArray(data?.guarantor_details) ? data.guarantor_details : [],
        documents: Array.isArray(data?.documents) ? data.documents : [],
      });
    } catch (err) {
      closeReviewModal();
      if (axios.isAxiosError(err)) {
        openAlertModal(
          "error",
          "Review Load Failed",
          (typeof err.response?.data?.message === "string" && err.response?.data?.message) ||
            "Failed to load loan request details."
        );
      } else {
        openAlertModal("error", "Review Load Failed", "Failed to load loan request details.");
      }
    } finally {
      setReviewLoading(false);
    }
  };

  const closeReviewModal = () => {
    if (actionLoadingId !== null) return;
    setReviewOpen(false);
    setReviewLoan(null);
    setReviewNote("");
    setReviewConfirmed(false);
  };

  const handleStatusAction = async (loanRequestId: number, action: "approve" | "reject") => {
    if (!token || actionLoadingId !== null) return;

    if (!reviewConfirmed) {
      openAlertModal(
        "warning",
        "Review Confirmation Required",
        "Please confirm you reviewed loan details and documents before proceeding."
      );
      return;
    }

    const note = reviewNote.trim();
    if (action === "reject" && !note) {
      openAlertModal("warning", "Rejection Note Required", "Rejection note is required.");
      return;
    }

    setActionLoadingId(loanRequestId);

    try {
      const response = await axios.post(
        `${API_URL}/api/loan-requests/${loanRequestId}/status`,
        { action, note: note || null },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const updated = response.data?.data;
      setRequests((prev) =>
        prev.map((item) =>
          item.id === loanRequestId
            ? {
                ...item,
                status: updated?.status ?? item.status,
                approval_level: Number(updated?.approval_level ?? item.approval_level),
                required_approval_level: Number(updated?.required_approval_level ?? item.required_approval_level),
              }
            : item
        )
      );

      openAlertModal(
        "success",
        "Status Updated",
        action === "approve" ? "Loan request approved successfully." : "Loan request rejected successfully."
      );
      setReviewNote("");
      setReviewConfirmed(false);
      setReviewOpen(false);
      setReviewLoan(null);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        openAlertModal(
          "error",
          "Status Update Failed",
          (typeof err.response?.data?.message === "string" && err.response?.data?.message) ||
            "Failed to update loan request status."
        );
      } else {
        openAlertModal("error", "Status Update Failed", "Failed to update loan request status.");
      }
    } finally {
      setActionLoadingId(null);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-cyan-200 blur-3xl"></div>
        <div className="absolute top-10 right-10 h-72 w-72 rounded-full bg-blue-200 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-200 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/90 rounded-3xl border border-cyan-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Credit Module</p>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Loan Requests</h1>
            <p className="text-sm text-slate-600 mt-1">Separate view for recent and ongoing loan requests.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/loan/request")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-700 hover:to-blue-700"
            >
              New Loan Request
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/loan")}
              className="px-4 py-2 rounded-xl bg-white border border-cyan-200 text-cyan-800 text-sm font-semibold hover:bg-cyan-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white/90 p-6">
          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-600">No loan requests found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-4">Request No</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Product</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Approval</th>
                    <th className="py-2 pr-4">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0 align-top">
                      <td className="py-2 pr-4 font-semibold text-slate-900 whitespace-nowrap">{item.request_no}</td>
                      <td className="py-2 pr-4 text-slate-800 whitespace-nowrap">
                        {item.customer_full_name || "-"}
                        {item.customer_no ? <span className="text-xs text-slate-500"> ({item.customer_no})</span> : null}
                      </td>
                      <td className="py-2 pr-4 text-slate-700 whitespace-nowrap">{item.loan_product}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        Level {item.approval_level} / {item.required_approval_level}
                      </td>
                      <td className="py-2 pr-4 min-w-[180px]">
                        <button
                          type="button"
                          onClick={() => openReviewModal(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {item.status === "pending_approval" ? "Review & Decide" : "View Details"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {reviewOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-cyan-100 bg-white shadow-xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyan-100 bg-white/95 px-5 py-4 backdrop-blur">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Loan Review</p>
                  <h2 className="text-lg font-extrabold text-slate-900">Loan Request Details</h2>
                </div>
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {reviewLoading ? (
                  <div className="py-10 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                  </div>
                ) : reviewLoan ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                        <p className="text-xs text-slate-500">Request No</p>
                        <p className="text-sm font-bold text-slate-900">{reviewLoan.request_no}</p>
                      </div>
                      <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="text-sm font-bold text-slate-900">{reviewLoan.status.replace("_", " ")}</p>
                      </div>
                      <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                        <p className="text-xs text-slate-500">Approval Level</p>
                        <p className="text-sm font-bold text-slate-900">
                          {reviewLoan.approval_level} / {reviewLoan.required_approval_level}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-100 p-4">
                      <h3 className="text-sm font-bold text-slate-900">Customer Details</h3>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                        <p><span className="font-semibold">Name:</span> {reviewLoan.customer_full_name || "-"}</p>
                        <p><span className="font-semibold">Customer No:</span> {reviewLoan.customer_no || "-"}</p>
                        <p><span className="font-semibold">NIC:</span> {reviewLoan.customer_nic || "-"}</p>
                        <p><span className="font-semibold">Mobile:</span> {reviewLoan.customer_mobile || "-"}</p>
                        <p className="md:col-span-2"><span className="font-semibold">Address:</span> {reviewLoan.customer_address || "-"}</p>
                        <p><span className="font-semibold">Income Source:</span> {reviewLoan.customer_details?.incomeSource || "-"}</p>
                        <p><span className="font-semibold">Monthly Income:</span> {formatAmount(reviewLoan.customer_details?.monthlyIncome)}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-100 p-4">
                      <h3 className="text-sm font-bold text-slate-900">Loan Details</h3>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                        <p><span className="font-semibold">Product:</span> {reviewLoan.loan_product}</p>
                        <p><span className="font-semibold">Frequency:</span> {reviewLoan.installment_frequency}</p>
                        <p><span className="font-semibold">Principal:</span> {formatAmount(reviewLoan.principal)}</p>
                        <p><span className="font-semibold">Rate:</span> {reviewLoan.annual_rate}%</p>
                        <p><span className="font-semibold">Tenure:</span> {reviewLoan.tenure_months} months</p>
                        <p><span className="font-semibold">Installments:</span> {reviewLoan.installments}</p>
                        <p><span className="font-semibold">Installment Amount:</span> {formatAmount(reviewLoan.installment_amount)}</p>
                        <p><span className="font-semibold">Total Payable:</span> {formatAmount(reviewLoan.total_payable)}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-100 p-4">
                      <h3 className="text-sm font-bold text-slate-900">Uploaded Documents</h3>
                      {reviewLoan.documents && reviewLoan.documents.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {reviewLoan.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-cyan-100 bg-cyan-50/40 px-3 py-2">
                              <div className="min-w-0 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-cyan-700" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.original_name}</p>
                                  <p className="text-xs text-slate-500">{doc.document_type}</p>
                                </div>
                              </div>
                              <a
                                href={documentUrl(doc.file_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-cyan-200 bg-white px-2 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-amber-700">No documents uploaded for this request.</p>
                      )}
                    </div>

                    {reviewLoan.status === "pending_approval" && (
                      <div className="rounded-xl border border-cyan-100 p-4 space-y-3">
                        <h3 className="text-sm font-bold text-slate-900">Approval Decision</h3>
                        <textarea
                          value={reviewNote}
                          onChange={(e) => {
                            setReviewNote(e.target.value);
                          }}
                          placeholder="Enter approval/rejection note (required for reject)"
                          rows={3}
                          className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                        />

                        <label className="flex items-start gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={reviewConfirmed}
                            onChange={(e) => setReviewConfirmed(e.target.checked)}
                            className="mt-0.5"
                          />
                          I reviewed the full loan details and supporting documents (if provided).
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusAction(reviewLoan.id, "approve")}
                            disabled={actionLoadingId !== null || !reviewConfirmed}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {actionLoadingId === reviewLoan.id ? "Processing..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusAction(reviewLoan.id, "reject")}
                            disabled={actionLoadingId !== null || !reviewConfirmed}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <XCircle className="h-4 w-4" />
                            {actionLoadingId === reviewLoan.id ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {alertModal.open && (
          <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-cyan-100 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-cyan-100 px-5 py-4">
                <h3
                  className={`text-base font-extrabold ${
                    alertModal.type === "success"
                      ? "text-emerald-700"
                      : alertModal.type === "warning"
                      ? "text-amber-700"
                      : "text-rose-700"
                  }`}
                >
                  {alertModal.title}
                </h3>
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-slate-700">{alertModal.message}</p>
              </div>
              <div className="px-5 pb-5 flex justify-end">
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-700 hover:to-blue-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
