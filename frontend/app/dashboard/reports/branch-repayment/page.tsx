"use client";

import axios from "axios";
import { getApiBaseUrl } from "@/lib/api";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  Percent,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

type RepaymentStatus = "excellent" | "good" | "watch" | "critical";

type BranchRepaymentRow = {
  branch_id: number;
  branch_name: string;
  manager_name: string | null;
  total_due: number;
  total_repaid: number;
  total_pending: number;
  repayment_rate: number;
  repayment_status: RepaymentStatus;
  period_repaid: number;
  mf_due: number;
  mf_repaid: number;
  mf_pending: number;
  mf_rate: number;
  mf_period_repaid: number;
  mf_active_loans: number;
  finance_due: number;
  finance_repaid: number;
  finance_pending: number;
  finance_rate: number;
  finance_period_repaid: number;
  finance_active: number;
  mortgage_due: number;
  mortgage_repaid: number;
  mortgage_pending: number;
  mortgage_rate: number;
  mortgage_period_repaid: number;
  mortgage_active: number;
  instant_due: number;
  instant_repaid: number;
  instant_pending: number;
  instant_rate: number;
  instant_period_repaid: number;
  instant_active: number;
};

type ReportSummary = {
  branch_count: number;
  total_due: number;
  total_repaid: number;
  total_pending: number;
  repayment_rate: number;
  period_repaid: number;
  status_excellent: number;
  status_good: number;
  status_watch: number;
  status_critical: number;
};

type CompanyOption = { id: number; name: string };

function formatAmount(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
}

function monthStartIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: unknown): string {
  return Number(value || 0).toFixed(2);
}

function getReportFileDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(status: RepaymentStatus): string {
  if (status === "excellent") return "Excellent";
  if (status === "good") return "Good";
  if (status === "watch") return "Watch";
  return "Critical";
}

function statusClass(status: RepaymentStatus): string {
  if (status === "excellent") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "good") return "bg-cyan-100 text-cyan-800 border-cyan-200";
  if (status === "watch") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

const inputClass =
  "w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-black [color-scheme:light] [&::-webkit-datetime-edit]:text-black";

function BranchRepaymentReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBase = getApiBaseUrl();

  const initialBranchId = Number(searchParams.get("branch_id") || 0) || "";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(monthStartIso);
  const [toDate, setToDate] = useState(todayIso);
  const [branchFilter, setBranchFilter] = useState<number | "">(initialBranchId);
  const [statusFilter, setStatusFilter] = useState<"all" | RepaymentStatus>("all");
  const [rows, setRows] = useState<BranchRepaymentRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [branches, setBranches] = useState<CompanyOption[]>([]);
  const [reportRange, setReportRange] = useState({ from: "", to: "" });

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (!stored) {
      router.push("/");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadBranches = async () => {
      try {
        const res = await axios.get(`${apiBase}/companies`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setBranches(
          data.map((b: { id: number; name: string }) => ({
            id: Number(b.id),
            name: String(b.name || `Branch ${b.id}`),
          }))
        );
      } catch {
        setBranches([]);
      }
    };

    loadBranches();
  }, [token, apiBase]);

  const loadReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/reports/branch-repayment`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: {
          from_date: fromDate,
          to_date: toDate,
          branch_id: branchFilter || undefined,
        },
      });

      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
      setSummary(res.data?.summary || null);
      setReportRange({
        from: String(res.data?.from_date || fromDate),
        to: String(res.data?.to_date || toDate),
      });
    } catch {
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [token, apiBase, fromDate, toDate, branchFilter]);

  useEffect(() => {
    if (!token) return;
    loadReport();
  }, [token, loadReport]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => row.repayment_status === statusFilter);
  }, [rows, statusFilter]);

  const exportCsv = () => {
    if (!filteredRows.length) return;

    const headers = [
      "Branch",
      "Manager",
      "Status",
      "Repayment Rate %",
      "Total Due",
      "Total Repaid",
      "Total Pending",
      "Period Repaid",
      "MF Due",
      "MF Repaid",
      "MF Rate %",
      "MF Period Repaid",
      "Finance Due",
      "Finance Repaid",
      "Finance Rate %",
      "Finance Period Repaid",
      "Mortgage Due",
      "Mortgage Repaid",
      "Mortgage Rate %",
      "Mortgage Period Repaid",
      "Instant Due",
      "Instant Repaid",
      "Instant Rate %",
      "Instant Period Repaid",
    ];

    const lines = filteredRows.map((r) =>
      [
        r.branch_name,
        r.manager_name || "",
        r.repayment_status,
        r.repayment_rate,
        r.total_due,
        r.total_repaid,
        r.total_pending,
        r.period_repaid,
        r.mf_due,
        r.mf_repaid,
        r.mf_rate,
        r.mf_period_repaid,
        r.finance_due,
        r.finance_repaid,
        r.finance_rate,
        r.finance_period_repaid,
        r.mortgage_due,
        r.mortgage_repaid,
        r.mortgage_rate,
        r.mortgage_period_repaid,
        r.instant_due,
        r.instant_repaid,
        r.instant_rate,
        r.instant_period_repaid,
      ].join(",")
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `branch-repayment-${reportRange.from}-${reportRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!filteredRows.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const generatedAt = new Intl.DateTimeFormat("en-LK", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());

    const rangeText = `Period repaid: ${reportRange.from || fromDate} to ${reportRange.to || toDate}`;
    const branchLabel =
      branchFilter && branches.length
        ? branches.find((b) => b.id === branchFilter)?.name || `Branch #${branchFilter}`
        : "All branches";

    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Branch Repayment Report", 40, 36);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("BMS — Branch Management", 40, 52);
    doc.text(`${rangeText} | Scope: ${branchLabel}`, 40, 66);
    doc.text(`Generated: ${generatedAt}`, 40, 80);

    let startY = 94;

    if (summary) {
      autoTable(doc, {
        startY,
        head: [["Summary", "Value"]],
        body: [
          ["Branches", String(summary.branch_count)],
          ["Overall repayment rate", formatPercent(summary.repayment_rate)],
          ["Total due (LKR)", formatMoney(summary.total_due)],
          ["Total repaid (LKR)", formatMoney(summary.total_repaid)],
          ["Total pending (LKR)", formatMoney(summary.total_pending)],
          ["Period repaid (LKR)", formatMoney(summary.period_repaid)],
          ["Excellent / Good / Watch / Critical", `${summary.status_excellent} / ${summary.status_good} / ${summary.status_watch} / ${summary.status_critical}`],
        ],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255] },
        margin: { left: 40, right: 40 },
        theme: "plain",
      });

      startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 14
        : startY + 120;
    }

    const tableBody = filteredRows.map((row) => [
      row.branch_name,
      row.manager_name || "—",
      statusLabel(row.repayment_status),
      formatPercent(row.repayment_rate),
      formatMoney(row.total_due),
      formatMoney(row.total_repaid),
      formatMoney(row.total_pending),
      formatMoney(row.period_repaid),
      formatPercent(row.mf_rate),
      formatPercent(row.finance_rate),
      formatPercent(row.mortgage_rate),
      formatPercent(row.instant_rate),
    ]);

    autoTable(doc, {
      startY,
      head: [
        [
          "Branch",
          "Manager",
          "Status",
          "Rate",
          "Due",
          "Repaid",
          "Pending",
          "Period Repaid",
          "MF %",
          "Fin %",
          "Mtge %",
          "Inst %",
        ],
      ],
      body: tableBody,
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 243, 255] },
      margin: { left: 24, right: 24, top: startY, bottom: 36 },
      theme: "striped",
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 16,
          { align: "center" }
        );
      },
    });

    doc.save(`branch-repayment-report-${getReportFileDate()}.pdf`);
  };

  const statCards = useMemo(
    () => [
      {
        label: "Branches",
        value: summary?.branch_count ?? 0,
        icon: Building2,
        color: "from-violet-500 to-purple-600",
      },
      {
        label: "Repayment rate",
        value: formatPercent(summary?.repayment_rate),
        icon: Percent,
        color: "from-emerald-500 to-teal-600",
      },
      {
        label: "Total repaid",
        value: formatAmount(summary?.total_repaid),
        icon: TrendingUp,
        color: "from-cyan-500 to-blue-600",
      },
      {
        label: "Total pending",
        value: formatAmount(summary?.total_pending),
        icon: Wallet,
        color: "from-amber-500 to-orange-600",
      },
      {
        label: "Period repaid",
        value: formatAmount(summary?.period_repaid),
        icon: Wallet,
        color: "from-rose-500 to-red-600",
      },
    ],
    [summary]
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
        <div className="animate-spin h-12 w-12 border-b-2 border-violet-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50/40 to-fuchsia-50 p-4 sm:p-6">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="rounded-3xl border border-white/80 bg-white/90 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <Percent className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-100">
                    Branch management
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Branch Repayment Report</h1>
                  <p className="text-sm text-violet-50 mt-1">
                    Portfolio repayment rates and period repayments across micro credit, finance, mortgage, and instant
                    loans.
                    {reportRange.from && reportRange.to ? ` Period: ${reportRange.from} to ${reportRange.to}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={loadReport}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={!filteredRows.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={!filteredRows.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-b border-violet-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From date (period repaid)</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To date (period repaid)</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
                <select
                  value={branchFilter === "" ? "" : String(branchFilter)}
                  onChange={(e) => setBranchFilter(e.target.value ? Number(e.target.value) : "")}
                  className={`${inputClass} [color-scheme:light]`}
                >
                  <option value="" className="text-black">
                    All branches
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="text-black">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Repayment status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | RepaymentStatus)}
                  className={`${inputClass} [color-scheme:light]`}
                >
                  <option value="all" className="text-black">
                    All statuses
                  </option>
                  <option value="excellent" className="text-black">
                    Excellent (90%+)
                  </option>
                  <option value="good" className="text-black">
                    Good (70–89%)
                  </option>
                  <option value="watch" className="text-black">
                    Watch (40–69%)
                  </option>
                  <option value="critical" className="text-black">
                    Critical (&lt;40%)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {summary ? (
            <div className="px-4 sm:px-6 pt-4 flex flex-wrap gap-2 text-xs">
              {(
                [
                  ["excellent", summary.status_excellent, "Excellent"],
                  ["good", summary.status_good, "Good"],
                  ["watch", summary.status_watch, "Watch"],
                  ["critical", summary.status_critical, "Critical"],
                ] as const
              ).map(([key, count, label]) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold ${statusClass(key)}`}
                >
                  {label}: {count}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 sm:p-6 border-b border-violet-100">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                    <div
                      className={`hidden sm:flex h-8 w-8 rounded-lg bg-gradient-to-br ${card.color} items-center justify-center`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
                    {loading ? "—" : card.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-violet-50" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-center py-12 text-slate-600 font-medium">No repayment data for the selected filters.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-violet-900 border-b-2 border-violet-200">
                      <th className="py-3 pr-3 pl-1 whitespace-nowrap" rowSpan={2}>
                        Branch
                      </th>
                      <th className="py-3 pr-3 whitespace-nowrap" rowSpan={2}>
                        Manager
                      </th>
                      <th className="py-3 pr-3 whitespace-nowrap" rowSpan={2}>
                        Status
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Rate
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Due
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Repaid
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Pending
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Period Repaid
                      </th>
                      <th className="py-2 pr-3 text-center text-cyan-800 border-b border-violet-100" colSpan={4}>
                        Micro credit
                      </th>
                      <th className="py-2 pr-3 text-center text-emerald-800 border-b border-violet-100" colSpan={4}>
                        Finance
                      </th>
                      <th className="py-2 pr-3 text-center text-indigo-800 border-b border-violet-100" colSpan={4}>
                        Mortgage
                      </th>
                      <th className="py-2 pr-3 text-center text-violet-800 border-b border-violet-100" colSpan={4}>
                        Instant loan
                      </th>
                    </tr>
                    <tr className="text-left text-[9px] font-bold uppercase tracking-wider text-slate-600 border-b border-violet-100">
                      <th className="py-2 pr-2 text-right text-cyan-800">Due</th>
                      <th className="py-2 pr-2 text-right text-cyan-800">Repaid</th>
                      <th className="py-2 pr-2 text-right text-cyan-800">Rate</th>
                      <th className="py-2 pr-2 text-right text-cyan-800">Period</th>
                      <th className="py-2 pr-2 text-right text-emerald-800">Due</th>
                      <th className="py-2 pr-2 text-right text-emerald-800">Repaid</th>
                      <th className="py-2 pr-2 text-right text-emerald-800">Rate</th>
                      <th className="py-2 pr-2 text-right text-emerald-800">Period</th>
                      <th className="py-2 pr-2 text-right text-indigo-800">Due</th>
                      <th className="py-2 pr-2 text-right text-indigo-800">Repaid</th>
                      <th className="py-2 pr-2 text-right text-indigo-800">Rate</th>
                      <th className="py-2 pr-2 text-right text-indigo-800">Period</th>
                      <th className="py-2 pr-2 text-right text-violet-800">Due</th>
                      <th className="py-2 pr-2 text-right text-violet-800">Repaid</th>
                      <th className="py-2 pr-2 text-right text-violet-800">Rate</th>
                      <th className="py-2 pr-2 text-right text-violet-800">Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50">
                    {filteredRows.map((row) => (
                      <tr key={row.branch_id} className="hover:bg-violet-50/60">
                        <td className="py-3 pr-3 pl-1 font-bold text-slate-900 whitespace-nowrap">{row.branch_name}</td>
                        <td className="py-3 pr-3 text-slate-700 whitespace-nowrap">{row.manager_name || "—"}</td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(row.repayment_status)}`}
                          >
                            {statusLabel(row.repayment_status)}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-emerald-800 tabular-nums whitespace-nowrap">
                          {formatPercent(row.repayment_rate)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(row.total_due)}</td>
                        <td className="py-3 pr-3 text-right font-semibold text-cyan-900 tabular-nums">
                          {formatAmount(row.total_repaid)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(row.total_pending)}</td>
                        <td className="py-3 pr-3 text-right font-semibold text-violet-900 tabular-nums whitespace-nowrap">
                          {formatAmount(row.period_repaid)}
                        </td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-900">{formatAmount(row.mf_due)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-800">{formatAmount(row.mf_repaid)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-800">{formatPercent(row.mf_rate)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-800">{formatAmount(row.mf_period_repaid)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-emerald-900">{formatAmount(row.finance_due)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-emerald-800">{formatAmount(row.finance_repaid)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-emerald-800">{formatPercent(row.finance_rate)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-emerald-800">{formatAmount(row.finance_period_repaid)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-indigo-900">{formatAmount(row.mortgage_due)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-indigo-800">{formatAmount(row.mortgage_repaid)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-indigo-800">{formatPercent(row.mortgage_rate)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-indigo-800">{formatAmount(row.mortgage_period_repaid)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-violet-900">{formatAmount(row.instant_due)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-violet-800">{formatAmount(row.instant_repaid)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-violet-800">{formatPercent(row.instant_rate)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-violet-800">{formatAmount(row.instant_period_repaid)}</td>
                      </tr>
                    ))}
                    {summary && filteredRows.length > 1 && statusFilter === "all" ? (
                      <tr className="bg-violet-100/80 font-bold">
                        <td className="py-3 pr-3 pl-1 text-slate-900">TOTAL</td>
                        <td className="py-3 pr-3">—</td>
                        <td className="py-3 pr-3">—</td>
                        <td className="py-3 pr-3 text-right text-emerald-900 tabular-nums">{formatPercent(summary.repayment_rate)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.total_due)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.total_repaid)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.total_pending)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.period_repaid)}</td>
                        <td colSpan={16} className="py-3 pr-3" />
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BranchRepaymentReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-violet-600 rounded-full" />
        </div>
      }
    >
      <BranchRepaymentReportContent />
    </Suspense>
  );
}
