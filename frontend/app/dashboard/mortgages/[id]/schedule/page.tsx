'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../../_components/ModuleHeader';
import SectionCard from '../../_components/SectionCard';
import StatCard from '../../_components/StatCard';
import { CalendarDays, Banknote, PercentCircle } from 'lucide-react';

export default function MortgageSchedule() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [mortgage, setMortgage] = useState<any>(null);
  const id = params?.id as string;

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      fetchMortgage(t);
      fetchSchedule(t);
    }
  }, [router]);

  const fetchSchedule = async (authToken: string) => {
    try {
      const res = await axios.get(`/api/mortgages/${id}/schedule`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = res.data.data || res.data;
      setSchedule(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMortgage = async (authToken: string) => {
    try {
      const res = await axios.get(`/api/mortgages/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setMortgage(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ModuleHeader
          title="Repayment Schedule"
          subtitle={`Mortgage #${id}`}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mortgages', href: '/dashboard/mortgages' },
            { label: `#${id}`, href: `/dashboard/mortgages/${id}` },
            { label: 'Schedule' },
          ]}
          actions={(
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard')} className="rounded-lg bg-gradient-to-r from-slate-600 to-gray-800 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Dashboard</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Details</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/payments`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Payments</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/documents`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Documents</button>
              <button onClick={() => router.back()} className="rounded-lg bg-gradient-to-r from-gray-500 to-zinc-700 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Back</button>
            </div>
          )}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {mortgage && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6">
            <StatCard icon={<Banknote className="h-5 w-5"/>} label="Requested" value={mortgage.requested_amount} tone="primary" />
            <StatCard icon={<PercentCircle className="h-5 w-5"/>} label="Interest" value={`${mortgage.interest_rate}% (${mortgage.interest_type})`} tone="success" />
            <StatCard icon={<CalendarDays className="h-5 w-5"/>} label="Tenure" value={`${mortgage.tenure_months} months`} tone="warning" />
          </div>
        )}
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedule.map(s => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 text-sm">{s.installment_no}</td>
                    <td className="px-6 py-4 text-sm">{s.due_date}</td>
                    <td className="px-6 py-4 text-sm">{s.principal}</td>
                    <td className="px-6 py-4 text-sm">{s.interest}</td>
                    <td className="px-6 py-4 text-sm">{s.total_amount}</td>
                    <td className="px-6 py-4 text-sm">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {schedule.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No schedule generated.</p>
                {mortgage && (
                  <p className="mt-2 text-sm text-gray-400">Status {mortgage.status}</p>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
