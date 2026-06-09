'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw, Scale } from 'lucide-react';
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

type LedgerLine = {
  account_code: string;
  account_name: string;
  closing_debit: number;
  closing_credit: number;
};

export default function TrialBalanceReportPage() {
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
  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [summary, setSummary] = useState({ closing_debits: 0, closing_credits: 0, accounts_count: 0 });

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
      const response = await axios.get('/api/finances/reports/general-ledger', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: {
          branch_id: selectedCompanyId,
          company_id: selectedCompanyId,
          from_date: overrides?.from_date ?? fromDate,
          to_date: overrides?.to_date ?? toDate,
        },
      });
      const payload = response.data || {};
      setLines(Array.isArray(payload.lines) ? payload.lines : []);
      setSummary({
        closing_debits: toNumber(payload.summary?.closing_debits),
        closing_credits: toNumber(payload.summary?.closing_credits),
        accounts_count: Number(payload.summary?.accounts_count || 0),
      });
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setLines([]);
      setError(fetchError?.response?.data?.message || 'Failed to load trial balance.');
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

  const balanced = Math.abs(summary.closing_debits - summary.closing_credits) < 0.01;
  const selectedCompany = useMemo(() => companies.find((c) => c.id === selectedCompanyId) || null, [companies, selectedCompanyId]);

  const exportCsv = () => {
    downloadCsv(
      `trial-balance-${selectedCompanyId}.csv`,
      ['Account Code', 'Account', 'Debit', 'Credit'],
      lines.map((line) => [line.account_code, line.account_name, amount(line.closing_debit), amount(line.closing_credit)])
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
    <AccountingReportShell
      badge="Accounting"
      title="Trial Balance"
      description="Verify debit and credit balances for every account. Auditors use this to confirm accounting accuracy."
      error={error}
      actions={
        <>
          <button type="button" onClick={exportCsv} disabled={lines.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50">
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
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name} · {currency}</p> : null}

      <SummaryCards
        items={[
          { label: 'Total Debit', value: `${currency} ${amount(summary.closing_debits)}`, valueClass: 'text-emerald-700' },
          { label: 'Total Credit', value: `${currency} ${amount(summary.closing_credits)}`, valueClass: 'text-rose-700' },
          { label: 'Accounts', value: String(summary.accounts_count) },
          { label: 'Balanced', value: balanced ? 'Yes' : 'No', valueClass: balanced ? 'text-emerald-700' : 'text-rose-700' },
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

      <ReportTable
        title="Trial Balance"
        subtitle="Account-wise debit and credit closing balances."
        countLabel={`${lines.length} accounts`}
        loading={loading}
        hasData={lines.length > 0}
        emptyTitle="No trial balance data"
        emptyMessage="Select a branch and date range to generate the trial balance."
      >
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left">Account</th>
                <th className="px-3 py-3 text-right">Debit</th>
                <th className="px-3 py-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {lines.map((line) => (
                <tr key={line.account_code} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold">{line.account_name}</p>
                    <p className="text-[10px] text-black">{line.account_code}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">
                    {line.closing_debit > 0 ? amount(line.closing_debit) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">
                    {line.closing_credit > 0 ? amount(line.closing_credit) : '—'}
                  </td>
                </tr>
              ))}
              <tr className="bg-violet-50/60 font-bold">
                <td className="px-3 py-3 flex items-center gap-2"><Scale className="h-4 w-4 text-violet-700" /> Totals</td>
                <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{amount(summary.closing_debits)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-rose-700">{amount(summary.closing_credits)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
