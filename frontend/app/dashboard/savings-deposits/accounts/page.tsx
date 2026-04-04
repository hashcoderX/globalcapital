'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, PiggyBank, Search } from 'lucide-react';

type CustomerSummary = {
  id: number;
  customer_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  nic_passport?: string | null;
};

type SavingsAccountRow = {
  id: number;
  account_number?: string | null;
  account_type?: 'savings' | 'current' | 'fixed_deposit' | null;
  opening_deposit?: number | string | null;
  balance?: number | string | null;
  interest_rate?: number | string | null;
  status?: string | null;
  customer?: CustomerSummary | null;
};

function amount(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SavingsOpenAccountPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [openingAccount, setOpeningAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [accounts, setAccounts] = useState<SavingsAccountRow[]>([]);
  const [accountCustomerNo, setAccountCustomerNo] = useState('');
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerResults, setCustomerResults] = useState<CustomerSummary[]>([]);
  const [accountType, setAccountType] = useState<'savings' | 'current' | 'fixed_deposit'>('savings');
  const [openingDeposit, setOpeningDeposit] = useState('0');
  const [interestRate, setInterestRate] = useState('4.5');
  const [openedAt, setOpenedAt] = useState('');
  const [resolvedCustomer, setResolvedCustomer] = useState<CustomerSummary | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }
    setToken(t);
  }, [router]);

  const loadAccounts = async (authToken: string) => {
    setLoadingAccounts(true);
    try {
      const response = await axios.get('http://localhost:8000/api/savings-accounts', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        params: { per_page: 200 },
      });

      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      setAccounts(rows as SavingsAccountRow[]);
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadAccounts(token);
  }, [token]);

  const resolveByCustomerNo = async () => {
    if (!token || !accountCustomerNo.trim()) {
      setResolvedCustomer(null);
      return;
    }

    try {
      const response = await axios.get(`http://localhost:8000/api/customers/by-code/${encodeURIComponent(accountCustomerNo.trim())}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      setResolvedCustomer(response.data as CustomerSummary);
      setSuccessMessage('Customer verified. You can open account(s) now.');
      setErrorMessage('');
    } catch {
      setResolvedCustomer(null);
      setErrorMessage('Customer not found. Please register customer first.');
    }
  };

  const searchCustomersAdvanced = async () => {
    if (!token) return;

    const term = customerSearchText.trim();
    if (!term) {
      setCustomerResults([]);
      setErrorMessage('Enter Customer No or NIC to search.');
      return;
    }

    try {
      setSearchingCustomers(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await axios.get('http://localhost:8000/api/customers', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          per_page: 25,
          q: term,
        },
      });

      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      const normalized = term.toLowerCase();
      const narrowed = (rows as CustomerSummary[]).filter((row) => {
        const code = String(row.customer_code || '').toLowerCase();
        const nic = String(row.nic_passport || '').toLowerCase();
        const name = `${row.first_name || ''} ${row.last_name || ''}`.toLowerCase();
        const phoneText = String(row.phone || '').toLowerCase();
        return code.includes(normalized) || nic.includes(normalized) || name.includes(normalized) || phoneText.includes(normalized);
      });

      setCustomerResults(narrowed);
      if (narrowed.length === 0) {
        setErrorMessage('No customers found for this Customer No / NIC.');
      } else {
        setSuccessMessage(`Found ${narrowed.length} customer(s). Select one below.`);
      }
    } catch {
      setCustomerResults([]);
      setErrorMessage('Failed to search customers.');
    } finally {
      setSearchingCustomers(false);
    }
  };

  const selectCustomer = (customer: CustomerSummary) => {
    const code = String(customer.customer_code || '').trim();
    setResolvedCustomer(customer);
    setAccountCustomerNo(code);
    setCustomerSearchText(code || customerSearchText);
    setSuccessMessage('Customer selected. You can open account(s) now.');
    setErrorMessage('');
  };

  const openAccount = async () => {
    if (!token) return;

    if (!accountCustomerNo.trim()) {
      setErrorMessage('Customer No is required to open account.');
      return;
    }

    const depositValue = Number(openingDeposit || 0);
    const rateValue = Number(interestRate || 0);

    if (!Number.isFinite(depositValue) || depositValue < 0) {
      setErrorMessage('Opening deposit must be a valid non-negative amount.');
      return;
    }
    if (!Number.isFinite(rateValue) || rateValue < 0) {
      setErrorMessage('Interest rate must be a valid non-negative number.');
      return;
    }

    try {
      setOpeningAccount(true);
      setErrorMessage('');
      setSuccessMessage('');

      await axios.post(
        'http://localhost:8000/api/savings-accounts',
        {
          customer_no: accountCustomerNo.trim(),
          account_type: accountType,
          opening_deposit: depositValue,
          interest_rate: rateValue,
          opened_at: openedAt || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      setSuccessMessage('Account opened successfully. You can open another account for the same customer.');
      await loadAccounts(token);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(String(error.response?.data?.message || 'Failed to open account.'));
      } else {
        setErrorMessage('Failed to open account.');
      }
    } finally {
      setOpeningAccount(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-yellow-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-orange-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        <div className="bg-white/90 rounded-3xl border border-orange-100 p-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">Savings & Deposits</p>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Open Account</h1>
            <p className="text-sm text-slate-600 mt-1">Separate page for opening savings/deposit accounts.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/savings-deposits')}
            className="px-4 py-2 rounded-xl bg-white border border-orange-200 text-orange-800 text-sm font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Savings Dashboard
          </button>
        </div>

        {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}
        {successMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}

        <div className="bg-white/90 rounded-3xl border border-orange-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-orange-700" />
            <h2 className="text-lg font-bold text-slate-900">Open Savings / Deposit Account</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Customer Search (Customer No / NIC) *</label>
              <div className="flex gap-2">
                <input
                  value={customerSearchText}
                  onChange={(e) => setCustomerSearchText(e.target.value)}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Type Customer No or NIC"
                />
                <button type="button" onClick={searchCustomersAdvanced} className="px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-800 inline-flex items-center gap-1">
                  <Search className="h-3.5 w-3.5" />
                  {searchingCustomers ? 'Searching...' : 'Search'}
                </button>
                <button type="button" onClick={resolveByCustomerNo} className="px-3 py-2 rounded-lg border border-orange-200 bg-white text-xs font-semibold text-orange-800 inline-flex items-center gap-1">
                  Verify
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">You can search by exact Customer No, partial Customer No, or NIC.</p>
              {resolvedCustomer && (
                <p className="mt-1 text-[11px] text-emerald-700 font-semibold">
                  Selected: {resolvedCustomer.customer_code} - {resolvedCustomer.first_name} {resolvedCustomer.last_name}
                </p>
              )}
            </div>

            {customerResults.length > 0 && (
              <div className="md:col-span-2 overflow-x-auto rounded-xl border border-orange-100">
                <table className="min-w-full text-sm bg-white">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-orange-100">
                      <th className="py-2 px-3">Customer No</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">NIC</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerResults.map((row) => (
                      <tr key={row.id} className="border-b border-orange-50 text-slate-700">
                        <td className="py-2 px-3 font-semibold">{row.customer_code || '-'}</td>
                        <td className="py-2 px-3">{row.first_name || ''} {row.last_name || ''}</td>
                        <td className="py-2 px-3">{row.nic_passport || '-'}</td>
                        <td className="py-2 px-3">{row.phone || '-'}</td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => selectCustomer(row)}
                            className="px-3 py-1 rounded-lg border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-800"
                          >
                            Use This
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Account Type</label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value as 'savings' | 'current' | 'fixed_deposit')} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="savings">Savings</option>
                <option value="current">Current</option>
                <option value="fixed_deposit">Fixed Deposit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Interest Rate %</label>
              <input value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="e.g. 4.5" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Opening Deposit</label>
              <input value={openingDeposit} onChange={(e) => setOpeningDeposit(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="0.00" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Opened Date</label>
              <input type="date" value={openedAt} onChange={(e) => setOpenedAt(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
          </div>

          <button type="button" disabled={openingAccount} onClick={openAccount} className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            {openingAccount ? 'Opening...' : 'Open Account'}
          </button>
          <p className="text-xs text-slate-500">One customer can open multiple savings/deposit accounts.</p>
        </div>

        <div className="bg-white/90 rounded-3xl border border-orange-100 p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Latest Accounts</h2>
          {loadingAccounts ? (
            <div className="py-8 text-sm text-slate-500">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-sm text-slate-500">No savings/deposit accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-orange-100">
                    <th className="py-2 pr-3">Account No</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Opening Deposit</th>
                    <th className="py-2 pr-3">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.slice(0, 20).map((row) => (
                    <tr key={row.id} className="border-b border-orange-50 text-slate-700">
                      <td className="py-2 pr-3 font-semibold">{row.account_number || '-'}</td>
                      <td className="py-2 pr-3">{row.customer?.customer_code || '-'} - {row.customer?.first_name || ''} {row.customer?.last_name || ''}</td>
                      <td className="py-2 pr-3 capitalize">{String(row.account_type || '-').replace('_', ' ')}</td>
                      <td className="py-2 pr-3">{amount(row.opening_deposit)}</td>
                      <td className="py-2 pr-3">{amount(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
