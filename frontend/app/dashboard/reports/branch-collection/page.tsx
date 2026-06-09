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
  HandCoins,
  RefreshCw,
  TrendingDown,
  Wallet,
} from "lucide-react";

type BranchCollectionRow = {
  branch_id: number;
  branch_name: string;
  manager_name: string | null;
  period_collected: number;
  total_transactions: number;
  mf_collected: number;
  mf_capital: number;
  mf_interest: number;
  mf_penalty: number;
  mf_transactions: number;
  mf_outstanding: number;
  mf_arrears: number;
  finance_collected: number;
  finance_interest: number;
  finance_transactions: number;
  finance_outstanding: number;
  finance_arrears: number;
  mortgage_collected: number;
  mortgage_profit: number;
  mortgage_transactions: number;
  mortgage_arrears: number;
  instant_collected: number;
  instant_transactions: number;
  instant_outstanding: number;
  total_pending: number;
  total_arrears: number;
};

type ReportSummary = {
  branch_count: number;
  period_collected: number;
  total_transactions: number;
  mf_collected: number;
  mf_capital: number;
  mf_interest: number;
  mf_penalty: number;
  finance_collected: number;
  finance_interest: number;
  mortgage_collected: number;
  mortgage_profit: number;
  instant_collected: number;
  instant_transactions: number;
  total_pending: number;
  total_arrears: number;
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

function BranchCollectionReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBase = getApiBaseUrl();

  const initialBranchId = Number(searchParams.get("branch_id") || 0) || "";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(monthStartIso);
  const [toDate, setToDate] = useState(todayIso);
  const [branchFilter, setBranchFilter] = useState<number | "">(initialBranchId);
  const [rows, setRows] = useState<BranchCollectionRow[]>([]);
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
      const res = await axios.get(`${apiBase}/reports/branch-collection`, {
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
      "Transactions",
      "MF Collected",
      "MF Capital",
      "MF Interest",
      "MF Penalty",
      "MF Transactions",
      "MF Pending",
      "MF Arrears",
      "Finance Collected",
      "Finance Interest",
      "Finance Transactions",
      "Finance Pending",
      "Finance Arrears",
      "Mortgage Collected",
      "Mortgage Profit",
      "Mortgage Transactions",
      "Mortgage Arrears",
      "Instant Collected",
      "Instant Transactions",
      "Instant Pending",
      "Total Pending",
      "Total Arrears",
    ];

    const lines = rows.map((r) =>
      [
        r.branch_name,
        r.manager_name || "",
        r.period_collected,
        r.total_transactions,
        r.mf_collected,
        r.mf_capital,
        r.mf_interest,
        r.mf_penalty,
        r.mf_transactions,
        r.mf_outstanding,
        r.mf_arrears,
        r.finance_collected,
        r.finance_interest,
        r.finance_transactions,
        r.finance_outstanding,
        r.finance_arrears,
        r.mortgage_collected,
        r.mortgage_profit,
        r.mortgage_transactions,
        r.mortgage_arrears,
        r.instant_collected,
        r.instant_transactions,
        r.instant_outstanding,
        r.total_pending,
        r.total_arrears,
      ].join(",")
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `branch-collection-${reportRange.from}-${reportRange.to}.csv`;
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
    doc.text("Branch Collection Report", 40, 36);
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
          ["Transactions", String(summary.total_transactions)],
          ["Micro credit collected", formatMoney(summary.mf_collected)],
          ["MF capital / interest / penalty", `${formatMoney(summary.mf_capital)} / ${formatMoney(summary.mf_interest)} / ${formatMoney(summary.mf_penalty)}`],
          ["Finance collected", formatMoney(summary.finance_collected)],
          ["Mortgage collected", formatMoney(summary.mortgage_collected)],
          ["Instant loan collected", formatMoney(summary.instant_collected)],
          ["Total pending (LKR)", formatMoney(summary.total_pending)],
          ["Total arrears (LKR)", formatMoney(summary.total_arrears)],
        ],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 200 },
          1: { halign: "right", cellWidth: 140 },
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
      String(row.total_transactions),
      formatMoney(row.mf_collected),
      formatMoney(row.mf_outstanding),
      formatMoney(row.mf_arrears),
      formatMoney(row.finance_collected),
      formatMoney(row.finance_outstanding),
      formatMoney(row.finance_arrears),
      formatMoney(row.mortgage_collected),
      formatMoney(row.mortgage_arrears),
      formatMoney(row.instant_collected),
      formatMoney(row.instant_outstanding),
      formatMoney(row.total_pending),
      formatMoney(row.total_arrears),
    ]);

    if (summary && rows.length > 1) {
      tableBody.push([
        "TOTAL",
        "—",
        formatMoney(summary.period_collected),
        String(summary.total_transactions),
        formatMoney(summary.mf_collected),
        "—",
        "—",
        formatMoney(summary.finance_collected),
        "—",
        "—",
        formatMoney(summary.mortgage_collected),
        "—",
        formatMoney(summary.instant_collected),
        "—",
        formatMoney(summary.total_pending),
        formatMoney(summary.total_arrears),
      ]);
    }

    autoTable(doc, {
      startY,
      head: [
        [
          "Branch",
          "Manager",
          "Collected",
          "Txns",
          "MF Coll.",
          "MF Pend.",
          "MF Arr.",
          "Fin Coll.",
          "Fin Pend.",
          "Fin Arr.",
          "Mtge Coll.",
          "Mtge Arr.",
          "Inst Coll.",
          "Inst Pend.",
          "Pending",
          "Arrears",
        ],
      ],
      body: tableBody,
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [255, 247, 237] },
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

    doc.save(`branch-collection-report-${getReportFileDate()}.pdf`);
  };

  const statCards = useMemo(
    () => [
      {
        label: "Branches",
        value: summary?.branch_count ?? 0,
        icon: Building2,
        color: "from-orange-500 to-amber-600",
      },
      {
        label: "Period collected",
        value: formatAmount(summary?.period_collected),
        icon: Wallet,
        color: "from-emerald-500 to-teal-600",
      },
      {
        label: "Transactions",
        value: summary?.total_transactions ?? 0,
        icon: HandCoins,
        color: "from-cyan-500 to-blue-600",
      },
      {
        label: "Total pending",
        value: formatAmount(summary?.total_pending),
        icon: TrendingDown,
        color: "from-violet-500 to-purple-600",
      },
      {
        label: "Total arrears",
        value: formatAmount(summary?.total_arrears),
        icon: TrendingDown,
        color: "from-rose-500 to-red-600",
      },
    ],
    [summary]
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <div className="animate-spin h-12 w-12 border-b-2 border-orange-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/40 to-rose-50 p-4 sm:p-6">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="rounded-3xl border border-white/80 bg-white/90 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <HandCoins className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-100">
                    Branch management
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Branch Collection Report</h1>
                  <p className="text-sm text-orange-50 mt-1">
                    Period collections by product with pending balances and arrears per branch.
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
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-orange-700 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={!rows.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-orange-700 disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-b border-orange-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-black [color-scheme:light] [&::-webkit-datetime-edit]:text-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-black [color-scheme:light] [&::-webkit-datetime-edit]:text-black"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
                <select
                  value={branchFilter === "" ? "" : String(branchFilter)}
                  onChange={(e) => setBranchFilter(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-black [color-scheme:light]"
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

          {summary ? (
            <div className="px-4 sm:px-6 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-xl bg-cyan-50 border border-cyan-100 px-3 py-2">
                <span className="text-slate-600">Micro credit</span>
                <p className="font-bold text-cyan-900 tabular-nums">{formatAmount(summary.mf_collected)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                <span className="text-slate-600">Finance</span>
                <p className="font-bold text-emerald-900 tabular-nums">{formatAmount(summary.finance_collected)}</p>
              </div>
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2">
                <span className="text-slate-600">Mortgage</span>
                <p className="font-bold text-indigo-900 tabular-nums">{formatAmount(summary.mortgage_collected)}</p>
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2">
                <span className="text-slate-600">Instant loan</span>
                <p className="font-bold text-violet-900 tabular-nums">{formatAmount(summary.instant_collected)}</p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 sm:p-6 border-b border-orange-100">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
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
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-orange-50" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center py-12 text-slate-600 font-medium">No collection data for the selected period.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-orange-900 border-b-2 border-orange-200">
                      <th className="py-3 pr-3 pl-1 whitespace-nowrap" rowSpan={2}>
                        Branch
                      </th>
                      <th className="py-3 pr-3 whitespace-nowrap" rowSpan={2}>
                        Manager
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Collected
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Txns
                      </th>
                      <th
                        className="py-2 pr-3 text-center text-cyan-800 border-b border-orange-100 whitespace-nowrap"
                        colSpan={5}
                      >
                        Micro credit
                      </th>
                      <th
                        className="py-2 pr-3 text-center text-emerald-800 border-b border-orange-100 whitespace-nowrap"
                        colSpan={4}
                      >
                        Finance
                      </th>
                      <th
                        className="py-2 pr-3 text-center text-indigo-800 border-b border-orange-100 whitespace-nowrap"
                        colSpan={3}
                      >
                        Mortgage
                      </th>
                      <th
                        className="py-2 pr-3 text-center text-violet-800 border-b border-orange-100 whitespace-nowrap"
                        colSpan={3}
                      >
                        Instant loan
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Pending
                      </th>
                      <th className="py-3 pr-3 text-right whitespace-nowrap" rowSpan={2}>
                        Arrears
                      </th>
                    </tr>
                    <tr className="text-left text-[9px] font-bold uppercase tracking-wider text-slate-600 border-b border-orange-100">
                      <th className="py-2 pr-2 text-right text-cyan-800">Coll.</th>
                      <th className="py-2 pr-2 text-right text-cyan-800">Cap.</th>
                      <th className="py-2 pr-2 text-right text-cyan-800">Int.</th>
                      <th className="py-2 pr-2 text-right text-cyan-800">Pen.</th>
                      <th className="py-2 pr-2 text-right text-cyan-800">Pend.</th>
                      <th className="py-2 pr-2 text-right text-emerald-800">Coll.</th>
                      <th className="py-2 pr-2 text-right text-emerald-800">Int.</th>
                      <th className="py-2 pr-2 text-right text-emerald-800">Pend.</th>
                      <th className="py-2 pr-2 text-right text-emerald-800">Arr.</th>
                      <th className="py-2 pr-2 text-right text-indigo-800">Coll.</th>
                      <th className="py-2 pr-2 text-right text-indigo-800">Profit</th>
                      <th className="py-2 pr-2 text-right text-indigo-800">Arr.</th>
                      <th className="py-2 pr-2 text-right text-violet-800">Coll.</th>
                      <th className="py-2 pr-2 text-right text-violet-800">Txns</th>
                      <th className="py-2 pr-2 text-right text-violet-800">Pend.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-50">
                    {rows.map((row) => (
                      <tr key={row.branch_id} className="hover:bg-orange-50/60">
                        <td className="py-3 pr-3 pl-1 font-bold text-slate-900 whitespace-nowrap">{row.branch_name}</td>
                        <td className="py-3 pr-3 text-slate-700 whitespace-nowrap">{row.manager_name || "—"}</td>
                        <td className="py-3 pr-3 text-right font-bold text-emerald-800 tabular-nums whitespace-nowrap">
                          {formatAmount(row.period_collected)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{row.total_transactions}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-900">{formatAmount(row.mf_collected)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-800">{formatAmount(row.mf_capital)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-800">{formatAmount(row.mf_interest)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-800">{formatAmount(row.mf_penalty)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-cyan-800">{formatAmount(row.mf_outstanding)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-emerald-900">{formatAmount(row.finance_collected)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-emerald-800">{formatAmount(row.finance_interest)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-emerald-800">{formatAmount(row.finance_outstanding)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-amber-800">{formatAmount(row.finance_arrears)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-indigo-900">{formatAmount(row.mortgage_collected)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-indigo-800">{formatAmount(row.mortgage_profit)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-amber-800">{formatAmount(row.mortgage_arrears)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-violet-900">{formatAmount(row.instant_collected)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-violet-800">{row.instant_transactions}</td>
                        <td className="py-3 pr-2 text-right tabular-nums text-violet-800">{formatAmount(row.instant_outstanding)}</td>
                        <td className="py-3 pr-3 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatAmount(row.total_pending)}
                        </td>
                        <td className="py-3 pr-3 text-right font-semibold text-amber-800 tabular-nums whitespace-nowrap">
                          {formatAmount(row.total_arrears)}
                        </td>
                      </tr>
                    ))}
                    {summary && rows.length > 1 ? (
                      <tr className="bg-orange-100/80 font-bold">
                        <td className="py-3 pr-3 pl-1 text-slate-900">TOTAL</td>
                        <td className="py-3 pr-3">—</td>
                        <td className="py-3 pr-3 text-right text-emerald-900 tabular-nums">
                          {formatAmount(summary.period_collected)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{summary.total_transactions}</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.mf_collected)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.mf_capital)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.mf_interest)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.mf_penalty)}</td>
                        <td className="py-3 pr-2 text-right">—</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.finance_collected)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.finance_interest)}</td>
                        <td className="py-3 pr-2 text-right">—</td>
                        <td className="py-3 pr-2 text-right">—</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.mortgage_collected)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.mortgage_profit)}</td>
                        <td className="py-3 pr-2 text-right">—</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{formatAmount(summary.instant_collected)}</td>
                        <td className="py-3 pr-2 text-right tabular-nums">{summary.instant_transactions}</td>
                        <td className="py-3 pr-2 text-right">—</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.total_pending)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatAmount(summary.total_arrears)}</td>
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

export default function BranchCollectionReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-orange-600 rounded-full" />
        </div>
      }
    >
      <BranchCollectionReportContent />
    </Suspense>
  );
}
