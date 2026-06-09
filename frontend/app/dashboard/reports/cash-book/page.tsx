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

export default function CashBookReportPage() {
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
  const [cashAccount, setCashAccount] = useState<{ account_name: string; opening_balance: number; current_balance: number } | null>(null);
  const [summary, setSummary] = useState({ cash_received: 0, cash_paid: 0, net_movement: 0 });
  const [lines, setLines] = useState<Array<{ account_name: string; period_debit: number; period_credit: number; closing_balance: number }>>([]);

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
      const response = await axios.get(`/api/companies/${selectedCompanyId}/reports/cash-book`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: { from_date: overrides?.from_date ?? fromDate, to_date: overrides?.to_date ?? toDate },
      });
      const payload = response.data || {};
      setCashAccount(payload.cash_account || null);
      setLines(Array.isArray(payload.lines) ? payload.lines : []);
      setSummary({
        cash_received: toNumber(payload.summary?.cash_received),
        cash_paid: toNumber(payload.summary?.cash_paid),
        net_movement: toNumber(payload.summary?.net_movement),
      });
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: any) {
      setCashAccount(null);
      setLines([]);
      setError(fetchError?.response?.data?.message || 'Failed to load cash book.');
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
      `cash-book-${selectedCompanyId}.csv`,
      ['Account', 'Cash Received', 'Cash Paid', 'Closing Balance'],
      lines.map((line) => [line.account_name, amount(line.period_debit), amount(line.period_credit), amount(line.closing_balance)])
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
    <AccountingReportShell badge="Accounting" title="Cash Book" description="Daily cash verification with all cash receipts and payments." error={error}
      actions={<><button type="button" onClick={exportCsv} disabled={lines.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button><button type="button" onClick={() => fetchReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={() => router.push('/dashboard/reports')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Reports Hub</button></>}
    >
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name} · {currency}</p> : null}
      <SummaryCards items={[
        { label: 'Current Cash', value: `${currency} ${amount(cashAccount?.current_balance || 0)}`, valueClass: 'text-emerald-700' },
        { label: 'Cash Received', value: `${currency} ${amount(summary.cash_received)}`, valueClass: 'text-cyan-700' },
        { label: 'Cash Paid', value: `${currency} ${amount(summary.cash_paid)}`, valueClass: 'text-rose-700' },
        { label: 'Net Movement', value: `${currency} ${amount(summary.net_movement)}`, valueClass: 'text-violet-700' },
      ]} />
      <ReportFilters companies={companies} selectedCompanyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} fromDate={fromDate} toDate={toDate} onFromDateChange={setFromDate} onToDateChange={setToDate} onApply={() => fetchReport()} onReset={() => { const nextFrom = monthStartIso(); const nextTo = todayIso(); setFromDate(nextFrom); setToDate(nextTo); fetchReport({ from_date: nextFrom, to_date: nextTo }); }} loadingCompanies={loadingCompanies} />
      <ReportTable title="Cash Transactions" countLabel={`${lines.length} lines`} loading={loading} hasData={lines.length > 0} emptyTitle="No cash transactions">
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider"><tr><th className="px-3 py-3 text-left">Account</th><th className="px-3 py-3 text-right">Received</th><th className="px-3 py-3 text-right">Paid</th><th className="px-3 py-3 text-right">Balance</th></tr></thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {lines.map((line) => (
                <tr key={line.account_name} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5 font-semibold">{line.account_name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{amount(line.period_debit)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{amount(line.period_credit)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{amount(line.closing_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
