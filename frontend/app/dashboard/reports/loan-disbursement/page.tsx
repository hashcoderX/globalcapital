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
  monthStartIso,
  todayIso,
  toNumber,
  type CompanyOption,
} from '@/app/components/accounting/AccountingReportShell';
import { accountingInputClass, accountingLabelClass } from '@/app/components/accounting/companyAccountingUtils';

type DisbursementRow = { date: string; product_label: string; reference: string; customer: string; amount: number; officer: string; branch_name: string };

export default function LoanDisbursementReportPage() {
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
  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [productType, setProductType] = useState('all');
  const [rows, setRows] = useState<DisbursementRow[]>([]);
  const [summary, setSummary] = useState({ disbursement_count: 0, total_disbursed: 0 });

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

  const fetchReport = async (overrides?: { from_date?: string; to_date?: string; product_type?: string }) => {
    if (!token || !selectedCompanyId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/finances/reports/loan-disbursement', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: {
          branch_id: selectedCompanyId,
          company_id: selectedCompanyId,
          from_date: overrides?.from_date ?? fromDate,
          to_date: overrides?.to_date ?? toDate,
          product_type: (overrides?.product_type ?? productType) === 'all' ? undefined : overrides?.product_type ?? productType,
        },
      });
      const payload = response.data || {};
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setSummary({
        disbursement_count: Number(payload.summary?.disbursement_count || 0),
        total_disbursed: toNumber(payload.summary?.total_disbursed),
      });
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setRows([]);
      setError(fetchError?.response?.data?.message || 'Failed to load loan disbursement report.');
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
      `loan-disbursement-${selectedCompanyId}.csv`,
      ['Date', 'Product', 'Reference', 'Customer', 'Amount', 'Officer', 'Branch'],
      rows.map((row) => [row.date, row.product_label, row.reference, row.customer, amount(row.amount), row.officer, row.branch_name])
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
    <AccountingReportShell badge="Loan Portfolio" title="Loan Disbursement Report" description="New loans disbursed by amount, branch, and officer." error={error}
      actions={<><button type="button" onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button><button type="button" onClick={() => fetchReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={() => router.push('/dashboard/reports')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Reports Hub</button></>}
    >
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name} · {currency}</p> : null}
      <SummaryCards items={[
        { label: 'Disbursements', value: String(summary.disbursement_count) },
        { label: 'Total Disbursed', value: `${currency} ${amount(summary.total_disbursed)}`, valueClass: 'text-rose-700' },
      ]} />
      <ReportFilters companies={companies} selectedCompanyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} fromDate={fromDate} toDate={toDate} onFromDateChange={setFromDate} onToDateChange={setToDate} onApply={() => fetchReport()} onReset={() => { const nextFrom = monthStartIso(); const nextTo = todayIso(); setFromDate(nextFrom); setToDate(nextTo); fetchReport({ from_date: nextFrom, to_date: nextTo }); }} loadingCompanies={loadingCompanies}
        extraFilters={<div><label className={accountingLabelClass}>Product</label><select value={productType} onChange={(e) => setProductType(e.target.value)} className={accountingInputClass}><option value="all">All products</option><option value="finance">Finance</option><option value="microfinance">Micro Credit</option><option value="mortgage">Mortgage</option><option value="instant">Instant Loan</option></select></div>}
      />
      <ReportTable title="Disbursement Lines" countLabel={`${rows.length} records`} loading={loading} hasData={rows.length > 0} emptyTitle="No disbursements">
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider"><tr><th className="px-3 py-3 text-left">Date</th><th className="px-3 py-3 text-left">Customer</th><th className="px-3 py-3 text-left">Product</th><th className="px-3 py-3 text-left">Officer</th><th className="px-3 py-3 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {rows.map((row, index) => (
                <tr key={`${row.reference}-${index}`} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5 whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-2.5 font-semibold">{row.customer}</td>
                  <td className="px-3 py-2.5">{row.product_label}</td>
                  <td className="px-3 py-2.5">{row.officer || '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">{amount(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
