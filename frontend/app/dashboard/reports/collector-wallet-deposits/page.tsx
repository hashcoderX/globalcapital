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

type DepositRow = {
  id: number;
  deposit_date: string;
  amount: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  bank_account_name?: string;
  bank_name?: string;
  account_type?: string;
  account_number?: string;
  note?: string;
};

type EmployeeTotal = {
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  transactions: number;
  total_amount: number;
};

const formatDate = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function CollectorWalletDepositsReportPage() {
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
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [employeeTotals, setEmployeeTotals] = useState<EmployeeTotal[]>([]);
  const [summary, setSummary] = useState({ transaction_count: 0, employee_count: 0, total_amount: 0 });

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
      const list = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setCompanies(list);
      if (list.length > 0) {
        setSelectedCompanyId((current) =>
          current && list.some((row: CompanyOption) => row.id === current) ? current : Number(list[0].id)
        );
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
      const response = await axios.get('/api/reports/collector-wallet-deposits', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: {
          branch_id: selectedCompanyId,
          from_date: overrides?.from_date ?? fromDate,
          to_date: overrides?.to_date ?? toDate,
        },
      });

      const payload = response.data || {};
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setEmployeeTotals(Array.isArray(payload.employee_totals) ? payload.employee_totals : []);
      setSummary({
        transaction_count: Number(payload.summary?.transaction_count || 0),
        employee_count: Number(payload.summary?.employee_count || 0),
        total_amount: toNumber(payload.summary?.total_amount),
      });
      setCurrency(payload.company?.currency || 'LKR');
    } catch (fetchError: unknown) {
      const message =
        axios.isAxiosError(fetchError) && typeof fetchError.response?.data?.message === 'string'
          ? fetchError.response?.data?.message
          : 'Failed to load collector wallet deposit report.';
      setRows([]);
      setEmployeeTotals([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void fetchCompanies(token);
    }
  }, [token]);

  useEffect(() => {
    if (!token || loadingCompanies || !selectedCompanyId) return;
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCompanyId, loadingCompanies]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const exportCsv = () => {
    downloadCsv(
      `collector-wallet-deposits-${selectedCompanyId}.csv`,
      ['Date', 'Employee Code', 'Employee Name', 'Account', 'Bank', 'Type', 'Amount', 'Note'],
      rows.map((row) => [
        formatDate(row.deposit_date),
        row.employee_code || '',
        row.employee_name || '',
        row.bank_account_name || '',
        row.bank_name || '',
        String(row.account_type || '').toUpperCase(),
        amount(row.amount),
        row.note || '',
      ])
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
      title="Collector Wallet Deposits"
      description="Admin report for field and collection officer bank/main-account deposit transactions."
      error={error}
      actions={
        <>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              void fetchReport();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/reports')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Reports Hub
          </button>
        </>
      }
    >
      {selectedCompany ? <p className="text-xs text-black font-semibold">{selectedCompany.name} · {currency}</p> : null}

      <SummaryCards
        items={[
          { label: 'Transactions', value: String(summary.transaction_count) },
          { label: 'Officers', value: String(summary.employee_count) },
          { label: 'Total Deposited', value: `${currency} ${amount(summary.total_amount)}`, valueClass: 'text-emerald-700' },
          { label: 'Date Range', value: `${fromDate} to ${toDate}` },
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
        onApply={() => {
          void fetchReport();
        }}
        onReset={() => {
          const nextFrom = monthStartIso();
          const nextTo = todayIso();
          setFromDate(nextFrom);
          setToDate(nextTo);
          void fetchReport({ from_date: nextFrom, to_date: nextTo });
        }}
        loadingCompanies={loadingCompanies}
      />

      <ReportTable
        title="Officer Totals"
        countLabel={`${employeeTotals.length} officers`}
        loading={loading}
        hasData={employeeTotals.length > 0}
        emptyTitle="No officer totals"
      >
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left">Employee Code</th>
                <th className="px-3 py-3 text-left">Officer</th>
                <th className="px-3 py-3 text-right">Transactions</th>
                <th className="px-3 py-3 text-right">Total Deposited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {employeeTotals.map((row) => (
                <tr key={`${row.employee_id}-${row.employee_code || ''}`} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5 font-semibold">{row.employee_code || '-'}</td>
                  <td className="px-3 py-2.5">{row.employee_name || '-'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.transactions}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">{amount(row.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportTable>

      <ReportTable
        title="Deposit Transactions"
        countLabel={`${rows.length} rows`}
        loading={loading}
        hasData={rows.length > 0}
        emptyTitle="No deposit transactions found"
      >
        <div className="overflow-x-auto rounded-xl border border-violet-100">
          <table className="min-w-full text-xs text-black">
            <thead className="bg-violet-50/70 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left">Date</th>
                <th className="px-3 py-3 text-left">Officer</th>
                <th className="px-3 py-3 text-left">Account</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-violet-50/40">
                  <td className="px-3 py-2.5">{formatDate(row.deposit_date)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{row.employee_name || '-'}</div>
                    <div className="text-[11px] text-black/60">{row.employee_code || ''}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.bank_account_name || '-'}</div>
                    <div className="text-[11px] text-black/60">{row.bank_name || ''}</div>
                  </td>
                  <td className="px-3 py-2.5">{String(row.account_type || '').toUpperCase() || '-'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">{amount(row.amount)}</td>
                  <td className="px-3 py-2.5">{row.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportTable>
    </AccountingReportShell>
  );
}
