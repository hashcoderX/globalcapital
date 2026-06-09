'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import {
  AccountingReportShell,
  ReportTable,
  SummaryCards,
  amount,
  downloadCsv,
  toNumber,
  type CompanyOption,
} from '@/app/components/accounting/AccountingReportShell';
import { accountingInputClass, accountingLabelClass } from '@/app/components/accounting/companyAccountingUtils';

type InvestorRow = { investor: string; account_number: string; account_type: string; capital: number; interest_rate: number };

export default function InvestorFundingReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCompanyId = Number(searchParams.get('branch_id') || searchParams.get('company_id') || 0) || null;

  const [token, setToken] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(initialCompanyId);
  const [currency, setCurrency] = useState('LKR');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<InvestorRow[]>([]);
  const [summary, setSummary] = useState({ investor_count: 0, total_capital: 0 });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const fetchCompanies = async (authToken: string) => {
    setLoadingCompanies(true);
    try {
      const response = await axios.get('/api/companies', { headers: { Authorization: `Bearer ${authToken}` } });
      const list = Array.isArray(response.data) ? response.data : Array.isArray(response.data?.data) ? response.data.data : [];
      setCompanies(list);
      if (list.length > 0) {
        setSelectedCompanyId((current) => (current && list.some((row: CompanyOption) => row.id === current) ? current : Number(list[0].id)));
      }
    } catch {
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchReport = async () => {
    if (!token || !selectedCompanyId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports/investor-funding', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: { branch_id: selectedCompanyId, company_id: selectedCompanyId },
      });
      const payload = response.data || {};
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setSummary({
        investor_count: Number(payload.summary?.investor_count || 0),
        total_capital: toNumber(payload.summary?.total_capital),
      });
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setRows([]);
      setError(fetchError?.response?.data?.message || 'Failed to load investor funding report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCompanies(token);
  }, [token]);

  useEffect(() => {
    if (!token || loadingCompanies || !selectedCompanyId) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCompanyId, loadingCompanies]);

  const selectedCompany = useMemo(() => companies.find((c) => c.id === selectedCompanyId) || null, [companies, selectedCompanyId]);

  const exportCsv = () => {
    downloadCsv(
      `investor-funding-${selectedCompanyId}.csv`,
      ['Investor', 'Account Number', 'Account Type', 'Capital', 'Interest Rate'],
      rows.map((row) => [row.investor, row.account_number, row.account_type, amount(row.capital), amount(row.interest_rate)])
    );
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <AccountingReportShell badge="Management" title="Investor / Funding Report" description="Investor capital from active savings and deposit accounts." error={error}
      actions={<><button type="button" onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button><button type="button" onClick={() => fetchReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={() => router.push('/dashboard/reports')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Reports Hub</button></>}
    >
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name} · {currency}</p> : null}
      <SummaryCards items={[
        { label: 'Investors', value: String(summary.investor_count) },
        { label: 'Total Capital', value: `${currency} ${amount(summary.total_capital)}`, valueClass: 'text-emerald-700' },
      ]} />
      <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4 chart-animate-panel">
        <h2 className="text-sm font-bold text-black">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={accountingLabelClass}>Branch</label>
            <select value={selectedCompanyId ?? ''} onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)} disabled={loadingCompanies} className={accountingInputClass}>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </div>
        </div>
        <button type="button" onClick={() => fetchReport()} className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white">Apply Filters</button>
      </div>
      <ReportTable title="Investor Funding" countLabel={`${rows.length} investors`} loading={loading} hasData={rows.length > 0} emptyTitle="No investor funding data">
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider"><tr><th className="px-3 py-3 text-left">Investor</th><th className="px-3 py-3 text-left">Account</th><th className="px-3 py-3 text-left">Type</th><th className="px-3 py-3 text-right">Capital</th><th className="px-3 py-3 text-right">Rate</th></tr></thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {rows.map((row, index) => (
                <tr key={`${row.account_number}-${index}`} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5 font-semibold">{row.investor}</td>
                  <td className="px-3 py-2.5">{row.account_number || '—'}</td>
                  <td className="px-3 py-2.5 capitalize">{row.account_type || '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">{amount(row.capital)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{amount(row.interest_rate)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
