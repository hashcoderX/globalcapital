'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import {
  AccountingReportShell,
  ReportFilters,
  ReportTable,
  SummaryCards,
  amount,
  downloadCsv,
  toNumber,
  type CompanyOption,
} from '@/app/components/accounting/AccountingReportShell';
import { accountingInputClass, accountingLabelClass } from '@/app/components/accounting/companyAccountingUtils';

type ReceivableRow = { product_label: string; reference: string; customer: string; outstanding: number };

export default function LoanReceivableReportPage() {
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
  const [productType, setProductType] = useState('all');
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [summary, setSummary] = useState({ accounts_count: 0, total_outstanding: 0 });

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
      const rowsData = Array.isArray(response.data) ? response.data : Array.isArray(response.data?.data) ? response.data.data : [];
      setCompanies(rowsData);
      if (rowsData.length > 0) {
        setSelectedCompanyId((current) => (current && rowsData.some((row: CompanyOption) => row.id === current) ? current : Number(rowsData[0].id)));
      }
    } catch {
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchReport = async (overrides?: { product_type?: string }) => {
    if (!token || !selectedCompanyId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/finances/reports/loan-receivable', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: {
          branch_id: selectedCompanyId,
          company_id: selectedCompanyId,
          product_type: (overrides?.product_type ?? productType) === 'all' ? undefined : overrides?.product_type ?? productType,
        },
      });
      const payload = response.data || {};
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setSummary({
        accounts_count: Number(payload.summary?.accounts_count || 0),
        total_outstanding: toNumber(payload.summary?.total_outstanding),
      });
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setRows([]);
      setError(fetchError?.response?.data?.message || 'Failed to load loan receivable report.');
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
      `loan-receivable-${selectedCompanyId}.csv`,
      ['Product', 'Reference', 'Customer', 'Outstanding'],
      rows.map((row) => [row.product_label, row.reference, row.customer, amount(row.outstanding)])
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
    <AccountingReportShell badge="Loan Portfolio" title="Loan Receivable Report" description="Amount customers still owe across finance, micro credit, mortgage, and instant loans." error={error}
      actions={<><button type="button" onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button><button type="button" onClick={() => fetchReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={() => router.push('/dashboard/reports')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Reports Hub</button></>}
    >
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name} · {currency}</p> : null}
      <SummaryCards items={[
        { label: 'Accounts', value: String(summary.accounts_count) },
        { label: 'Total Outstanding', value: `${currency} ${amount(summary.total_outstanding)}`, valueClass: 'text-rose-700' },
      ]} />
      <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4 chart-animate-panel">
        <h2 className="text-sm font-bold text-black">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={accountingLabelClass}>Branch</label>
            <select value={selectedCompanyId ?? ''} onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)} className={accountingInputClass}>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </div>
          <div>
            <label className={accountingLabelClass}>Product</label>
            <select value={productType} onChange={(e) => setProductType(e.target.value)} className={accountingInputClass}>
              <option value="all">All products</option>
              <option value="finance">Finance</option>
              <option value="microfinance">Micro Credit</option>
              <option value="mortgage">Mortgage</option>
              <option value="instant">Instant Loan</option>
            </select>
          </div>
        </div>
        <button type="button" onClick={() => fetchReport()} className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white">Apply Filters</button>
      </div>
      <ReportTable title="Outstanding Loans" countLabel={`${rows.length} accounts`} loading={loading} hasData={rows.length > 0} emptyTitle="No outstanding loans">
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider"><tr><th className="px-3 py-3 text-left">Customer</th><th className="px-3 py-3 text-left">Product</th><th className="px-3 py-3 text-left">Reference</th><th className="px-3 py-3 text-right">Outstanding</th></tr></thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {rows.map((row, index) => (
                <tr key={`${row.reference}-${index}`} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5 font-semibold">{row.customer}</td>
                  <td className="px-3 py-2.5">{row.product_label}</td>
                  <td className="px-3 py-2.5">{row.reference}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">{amount(row.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
