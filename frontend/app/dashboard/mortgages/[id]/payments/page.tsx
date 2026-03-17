'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../../_components/ModuleHeader';
import SectionCard from '../../_components/SectionCard';
import StatCard from '../../_components/StatCard';
import { Banknote, PercentCircle, CalendarDays } from 'lucide-react';

export default function MortgagePayments() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [mortgage, setMortgage] = useState<any>(null);
  const id = params?.id as string;

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      fetchMortgage(t);
      fetchPayments(t);
    }
  }, [router]);

  const fetchPayments = async (authToken: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/mortgages/${id}/payments`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = res.data.data || res.data;
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

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

  const formatAmount = (v: number | string | null | undefined) => {
    const n = typeof v === 'number' ? v : v != null ? parseFloat(String(v)) : NaN;
    if (!Number.isFinite(n)) return '-';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => {
      const n = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount || 0));
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [payments]);

  const toNumber = (v: any): number => {
    const n = typeof v === 'number' ? v : parseFloat(String(v || 0));
    return Number.isFinite(n) ? n : 0;
  };

  const monthlyRate = useMemo(() => {
    const annual = toNumber(mortgage?.interest_rate) / 100;
    return annual / 12;
  }, [mortgage]);

  const principal = useMemo(() => {
    if (!mortgage) return 0;
    const raw = mortgage.approved_amount ?? mortgage.requested_amount;
    return toNumber(raw);
  }, [mortgage]);

  const parseDate = (d: string | Date | undefined): Date | null => {
    if (!d) return null;
    try { return new Date(d); } catch { return null; }
  };

  const diffMonths = (from: Date, to: Date): number => {
    const y = to.getFullYear() - from.getFullYear();
    const m = to.getMonth() - from.getMonth();
    const total = y * 12 + m;
    return total < 0 ? 0 : total;
  };

  const enriched = useMemo(() => {
    if (!mortgage) return { rows: payments, principalAfter: principal, arrears: 0 };
    const start = parseDate(mortgage.created_at) || new Date();
    let runningPrincipal = principal;
    let arrears = 0;
    let prevDate = start;
    const rows = payments.map((p) => {
      const paidDate = parseDate(p.paid_date) || prevDate;
      // Accrue interest for missed months into arrears (no principal change during missed period)
      const missed = diffMonths(prevDate, paidDate);
      for (let i = 0; i < missed; i++) {
        const monthInterest = mortgage.interest_type === 'reducing'
          ? runningPrincipal * monthlyRate
          : principal * monthlyRate;
        arrears += monthInterest;
      }

      // Current period interest due
      const currentInterest = mortgage.interest_type === 'reducing'
        ? runningPrincipal * monthlyRate
        : principal * monthlyRate;

      const amount = toNumber(p.amount);

      // Apply payment: first to arrears, then current interest, then principal
      const payToArrears = Math.min(amount, arrears);
      arrears -= payToArrears;
      let remaining = amount - payToArrears;

      const payToCurrentInterest = Math.min(remaining, currentInterest);
      remaining -= payToCurrentInterest;

      // If payment covers more than total due (arrears + current interest), no deficit this period
      const totalDueThisPeriod = (arrears + currentInterest);
      const deficitThisPeriod = Math.max(0, totalDueThisPeriod - (payToArrears + payToCurrentInterest));
      arrears = deficitThisPeriod; // carry forward only unpaid interest

      const principalApplied = Math.max(0, remaining);
      runningPrincipal = Math.max(0, runningPrincipal - principalApplied);

      const prevPaidDate = prevDate;
      prevDate = paidDate;
      return {
        ...p,
        last_paid_date: prevPaidDate ? `${prevPaidDate.getFullYear()}-${String(prevPaidDate.getMonth()+1).padStart(2,'0')}-${String(prevPaidDate.getDate()).padStart(2,'0')}` : '',
        interest_due: currentInterest,
        interest_paid: payToArrears + payToCurrentInterest,
        principal_applied: principalApplied,
        arrears_after: arrears,
        principal_balance_after: runningPrincipal,
      };
    });

    return { rows, principalAfter: runningPrincipal, arrears };
  }, [payments, mortgage, principal, monthlyRate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ModuleHeader
          title="Mortgage Payments"
          subtitle={`Mortgage #${id}`}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mortgages', href: '/dashboard/mortgages' },
            { label: `#${id}`, href: `/dashboard/mortgages/${id}` },
            { label: 'Payments' },
          ]}
          actions={(
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard')} className="rounded-lg bg-gradient-to-r from-slate-600 to-gray-800 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Dashboard</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Details</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/documents`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Documents</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/schedule`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Schedule</button>
              <button onClick={() => router.back()} className="rounded-lg bg-gradient-to-r from-gray-500 to-zinc-700 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Back</button>
            </div>
          )}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {mortgage && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6">
            <StatCard icon={<Banknote className="h-5 w-5"/>} label="Requested" value={formatAmount(mortgage.requested_amount)} tone="primary" />
            <StatCard icon={<PercentCircle className="h-5 w-5"/>} label="Interest" value={`${mortgage.interest_rate}% (${mortgage.interest_type})`} tone="success" />
            <StatCard icon={<CalendarDays className="h-5 w-5"/>} label="Tenure" value={`${mortgage.tenure_months} months`} tone="warning" />
          </div>
        )}
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal Applied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrears After</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enriched.rows.map(p => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 text-sm">{p.paid_date}</td>
                    <td className="px-6 py-4 text-sm">{p.last_paid_date || '—'}</td>
                    <td className="px-6 py-4 text-sm">{formatAmount(p.amount)}</td>
                    <td className="px-6 py-4 text-sm">{p.payment_method}</td>
                    <td className="px-6 py-4 text-sm">{formatAmount(p.interest_due)}</td>
                    <td className="px-6 py-4 text-sm">{formatAmount(p.principal_applied)}</td>
                    <td className="px-6 py-4 text-sm">{formatAmount(p.arrears_after)}</td>
                    <td className="px-6 py-4 text-sm">{formatAmount(p.principal_balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No payments recorded.</p>
                {mortgage && (
                  <p className="mt-2 text-sm text-gray-400">Requested {formatAmount(mortgage.requested_amount)} · Tenure {mortgage.tenure_months} months</p>
                )}
              </div>
            )}
          </div>
        </SectionCard>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard icon={<Banknote className="h-5 w-5"/>} label="Total Paid" value={formatAmount(totalPaid)} tone="neutral" />
          <StatCard icon={<Banknote className="h-5 w-5"/>} label="Principal Outstanding" value={mortgage ? formatAmount(enriched.principalAfter) : '-'} tone="danger" />
          <StatCard icon={<PercentCircle className="h-5 w-5"/>} label="Interest Arrears" value={formatAmount(enriched.arrears)} tone="warning" />
        </div>
      </div>
    </div>
  );
}
