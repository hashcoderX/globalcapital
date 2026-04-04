'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Search, UserPlus, Users } from 'lucide-react';

type CustomerRow = {
  id: number;
  customer_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  nic_passport?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  employment_type?: 'salaried' | 'self_employed' | 'business' | null;
  status?: string | null;
  created_at?: string | null;
};

export default function SavingsCustomerRegistrationPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

  const [customerCode, setCustomerCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [nicPassport, setNicPassport] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [employmentType, setEmploymentType] = useState<'salaried' | 'self_employed' | 'business'>('salaried');

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [employmentFilter, setEmploymentFilter] = useState<'all' | 'salaried' | 'self_employed' | 'business'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'customer_code'>('newest');

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }

    setToken(t);
  }, [router]);

  const fetchCustomers = async (authToken: string) => {
    setLoadingCustomers(true);
    try {
      const response = await axios.get('http://localhost:8000/api/customers', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        params: {
          per_page: 1000,
          q: searchText.trim() || undefined,
        },
      });

      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      setCustomers(rows as CustomerRow[]);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchCustomers(token);
  }, [token]);

  const generateCustomerCode = async () => {
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:8000/api/customers/generate-code', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const generated = String(response.data?.customer_no || '').trim();
      if (generated) {
        setCustomerCode(generated);
      }
    } catch {
      setErrorMessage('Failed to generate customer code.');
    }
  };

  const registerCustomer = async () => {
    if (!token) return;

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !nicPassport.trim() || !dateOfBirth || !permanentAddress.trim()) {
      setErrorMessage('Please fill required fields: First Name, Last Name, Phone, NIC/Passport, Date of Birth, Permanent Address.');
      return;
    }

    try {
      setSavingCustomer(true);
      setErrorMessage('');
      setSuccessMessage('');

      const payload = {
        customer_code: customerCode.trim() || undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        nic_passport: nicPassport.trim(),
        date_of_birth: dateOfBirth,
        gender,
        employment_type: employmentType,
        permanent_address: permanentAddress.trim(),
      };

      const response = await axios.post('http://localhost:8000/api/customers', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const createdCode = String(response.data?.customer_code || customerCode || '').trim();
      setSuccessMessage(`Customer registered successfully${createdCode ? ` (${createdCode})` : ''}. You can now open account(s).`);
      if (createdCode) {
        setCustomerCode(createdCode);
      }
      setFirstName('');
      setLastName('');
      setPhone('');
      setNicPassport('');
      setDateOfBirth('');
      setGender('male');
      setPermanentAddress('');
      setEmploymentType('salaried');
      await fetchCustomers(token);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(String(error.response?.data?.message || 'Failed to register customer.'));
      } else {
        setErrorMessage('Failed to register customer.');
      }
    } finally {
      setSavingCustomer(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const rows = customers.filter((row) => {
      const statusValue = String(row.status || '').toLowerCase();
      const genderValue = String(row.gender || '').toLowerCase();
      const employmentValue = String(row.employment_type || '').toLowerCase();

      if (statusFilter !== 'all' && statusValue !== statusFilter) return false;
      if (genderFilter !== 'all' && genderValue !== genderFilter) return false;
      if (employmentFilter !== 'all' && employmentValue !== employmentFilter) return false;

      if (!q) return true;

      const haystack = [
        row.customer_code || '',
        row.first_name || '',
        row.last_name || '',
        row.phone || '',
        row.nic_passport || '',
      ].join(' ').toLowerCase();

      return haystack.includes(q);
    });

    if (sortBy === 'name') {
      return rows.sort((a, b) => `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`));
    }

    if (sortBy === 'customer_code') {
      return rows.sort((a, b) => String(a.customer_code || '').localeCompare(String(b.customer_code || '')));
    }

    return rows.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [customers, searchText, statusFilter, genderFilter, employmentFilter, sortBy]);

  const activeCustomerCount = useMemo(
    () => customers.filter((row) => String(row.status || '').toLowerCase() === 'active').length,
    [customers],
  );

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

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        <div className="bg-white/90 rounded-3xl border border-orange-100 p-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">Savings & Deposits</p>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Register Customer</h1>
            <p className="text-sm text-slate-600 mt-1">Customer onboarding page before account opening.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard/savings-deposits')}
              className="px-4 py-2 rounded-xl bg-white border border-orange-200 text-orange-800 text-sm font-semibold inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Savings Dashboard
            </button>
          </div>
        </div>

        {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}
        {successMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/90 rounded-2xl border border-orange-100 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Customers</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{customers.length}</p>
          </div>
          <div className="bg-white/90 rounded-2xl border border-orange-100 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Active Customers</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{activeCustomerCount}</p>
          </div>
          <div className="bg-white/90 rounded-2xl border border-orange-100 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Filtered Results</p>
            <p className="text-2xl font-extrabold text-orange-700 mt-1">{filteredCustomers.length}</p>
          </div>
        </div>

        <div className="bg-white/90 rounded-3xl border border-orange-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-orange-700" />
            <h2 className="text-lg font-bold text-slate-900">Register New Customer</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Customer No</label>
              <div className="flex gap-2">
                <input value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Auto or manual" />
                <button type="button" onClick={generateCustomerCode} className="px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-800">Generate</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Phone *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">First Name *</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Last Name *</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">NIC / Passport *</label>
              <input value={nicPassport} onChange={(e) => setNicPassport(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Date of Birth *</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Gender *</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Employment Type</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as 'salaried' | 'self_employed' | 'business')} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="salaried">Salaried</option>
                <option value="self_employed">Self Employed</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Permanent Address *</label>
              <input value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
          </div>

          <button type="button" disabled={savingCustomer} onClick={registerCustomer} className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            {savingCustomer ? 'Registering...' : 'Register Customer'}
          </button>
        </div>

        <div className="bg-white/90 rounded-3xl border border-orange-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-700" />
            <h2 className="text-lg font-bold text-slate-900">Find Customers</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="xl:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Search</label>
              <div className="flex gap-2">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Customer no / name / phone / NIC"
                />
                <button
                  type="button"
                  onClick={() => token && fetchCustomers(token)}
                  className="px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-800 inline-flex items-center gap-1"
                >
                  <Search className="h-3.5 w-3.5" />
                  Find
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Gender</label>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female' | 'other')} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Employment</label>
              <select value={employmentFilter} onChange={(e) => setEmploymentFilter(e.target.value as 'all' | 'salaried' | 'self_employed' | 'business')} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="all">All</option>
                <option value="salaried">Salaried</option>
                <option value="self_employed">Self Employed</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-500">Use filters to quickly find customer profiles.</p>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Sort</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'newest' | 'name' | 'customer_code')} className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="newest">Newest</option>
                <option value="name">Name</option>
                <option value="customer_code">Customer No</option>
              </select>
            </div>
          </div>

          {loadingCustomers ? (
            <div className="py-8 text-sm text-slate-500">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-8 text-sm text-slate-500">No customers found with selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-orange-100">
                    <th className="py-2 pr-3">Customer No</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">NIC</th>
                    <th className="py-2 pr-3">Gender</th>
                    <th className="py-2 pr-3">Employment</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.slice(0, 300).map((row) => (
                    <tr key={row.id} className="border-b border-orange-50 text-slate-700">
                      <td className="py-2 pr-3 font-semibold">{row.customer_code || '-'}</td>
                      <td className="py-2 pr-3">{row.first_name || ''} {row.last_name || ''}</td>
                      <td className="py-2 pr-3">{row.phone || '-'}</td>
                      <td className="py-2 pr-3">{row.nic_passport || '-'}</td>
                      <td className="py-2 pr-3 capitalize">{row.gender || '-'}</td>
                      <td className="py-2 pr-3 capitalize">{String(row.employment_type || '-').replace('_', ' ')}</td>
                      <td className="py-2 pr-3 capitalize">{row.status || '-'}</td>
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
