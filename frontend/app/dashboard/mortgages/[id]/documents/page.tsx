'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../../_components/ModuleHeader';
import SectionCard from '../../_components/SectionCard';
import StatCard from '../../_components/StatCard';
import { FileText, Banknote, CalendarDays } from 'lucide-react';

export default function MortgageDocuments() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [mortgage, setMortgage] = useState<any>(null);
  const id = params?.id as string;

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      fetchMortgage(t);
      fetchDocuments(t);
    }
  }, [router]);

  const fetchDocuments = async (authToken: string) => {
    try {
      const res = await axios.get(`/api/mortgages/${id}/documents`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = res.data.data || res.data;
      setDocuments(Array.isArray(data) ? data : []);
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
          title="Mortgage Documents"
          subtitle={`Mortgage #${id}`}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mortgages', href: '/dashboard/mortgages' },
            { label: `#${id}`, href: `/dashboard/mortgages/${id}` },
            { label: 'Documents' },
          ]}
          actions={(
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard')} className="rounded-lg bg-gradient-to-r from-slate-600 to-gray-800 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Dashboard</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Details</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/payments`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Payments</button>
              <button onClick={() => router.push(`/dashboard/mortgages/${id}/schedule`)} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Schedule</button>
              <button onClick={() => router.back()} className="rounded-lg bg-gradient-to-r from-gray-500 to-zinc-700 px-4 py-2 text-white shadow-sm transition hover:opacity-95">Back</button>
            </div>
          )}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {mortgage && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6">
            <StatCard icon={<FileText className="h-5 w-5"/>} label="Documents" value={documents.length} tone="primary" />
            <StatCard icon={<Banknote className="h-5 w-5"/>} label="Requested" value={mortgage.requested_amount} tone="success" />
            <StatCard icon={<CalendarDays className="h-5 w-5"/>} label="Tenure" value={`${mortgage.tenure_months} months`} tone="warning" />
          </div>
        )}
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map(d => (
                  <tr key={d.id}>
                    <td className="px-6 py-4 text-sm">{d.document_type}</td>
                    <td className="px-6 py-4 text-sm">{d.original_name || d.file_path}</td>
                    <td className="px-6 py-4 text-sm">{d.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {documents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No documents uploaded.</p>
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
