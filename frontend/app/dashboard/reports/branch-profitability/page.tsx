'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import {
  AccountingReportShell,
  ReportTable,
  SummaryCards,
  amount,
  downloadCsv,
  monthStartIso,
  todayIso,
  toNumber,
} from '@/app/components/accounting/AccountingReportShell';
import { accountingInputClass, accountingLabelClass } from '@/app/components/accounting/companyAccountingUtils';

type BranchProfitRow = { branch_name: string; income: number; expense: number; profit: number };

export default function BranchProfitabilityReportPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [rows, setRows] = useState<BranchProfitRow[]>([]);
  const [summary, setSummary] = useState({ branch_count: 0, total_income: 0, total_expense: 0, total_profit: 0 });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }
    setToken(storedToken);
  }, [router]);

  const fetchReport = async (overrides?: { from_date?: string; to_date?: string }) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports/branch-profitability', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: { from_date: overrides?.from_date ?? fromDate, to_date: overrides?.to_date ?? toDate },
      });
      const payload = response.data || {};
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setSummary({
        branch_count: Number(payload.summary?.branch_count || 0),
        total_income: toNumber(payload.summary?.total_income),
        total_expense: toNumber(payload.summary?.total_expense),
        total_profit: toNumber(payload.summary?.total_profit),
      });
    } catch (fetchError: any) {
      setRows([]);
      setError(fetchError?.response?.data?.message || 'Failed to load branch profitability report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const exportCsv = () => {
    downloadCsv(
      'branch-profitability.csv',
      ['Branch', 'Income', 'Expense', 'Profit'],
      rows.map((row) => [row.branch_name, amount(row.income), amount(row.expense), amount(row.profit)])
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
    <AccountingReportShell badge="Management" title="Branch Profitability Report" description="Income, expense, and profit comparison across branches." error={error}
      actions={<><button type="button" onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button><button type="button" onClick={() => fetchReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={() => router.push('/dashboard/reports')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Reports Hub</button></>}
    >
      <SummaryCards items={[
        { label: 'Branches', value: String(summary.branch_count) },
        { label: 'Total Income', value: amount(summary.total_income), valueClass: 'text-cyan-700' },
        { label: 'Total Expense', value: amount(summary.total_expense), valueClass: 'text-rose-700' },
        { label: 'Total Profit', value: amount(summary.total_profit), valueClass: 'text-emerald-700' },
      ]} />
      <div className="rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm space-y-4 chart-animate-panel">
        <h2 className="text-sm font-bold text-black">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className={accountingLabelClass}>From date</label><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={accountingInputClass} /></div>
          <div><label className={accountingLabelClass}>To date</label><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={accountingInputClass} /></div>
        </div>
        <button type="button" onClick={() => fetchReport()} className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white">Apply Filters</button>
      </div>
      <ReportTable title="Branch Profitability" countLabel={`${rows.length} branches`} loading={loading} hasData={rows.length > 0} emptyTitle="No branch profitability data">
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider"><tr><th className="px-3 py-3 text-left">Branch</th><th className="px-3 py-3 text-right">Income</th><th className="px-3 py-3 text-right">Expense</th><th className="px-3 py-3 text-right">Profit</th></tr></thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {rows.map((row) => (
                <tr key={row.branch_name} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5 font-semibold">{row.branch_name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-cyan-700">{amount(row.income)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{amount(row.expense)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${row.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{amount(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
