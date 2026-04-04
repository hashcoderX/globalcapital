"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Wallet,
} from "lucide-react";

export default function LoanDashboardPage() {
  const [token, setToken] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/");
      return;
    }
    setToken(storedToken);
  }, [router]);

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
        <div className="bg-white/82 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
              Loan Management
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Loan Control Center</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Manage loan workflow modules, create new requests, and monitor request queues from one page.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push("/dashboard/loan/request")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold shadow-sm flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              New Loan Request
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-200 shadow-sm flex items-center gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Main Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/credit")}
              className="px-4 py-2 rounded-xl bg-white hover:bg-cyan-50 text-cyan-800 text-sm font-semibold border border-cyan-200 shadow-sm flex items-center gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Back to Credit
            </button>
          </div>
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Loan Operations</h2>
              <p className="text-xs text-slate-600 mt-1">Access each loan function as a dedicated module.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/loan/request")}
              className="rounded-2xl border border-cyan-200 bg-white hover:bg-cyan-50 text-left p-4 transition-colors"
            >
              <PlusCircle className="h-5 w-5 text-cyan-700" />
              <p className="mt-2 text-sm font-bold text-slate-900">New Loan Request</p>
              <p className="mt-1 text-xs text-slate-600">Open the step-by-step request creation wizard.</p>
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard/loan/requests")}
              className="rounded-2xl border border-cyan-200 bg-white hover:bg-cyan-50 text-left p-4 transition-colors"
            >
              <ListChecks className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 text-sm font-bold text-slate-900">Loan Requests</p>
              <p className="mt-1 text-xs text-slate-600">Review submitted requests in a separate module page.</p>
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard/loan/requests")}
              className="rounded-2xl border border-cyan-200 bg-white hover:bg-cyan-50 text-left p-4 transition-colors"
            >
              <ClipboardList className="h-5 w-5 text-violet-700" />
              <p className="mt-2 text-sm font-bold text-slate-900">Request Queue</p>
              <p className="mt-1 text-xs text-slate-600">Track request statuses and approval progress levels.</p>
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard/credit")}
              className="rounded-2xl border border-cyan-200 bg-white hover:bg-cyan-50 text-left p-4 transition-colors"
            >
              <Wallet className="h-5 w-5 text-amber-700" />
              <p className="mt-2 text-sm font-bold text-slate-900">Credit Module</p>
              <p className="mt-1 text-xs text-slate-600">Jump back to the credit module and related workflows.</p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-cyan-100 bg-white/90 p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Module Overview</p>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1">Structured Loan Workspace</h2>
            <p className="text-sm text-slate-600 mt-2">
              This dashboard now follows the finance-page style with dedicated module entry points and icon-led actions.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/loan/requests")}
                className="px-4 py-2 rounded-xl bg-white border border-cyan-200 text-cyan-800 text-sm font-semibold hover:bg-cyan-50 flex items-center gap-2"
              >
                <ListChecks className="h-4 w-4" />
                Open Loan Requests Module
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/loan/request")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-700 hover:to-blue-700 flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Create New Request
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Quick Actions</p>
              <h3 className="mt-1 text-base font-extrabold text-slate-900">What do you want to do?</h3>
              <div className="mt-3 space-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/loan/request")}
                  className="w-full text-left rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2 font-semibold text-cyan-900 hover:bg-cyan-100 flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create new loan request
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/loan/requests")}
                  className="w-full text-left rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2 font-semibold text-cyan-900 hover:bg-cyan-100 flex items-center gap-2"
                >
                  <ListChecks className="h-4 w-4" />
                  View separate loan requests module
                </button>
                <p className="text-xs text-slate-600">
                  Approvals and detailed loan analytics can be added here later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
