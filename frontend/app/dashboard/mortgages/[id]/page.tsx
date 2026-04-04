'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../_components/ModuleHeader';
import SectionCard from '../_components/SectionCard';
import Badge from '../_components/Badge';
import StatCard from '../_components/StatCard';
import { Banknote, PercentCircle, CalendarDays, MapPin, Users, Send, Check, XCircle, Unlock, Landmark, ShieldCheck, Loader2 } from 'lucide-react';
import ActionButton from '../_components/ActionButton';

export default function MortgageDetails() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [mortgage, setMortgage] = useState<any>(null);
  const id = params?.id as string;
  const [toast, setToast] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<'submit' | 'approve' | 'reject' | 'release' | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      fetchMortgage(t);
    }
  }, [router]);

  const fetchMortgage = async (authToken: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/mortgages/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setMortgage(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatus = async (action: 'submit' | 'approve' | 'reject' | 'release') => {
    if (!token) return;
    try {
      setActionLoading(true);
      setActionInProgress(action);
      const res = await axios.post(`http://localhost:8000/api/mortgages/${id}/status`, { action }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchMortgage(token);
      setToast(`Status updated: ${res.data?.status ?? action}`);
    } catch (e) {
      alert('Failed to update status');
      console.error(e);
    } finally {
      setActionLoading(false);
      setActionInProgress(null);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const formatAmount = (v: number | string | null | undefined) => {
    const n = typeof v === 'number' ? v : v != null ? parseFloat(String(v)) : NaN;
    if (!Number.isFinite(n)) return '-';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const canSubmit = useMemo(() => mortgage?.status === 'draft', [mortgage]);
  const canApproveReject = useMemo(() => mortgage?.status === 'submitted', [mortgage]);
  const canRelease = useMemo(() => mortgage?.status === 'approved', [mortgage]);
  const statusVariant = useMemo(() => (
    mortgage?.status === 'active' ? 'success' :
    mortgage?.status === 'arrears' ? 'warning' :
    mortgage?.status === 'approved' ? 'info' : 'default'
  ), [mortgage]);

  const toNumber = (v: number | string | null | undefined): number => {
    if (typeof v === 'number') return v;
    if (v == null) return NaN;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : NaN;
  };

  const monthlyFigures = useMemo(() => {
    if (!mortgage) return { monthlyInstallment: NaN, monthlyInterest: NaN, totalInterest: NaN };
    const principal = toNumber(mortgage.approved_amount ?? mortgage.requested_amount);
    const annualRate = toNumber(mortgage.interest_rate) / 100;
    const months = Math.round(toNumber(mortgage.tenure_months));
    if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(months) || months <= 0) {
      return { monthlyInstallment: NaN, monthlyInterest: NaN, totalInterest: NaN };
    }
    const r = annualRate / 12;
    if (mortgage.interest_type === 'reducing') {
      const pow = Math.pow(1 + r, months);
      const emi = principal * r * pow / (pow - 1);
      const firstInterest = principal * r;
      const totalPayment = emi * months;
      const totalInterest = totalPayment - principal;
      return { monthlyInstallment: emi, monthlyInterest: firstInterest, totalInterest };
    } else {
      const monthlyInterest = principal * r;
      const totalInterest = principal * annualRate * (months / 12);
      const monthlyInstallment = (principal + totalInterest) / months;
      return { monthlyInstallment, monthlyInterest, totalInterest };
    }
  }, [mortgage]);

  if (!mortgage) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-24 left-8 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute top-16 right-10 h-72 w-72 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-teal-300 blur-3xl"></div>
      </div>
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-white shadow-lg">
          {toast}
        </div>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ModuleHeader
          title={`Mortgage #${id}`}
          subtitle={undefined}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mortgages', href: '/dashboard/mortgages' },
            { label: `#${id}` },
          ]}
          actions={(
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard')} className="rounded-lg bg-gradient-to-r from-slate-600 to-gray-800 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Dashboard</button>
              <button onClick={() => router.back()} className="rounded-lg bg-gradient-to-r from-gray-500 to-zinc-700 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Back</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/payments`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Payments</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/documents`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Documents</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/schedule`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Schedule</button>
            </div>
          )}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="rounded-3xl border border-white/70 bg-white/80 backdrop-blur-xl p-6 shadow-[0_22px_60px_-30px_rgba(14,116,144,0.55)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Mortgage Profile</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 capitalize">{mortgage.mortgage_type} Mortgage</h2>
              <p className="mt-1 text-sm text-slate-600">Customer #{mortgage.customer_id} • Created {new Date(mortgage.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={mortgage.status} variant={statusVariant as any} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Requested</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatAmount(mortgage.requested_amount)}</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatAmount(mortgage.approved_amount)}</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Installment</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatAmount(mortgage.installment_amount ?? monthlyFigures.monthlyInstallment)}</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Interest</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatAmount(monthlyFigures.totalInterest)}</p>
            </div>
          </div>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={<Banknote className="h-5 w-5"/>} label="Requested Amount" value={formatAmount(mortgage.requested_amount)} tone="primary" />
          <StatCard icon={<PercentCircle className="h-5 w-5"/>} label="Interest" value={`${mortgage.interest_rate}% (${mortgage.interest_type})`} tone="success" />
          <StatCard icon={<CalendarDays className="h-5 w-5"/>} label="Tenure" value={`${mortgage.tenure_months} months`} tone="warning" />
          <StatCard icon={<Banknote className="h-5 w-5"/>} label="Monthly Installment" value={formatAmount(monthlyFigures.monthlyInstallment)} tone="primary" />
          <StatCard icon={<PercentCircle className="h-5 w-5"/>} label="Monthly Interest" value={formatAmount(monthlyFigures.monthlyInterest)} tone="success" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SectionCard
            title="Details"
            description={undefined}
            className="border-white/80 bg-white/85 backdrop-blur-xl"
          >
            <div className="mb-4 inline-flex rounded-full border border-cyan-100 bg-cyan-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-800">
              Core Finance Snapshot
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-500"/><span className="text-gray-800">Type:</span> <span className="capitalize text-gray-800">{mortgage.mortgage_type}</span></div>
              <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-gray-500"/><span className="text-gray-800">Requested:</span> <span className="text-gray-900">{formatAmount(mortgage.requested_amount)}</span></div>
              <div className="flex items-center gap-2"><PercentCircle className="h-4 w-4 text-gray-500"/><span className="text-gray-800">Interest:</span> <span className="text-gray-900">{mortgage.interest_rate}% ({mortgage.interest_type})</span></div>
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gray-500"/><span className="text-gray-800">Tenure:</span> <span className="text-gray-900">{mortgage.tenure_months} months</span></div>
              <div><span className="text-gray-800">Processing Fee:</span> <span className="text-gray-900">{formatAmount(mortgage.processing_fee)}</span></div>
              <div><span className="text-gray-800">Penalty Rate:</span> <span className="text-gray-900">{mortgage.penalty_rate}%</span></div>
            </div>
          </SectionCard>
          <SectionCard title="Actions" description="Progress this mortgage through the lifecycle" className="border-white/80 bg-white/85 backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-2">
              <ActionButton
                label={actionInProgress === 'submit' ? 'Submitting...' : 'Submit for Approval'}
                icon={actionInProgress === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                variant="primary"
                onClick={() => handleStatus('submit')}
                disabled={!canSubmit || actionLoading}
                className="w-full"
              />
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-700"/>Only allowed transitions are enabled for current status.</div>
            </div>
          </SectionCard>
          <SectionCard title="Structure" description="Current terms and frequency mapping" className="border-white/80 bg-white/85 backdrop-blur-xl">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-slate-600">Refund Frequency</span><span className="font-semibold text-slate-900 capitalize">{mortgage.installment_frequency || '-'}</span></div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-slate-600">Interest Calc Frequency</span><span className="font-semibold text-slate-900 capitalize">{mortgage.interest_calculation_frequency || '-'}</span></div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-slate-600">Installment Amount</span><span className="font-semibold text-slate-900">{formatAmount(mortgage.installment_amount)}</span></div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-slate-600">Interest Type</span><span className="font-semibold text-slate-900 capitalize">{mortgage.interest_type || '-'}</span></div>
            </div>
          </SectionCard>
        </div>

        {/* Asset & Valuation */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
          <SectionCard title="Asset Details" description="Collateral information" padded className="border-white/80 bg-white/85 backdrop-blur-xl">
            {mortgage.asset ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-800">Type:</span> <span className="capitalize text-gray-800">{mortgage.asset.asset_type}</span></div>
                {mortgage.asset.description && <div><span className="text-gray-800">Description:</span> <span className="text-gray-900">{mortgage.asset.description}</span></div>}
                {mortgage.asset.address && <div><span className="text-gray-800">Address:</span> <span className="text-gray-900">{mortgage.asset.address}</span></div>}
                {mortgage.asset.deed_number && <div><span className="text-gray-800">Deed No:</span> <span className="text-gray-900">{mortgage.asset.deed_number}</span></div>}
                {mortgage.asset.deed_date && <div><span className="text-gray-800">Deed Date:</span> <span className="text-gray-900">{mortgage.asset.deed_date}</span></div>}
                {mortgage.asset.survey_plan_number && <div><span className="text-gray-800">Survey Plan:</span> <span className="text-gray-900">{mortgage.asset.survey_plan_number}</span></div>}
                {mortgage.asset.registration_office && <div><span className="text-gray-800">Registry:</span> <span className="text-gray-900">{mortgage.asset.registration_office}</span></div>}
                {mortgage.asset.land_size_or_area && <div><span className="text-gray-800">Area:</span> <span className="text-gray-900">{mortgage.asset.land_size_or_area}</span></div>}
                {mortgage.asset.vehicle_reg_no && <div><span className="text-gray-800">Vehicle Reg:</span> <span className="text-gray-900">{mortgage.asset.vehicle_reg_no}</span></div>}
                {mortgage.asset.engine_no && <div><span className="text-gray-800">Engine No:</span> <span className="text-gray-900">{mortgage.asset.engine_no}</span></div>}
                {mortgage.asset.chassis_no && <div><span className="text-gray-800">Chassis No:</span> <span className="text-gray-900">{mortgage.asset.chassis_no}</span></div>}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No asset details provided.</div>
            )}
          </SectionCard>

          <SectionCard title="Valuation" description="Market and forced sale values" padded className="border-white/80 bg-white/85 backdrop-blur-xl">
            {mortgage.valuation ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-gray-500"/><span className="text-gray-800">Market Value:</span> <span className="text-gray-900">{formatAmount(mortgage.valuation.market_value)}</span></div>
                <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-gray-500"/><span className="text-gray-800">Forced Sale Value:</span> <span className="text-gray-900">{formatAmount(mortgage.valuation.forced_sale_value)}</span></div>
                {mortgage.valuation.valuation_date && <div><span className="text-gray-800">Valuation Date:</span> <span className="text-gray-900">{mortgage.valuation.valuation_date}</span></div>}
                {mortgage.valuation.valuer_name && <div><span className="text-gray-800">Valuer:</span> <span className="text-gray-900">{mortgage.valuation.valuer_name}</span></div>}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No valuation provided.</div>
            )}
          </SectionCard>
        </div>

        {/* Guarantors */}
        <div className="mt-6">
          <SectionCard title="Guarantors" description="People backing the mortgage" padded className="border-white/80 bg-white/85 backdrop-blur-xl">
            {Array.isArray(mortgage.guarantors) && mortgage.guarantors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-cyan-100">
                  <thead className="bg-cyan-50/70">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIC</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-100 bg-white">
                    {mortgage.guarantors.map((g: any, idx: number) => (
                      <tr key={idx} className="hover:bg-cyan-50/40 transition-colors">
                        <td className="px-4 py-2 text-sm text-gray-900">{g.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{g.nic}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{g.relationship}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatAmount(g.income)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{g.contact_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3 text-sm text-gray-600"><Users className="h-4 w-4"/>No guarantors added.</div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
