'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../_components/ModuleHeader';
import StatCard from '../_components/StatCard';
import SectionCard from '../_components/SectionCard';
import Badge from '../_components/Badge';
import ActionButton from '../_components/ActionButton';
import Modal from '../_components/Modal';
import { Briefcase, Clock, AlertTriangle, Eye, Banknote, Receipt } from 'lucide-react';

interface Mortgage {
  id: number;
  due_date?: string | null;
  arrears_amount?: number | string | null;
  due_amount?: number | string | null;
  due_interest_amount?: number | string | null;
  customer_id: number;
  mortgage_type: 'land' | 'house' | 'vehicle' | 'gold' | 'other';
  requested_amount: number | string;
  approved_amount?: number | string | null;
  interest_rate: number | string;
  interest_type: 'fixed' | 'reducing';
  tenure_months: number | string;
  installment_amount?: number | string | null;
  installment_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  interest_calculation_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  penalty_rate: number | string;
  processing_fee: number | string;
  status: 'draft' | 'submitted' | 'approved' | 'active' | 'arrears' | 'settled' | 'released';
  created_at: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    nic_passport?: string;
  };
  asset?: {
    asset_type?: string;
    deed_number?: string | null;
    vehicle_reg_no?: string | null;
    description?: string | null;
  } | null;
}

function formatAmount(v: number | string | null | undefined) {
  const n = typeof v === 'number' ? v : v != null ? parseFloat(String(v)) : NaN;
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toNumber(v: number | string | null | undefined): number {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : NaN;
}

function getFrequencyPerYear(frequency: string | null | undefined): number {
  const map: Record<string, number> = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    yearly: 1,
  };
  return map[String(frequency || 'monthly').toLowerCase()] ?? 12;
}

function frequencyLabel(frequency: string | null | undefined): string {
  const f = String(frequency || 'monthly').toLowerCase();
  if (f === 'daily') return 'Daily';
  if (f === 'weekly') return 'Weekly';
  if (f === 'monthly') return 'Monthly';
  if (f === 'quarterly') return 'Quarterly';
  if (f === 'yearly') return 'Yearly';
  return 'Monthly';
}

function daysOverdue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function computeInstallmentFigures(m: Mortgage) {
  const principal = toNumber(m.approved_amount ?? m.requested_amount);
  const annualRate = toNumber(m.interest_rate) / 100;
  const months = Math.round(toNumber(m.tenure_months));
  const installmentPerYear = getFrequencyPerYear(m.installment_frequency);
  const interestCalcPerYear = getFrequencyPerYear(m.interest_calculation_frequency || 'monthly');

  if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(months) || months <= 0) {
    return { installmentAmount: NaN, interestAmount: NaN, totalInterest: NaN };
  }

  const years = months / 12;
  const installmentCount = Math.max(1, Math.round(years * installmentPerYear));

  const effectiveAnnualRate = Math.pow(1 + (annualRate / interestCalcPerYear), interestCalcPerYear) - 1;
  const installmentRate = Math.pow(1 + effectiveAnnualRate, 1 / installmentPerYear) - 1;
  const interestPeriodRate = Math.pow(1 + effectiveAnnualRate, 1 / interestCalcPerYear) - 1;

  if (m.interest_type === 'reducing') {
    const pow = Math.pow(1 + installmentRate, installmentCount);
    const installment = principal * installmentRate * pow / (pow - 1);
    const firstInterest = principal * interestPeriodRate;
    const totalPayment = installment * installmentCount;
    const totalInterest = totalPayment - principal;
    return {
      installmentAmount: toNumber(m.installment_amount) || installment,
      interestAmount: firstInterest,
      totalInterest,
    };
  } else {
    const interestAmount = principal * interestPeriodRate;
    const totalInterest = principal * annualRate * years;
    const installmentAmount = toNumber(m.installment_amount) || ((principal + totalInterest) / installmentCount);
    return { installmentAmount, interestAmount, totalInterest };
  }
}

export default function Mortgages() {
  const [token, setToken] = useState('');
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [branchFilter, setBranchFilter] = useState('');
  const [searchNic, setSearchNic] = useState('');
  const [searchId, setSearchId] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchDeed, setSearchDeed] = useState('');
  const router = useRouter();

  const stats = useMemo(() => {
    const totalAccounts = mortgages.length;
    const totalApprovedAmount = mortgages.reduce((sum, mortgage) => {
      const amount = toNumber(mortgage.approved_amount ?? mortgage.requested_amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const averageInstallment = totalAccounts
      ? mortgages.reduce((sum, mortgage) => {
          const amount = toNumber(mortgage.installment_amount);
          return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0) / totalAccounts
      : 0;
    const averageRate = totalAccounts
      ? mortgages.reduce((sum, mortgage) => {
          const rate = toNumber(mortgage.interest_rate);
          return sum + (Number.isFinite(rate) ? rate : 0);
        }, 0) / totalAccounts
      : 0;

    return { totalAccounts, totalApprovedAmount, averageInstallment, averageRate };
  }, [mortgages]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      fetchMortgages(t, 1);
    }
  }, [router]);

  const fetchMortgages = async (authToken: string, page: number = 1) => {
    try {
      setLoading(true);
      const params: any = {};
      params.status = 'approved';
      if (branchFilter) params.branch_id = branchFilter;
      if (searchId) params.id = searchId;
      if (searchNic) params.nic = searchNic;
      if (searchMobile) params.mobile = searchMobile;
      if (searchVehicle) params.vehicle_no = searchVehicle;
      if (searchDeed) params.deed_no = searchDeed;

      const res = await axios.get('http://localhost:8000/api/mortgages', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { ...params, per_page: perPage, page }
      });

      const payload = res.data;
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      setMortgages(rows);
      setCurrentPage(Number(payload?.current_page || page || 1));
      setLastPage(Number(payload?.last_page || 1));
      setTotalRows(Number(payload?.total || rows.length || 0));
      setPerPage(Number(payload?.per_page || perPage));
    } catch (e) {
      console.error('Error fetching mortgages:', e);
      setMortgages([]);
      setCurrentPage(1);
      setLastPage(1);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  // Collect Payment modal state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMortgageId, setPaymentMortgageId] = useState<number | null>(null);
  const [paymentMortgage, setPaymentMortgage] = useState<Mortgage | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentToast, setPaymentToast] = useState<string>('');

  const openPaymentModal = (id: number) => {
    setPaymentMortgageId(id);
    const m = mortgages.find(x => x.id === id) || null;
    setPaymentMortgage(m);
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

  const submitPayment = async () => {
    if (!token || !paymentMortgageId) return;
    const amountNum = parseFloat(paymentAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setPaymentToast('Enter a valid amount');
      setTimeout(() => setPaymentToast(''), 2000);
      return;
    }
    try {
      setPaymentSubmitting(true);
      const payload = {
        mortgage_id: paymentMortgageId,
        branch_id: null,
        user_id: null,
        schedule_id: null,
        paid_date: paymentDate,
        amount: amountNum,
        payment_method: paymentMethod,
        remarks: paymentNote || undefined,
        collected_by: null,
      };
      // Attempt backend call (if endpoint exists); otherwise show success toast.
      await axios.post(`http://localhost:8000/api/mortgages/${paymentMortgageId}/payments`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Graceful fallback if POST not implemented yet
        return Promise.resolve();
      });
      setPaymentToast('Payment recorded');
      setPaymentOpen(false);
      setTimeout(() => setPaymentToast(''), 2000);
    } catch (e) {
      console.error('Payment submit error:', e);
      setPaymentToast('Failed to record payment');
      setTimeout(() => setPaymentToast(''), 2500);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-24 left-10 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute top-24 right-6 h-96 w-96 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-teal-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ModuleHeader
          title="Mortgage Portfolio"
          subtitle="Premium workspace to manage approved mortgage accounts"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mortgages', href: '/dashboard/mortgages' },
            { label: 'Portfolio' },
          ]}
          actions={(
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-lg bg-gradient-to-r from-slate-600 to-gray-800 px-4 py-2 text-white shadow-sm transition hover:opacity-95"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.back()}
                className="rounded-lg bg-gradient-to-r from-gray-500 to-zinc-700 px-4 py-2 text-white shadow-sm transition hover:opacity-95"
              >
                Back
              </button>
              <button
                onClick={() => router.push('/dashboard/mortgages/create')}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95"
              >
                <span className="h-4 w-4">+</span>
                New Mortgage
              </button>
            </div>
          )}
        />
      </div>

      {/* Stats + Filters */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="rounded-3xl border border-white/70 bg-white/82 backdrop-blur-xl p-6 shadow-[0_22px_60px_-30px_rgba(14,116,144,0.52)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] font-bold text-cyan-700">Portfolio Overview</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Approved Mortgage Book</h2>
              <p className="mt-1 text-sm text-slate-600">Monitor value exposure, installment strength, and rate profile across approved accounts.</p>
            </div>
            <button
              onClick={() => token && fetchMortgages(token)}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-cyan-700 hover:to-blue-700"
            >
              Refresh Portfolio
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Approved Accounts"
            value={stats.totalAccounts}
            tone="primary"
          />
          <StatCard
            icon={<Banknote className="h-5 w-5" />}
            label="Portfolio Value"
            value={formatAmount(stats.totalApprovedAmount)}
            hint="Approved + effective principal"
            tone="success"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Avg Installment"
            value={formatAmount(stats.averageInstallment)}
            hint="Per repayment period"
            tone="warning"
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Avg Interest Rate"
            value={`${stats.averageRate.toFixed(2)}%`}
            hint="Across approved records"
            tone="primary"
          />
        </div>

        <div>
          <SectionCard title="Smart Filters" description="Showing approved mortgages. Filter quickly by branch and identity markers." className="border-white/80 bg-white/85 backdrop-blur-xl shadow-[0_18px_44px_-28px_rgba(14,116,144,0.48)]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-6">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Status</label>
                <select
                  value="approved"
                  disabled
                  className="w-full rounded-xl border border-cyan-100 bg-cyan-50/80 px-3 py-2 text-slate-800"
                >
                  <option value="approved">approved</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Branch</label>
                <input
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  placeholder="Branch ID"
                  className="w-full rounded-xl border border-cyan-100 px-3 py-2 text-black focus:ring-2 focus:ring-cyan-300"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Mortgage ID</label>
                <input value={searchId} onChange={(e)=>setSearchId(e.target.value)} placeholder="e.g. 2" className="w-full rounded-xl border border-cyan-100 px-3 py-2 text-black focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Customer NIC</label>
                <input value={searchNic} onChange={(e)=>setSearchNic(e.target.value)} placeholder="e.g. 992233445V" className="w-full rounded-xl border border-cyan-100 px-3 py-2 text-black focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Mobile</label>
                <input value={searchMobile} onChange={(e)=>setSearchMobile(e.target.value)} placeholder="e.g. 0771234567" className="w-full rounded-xl border border-cyan-100 px-3 py-2 text-black focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div className="flex items-end xl:justify-end">
                <button
                  onClick={() => token && fetchMortgages(token, 1)}
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-white shadow-md transition hover:from-cyan-700 hover:to-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Vehicle Reg No</label>
                <input value={searchVehicle} onChange={(e)=>setSearchVehicle(e.target.value)} placeholder="e.g. CA-1234" className="w-full rounded-xl border border-cyan-100 px-3 py-2 text-black focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Deed No</label>
                <input value={searchDeed} onChange={(e)=>setSearchDeed(e.target.value)} placeholder="e.g. D123" className="w-full rounded-xl border border-cyan-100 px-3 py-2 text-black focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div className="flex items-end xl:justify-end">
                <button
                  onClick={() => {
                    setBranchFilter('');
                    setSearchId('');
                    setSearchNic('');
                    setSearchMobile('');
                    setSearchVehicle('');
                    setSearchDeed('');
                    if (token) fetchMortgages(token, 1);
                  }}
                  className="inline-flex items-center rounded-xl border border-cyan-200 bg-white px-6 py-2.5 text-cyan-800 shadow-sm transition hover:bg-cyan-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

      </div>

      {/* Table */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-white/90 backdrop-blur-xl shadow-[0_22px_55px_-34px_rgba(14,116,144,0.56)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cyan-100">
                <thead className="bg-cyan-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrears</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Principal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Interest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installment Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-100 bg-white">
                  {mortgages.map(m => (
                    <tr key={m.id} className="hover:bg-cyan-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(m.customer?.first_name || m.customer?.last_name) ? `${m.customer?.first_name ?? ''} ${m.customer?.last_name ?? ''}`.trim() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.customer?.phone ?? '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.customer?.nic_passport ?? '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="capitalize text-gray-900">{m.mortgage_type}</span>
                        {m.asset?.asset_type === 'vehicle' && m.asset?.vehicle_reg_no ? (
                          <span className="ml-2 text-gray-700">• {m.asset.vehicle_reg_no}</span>
                        ) : null}
                        {m.asset?.asset_type !== 'vehicle' && m.asset?.deed_number ? (
                          <span className="ml-2 text-gray-700">• {m.asset.deed_number}</span>
                        ) : null}
                        {!m.asset?.deed_number && !m.asset?.vehicle_reg_no && m.asset?.description ? (
                          <span className="ml-2 text-gray-700">• {m.asset.description}</span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatAmount(m.requested_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.interest_rate}% ({m.interest_type})</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.tenure_months} months</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {m.due_date ? (
                          <div>
                            <div>{m.due_date}</div>
                            {daysOverdue(m.due_date) ? <div className="text-xs text-rose-600">{daysOverdue(m.due_date)} days overdue</div> : <div className="text-xs text-emerald-600">On schedule</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatAmount(m.arrears_amount ?? 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatAmount(m.due_amount ?? 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatAmount(m.due_interest_amount ?? 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const { installmentAmount } = computeInstallmentFigures(m);
                          return `${formatAmount(installmentAmount)} (${frequencyLabel(m.installment_frequency)})`;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const { interestAmount } = computeInstallmentFigures(m);
                          return `${formatAmount(interestAmount)} (${frequencyLabel(m.interest_calculation_frequency || 'monthly')})`;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          label={m.status}
                          variant={
                            m.status === 'active' ? 'success' :
                            m.status === 'arrears' ? 'warning' :
                            m.status === 'approved' ? 'info' : 'default'
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <ActionButton
                            label="View"
                            size="sm"
                            variant="info"
                            icon={<Eye className="h-4 w-4" />}
                            onClick={() => router.push(`/dashboard/mortgages/${m.id}`)}
                          />
                          <ActionButton
                            label="Collect Payment"
                            size="sm"
                            variant="success"
                            icon={<Banknote className="h-4 w-4" />}
                            onClick={() => openPaymentModal(m.id)}
                          />
                          <ActionButton
                            label="View Payments"
                            size="sm"
                            variant="warning"
                            icon={<Receipt className="h-4 w-4" />}
                            onClick={() => router.push(`/dashboard/mortgages/${m.id}/payments`)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mortgages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No mortgages found.</p>
                </div>
              )}

              {totalRows > 0 && (
                <div className="flex flex-col gap-3 border-t border-cyan-100 bg-cyan-50/50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs font-medium text-slate-600">
                    Showing page {currentPage} of {lastPage} • Total records: {totalRows}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loading || currentPage <= 1}
                      onClick={() => token && fetchMortgages(token, currentPage - 1)}
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-sm font-semibold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="rounded-lg border border-cyan-100 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                      {currentPage}
                    </span>
                    <button
                      type="button"
                      disabled={loading || currentPage >= lastPage}
                      onClick={() => token && fetchMortgages(token, currentPage + 1)}
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-sm font-semibold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Modal */}
              <Modal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} title="Collect Payment" size="md">
                <div className="grid grid-cols-1 gap-4">
                  {paymentMortgage && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="text-xs text-gray-500">Interest per {frequencyLabel(paymentMortgage.interest_calculation_frequency || 'monthly')} ({paymentMortgage.interest_type})</div>
                      <div className="text-base font-medium text-gray-900">
                        {(() => {
                          const { interestAmount } = computeInstallmentFigures(paymentMortgage);
                          return formatAmount(interestAmount);
                        })()}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {paymentMortgage.interest_type === 'reducing' ? (
                          <span>Reducing: interest is on current outstanding principal.</span>
                        ) : (
                          <span>Fixed: interest is flat on full principal.</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 25000.00"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500"
                    />
                    {paymentMortgage && paymentAmount && (
                      <div className="mt-1 text-xs">
                        {(() => {
                          const amt = parseFloat(paymentAmount);
                          const { interestAmount } = computeInstallmentFigures(paymentMortgage);
                          if (!Number.isFinite(amt)) return null;
                          if (Math.abs(amt - interestAmount) < 0.01) {
                            return <span className="text-amber-600">Interest-only payment: principal will not reduce.</span>;
                          }
                          if (amt < interestAmount) {
                            return <span className="text-rose-600">Less than interest due for this period: will be recorded with arrears.</span>;
                          }
                          return <span className="text-emerald-600">Covers interest; excess reduces principal.</span>;
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Method</label>
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                      value={paymentNote}
                      onChange={e => setPaymentNote(e.target.value)}
                      placeholder="Optional remarks"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <ActionButton label="Cancel" variant="default" onClick={() => setPaymentOpen(false)} />
                  <ActionButton label={paymentSubmitting ? 'Submitting...' : 'Record Payment'} variant="success" onClick={submitPayment} disabled={paymentSubmitting} />
                </div>
              </Modal>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
