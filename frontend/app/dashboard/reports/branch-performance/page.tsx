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
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

type BranchPerformanceRow = {
  branch_id: number;
  branch_name: string;
  manager_name: string | null;
  opening_asset: number;
  employee_count: number;
  savings_accounts: number;
  mf_active_loans: number;
  mf_arrears: number;
  mf_outstanding: number;
  mf_collected: number;
  finance_active: number;
  finance_arrears: number;
  finance_outstanding: number;
  finance_collected: number;
  mortgage_active: number;
  mortgage_arrears: number;
  mortgage_collected: number;
  instant_active: number;
  instant_outstanding: number;
  instant_collected: number;
  period_collected: number;
  period_profit: number;
  total_arrears: number;
  total_outstanding: number;
};

type ReportSummary = {
  branch_count: number;
  period_collected: number;
  period_profit: number;
  total_arrears: number;
  total_outstanding: number;
  mf_active_loans: number;
  mf_collected: number;
  finance_active: number;
  finance_collected: number;
  mortgage_active: number;
  mortgage_collected: number;
  instant_active: number;
  instant_collected: number;
};

type CompanyOption = { id: number; name: string };

function formatAmount(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function BranchPerformanceReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBase = getApiBaseUrl();

  const initialBranchId = Number(searchParams.get("branch_id") || 0) || "";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(monthStartIso);
  const [toDate, setToDate] = useState(todayIso);
  const [branchFilter, setBranchFilter] = useState<number | "">(initialBranchId);
  const [rows, setRows] = useState<BranchPerformanceRow[]>([]);
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
      const res = await axios.get(`${apiBase}/reports/branch-performance`, {
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

  const exportCsv = () => {
    if (!rows.length) return;

    const headers = [
      "Branch",
      "Manager",
      "Period Collected",
      "Period Profit",
      "Total Arrears",
      "Outstanding",
      "MF Active",
      "MF Collected",
      "MF Arrears",
      "Finance Active",
      "Finance Collected",
      "Mortgage Active",
      "Mortgage Collected",
      "Instant Active",
      "Instant Collected",
      "Employees",
    ];

    const lines = rows.map((r) =>
      [
        r.branch_name,
        r.manager_name || "",
        r.period_collected,
        r.period_profit,
        r.total_arrears,
        r.total_outstanding,
        r.mf_active_loans,
        r.mf_collected,
        r.mf_arrears,
        r.finance_active,
        r.finance_collected,
        r.mortgage_active,
        r.mortgage_collected,
        r.instant_active,
        r.instant_collected,
        r.employee_count,
      ].join(",")
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `branch-performance-${reportRange.from}-${reportRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!rows.length) return;

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

    const rangeText = `Period: ${reportRange.from || fromDate} to ${reportRange.to || toDate}`;
    const branchLabel =
      branchFilter && branches.length
        ? branches.find((b) => b.id === branchFilter)?.name || `Branch #${branchFilter}`
        : "All branches";

    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Branch Performance Report", 40, 36);
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
          ["Period collected (LKR)", formatMoney(summary.period_collected)],
          ["Period profit (LKR)", formatMoney(summary.period_profit)],
          ["Total arrears (LKR)", formatMoney(summary.total_arrears)],
          ["Outstanding (LKR)", formatMoney(summary.total_outstanding)],
          ["Micro credit collected", formatMoney(summary.mf_collected)],
          ["Finance collected", formatMoney(summary.finance_collected)],
          ["Mortgage collected", formatMoney(summary.mortgage_collected)],
          ["Instant loan collected", formatMoney(summary.instant_collected)],
        ],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [190, 18, 60], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 180 },
          1: { halign: "right", cellWidth: 120 },
        },
        margin: { left: 40, right: 40 },
        theme: "plain",
      });

      startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 14
        : startY + 120;
    }

    const tableBody = rows.map((row) => [
      row.branch_name,
      row.manager_name || "—",
      formatMoney(row.period_collected),
      formatMoney(row.period_profit),
      formatMoney(row.total_arrears),
      formatMoney(row.total_outstanding),
      String(row.mf_active_loans),
      formatMoney(row.mf_collected),
      String(row.finance_active),
      formatMoney(row.finance_collected),
      String(row.mortgage_active),
      formatMoney(row.mortgage_collected),
      String(row.instant_active),
      formatMoney(row.instant_collected),
      String(row.employee_count),
    ]);

    if (summary && rows.length > 1) {
      tableBody.push([
        "TOTAL",
        "—",
        formatMoney(summary.period_collected),
        formatMoney(summary.period_profit),
        formatMoney(summary.total_arrears),
        formatMoney(summary.total_outstanding),
        String(summary.mf_active_loans),
        formatMoney(summary.mf_collected),
        String(summary.finance_active),
        formatMoney(summary.finance_collected),
        String(summary.mortgage_active),
        formatMoney(summary.mortgage_collected),
        String(summary.instant_active),
        formatMoney(summary.instant_collected),
        "—",
      ]);
    }

    autoTable(doc, {
      startY,
      head: [
        [
          "Branch",
          "Manager",
          "Collected",
          "Profit",
          "Arrears",
          "Outstanding",
          "MF Act.",
          "MF Coll.",
          "Fin Act.",
          "Fin Coll.",
          "Mtge Act.",
          "Mtge Coll.",
          "Inst Act.",
          "Inst Coll.",
          "Staff",
        ],
      ],
      body: tableBody,
      styles: {
        fontSize: 7,
        cellPadding: 3,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [190, 18, 60],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [255, 241, 242],
      },
      bodyStyles: {
        textColor: [30, 30, 30],
      },
      footStyles: {
        fillColor: [254, 226, 226],
        textColor: [30, 30, 30],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 58 },
        2: { halign: "right", cellWidth: 48 },
        3: { halign: "right", cellWidth: 44 },
        4: { halign: "right", cellWidth: 44 },
        5: { halign: "right", cellWidth: 48 },
        6: { halign: "right", cellWidth: 32 },
        7: { halign: "right", cellWidth: 44 },
        8: { halign: "right", cellWidth: 32 },
        9: { halign: "right", cellWidth: 44 },
        10: { halign: "right", cellWidth: 34 },
        11: { halign: "right", cellWidth: 44 },
        12: { halign: "right", cellWidth: 34 },
        13: { halign: "right", cellWidth: 44 },
        14: { halign: "right", cellWidth: 28 },
      },
      margin: { left: 24, right: 24, top: startY, bottom: 36 },
      theme: "striped",
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 16,
          { align: "center" }
        );
      },
    });

    doc.save(`branch-performance-report-${getReportFileDate()}.pdf`);
  };

  const statCards = useMemo(
    () => [
      {
        label: "Branches",
        value: summary?.branch_count ?? 0,
        icon: Building2,
        color: "from-rose-500 to-red-600",
      },
      {
        label: "Period collected",
        value: formatAmount(summary?.period_collected),
        icon: Wallet,
        color: "from-emerald-500 to-teal-600",
      },
      {
        label: "Period profit",
        value: formatAmount(summary?.period_profit),
        icon: TrendingUp,
        color: "from-cyan-500 to-blue-600",
      },
      {
        label: "Total arrears",
        value: formatAmount(summary?.total_arrears),
        icon: TrendingDown,
        color: "from-amber-500 to-orange-600",
      },
      {
        label: "Outstanding",
        value: formatAmount(summary?.total_outstanding),
        icon: Users,
        color: "from-violet-500 to-purple-600",
      },
    ],
    [summary]
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-red-50 to-orange-50">
        <div className="animate-spin h-12 w-12 border-b-2 border-rose-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-red-50/40 to-orange-50 p-4 sm:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="rounded-3xl border border-white/80 bg-white/90 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-100">
                    Branch management
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Branch Performance Report
                  </h1>
                  <p className="text-sm text-rose-50 mt-1">
                    Compare collections, profit, arrears, and portfolio health across all branches.
                    {reportRange.from && reportRange.to ? ` (${reportRange.from} to ${reportRange.to})` : ""}
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
                  disabled={!rows.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={!rows.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-b border-rose-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-black [color-scheme:light] [&::-webkit-datetime-edit]:text-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-black [color-scheme:light] [&::-webkit-datetime-edit]:text-black"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
                <select
                  value={branchFilter === "" ? "" : String(branchFilter)}
                  onChange={(e) => setBranchFilter(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-black [color-scheme:light]"
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
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 sm:p-6 border-b border-rose-100">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-rose-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                    <div className={`hidden sm:flex h-8 w-8 rounded-lg bg-gradient-to-br ${card.color} items-center justify-center`}>
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
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-rose-50" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center py-12 text-slate-600 font-medium">No branch data for the selected period.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-rose-900 border-b-2 border-rose-200">
                      <th className="py-3 pr-3 pl-1 whitespace-nowrap">Branch</th>
                      <th className="py-3 pr-3 whitespace-nowrap">Manager</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Collected</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Profit</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Arrears</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Outstanding</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">MF</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">MF Coll.</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Finance</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Fin. Coll.</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Mortgage</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Mtge Coll.</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Instant</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Inst. Coll.</th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {rows.map((row) => (
                      <tr key={row.branch_id} className="hover:bg-rose-50/60">
                        <td className="py-3 pr-3 pl-1 font-bold text-slate-900 whitespace-nowrap">{row.branch_name}</td>
                        <td className="py-3 pr-3 text-slate-700 whitespace-nowrap">{row.manager_name || "—"}</td>
                        <td className="py-3 pr-3 text-right font-bold text-emerald-800 tabular-nums whitespace-nowrap">
                          {formatAmount(row.period_collected)}
                        </td>
                        <td className="py-3 pr-3 text-right font-semibold text-cyan-800 tabular-nums whitespace-nowrap">
                          {formatAmount(row.period_profit)}
                        </td>
                        <td className="py-3 pr-3 text-right font-semibold text-amber-800 tabular-nums whitespace-nowrap">
                          {formatAmount(row.total_arrears)}
                        </td>
                        <td className="py-3 pr-3 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatAmount(row.total_outstanding)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{row.mf_active_loans}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(row.mf_collected)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{row.finance_active}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(row.finance_collected)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{row.mortgage_active}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(row.mortgage_collected)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{row.instant_active}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(row.instant_collected)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{row.employee_count}</td>
                      </tr>
                    ))}
                    {summary && rows.length > 1 ? (
                      <tr className="bg-rose-100/80 font-bold">
                        <td className="py-3 pr-3 pl-1 text-slate-900">TOTAL</td>
                        <td className="py-3 pr-3">—</td>
                        <td className="py-3 pr-3 text-right text-emerald-900 tabular-nums">
                          {formatAmount(summary.period_collected)}
                        </td>
                        <td className="py-3 pr-3 text-right text-cyan-900 tabular-nums">
                          {formatAmount(summary.period_profit)}
                        </td>
                        <td className="py-3 pr-3 text-right text-amber-900 tabular-nums">
                          {formatAmount(summary.total_arrears)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.total_outstanding)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{summary.mf_active_loans}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.mf_collected)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{summary.finance_active}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.finance_collected)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{summary.mortgage_active}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.mortgage_collected)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{summary.instant_active}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.instant_collected)}</td>
                        <td className="py-3 pr-3 text-right">—</td>
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

export default function BranchPerformanceReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-rose-600 rounded-full" />
        </div>
      }
    >
      <BranchPerformanceReportContent />
    </Suspense>
  );
}
