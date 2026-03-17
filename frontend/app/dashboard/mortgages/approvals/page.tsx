'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import ModuleHeader from '../_components/ModuleHeader';
import SectionCard from '../_components/SectionCard';

export default function MortgageApprovals() {
  const [token, setToken] = useState('');
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
    } else {
      setToken(t);
      fetchMortgages(t);
    }
  }, [router]);

  const fetchMortgages = async (authToken: string) => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8000/api/mortgages', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { status: 'submitted', per_page: 50 }
      });
      const data = res.data.data || res.data;
      setMortgages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setMortgages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ModuleHeader title="Pending Approvals" subtitle="Review submitted mortgage applications" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SectionCard>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mortgages.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.mortgage_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.requested_amount.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.interest_rate}% ({m.interest_type})</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.tenure_months} months</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-green-600 hover:text-green-900">Approve</button>
                        <button className="text-red-600 hover:text-red-900">Reject</button>
                        <button onClick={() => router.push(`/dashboard/mortgages/${m.id}`)} className="text-blue-600 hover:text-blue-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mortgages.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No submitted mortgages.</p>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
