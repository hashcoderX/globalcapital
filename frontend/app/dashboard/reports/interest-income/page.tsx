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

export default function InterestIncomeReportPage() {
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
  const [products, setProducts] = useState<Array<{ label: string; interest_income: number; penalty_income: number }>>([]);
  const [summary, setSummary] = useState({ total_interest_income: 0, total_penalty_income: 0, grand_total: 0 });

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
      const rows = Array.isArray(response.data) ? response.data : Array.isArray(response.data?.data) ? response.data.data : [];
      setCompanies(rows);
      if (rows.length > 0) {
        setSelectedCompanyId((current) => (current && rows.some((row: CompanyOption) => row.id === current) ? current : Number(rows[0].id)));
      }
    } catch {
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchReport = async (overrides?: { from_date?: string; to_date?: string }) => {
    if (!token || !selectedCompanyId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/finances/reports/interest-income', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: {
          branch_id: selectedCompanyId,
          company_id: selectedCompanyId,
          from_date: overrides?.from_date ?? fromDate,
          to_date: overrides?.to_date ?? toDate,
        },
      });
      const payload = response.data || {};
      setProducts(Array.isArray(payload.products) ? payload.products : []);
      setSummary({
        total_interest_income: toNumber(payload.summary?.total_interest_income),
        total_penalty_income: toNumber(payload.summary?.total_penalty_income),
        grand_total: toNumber(payload.summary?.grand_total),
      });
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setProducts([]);
      setError(fetchError?.response?.data?.message || 'Failed to load interest income report.');
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

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <AccountingReportShell badge="Loan Portfolio" title="Interest Income Report" description="Interest and penalty income by product and branch for the selected period." error={error}
      actions={<><button type="button" onClick={() => fetchReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={() => router.push('/dashboard/reports')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Reports Hub</button></>}
    >
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name} · {currency}</p> : null}
      <SummaryCards items={[
        { label: 'Interest Income', value: `${currency} ${amount(summary.total_interest_income)}`, valueClass: 'text-cyan-700' },
        { label: 'Penalty Income', value: `${currency} ${amount(summary.total_penalty_income)}`, valueClass: 'text-amber-700' },
        { label: 'Grand Total', value: `${currency} ${amount(summary.grand_total)}`, valueClass: 'text-emerald-700' },
      ]} />
      <ReportFilters companies={companies} selectedCompanyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} fromDate={fromDate} toDate={toDate} onFromDateChange={setFromDate} onToDateChange={setToDate} onApply={() => fetchReport()} onReset={() => { const nextFrom = monthStartIso(); const nextTo = todayIso(); setFromDate(nextFrom); setToDate(nextTo); fetchReport({ from_date: nextFrom, to_date: nextTo }); }} loadingCompanies={loadingCompanies} />
      <ReportTable title="Product-wise Interest" loading={loading} hasData={products.length > 0} emptyTitle="No interest income">
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider"><tr><th className="px-3 py-3 text-left">Product</th><th className="px-3 py-3 text-right">Interest</th><th className="px-3 py-3 text-right">Penalty</th><th className="px-3 py-3 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {products.map((row) => (
                <tr key={row.label} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5 font-semibold">{row.label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{amount(row.interest_income)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{amount(row.penalty_income)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">{amount(row.interest_income + row.penalty_income)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
