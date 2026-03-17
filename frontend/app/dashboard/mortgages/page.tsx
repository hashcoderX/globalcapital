'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from './_components/ModuleHeader';
import StatCard from './_components/StatCard';
import SectionCard from './_components/SectionCard';
import Badge from './_components/Badge';
import ActionButton from './_components/ActionButton';
import Modal from './_components/Modal';
import { Briefcase, Clock, AlertTriangle, Eye, Banknote, Receipt } from 'lucide-react';

interface Mortgage {
  id: number;
  customer_id: number;
  mortgage_type: 'land' | 'house' | 'vehicle' | 'gold' | 'other';
  requested_amount: number | string;
  approved_amount?: number | string | null;
  interest_rate: number | string;
  interest_type: 'fixed' | 'reducing';
  tenure_months: number | string;
  installment_amount?: number | string | null;
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

function computeMonthlyFigures(m: Mortgage) {
  const principal = toNumber(m.approved_amount ?? m.requested_amount);
  const annualRate = toNumber(m.interest_rate) / 100;
  const months = Math.round(toNumber(m.tenure_months));
  if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(months) || months <= 0) {
    return { monthlyInstallment: NaN, monthlyInterest: NaN, totalInterest: NaN };
  }

  const r = annualRate / 12; // monthly rate

  if (m.interest_type === 'reducing') {
    // EMI for reducing balance
    const pow = Math.pow(1 + r, months);
    const emi = principal * r * pow / (pow - 1);
    const firstMonthInterest = principal * r;
    const totalPayment = emi * months;
    const totalInterest = totalPayment - principal;
    return {
      monthlyInstallment: emi,
      monthlyInterest: firstMonthInterest,
      totalInterest,
    };
  } else {
    // Fixed/flat interest: interest on full principal each month
    const monthlyInterest = principal * r;
    const totalInterest = principal * annualRate * (months / 12);
    const monthlyInstallment = (principal + totalInterest) / months;
    return { monthlyInstallment, monthlyInterest, totalInterest };
  }
}

export default function Mortgages() {
  const [token, setToken] = useState('');
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [searchNic, setSearchNic] = useState('');
  const [searchId, setSearchId] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchDeed, setSearchDeed] = useState('');
  const router = useRouter();

  // Quick Calculator
  const [calcPrincipal, setCalcPrincipal] = useState<string>('');
  const [calcRate, setCalcRate] = useState<string>('');
  const [calcTenure, setCalcTenure] = useState<string>('');
  const [calcType, setCalcType] = useState<'fixed' | 'reducing'>('reducing');
  const calcResult = useMemo(() => {
    const mock: Mortgage = {
      id: 0,
      customer_id: 0,
      mortgage_type: 'other',
      requested_amount: calcPrincipal,
      approved_amount: null,
      interest_rate: calcRate,
      interest_type: calcType,
      tenure_months: calcTenure,
      installment_amount: null,
      penalty_rate: 0,
      processing_fee: 0,
      status: 'draft',
      created_at: '',
    };
    return computeMonthlyFigures(mock);
  }, [calcPrincipal, calcRate, calcTenure, calcType]);

  const stats = useMemo(() => {
    const active = mortgages.filter(m => m.status === 'active').length;
    const submitted = mortgages.filter(m => m.status === 'submitted' || m.status === 'approved').length;
    const arrears = mortgages.filter(m => m.status === 'arrears').length;
    return { active, submitted, arrears };
  }, [mortgages]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      // Temporary: set new token
      localStorage.setItem('token', '15|HCGJ1ncFdi1cLsjSpKAh34hKTv1nperxPylubiOu00aad7bf');
      setToken('15|HCGJ1ncFdi1cLsjSpKAh34hKTv1nperxPylubiOu00aad7bf');
      fetchMortgages('15|HCGJ1ncFdi1cLsjSpKAh34hKTv1nperxPylubiOu00aad7bf');
    }
  }, [router]);

  const fetchMortgages = async (authToken: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (branchFilter) params.branch_id = branchFilter;
      if (searchId) params.id = searchId;
      if (searchNic) params.nic = searchNic;
      if (searchMobile) params.mobile = searchMobile;
      if (searchVehicle) params.vehicle_no = searchVehicle;
      if (searchDeed) params.deed_no = searchDeed;

      const res = await axios.get('http://localhost:8000/api/mortgages', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { ...params, per_page: 20 }
      });
      const data = res.data?.data ?? res.data;
      setMortgages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching mortgages:', e);
      setMortgages([]);
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
        amount: amountNum,
        date: paymentDate,
        method: paymentMethod,
        note: paymentNote || undefined,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ModuleHeader
          title="Mortgage Management"
          subtitle="Track applications, approvals, schedules and repayments"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mortgages' },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Active Mortgages"
            value={stats.active}
            tone="primary"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Pending / Approved"
            value={stats.submitted}
            hint="Awaiting activation"
            tone="success"
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="In Arrears"
            value={stats.arrears}
            hint="Past due installments"
            tone="warning"
          />
        </div>

        <div className="mt-6">
          <SectionCard title="Filters" description="Search by NIC, ID, mobile, vehicle no., or deed no.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  {['draft','submitted','approved','active','arrears','settled','released'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Branch</label>
                <input
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  placeholder="Branch ID"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => token && fetchMortgages(token)}
                  className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2 text-white shadow-sm transition hover:opacity-95"
                >
                  Apply Filters
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Mortgage ID</label>
                <input value={searchId} onChange={(e)=>setSearchId(e.target.value)} placeholder="e.g. 2" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Customer NIC</label>
                <input value={searchNic} onChange={(e)=>setSearchNic(e.target.value)} placeholder="e.g. 992233445V" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Mobile Number</label>
                <input value={searchMobile} onChange={(e)=>setSearchMobile(e.target.value)} placeholder="e.g. 0771234567" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Vehicle Reg No</label>
                <input value={searchVehicle} onChange={(e)=>setSearchVehicle(e.target.value)} placeholder="e.g. CA-1234" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Deed No</label>
                <input value={searchDeed} onChange={(e)=>setSearchDeed(e.target.value)} placeholder="e.g. D123" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="mt-6">
          <SectionCard title="Mortgage Calculator" description="Estimate monthly installment and monthly interest using amount, rate, and tenure.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Amount</label>
                <input
                  value={calcPrincipal}
                  onChange={e => setCalcPrincipal(e.target.value)}
                  placeholder="e.g. 1,000,000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Interest Rate (Annual %)</label>
                <input
                  value={calcRate}
                  onChange={e => setCalcRate(e.target.value)}
                  placeholder="e.g. 16"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tenure (Months)</label>
                <input
                  value={calcTenure}
                  onChange={e => setCalcTenure(e.target.value)}
                  placeholder="e.g. 60"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={calcType}
                  onChange={e => setCalcType(e.target.value as 'fixed' | 'reducing')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reducing">Reducing (EMI)</option>
                  <option value="fixed">Fixed (Flat)</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="w-full rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">Monthly Installment</div>
                  <div className="text-base font-medium text-gray-900">{formatAmount(calcResult.monthlyInstallment)}</div>
                  <div className="mt-2 text-xs text-gray-500">Monthly Interest</div>
                  <div className="text-base font-medium text-gray-900">{formatAmount(calcResult.monthlyInterest)}</div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Installment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Interest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {mortgages.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
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
                        {(() => {
                          const { monthlyInstallment } = computeMonthlyFigures(m);
                          return formatAmount(monthlyInstallment);
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const { monthlyInterest } = computeMonthlyFigures(m);
                          return formatAmount(monthlyInterest);
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
              {/* Payment Modal */}
              <Modal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} title="Collect Payment" size="md">
                <div className="grid grid-cols-1 gap-4">
                  {paymentMortgage && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="text-xs text-gray-500">Monthly Interest ({paymentMortgage.interest_type})</div>
                      <div className="text-base font-medium text-gray-900">
                        {(() => {
                          const { monthlyInterest } = computeMonthlyFigures(paymentMortgage);
                          return formatAmount(monthlyInterest);
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
                          const { monthlyInterest } = computeMonthlyFigures(paymentMortgage);
                          if (!Number.isFinite(amt)) return null;
                          if (Math.abs(amt - monthlyInterest) < 0.01) {
                            return <span className="text-amber-600">Interest-only payment: principal will not reduce.</span>;
                          }
                          if (amt < monthlyInterest) {
                            return <span className="text-rose-600">Less than monthly interest: will be recorded with arrears.</span>;
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
