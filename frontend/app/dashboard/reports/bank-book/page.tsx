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

type BankAccount = { account_name: string; bank_name: string; account_number: string; current_balance: number };
type BankMovement = { account_name: string; deposits: number; withdrawals: number; closing_balance: number };

export default function BankBookReportPage() {
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
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [summary, setSummary] = useState({ bank_count: 0, total_current_balance: 0, period_deposits: 0, period_withdrawals: 0 });

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
      const response = await axios.get(`/api/companies/${selectedCompanyId}/reports/bank-book`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: { from_date: overrides?.from_date ?? fromDate, to_date: overrides?.to_date ?? toDate },
      });
      const payload = response.data || {};
      setBanks(Array.isArray(payload.banks) ? payload.banks : []);
      setMovements(Array.isArray(payload.movements) ? payload.movements : []);
      setSummary({
        bank_count: Number(payload.summary?.bank_count || 0),
        total_current_balance: toNumber(payload.summary?.total_current_balance),
        period_deposits: toNumber(payload.summary?.period_deposits),
        period_withdrawals: toNumber(payload.summary?.period_withdrawals),
      });
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setBanks([]);
      setMovements([]);
      setError(fetchError?.response?.data?.message || 'Failed to load bank book.');
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
      `bank-book-${selectedCompanyId}.csv`,
      ['Bank', 'Account Number', 'Current Balance', 'Period Deposits', 'Period Withdrawals'],
      banks.map((bank) => {
        const movement = movements.find((row) => row.account_name === bank.account_name);
        return [bank.bank_name || bank.account_name, bank.account_number, amount(bank.current_balance), amount(movement?.deposits || 0), amount(movement?.withdrawals || 0)];
      })
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
    <AccountingReportShell badge="Accounting" title="Bank Book" description="Deposits, withdrawals, and balances for each bank account." error={error}
      actions={<><button type="button" onClick={exportCsv} disabled={banks.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button><button type="button" onClick={() => fetchReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={() => router.push('/dashboard/reports')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Reports Hub</button></>}
    >
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name} · {currency}</p> : null}
      <SummaryCards items={[
        { label: 'Bank Accounts', value: String(summary.bank_count) },
        { label: 'Total Balance', value: `${currency} ${amount(summary.total_current_balance)}`, valueClass: 'text-emerald-700' },
        { label: 'Period Deposits', value: `${currency} ${amount(summary.period_deposits)}`, valueClass: 'text-cyan-700' },
        { label: 'Period Withdrawals', value: `${currency} ${amount(summary.period_withdrawals)}`, valueClass: 'text-rose-700' },
      ]} />
      <ReportFilters companies={companies} selectedCompanyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} fromDate={fromDate} toDate={toDate} onFromDateChange={setFromDate} onToDateChange={setToDate} onApply={() => fetchReport()} onReset={() => { const nextFrom = monthStartIso(); const nextTo = todayIso(); setFromDate(nextFrom); setToDate(nextTo); fetchReport({ from_date: nextFrom, to_date: nextTo }); }} loadingCompanies={loadingCompanies} />
      <ReportTable title="Bank Accounts" countLabel={`${banks.length} banks`} loading={loading} hasData={banks.length > 0} emptyTitle="No bank accounts configured">
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider"><tr><th className="px-3 py-3 text-left">Bank</th><th className="px-3 py-3 text-left">Account No</th><th className="px-3 py-3 text-right">Balance</th><th className="px-3 py-3 text-right">Deposits</th><th className="px-3 py-3 text-right">Withdrawals</th></tr></thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {banks.map((bank) => {
                const movement = movements.find((row) => row.account_name === bank.account_name);
                return (
                  <tr key={bank.account_name} className="hover:bg-violet-50/40">
                    <td className="px-3 py-2.5 font-semibold">{bank.bank_name || bank.account_name}</td>
                    <td className="px-3 py-2.5">{bank.account_number || '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{amount(bank.current_balance)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{amount(movement?.deposits || 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{amount(movement?.withdrawals || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
