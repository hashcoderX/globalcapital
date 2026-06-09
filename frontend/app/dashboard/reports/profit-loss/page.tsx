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

export default function ProfitLossReportPage() {
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
  const [income, setIncome] = useState<Record<string, number>>({});
  const [expenses, setExpenses] = useState<Record<string, number>>({});
  const [profit, setProfit] = useState<Record<string, number>>({});

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
      setIncome(payload.income || {});
      setExpenses(payload.expenses || {});
      setProfit(payload.profit || {});
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setIncome({});
      setExpenses({});
      setProfit({});
      setError(fetchError?.response?.data?.message || 'Failed to load profit and loss statement.');
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

  const netProfit = toNumber(profit.period_profit);
  const selectedCompany = useMemo(() => companies.find((c) => c.id === selectedCompanyId) || null, [companies, selectedCompanyId]);

  const exportCsv = () => {
    downloadCsv(
      `profit-loss-${selectedCompanyId}.csv`,
      ['Section', 'Line Item', 'Amount'],
      [
        ['Income', 'Interest Income', amount(income.interest_income)],
        ['Income', 'Penalty Income', amount(income.penalty_income)],
        ['Income', 'Processing Fees', amount(income.processing_fees)],
        ['Income', 'Other Income', amount(income.other_income)],
        ['Income', 'Total Income', amount(income.total_income)],
        ['Expenses', 'Salaries', amount(expenses.salaries)],
        ['Expenses', 'Fuel', amount(expenses.fuel_expenses)],
        ['Expenses', 'Office Expenses', amount(expenses.office_expenses)],
        ['Expenses', 'Marketing', amount(expenses.marketing_expenses)],
        ['Expenses', 'Refund Expenses', amount(expenses.refund_expenses)],
        ['Expenses', 'Total Expenses', amount(expenses.total_expenses)],
        ['Profit', 'Net Profit', amount(netProfit)],
      ]
    );
  };

  const section = (title: string, rows: Array<{ label: string; key: string; total?: boolean }>, data: Record<string, number>, accent: string) => (
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
      title="Profit & Loss Statement"
      description="Actual business profitability from income, expenses, and net profit."
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
          { label: 'Total Income', value: `${currency} ${amount(income.total_income)}`, valueClass: 'text-cyan-700' },
          { label: 'Total Expenses', value: `${currency} ${amount(expenses.total_expenses)}`, valueClass: 'text-rose-700' },
          { label: 'Net Profit', value: `${currency} ${amount(netProfit)}`, valueClass: netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700' },
          { label: 'Monthly Profit', value: `${currency} ${amount(profit.monthly_profit)}`, valueClass: 'text-violet-700' },
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

      <ReportTable title="Profit & Loss Statement" loading={loading} hasData={toNumber(income.total_income) > 0 || toNumber(expenses.total_expenses) > 0} emptyTitle="No profit and loss data">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {section('Income', [
            { label: 'Interest Income', key: 'interest_income' },
            { label: 'Penalty Income', key: 'penalty_income' },
            { label: 'Processing Fees', key: 'processing_fees' },
            { label: 'Other Income', key: 'other_income' },
            { label: 'Total Income', key: 'total_income', total: true },
          ], income, 'from-cyan-600 to-blue-600')}
          <div className="space-y-4">
            {section('Expenses', [
              { label: 'Salaries', key: 'salaries' },
              { label: 'Fuel', key: 'fuel_expenses' },
              { label: 'Office Expenses', key: 'office_expenses' },
              { label: 'Marketing', key: 'marketing_expenses' },
              { label: 'Refund Expenses', key: 'refund_expenses' },
              { label: 'Total Expenses', key: 'total_expenses', total: true },
            ], expenses, 'from-rose-600 to-red-600')}
            {section('Net Profit', [{ label: 'Period Net Profit', key: 'period_profit', total: true }], profit, 'from-violet-600 to-purple-600')}
          </div>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
