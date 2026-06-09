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

type SectionData = Record<string, number>;

export default function BalanceSheetReportPage() {
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
  const [assets, setAssets] = useState<SectionData>({});
  const [liabilities, setLiabilities] = useState<SectionData>({});

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
      const response = await axios.get(`/api/companies/${selectedCompanyId}/accounting-overview`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: { from_date: overrides?.from_date ?? fromDate, to_date: overrides?.to_date ?? toDate },
      });
      const payload = response.data || {};
      setAssets(payload.assets || {});
      setLiabilities(payload.liabilities || {});
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setAssets({});
      setLiabilities({});
      setError(fetchError?.response?.data?.message || 'Failed to load balance sheet.');
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

  const totalAssets = toNumber(assets.total_assets);
  const totalLiabilities = toNumber(liabilities.total_liabilities);
  const equity = totalAssets - totalLiabilities;
  const selectedCompany = useMemo(() => companies.find((c) => c.id === selectedCompanyId) || null, [companies, selectedCompanyId]);

  const exportCsv = () => {
    downloadCsv(
      `balance-sheet-${selectedCompanyId}.csv`,
      ['Section', 'Line Item', 'Amount'],
      [
        ['Assets', 'Cash in Hand', amount(assets.cash_in_hand)],
        ['Assets', 'Bank Balance', amount(assets.bank_balance)],
        ['Assets', 'Loan Receivable', amount(assets.loan_receivable)],
        ['Assets', 'Total Assets', amount(totalAssets)],
        ['Liabilities', 'Investor Deposits', amount(liabilities.investor_deposits)],
        ['Liabilities', 'Borrowed Funds', amount(liabilities.borrowed_funds)],
        ['Liabilities', 'Total Liabilities', amount(totalLiabilities)],
        ['Equity', 'Capital / Retained Earnings', amount(equity)],
      ]
    );
  };

  const renderSection = (title: string, rows: Array<{ label: string; key: string; total?: boolean }>, data: SectionData, accent: string) => (
    <div className="rounded-2xl border border-violet-100 overflow-hidden">
      <div className={`bg-gradient-to-r ${accent} px-4 py-3 text-white font-bold text-sm`}>{title}</div>
      <div className="divide-y divide-violet-50">
        {rows.map((row) => (
          <div key={row.key} className={`flex items-center justify-between px-4 py-3 text-black ${row.total ? 'bg-violet-50/60 font-bold' : ''}`}>
            <span>{row.label}</span>
            <span className="tabular-nums">{currency} {amount(data[row.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <AccountingReportShell
      badge="Accounting"
      title="Balance Sheet"
      description="Business financial position showing assets, liabilities, and equity."
      error={error}
      actions={
        <>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button type="button" onClick={() => fetchReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={() => router.push('/dashboard/reports')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
            <ArrowLeft className="h-4 w-4" /> Reports Hub
          </button>
        </>
      }
    >
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name}</p> : null}

      <SummaryCards
        items={[
          { label: 'Total Assets', value: `${currency} ${amount(totalAssets)}`, valueClass: 'text-emerald-700' },
          { label: 'Total Liabilities', value: `${currency} ${amount(totalLiabilities)}`, valueClass: 'text-amber-700' },
          { label: 'Equity', value: `${currency} ${amount(equity)}`, valueClass: 'text-violet-700' },
          { label: 'Position Check', value: Math.abs(totalAssets - totalLiabilities - equity) < 0.01 ? 'Balanced' : 'Review', valueClass: 'text-cyan-700' },
        ]}
      />

      <ReportFilters
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onCompanyChange={setSelectedCompanyId}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onApply={() => fetchReport()}
        onReset={() => {
          const nextFrom = monthStartIso();
          const nextTo = todayIso();
          setFromDate(nextFrom);
          setToDate(nextTo);
          fetchReport({ from_date: nextFrom, to_date: nextTo });
        }}
        loadingCompanies={loadingCompanies}
      />

      <ReportTable title="Balance Sheet Statement" loading={loading} hasData={totalAssets > 0 || totalLiabilities > 0} emptyTitle="No balance sheet data">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {renderSection('Assets', [
            { label: 'Cash in Hand', key: 'cash_in_hand' },
            { label: 'Bank Balance', key: 'bank_balance' },
            { label: 'Loan Receivable', key: 'loan_receivable' },
            { label: 'Total Assets', key: 'total_assets', total: true },
          ], assets, 'from-emerald-600 to-teal-600')}
          <div className="space-y-4">
            {renderSection('Liabilities', [
              { label: 'Investor Funds', key: 'investor_deposits' },
              { label: 'Borrowings', key: 'borrowed_funds' },
              { label: 'Total Liabilities', key: 'total_liabilities', total: true },
            ], liabilities, 'from-amber-600 to-orange-600')}
            {renderSection('Equity', [{ label: 'Capital / Retained Earnings', key: 'equity', total: true }], { equity }, 'from-violet-600 to-purple-600')}
          </div>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
