'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Building2, CheckCircle2, RefreshCw } from 'lucide-react';
import CompanyAccountingPanel from '@/app/components/accounting/CompanyAccountingPanel';
import type { AccountingCompany } from '@/app/components/accounting/companyAccountingUtils';

export default function AccountingAccountsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<AccountingCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const fetchCompanies = async (authToken: string) => {
    setLoading(true);
    setNotice(null);

    try {
      const response = await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setCompanies(rows);

      if (rows.length > 0) {
        setSelectedCompanyId((current) => current ?? Number(rows[0].id));
      } else {
        setSelectedCompanyId(null);
      }
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.response?.data?.message || 'Failed to load companies.' });
      setCompanies([]);
      setSelectedCompanyId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetchCompanies(token);
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-violet-300 blur-3xl" />
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-purple-300 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-100">Accounting</p>
              <h1 className="text-2xl font-extrabold mt-1">Account Setup</h1>
              <p className="text-sm text-violet-50 mt-1">Main, cash, and bank accounts with opening balances per branch</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => token && fetchCompanies(token)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/accounting')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Accounting Home
              </button>
            </div>
          </div>
        </div>

        {notice ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
              {notice.text}
            </span>
          </div>
        ) : null}

        <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Company / Branch</label>
              <select
                value={selectedCompanyId ?? ''}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)}
                disabled={loading || companies.length === 0}
                className="w-full rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200/80"
              >
                {companies.length === 0 ? (
                  <option value="">No companies found</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedCompany ? (
              <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-2.5 text-sm text-slate-700 inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-700" />
                Currency: <span className="font-bold">{selectedCompany.currency || 'LKR'}</span>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
            </div>
          ) : (
            <CompanyAccountingPanel
              token={token}
              companyId={selectedCompanyId}
              currency={selectedCompany?.currency || 'LKR'}
              onNotice={setNotice}
              emptyMessage="Create a company or branch first, then configure accounting accounts here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
