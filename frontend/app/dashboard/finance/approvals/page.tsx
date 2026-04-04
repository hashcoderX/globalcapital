'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Clock3, Eye, Sparkles, XCircle } from 'lucide-react';

type FinanceApprovalRow = {
  id: number;
  finance_type?: string | null;
  product_type?: string | null;
  asset_reference?: string | null;
  amount?: number | string | null;
  down_payment?: number | string | null;
  financed_amount?: number | string | null;
  interest_rate?: number | string | null;
  interest_type?: string | null;
  tenure_months?: number | string | null;
  installment_frequency?: string | null;
  installment_amount?: number | string | null;
  refund_amount?: number | string | null;
  total_paid_amount?: number | string | null;
  balance_amount?: number | string | null;
  status?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  vehicle_details?: {
    vehicle_no?: string | null;
    chassis_no?: string | null;
    engine_no?: string | null;
    make_model?: string | null;
    year?: string | number | null;
  } | null;
  valuation_details?: {
    valuation_amount?: string | number | null;
    valuation_date?: string | null;
    valuer_name?: string | null;
  } | null;
  guarantor_details?: Array<{
    name?: string | null;
    nic?: string | null;
    phone?: string | null;
    address?: string | null;
  }> | null;
  repayment_plan?: {
    schedule_mode?: 'auto' | 'fixed_day' | 'custom_date' | null;
    first_installment_date?: string | null;
    collection_day_of_month?: number | string | null;
    grace_period_days?: number | string | null;
    installment_mode?: 'auto' | 'manual' | null;
    manual_installment_amount?: number | string | null;
    total_planned_amount?: number | string | null;
    next_installment_index?: number | string | null;
    installments?: Array<{
      installment_no?: number | string | null;
      payment_date?: string | null;
      amount?: number | string | null;
    }> | null;
    deduction_order?: {
      mode?: 'flat' | 'front_loaded' | 'installment_wise' | null;
      profit_percentage?: number | string | null;
      capital_percentage?: number | string | null;
      initial_installments?: number | string | null;
      initial_profit_percentage?: number | string | null;
      initial_capital_percentage?: number | string | null;
      remaining_profit_percentage?: number | string | null;
      remaining_capital_percentage?: number | string | null;
      installment_rules?: Array<{
        installment_no?: number | string | null;
        installment_amount?: number | string | null;
        profit_percentage?: number | string | null;
        capital_percentage?: number | string | null;
      }> | null;
    } | null;
  } | null;
  documents?: Array<{
    id: number;
    document_type?: string | null;
    original_name?: string | null;
    file_path?: string | null;
  }> | null;
  customer?: {
    customer_code?: string | null;
    first_name?: string;
    last_name?: string;
    nic_passport?: string | null;
    nic?: string | null;
    phone?: string | null;
  } | null;
};

type DeductionInstallmentRule = {
  installment_no: number;
  installment_amount: string;
  profit_percentage: string;
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
  return d.toLocaleDateString();
}

export default function FinanceApprovalsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FinanceApprovalRow[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedFinance, setSelectedFinance] = useState<FinanceApprovalRow | null>(null);
  const [deductionMode, setDeductionMode] = useState<'flat' | 'front_loaded' | 'installment_wise'>('flat');
  const [deductionProfitPercentage, setDeductionProfitPercentage] = useState('18');
  const [deductionInitialInstallments, setDeductionInitialInstallments] = useState('12');
  const [deductionInitialProfitPercentage, setDeductionInitialProfitPercentage] = useState('25');
  const [deductionRemainingProfitPercentage, setDeductionRemainingProfitPercentage] = useState('15');
  const [deductionInstallmentRules, setDeductionInstallmentRules] = useState<DeductionInstallmentRule[]>([]);
  const [deductionError, setDeductionError] = useState('');

  const pendingCount = rows.length;

  const totalPendingAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number.isFinite(toNumber(row.financed_amount)) ? toNumber(row.financed_amount) : 0), 0),
    [rows],
  );

  const averageTenure = useMemo(() => {
    if (rows.length === 0) return 0;
    const valid = rows.map((r) => toNumber(r.tenure_months)).filter((n) => Number.isFinite(n));
    if (valid.length === 0) return 0;
    return valid.reduce((sum, n) => sum + n, 0) / valid.length;
  }, [rows]);

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
      const response = await axios.get('http://localhost:8000/api/finances', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        params: { per_page: 1000, status: 'pending_approval' },
      });

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      setRows(data as FinanceApprovalRow[]);
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

  const buildDefaultDeductionRules = (finance: FinanceApprovalRow, defaultProfit: string): DeductionInstallmentRule[] => {
    const profitText = Number.isFinite(toNumber(defaultProfit)) ? toNumber(defaultProfit).toFixed(2) : '18.00';
    const planInstallments = Array.isArray(finance.repayment_plan?.installments)
      ? finance.repayment_plan?.installments
      : [];

    if (planInstallments && planInstallments.length > 0) {
      return planInstallments.map((row, index) => ({
        installment_no: Number.isFinite(toNumber(row.installment_no)) ? Math.max(1, Math.floor(toNumber(row.installment_no))) : index + 1,
        installment_amount: Number.isFinite(toNumber(row.amount)) ? toNumber(row.amount).toFixed(2) : (Number.isFinite(toNumber(finance.installment_amount)) ? toNumber(finance.installment_amount).toFixed(2) : '0.00'),
        profit_percentage: profitText,
      }));
    }

    const tenure = Number.isFinite(toNumber(finance.tenure_months)) ? Math.max(1, Math.floor(toNumber(finance.tenure_months))) : 1;
    const installmentAmountText = Number.isFinite(toNumber(finance.installment_amount)) ? toNumber(finance.installment_amount).toFixed(2) : '0.00';

    return Array.from({ length: tenure }, (_, i) => ({
      installment_no: i + 1,
      installment_amount: installmentAmountText,
      profit_percentage: profitText,
    }));
  };

  useEffect(() => {
    if (!selectedFinance) return;

    const existing = selectedFinance.repayment_plan?.deduction_order;
    const defaultProfit = Number.isFinite(toNumber(selectedFinance.interest_rate))
      ? toNumber(selectedFinance.interest_rate).toFixed(2)
      : '18';

    setDeductionMode((existing?.mode as 'flat' | 'front_loaded' | 'installment_wise') || 'flat');
    setDeductionProfitPercentage(Number.isFinite(toNumber(existing?.profit_percentage)) ? toNumber(existing?.profit_percentage).toFixed(2) : defaultProfit);
    setDeductionInitialInstallments(Number.isFinite(toNumber(existing?.initial_installments)) ? String(Math.floor(toNumber(existing?.initial_installments))) : '12');
    setDeductionInitialProfitPercentage(Number.isFinite(toNumber(existing?.initial_profit_percentage)) ? toNumber(existing?.initial_profit_percentage).toFixed(2) : '25');
    setDeductionRemainingProfitPercentage(Number.isFinite(toNumber(existing?.remaining_profit_percentage)) ? toNumber(existing?.remaining_profit_percentage).toFixed(2) : defaultProfit);

    const existingRules = Array.isArray(existing?.installment_rules)
      ? existing?.installment_rules
      : [];

    if (existingRules && existingRules.length > 0) {
      setDeductionInstallmentRules(existingRules.map((rule, idx) => ({
        installment_no: Number.isFinite(toNumber(rule.installment_no)) ? Math.max(1, Math.floor(toNumber(rule.installment_no))) : idx + 1,
        installment_amount: Number.isFinite(toNumber(rule.installment_amount)) ? toNumber(rule.installment_amount).toFixed(2) : (Number.isFinite(toNumber(selectedFinance.installment_amount)) ? toNumber(selectedFinance.installment_amount).toFixed(2) : '0.00'),
        profit_percentage: Number.isFinite(toNumber(rule.profit_percentage)) ? toNumber(rule.profit_percentage).toFixed(2) : defaultProfit,
      })));
    } else {
      setDeductionInstallmentRules(buildDefaultDeductionRules(selectedFinance, defaultProfit));
    }

    setDeductionError('');
  }, [selectedFinance]);

  const buildDeductionOrderPayload = () => {
    const profit = toNumber(deductionProfitPercentage);
    if (!Number.isFinite(profit) || profit < 0 || profit > 100) {
      setDeductionError('Profit percentage must be between 0 and 100.');
      return null;
    }

    const payload: Record<string, number | string> = {
      mode: deductionMode,
      profit_percentage: Number(profit.toFixed(2)),
      capital_percentage: Number((100 - profit).toFixed(2)),
    };

    if (deductionMode === 'front_loaded') {
      const initialInstallments = toNumber(deductionInitialInstallments);
      const initialProfit = toNumber(deductionInitialProfitPercentage);
      const remainingProfit = toNumber(deductionRemainingProfitPercentage);

      if (!Number.isFinite(initialInstallments) || initialInstallments < 1) {
        setDeductionError('Initial installment count must be at least 1.');
        return null;
      }
      if (!Number.isFinite(initialProfit) || initialProfit < 0 || initialProfit > 100) {
        setDeductionError('Initial profit percentage must be between 0 and 100.');
        return null;
      }
      if (!Number.isFinite(remainingProfit) || remainingProfit < 0 || remainingProfit > 100) {
        setDeductionError('Remaining profit percentage must be between 0 and 100.');
        return null;
      }

      payload.initial_installments = Math.floor(initialInstallments);
      payload.initial_profit_percentage = Number(initialProfit.toFixed(2));
      payload.remaining_profit_percentage = Number(remainingProfit.toFixed(2));
    } else if (deductionMode === 'installment_wise') {
      if (deductionInstallmentRules.length === 0) {
        setDeductionError('Installment-wise rules are empty.');
        return null;
      }

      const rules = deductionInstallmentRules.map((rule) => ({
        installment_no: Math.max(1, Math.floor(toNumber(rule.installment_no))),
        installment_amount: Number.isFinite(toNumber(rule.installment_amount)) ? Number(toNumber(rule.installment_amount).toFixed(2)) : NaN,
        profit_percentage: Number.isFinite(toNumber(rule.profit_percentage)) ? Number(toNumber(rule.profit_percentage).toFixed(2)) : NaN,
      }));

      const invalid = rules.find((rule) => !Number.isFinite(rule.installment_no) || !Number.isFinite(rule.profit_percentage) || rule.profit_percentage < 0 || rule.profit_percentage > 100);
      if (invalid) {
        setDeductionError('Each installment row needs a valid profit % (0-100).');
        return null;
      }

      const payloadWithRules = payload as Record<string, unknown>;
      payloadWithRules.installment_rules = rules;
      setDeductionError('');
      return payloadWithRules;
    }

    setDeductionError('');
    return payload;
  };

  const deductionPreviewRows = useMemo(() => {
    if (!selectedFinance) return [] as Array<{ installmentAmount: number; profitPct: number; capitalPct: number; profitAmount: number; capitalAmount: number }>;

    const planInstallments = Array.isArray(selectedFinance.repayment_plan?.installments)
      ? selectedFinance.repayment_plan.installments
      : [];

    const fallbackInstallmentAmount = Number.isFinite(toNumber(selectedFinance.installment_amount))
      ? toNumber(selectedFinance.installment_amount)
      : 0;

    const fallbackCount = Number.isFinite(toNumber(selectedFinance.tenure_months))
      ? Math.max(1, Math.floor(toNumber(selectedFinance.tenure_months)))
      : 1;

    if (deductionMode === 'installment_wise') {
      return deductionInstallmentRules
        .map((rule) => {
          const installmentAmount = Number.isFinite(toNumber(rule.installment_amount)) ? toNumber(rule.installment_amount) : fallbackInstallmentAmount;
          const profitPct = Number.isFinite(toNumber(rule.profit_percentage)) ? toNumber(rule.profit_percentage) : 0;
          const capitalPct = Math.max(0, 100 - profitPct);
          return {
            installmentAmount,
            profitPct,
            capitalPct,
            profitAmount: installmentAmount * (profitPct / 100),
            capitalAmount: installmentAmount * (capitalPct / 100),
          };
        })
        .filter((r) => Number.isFinite(r.installmentAmount) && r.installmentAmount >= 0);
    }

    const scheduleAmounts = planInstallments.length > 0
      ? planInstallments.map((row) => (Number.isFinite(toNumber(row.amount)) ? toNumber(row.amount) : fallbackInstallmentAmount))
      : Array.from({ length: fallbackCount }, () => fallbackInstallmentAmount);

    const baseProfit = Number.isFinite(toNumber(deductionProfitPercentage)) ? toNumber(deductionProfitPercentage) : 0;
    const initialCount = Number.isFinite(toNumber(deductionInitialInstallments)) ? Math.max(0, Math.floor(toNumber(deductionInitialInstallments))) : 0;
    const initialProfit = Number.isFinite(toNumber(deductionInitialProfitPercentage)) ? toNumber(deductionInitialProfitPercentage) : baseProfit;
    const remainingProfit = Number.isFinite(toNumber(deductionRemainingProfitPercentage)) ? toNumber(deductionRemainingProfitPercentage) : baseProfit;

    return scheduleAmounts.map((installmentAmount, idx) => {
      const profitPct = deductionMode === 'front_loaded'
        ? (idx < initialCount ? initialProfit : remainingProfit)
        : baseProfit;
      const capitalPct = Math.max(0, 100 - profitPct);
      return {
        installmentAmount,
        profitPct,
        capitalPct,
        profitAmount: installmentAmount * (profitPct / 100),
        capitalAmount: installmentAmount * (capitalPct / 100),
      };
    });
  }, [selectedFinance, deductionMode, deductionProfitPercentage, deductionInitialInstallments, deductionInitialProfitPercentage, deductionRemainingProfitPercentage, deductionInstallmentRules]);

  const deductionTotals = useMemo(() => {
    const totalInstallments = deductionPreviewRows.reduce((sum, row) => sum + row.installmentAmount, 0);
    const totalInterest = deductionPreviewRows.reduce((sum, row) => sum + row.profitAmount, 0);
    const totalCapital = deductionPreviewRows.reduce((sum, row) => sum + row.capitalAmount, 0);
    const financed = selectedFinance && Number.isFinite(toNumber(selectedFinance.financed_amount)) ? toNumber(selectedFinance.financed_amount) : 0;
    const previewBalance = financed - totalCapital;

    return {
      totalInstallments,
      totalInterest,
      totalCapital,
      financed,
      previewBalance,
    };
  }, [deductionPreviewRows, selectedFinance]);

  const autoBalanceSuggestion = useMemo(() => {
    const financed = deductionTotals.financed;
    const totalInstallments = deductionTotals.totalInstallments;

    if (!Number.isFinite(financed) || financed <= 0 || !Number.isFinite(totalInstallments) || totalInstallments <= 0) {
      return {
        canApply: false,
        suggestedCapitalPct: 0,
        suggestedProfitPct: 0,
      };
    }

    const capitalPctRaw = (financed / totalInstallments) * 100;
    const suggestedCapitalPct = Math.min(100, Math.max(0, capitalPctRaw));
    const suggestedProfitPct = Math.max(0, 100 - suggestedCapitalPct);

    return {
      canApply: true,
      suggestedCapitalPct: Number(suggestedCapitalPct.toFixed(2)),
      suggestedProfitPct: Number(suggestedProfitPct.toFixed(2)),
    };
  }, [deductionTotals]);

  const applyAutoBalanceHelper = () => {
    if (!autoBalanceSuggestion.canApply) {
      setDeductionError('Cannot auto-balance without financed amount and installment total.');
      return;
    }

    const suggestedProfit = autoBalanceSuggestion.suggestedProfitPct.toFixed(2);
    setDeductionProfitPercentage(suggestedProfit);

    if (deductionMode === 'front_loaded') {
      setDeductionInitialProfitPercentage(suggestedProfit);
      setDeductionRemainingProfitPercentage(suggestedProfit);
    } else if (deductionMode === 'installment_wise') {
      setDeductionInstallmentRules((prev) => prev.map((row) => ({ ...row, profit_percentage: suggestedProfit })));
    }

    setDeductionError('');
  };

  const updateStatus = async (id: number, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      setProcessingId(id);
      const payload: Record<string, unknown> = { action };

      if (action === 'approve') {
        const deductionOrder = buildDeductionOrderPayload();
        if (!deductionOrder) {
          setProcessingId(null);
          return;
        }
        payload.deduction_order = deductionOrder;
      }

      await axios.post(
        `http://localhost:8000/api/finances/${id}/status`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      setRows((prev) => prev.filter((r) => r.id !== id));
      if (selectedFinance?.id === id) {
        setDetailOpen(false);
        setSelectedFinance(null);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setDeductionError(String(error.response?.data?.message || 'Failed to update status.'));
      } else {
        setDeductionError('Failed to update status.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const openDetails = async (id: number) => {
    if (!token) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setSelectedFinance(null);

    try {
      const response = await axios.get(`http://localhost:8000/api/finances/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      setSelectedFinance(response.data as FinanceApprovalRow);
    } catch {
      setDetailError('Failed to load finance details.');
    } finally {
      setDetailLoading(false);
    }
  };

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Loading approvals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-24 left-10 h-80 w-80 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute top-24 right-8 h-96 w-96 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute -bottom-10 left-1/3 h-72 w-72 rounded-full bg-teal-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-5">
        <div className="bg-white/90 rounded-3xl border border-cyan-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-[0_24px_50px_-28px_rgba(8,145,178,0.45)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">
              <Sparkles className="h-3.5 w-3.5" />
              Finance Section
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-3">Finance Approvals</h1>
            <p className="text-sm text-slate-600 mt-1">Review every application with decision confidence before activation.</p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/dashboard/finance')}
            className="px-4 py-2 rounded-xl bg-white border border-cyan-200 text-cyan-800 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-cyan-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-cyan-100 bg-white/90 backdrop-blur-xl p-4">
            <div className="inline-flex items-center gap-2 text-cyan-800">
              <Clock3 className="h-5 w-5" />
              <p className="text-xs font-bold uppercase tracking-wide">Pending Queue</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{pendingCount}</p>
            <p className="text-xs text-slate-500">Records waiting for decision</p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white/90 backdrop-blur-xl p-4">
            <div className="inline-flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-xs font-bold uppercase tracking-wide">Exposure</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatAmount(totalPendingAmount)}</p>
            <p className="text-xs text-slate-500">Total financed amount awaiting approval</p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white/90 backdrop-blur-xl p-4">
            <div className="inline-flex items-center gap-2 text-violet-800">
              <ClipboardCheck className="h-5 w-5" />
              <p className="text-xs font-bold uppercase tracking-wide">Avg Tenure</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{averageTenure > 0 ? `${averageTenure.toFixed(1)} mo` : '-'}</p>
            <p className="text-xs text-slate-500">Average tenure of queued applications</p>
          </div>
        </div>

        <div className="bg-white/90 rounded-3xl border border-cyan-100 p-5 shadow-[0_24px_50px_-28px_rgba(8,145,178,0.35)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2 text-cyan-800">
              <ClipboardCheck className="h-5 w-5" />
              <p className="font-bold">Pending Approval Queue</p>
            </div>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{rows.length} records</span>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-6 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-white border border-cyan-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-cyan-700" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">No pending finance approvals.</p>
              <p className="text-xs text-slate-500 mt-1">New applications sent for approval will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-cyan-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">ID</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold">Financed</th>
                    <th className="px-3 py-2 font-semibold">Terms</th>
                    <th className="px-3 py-2 font-semibold">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const customer = `${row.customer?.first_name || ''} ${row.customer?.last_name || ''}`.trim();
                    return (
                      <tr key={row.id} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-900">#{row.id}</td>
                        <td className="px-3 py-2">{customer || '-'}</td>
                        <td className="px-3 py-2 capitalize">{row.finance_type || '-'}</td>
                        <td className="px-3 py-2">{row.product_type || '-'}</td>
                        <td className="px-3 py-2">{formatAmount(row.financed_amount)}</td>
                        <td className="px-3 py-2">{Number.isFinite(toNumber(row.interest_rate)) ? `${toNumber(row.interest_rate).toFixed(2)}%` : '-'} / {row.tenure_months || '-'} mo</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => openDetails(row.id)}
                            className="rounded-lg bg-cyan-100 hover:bg-cyan-200 border border-cyan-200 px-3 py-1.5 text-xs font-semibold text-cyan-800 inline-flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
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
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-7xl h-[92vh] rounded-2xl bg-white border border-cyan-100 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Approval Review</p>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedFinance ? `Finance #${selectedFinance.id}` : 'Finance Details'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">Review full application details before taking action.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  setSelectedFinance(null);
                  setDetailError('');
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40 space-y-4">
              {detailLoading && (
                <div className="h-full min-h-[260px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Loading details</p>
                  </div>
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {detailError}
                </div>
              )}

              {!detailLoading && !detailError && selectedFinance && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-cyan-100 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Customer</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {`${selectedFinance.customer?.first_name || ''} ${selectedFinance.customer?.last_name || ''}`.trim() || '-'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{selectedFinance.customer?.customer_code || '-'}</p>
                      <p className="text-xs text-slate-500">NIC: {selectedFinance.customer?.nic_passport || selectedFinance.customer?.nic || '-'}</p>
                      <p className="text-xs text-slate-500">Phone: {selectedFinance.customer?.phone || '-'}</p>
                    </div>

                    <div className="rounded-xl border border-cyan-100 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Finance Type</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 capitalize">{selectedFinance.finance_type || '-'}</p>
                      <p className="text-xs text-slate-500 mt-1">Product: {selectedFinance.product_type || '-'}</p>
                      <p className="text-xs text-slate-500">Status: {selectedFinance.status || '-'}</p>
                    </div>

                    <div className="rounded-xl border border-cyan-100 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Timeline</p>
                      <p className="mt-2 text-xs text-slate-500">Start: {formatDate(selectedFinance.start_date)}</p>
                      <p className="text-xs text-slate-500">Created: {formatDate(selectedFinance.created_at)}</p>
                      <p className="text-xs text-slate-500">Reference: {selectedFinance.asset_reference || '-'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-100 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 mb-3">Financial Terms</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div><span className="text-slate-500">Asset Value: </span><span className="font-semibold text-slate-900">{formatAmount(selectedFinance.amount)}</span></div>
                      <div><span className="text-slate-500">Down Payment: </span><span className="font-semibold text-slate-900">{formatAmount(selectedFinance.down_payment)}</span></div>
                      <div><span className="text-slate-500">Financed: </span><span className="font-semibold text-slate-900">{formatAmount(selectedFinance.financed_amount)}</span></div>
                      <div><span className="text-slate-500">Interest: </span><span className="font-semibold text-slate-900">{Number.isFinite(toNumber(selectedFinance.interest_rate)) ? `${toNumber(selectedFinance.interest_rate).toFixed(2)}%` : '-'}</span></div>
                      <div><span className="text-slate-500">Interest Type: </span><span className="font-semibold text-slate-900 capitalize">{selectedFinance.interest_type || '-'}</span></div>
                      <div><span className="text-slate-500">Tenure: </span><span className="font-semibold text-slate-900">{selectedFinance.tenure_months || '-'} mo</span></div>
                      <div><span className="text-slate-500">Frequency: </span><span className="font-semibold text-slate-900 capitalize">{selectedFinance.installment_frequency || '-'}</span></div>
                      <div><span className="text-slate-500">Installment: </span><span className="font-semibold text-slate-900">{formatAmount(selectedFinance.installment_amount)}</span></div>
                      <div><span className="text-slate-500">Total Paid: </span><span className="font-semibold text-slate-900">{formatAmount(selectedFinance.total_paid_amount)}</span></div>
                      <div><span className="text-slate-500">Balance: </span><span className="font-semibold text-slate-900">{formatAmount(selectedFinance.balance_amount)}</span></div>
                      <div><span className="text-slate-500">Refund: </span><span className="font-semibold text-slate-900">{formatAmount(selectedFinance.refund_amount)}</span></div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-100 bg-white p-4 space-y-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Deduction Order</p>
                      <p className="text-xs text-slate-500 mt-1">Set how each installment is split between company profit (interest) and capital recovery.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Allocation Mode</label>
                        <select
                          value={deductionMode}
                          onChange={(e) => setDeductionMode(e.target.value as 'flat' | 'front_loaded' | 'installment_wise')}
                          className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="flat">Flat Percentage</option>
                          <option value="front_loaded">Front-Loaded Profit</option>
                          <option value="installment_wise">Installment-Wise Percentage</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Base Profit %</label>
                        <input
                          value={deductionProfitPercentage}
                          onChange={(e) => setDeductionProfitPercentage(e.target.value)}
                          className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                          placeholder="e.g. 18"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Base Capital %</label>
                        <input
                          value={Number.isFinite(toNumber(deductionProfitPercentage)) ? (100 - toNumber(deductionProfitPercentage)).toFixed(2) : '-'}
                          readOnly
                          className="w-full rounded-lg border border-cyan-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        />
                      </div>
                    </div>

                    {deductionMode === 'front_loaded' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Initial Installments</label>
                          <input
                            value={deductionInitialInstallments}
                            onChange={(e) => setDeductionInitialInstallments(e.target.value)}
                            className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                            placeholder="e.g. 12"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Initial Profit %</label>
                          <input
                            value={deductionInitialProfitPercentage}
                            onChange={(e) => setDeductionInitialProfitPercentage(e.target.value)}
                            className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                            placeholder="e.g. 25"
                          />
                          <p className="mt-1 text-[11px] text-slate-500">Initial Capital %: {Number.isFinite(toNumber(deductionInitialProfitPercentage)) ? (100 - toNumber(deductionInitialProfitPercentage)).toFixed(2) : '-'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Remaining Profit %</label>
                          <input
                            value={deductionRemainingProfitPercentage}
                            onChange={(e) => setDeductionRemainingProfitPercentage(e.target.value)}
                            className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                            placeholder="e.g. 15"
                          />
                          <p className="mt-1 text-[11px] text-slate-500">Remaining Capital %: {Number.isFinite(toNumber(deductionRemainingProfitPercentage)) ? (100 - toNumber(deductionRemainingProfitPercentage)).toFixed(2) : '-'}</p>
                        </div>
                      </div>
                    )}

                    {deductionMode === 'installment_wise' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-600">Set profit percentage for each installment. Capital % will auto-calculate.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const base = Number.isFinite(toNumber(deductionProfitPercentage)) ? toNumber(deductionProfitPercentage).toFixed(2) : '18.00';
                              setDeductionInstallmentRules((prev) => prev.map((row) => ({ ...row, profit_percentage: base })));
                            }}
                            className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                          >
                            Apply Base To All
                          </button>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-cyan-100">
                          <table className="min-w-full text-xs text-left text-slate-700 bg-white">
                            <thead className="bg-cyan-50/70">
                              <tr>
                                <th className="px-2 py-2 font-semibold">Installment #</th>
                                <th className="px-2 py-2 font-semibold">Installment Amount</th>
                                <th className="px-2 py-2 font-semibold">Profit %</th>
                                <th className="px-2 py-2 font-semibold">Capital %</th>
                                <th className="px-2 py-2 font-semibold">Profit Amount</th>
                                <th className="px-2 py-2 font-semibold">Capital Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deductionInstallmentRules.map((rule, idx) => {
                                const installmentAmount = toNumber(rule.installment_amount);
                                const profitPct = toNumber(rule.profit_percentage);
                                const capitalPct = Number.isFinite(profitPct) ? Math.max(0, 100 - profitPct) : NaN;
                                return (
                                  <tr key={`dor-${rule.installment_no}-${idx}`} className="border-b border-cyan-100 last:border-b-0">
                                    <td className="px-2 py-2">{rule.installment_no}</td>
                                    <td className="px-2 py-2">{formatAmount(installmentAmount)}</td>
                                    <td className="px-2 py-2">
                                      <input
                                        value={rule.profit_percentage}
                                        onChange={(e) => setDeductionInstallmentRules((prev) => prev.map((row, i) => i === idx ? { ...row, profit_percentage: e.target.value } : row))}
                                        className="w-24 rounded-lg border border-cyan-100 bg-white px-2 py-1 text-xs text-slate-900"
                                      />
                                    </td>
                                    <td className="px-2 py-2">{Number.isFinite(capitalPct) ? capitalPct.toFixed(2) : '-'}</td>
                                    <td className="px-2 py-2">{formatAmount(Number.isFinite(installmentAmount) && Number.isFinite(profitPct) ? installmentAmount * (profitPct / 100) : NaN)}</td>
                                    <td className="px-2 py-2">{formatAmount(Number.isFinite(installmentAmount) && Number.isFinite(capitalPct) ? installmentAmount * (capitalPct / 100) : NaN)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3 text-xs text-cyan-900 space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-md border border-cyan-200 bg-white/70 px-2.5 py-2">
                        <div>
                          Suggested Auto Balance: Profit <span className="font-semibold">{autoBalanceSuggestion.canApply ? autoBalanceSuggestion.suggestedProfitPct.toFixed(2) : '-'}%</span> | Capital <span className="font-semibold">{autoBalanceSuggestion.canApply ? autoBalanceSuggestion.suggestedCapitalPct.toFixed(2) : '-'}%</span>
                        </div>
                        <button
                          type="button"
                          onClick={applyAutoBalanceHelper}
                          disabled={!autoBalanceSuggestion.canApply}
                          className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
                        >
                          Auto Balance
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>Total Installment Sum: <span className="font-semibold">{formatAmount(deductionTotals.totalInstallments)}</span></div>
                        <div>Total Interest Amount: <span className="font-semibold">{formatAmount(deductionTotals.totalInterest)}</span></div>
                        <div>Total Capital Amount: <span className="font-semibold">{formatAmount(deductionTotals.totalCapital)}</span></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>Financed Amount: <span className="font-semibold">{formatAmount(deductionTotals.financed)}</span></div>
                        <div>Current Balance: <span className="font-semibold">{formatAmount(selectedFinance.balance_amount)}</span></div>
                        <div>
                          Preview Balance: <span className={`font-semibold ${deductionTotals.previewBalance < 0 ? 'text-rose-700' : 'text-cyan-900'}`}>{formatAmount(deductionTotals.previewBalance)}</span>
                        </div>
                      </div>
                      {deductionTotals.previewBalance < 0 && (
                        <div className="text-rose-700 font-semibold">Preview balance is negative. Capital allocation exceeds financed amount.</div>
                      )}
                    </div>

                    {deductionError && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                        {deductionError}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-cyan-100 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 mb-3">Repayment Plan</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                      <div><span className="text-slate-500">Installment Mode: </span><span className="font-semibold text-slate-900 capitalize">{selectedFinance.repayment_plan?.installment_mode || 'auto'}</span></div>
                      <div><span className="text-slate-500">Schedule Mode: </span><span className="font-semibold text-slate-900 capitalize">{String(selectedFinance.repayment_plan?.schedule_mode || 'auto').replace('_', ' ')}</span></div>
                      <div><span className="text-slate-500">First Installment: </span><span className="font-semibold text-slate-900">{formatDate(selectedFinance.repayment_plan?.first_installment_date)}</span></div>
                      <div><span className="text-slate-500">Collection Day: </span><span className="font-semibold text-slate-900">{selectedFinance.repayment_plan?.collection_day_of_month || '-'}</span></div>
                      <div><span className="text-slate-500">Grace Days: </span><span className="font-semibold text-slate-900">{selectedFinance.repayment_plan?.grace_period_days || 0}</span></div>
                      <div><span className="text-slate-500">Planned Total: </span><span className="font-semibold text-slate-900">{formatAmount(selectedFinance.repayment_plan?.total_planned_amount)}</span></div>
                    </div>

                    {Array.isArray(selectedFinance.repayment_plan?.installments) && selectedFinance.repayment_plan?.installments.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-cyan-100">
                        <div className="px-2 py-2 text-[11px] font-semibold text-cyan-800 bg-cyan-50/60 border-b border-cyan-100">
                          Upcoming installment highlighted based on saved schedule progress.
                        </div>
                        <table className="min-w-full text-xs text-left text-slate-700 bg-white">
                          <thead className="bg-cyan-50/70">
                            <tr>
                              <th className="px-2 py-2 font-semibold">Installment #</th>
                              <th className="px-2 py-2 font-semibold">Payment Date</th>
                              <th className="px-2 py-2 font-semibold">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedFinance.repayment_plan.installments.map((item, index) => {
                              const nextIndexRaw = toNumber(selectedFinance.repayment_plan?.next_installment_index);
                              const nextIndex = Number.isFinite(nextIndexRaw) ? Math.max(0, Math.floor(nextIndexRaw)) : 0;
                              const isUpcoming = index === nextIndex;

                              return (
                              <tr key={`rp-${index}`} className={`border-b border-cyan-100 last:border-b-0 ${isUpcoming ? 'bg-emerald-50/70' : ''}`}>
                                <td className="px-2 py-2">
                                  {item.installment_no || index + 1}
                                  {isUpcoming && (
                                    <span className="ml-2 inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Upcoming</span>
                                  )}
                                </td>
                                <td className="px-2 py-2">{formatDate(item.payment_date)}</td>
                                <td className="px-2 py-2">{formatAmount(item.amount)}</td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Default equal-installment plan (no custom installment rows).</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-cyan-100 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 mb-3">Vehicle Details</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-slate-500">Vehicle No: </span><span className="text-slate-900 font-semibold">{selectedFinance.vehicle_details?.vehicle_no || '-'}</span></p>
                        <p><span className="text-slate-500">Chassis No: </span><span className="text-slate-900 font-semibold">{selectedFinance.vehicle_details?.chassis_no || '-'}</span></p>
                        <p><span className="text-slate-500">Engine No: </span><span className="text-slate-900 font-semibold">{selectedFinance.vehicle_details?.engine_no || '-'}</span></p>
                        <p><span className="text-slate-500">Make/Model: </span><span className="text-slate-900 font-semibold">{selectedFinance.vehicle_details?.make_model || '-'}</span></p>
                        <p><span className="text-slate-500">Year: </span><span className="text-slate-900 font-semibold">{selectedFinance.vehicle_details?.year || '-'}</span></p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-100 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 mb-3">Valuation Details</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-slate-500">Amount: </span><span className="text-slate-900 font-semibold">{formatAmount(selectedFinance.valuation_details?.valuation_amount)}</span></p>
                        <p><span className="text-slate-500">Date: </span><span className="text-slate-900 font-semibold">{formatDate(selectedFinance.valuation_details?.valuation_date)}</span></p>
                        <p><span className="text-slate-500">Valuer: </span><span className="text-slate-900 font-semibold">{selectedFinance.valuation_details?.valuer_name || '-'}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-100 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 mb-3">Guarantors</p>
                    {Array.isArray(selectedFinance.guarantor_details) && selectedFinance.guarantor_details.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedFinance.guarantor_details.map((g, index) => (
                          <div key={`g-${index}`} className="rounded-lg border border-cyan-100 bg-cyan-50/35 p-3 text-sm">
                            <p><span className="text-slate-500">Name: </span><span className="text-slate-900 font-semibold">{g.name || '-'}</span></p>
                            <p><span className="text-slate-500">NIC: </span><span className="text-slate-900 font-semibold">{g.nic || '-'}</span></p>
                            <p><span className="text-slate-500">Phone: </span><span className="text-slate-900 font-semibold">{g.phone || '-'}</span></p>
                            <p><span className="text-slate-500">Address: </span><span className="text-slate-900 font-semibold">{g.address || '-'}</span></p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No guarantor details found.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-cyan-100 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 mb-3">Documents</p>
                    {Array.isArray(selectedFinance.documents) && selectedFinance.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedFinance.documents.map((doc) => (
                          <div key={doc.id} className="rounded-lg border border-cyan-100 bg-cyan-50/35 px-3 py-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">{doc.original_name || 'Unnamed file'}</span>
                            <span className="text-slate-500"> ({doc.document_type || 'document'})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No documents uploaded.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-cyan-100 bg-white flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  setSelectedFinance(null);
                  setDetailError('');
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => selectedFinance && updateStatus(selectedFinance.id, 'reject')}
                disabled={!selectedFinance || detailLoading || processingId === selectedFinance?.id}
                className="px-4 py-2 rounded-lg bg-rose-100 hover:bg-rose-200 border border-rose-200 text-rose-800 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                type="button"
                onClick={() => selectedFinance && updateStatus(selectedFinance.id, 'approve')}
                disabled={!selectedFinance || detailLoading || processingId === selectedFinance?.id}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
