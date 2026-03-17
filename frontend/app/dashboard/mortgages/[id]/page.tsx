'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../_components/ModuleHeader';
import SectionCard from '../_components/SectionCard';
import Badge from '../_components/Badge';
import StatCard from '../_components/StatCard';
import { Banknote, PercentCircle, CalendarDays, MapPin, FileText, Users, Send, Check, XCircle, Unlock } from 'lucide-react';
import ActionButton from '../_components/ActionButton';

export default function MortgageDetails() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [mortgage, setMortgage] = useState<any>(null);
  const id = params?.id as string;
  const [toast, setToast] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-white shadow-lg">
          {toast}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top metrics */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6">
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
          >
            <div className="mb-4">
              <Badge
                label={mortgage.status}
                variant={
                  mortgage.status === 'active' ? 'success' :
                  mortgage.status === 'arrears' ? 'warning' :
                  mortgage.status === 'approved' ? 'info' : 'default'
                }
              />
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
          <SectionCard title="Actions" description={undefined}>
            <div className="grid grid-cols-1 gap-2">
              <ActionButton
                label="Submit for Approval"
                icon={<Send className="h-4 w-4" />}
                variant="primary"
                onClick={() => handleStatus('submit')}
                disabled={!canSubmit || actionLoading}
                className="w-full"
              />
              <ActionButton
                label="Approve"
                icon={<Check className="h-4 w-4" />}
                variant="success"
                onClick={() => handleStatus('approve')}
                disabled={!canApproveReject || actionLoading}
                className="w-full"
              />
              <ActionButton
                label="Reject"
                icon={<XCircle className="h-4 w-4" />}
                variant="danger"
                onClick={() => handleStatus('reject')}
                disabled={!canApproveReject || actionLoading}
                className="w-full"
              />
              <ActionButton
                label="Release"
                icon={<Unlock className="h-4 w-4" />}
                variant="info"
                onClick={() => handleStatus('release')}
                disabled={!canRelease || actionLoading}
                className="w-full"
              />
            </div>
          </SectionCard>
        </div>

        {/* Asset & Valuation */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
          <SectionCard title="Asset Details" description="Collateral information" padded>
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

          <SectionCard title="Valuation" description="Market and forced sale values" padded>
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
          <SectionCard title="Guarantors" description="People backing the mortgage" padded>
            {Array.isArray(mortgage.guarantors) && mortgage.guarantors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIC</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {mortgage.guarantors.map((g: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
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
              <div className="flex items-center gap-2 text-sm text-gray-500"><Users className="h-4 w-4"/>No guarantors added.</div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
