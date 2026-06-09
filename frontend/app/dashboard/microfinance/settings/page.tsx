'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

type MFRoute = {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
};

type MFGroup = {
  id: number;
  mf_route_id: number;
  mf_center_id: number;
  name: string;
  code: string;
  is_active: boolean;
  route?: { id: number; name: string; code: string };
  center?: { id: number; name: string; code: string; mf_route_id: number };
};

type MFCenter = {
  id: number;
  mf_route_id: number;
  name: string;
  code: string;
  meeting_day: string | null;
  is_active: boolean;
  route?: { id: number; name: string; code: string };
};

type MFPenaltySetting = {
  id: number;
  penalty_rate: number;
  is_active: boolean;
};

type LoanLifecycleRow = {
  id: number;
  loan_code?: string | null;
  customer_no?: string | null;
  customer_name?: string | null;
  field_officer?: string | null;
  status?: string | null;
  refund_option?: 'day' | 'week' | 'month' | string | null;
  installment_amount?: number | string | null;
  due_date?: string | null;
  next_payment_date?: string | null;
  arrears_balance?: number | string | null;
};

type TabType = 'routes' | 'groups' | 'centers' | 'penalty' | 'loan_lifecycle';

const API_BASE = '/api/microfinance/settings';
const shellCardClass =
  'bg-white/75 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_18px_45px_-20px_rgba(14,116,144,0.45)]';
const inputClass =
  'w-full rounded-xl border border-cyan-100 bg-white/90 px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200';

export default function MicrofinanceSettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('routes');

  const [routes, setRoutes] = useState<MFRoute[]>([]);
  const [groups, setGroups] = useState<MFGroup[]>([]);
  const [centers, setCenters] = useState<MFCenter[]>([]);
  const [penaltySetting, setPenaltySetting] = useState<MFPenaltySetting | null>(null);
  const [loanLifecycleRows, setLoanLifecycleRows] = useState<LoanLifecycleRow[]>([]);

  const [routeForm, setRouteForm] = useState({ id: 0, name: '', code: '', is_active: true });
  const [groupForm, setGroupForm] = useState({ id: 0, mf_route_id: 0, mf_center_id: 0, name: '', code: '', is_active: true });
  const [centerForm, setCenterForm] = useState({ id: 0, mf_route_id: 0, name: '', code: '', meeting_day: '', is_active: true });
  const [penaltyForm, setPenaltyForm] = useState({ id: 0, penalty_rate: '', is_active: true });
  const [routeLoading, setRouteLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [centerLoading, setCenterLoading] = useState(false);
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleActionLoading, setLifecycleActionLoading] = useState(false);
  const [lifecycleSearch, setLifecycleSearch] = useState('');
  const [lifecycleStatusFilter, setLifecycleStatusFilter] = useState<'all' | 'requested' | 'approved' | 'released' | 'hold'>('all');
  const [lifecycleActionFilter, setLifecycleActionFilter] = useState<'all' | 'can_hold' | 'can_close'>('all');
  const [modal, setModal] = useState({ open: false, title: '', message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: Exclude<TabType, 'penalty'> | null; id: number | null }>({
    open: false,
    type: null,
    id: null,
  });
  const [lifecycleModal, setLifecycleModal] = useState<{
    open: boolean;
    action: 'hold' | 'close';
    reason: string;
    loan: LoanLifecycleRow | null;
  }>({
    open: false,
    action: 'hold',
    reason: '',
    loan: null,
  });

  const openModal = (message: string, title = 'Notice') => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal({ open: false, title: '', message: '' });
  };

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
    [token]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/');
      return;
    }

    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token]);

  const loadAll = async () => {
    try {
      const [routeRes, groupRes, centerRes, penaltyRes, loanRes] = await Promise.all([
        axios.get(`${API_BASE}/routes`, { headers }),
        axios.get(`${API_BASE}/groups`, { headers }),
        axios.get(`${API_BASE}/centers`, { headers }),
        axios.get(`${API_BASE}/penalty-rate`, { headers }),
        axios.get('/api/microfinance/loan-requests', { headers }),
      ]);

      setRoutes(routeRes.data);
      setGroups(groupRes.data);
      setCenters(centerRes.data);
      setPenaltySetting(penaltyRes.data);
      const loanRows = Array.isArray(loanRes.data) ? loanRes.data : [];
      setLoanLifecycleRows(
        loanRows
          .filter((loan: LoanLifecycleRow) => {
            const status = String(loan.status || '').toLowerCase();
            return ['requested', 'approved', 'released', 'hold'].includes(status);
          })
          .sort((a: LoanLifecycleRow, b: LoanLifecycleRow) => Number(b.id || 0) - Number(a.id || 0))
      );
      if (penaltyRes.data) {
        setPenaltyForm({
          id: penaltyRes.data.id,
          penalty_rate: String(penaltyRes.data.penalty_rate ?? ''),
          is_active: penaltyRes.data.is_active ?? true,
        });
      } else {
        setPenaltyForm({ id: 0, penalty_rate: '', is_active: true });
      }
    } catch {
      openModal('Failed to load microfinance settings.', 'Error');
    }
  };

  const resetRouteForm = () => setRouteForm({ id: 0, name: '', code: '', is_active: true });
  const resetGroupForm = () => setGroupForm({ id: 0, mf_route_id: 0, mf_center_id: 0, name: '', code: '', is_active: true });
  const resetCenterForm = () => setCenterForm({ id: 0, mf_route_id: 0, name: '', code: '', meeting_day: '', is_active: true });
  const resetPenaltyForm = () =>
    setPenaltyForm({
      id: penaltySetting?.id ?? 0,
      penalty_rate: penaltySetting ? String(penaltySetting.penalty_rate ?? '') : '',
      is_active: penaltySetting?.is_active ?? true,
    });

  const submitRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setRouteLoading(true);
    try {
      if (routeForm.id) {
        await axios.put(`${API_BASE}/routes/${routeForm.id}`, routeForm, { headers });
      } else {
        await axios.post(`${API_BASE}/routes`, routeForm, { headers });
      }
      await loadAll();
      resetRouteForm();
    } catch {
      openModal('Failed to save route. Ensure code is unique.', 'Error');
    } finally {
      setRouteLoading(false);
    }
  };

  const submitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupLoading(true);
    try {
      if (groupForm.id) {
        await axios.put(`${API_BASE}/groups/${groupForm.id}`, groupForm, { headers });
      } else {
        await axios.post(`${API_BASE}/groups`, groupForm, { headers });
      }
      await loadAll();
      resetGroupForm();
    } catch {
      openModal('Failed to save group. Ensure route and center are selected and code is unique.', 'Error');
    } finally {
      setGroupLoading(false);
    }
  };

  const submitCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setCenterLoading(true);
    try {
      if (centerForm.id) {
        await axios.put(`${API_BASE}/centers/${centerForm.id}`, centerForm, { headers });
      } else {
        await axios.post(`${API_BASE}/centers`, centerForm, { headers });
      }
      await loadAll();
      resetCenterForm();
    } catch {
      openModal('Failed to save center. Ensure route is selected and code is unique.', 'Error');
    } finally {
      setCenterLoading(false);
    }
  };

  const submitPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    setPenaltyLoading(true);
    try {
      const payload = {
        penalty_rate: Number(penaltyForm.penalty_rate || 0),
        is_active: penaltyForm.is_active,
      };

      if (penaltyForm.id) {
        await axios.put(`${API_BASE}/penalty-rate/${penaltyForm.id}`, payload, { headers });
      } else {
        await axios.post(`${API_BASE}/penalty-rate`, payload, { headers });
      }

      await loadAll();
    } catch {
      openModal('Failed to save penalty rate setting.', 'Error');
    } finally {
      setPenaltyLoading(false);
    }
  };

  const deleteItem = (type: Exclude<TabType, 'penalty'>, id: number) => {
    setDeleteConfirm({ open: true, type, id });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, type: null, id: null });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.type || !deleteConfirm.id) return;

    try {
      const response = await axios.delete(`${API_BASE}/${deleteConfirm.type}/${deleteConfirm.id}`, { headers });
      await loadAll();
      closeDeleteConfirm();

      const successMessage = response?.data?.message || 'Item deleted successfully.';
      openModal(successMessage, 'Delete Success');
    } catch {
      openModal('Delete failed. Item may have dependent records.', 'Error');
    }
  };

  const openLifecycleModal = (loan: LoanLifecycleRow, action: 'hold' | 'close') => {
    setLifecycleModal({ open: true, action, reason: '', loan });
  };

  const closeLifecycleModal = () => {
    if (lifecycleActionLoading) return;
    setLifecycleModal({ open: false, action: 'hold', reason: '', loan: null });
  };

  const submitLifecycleAction = async () => {
    if (!lifecycleModal.loan) return;

    setLifecycleActionLoading(true);
    try {
      await axios.post(
        `/api/microfinance/loan-requests/${lifecycleModal.loan.id}/lifecycle`,
        {
          action: lifecycleModal.action,
          reason: lifecycleModal.reason || null,
        },
        { headers }
      );

      closeLifecycleModal();
      setLifecycleLoading(true);
      await loadAll();
      openModal(
        lifecycleModal.action === 'hold'
          ? 'Loan is now on hold. Arrears and due-date progression are paused.'
          : 'Loan has been closed successfully.',
        'Success'
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to update loan lifecycle.';
      openModal(message, 'Error');
    } finally {
      setLifecycleLoading(false);
      setLifecycleActionLoading(false);
    }
  };

  const formatDate = (value?: string | null) => {
    const raw = String(value || '').slice(0, 10);
    if (!raw) return '-';
    const parsed = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return raw;
    return new Intl.DateTimeFormat('en-LK', { year: 'numeric', month: 'short', day: '2-digit' }).format(parsed);
  };

  const shiftDateByRefundOption = (date: Date, refundOption?: string | null) => {
    const next = new Date(date);
    if (refundOption === 'day') {
      next.setDate(next.getDate() + 1);
      return next;
    }
    if (refundOption === 'week') {
      next.setDate(next.getDate() + 7);
      return next;
    }
    next.setMonth(next.getMonth() + 1);
    return next;
  };

  const getProjectedArrears = (loan: LoanLifecycleRow) => {
    const status = String(loan.status || '').toLowerCase();
    if (status === 'hold' || status === 'closed') {
      return 0;
    }

    let balance = Number(loan.arrears_balance || 0);
    const installment = Number(loan.installment_amount || 0);
    const dueDateText = String(loan.due_date || '').slice(0, 10);
    if (installment <= 0 || !dueDateText) return Math.max(balance, 0);

    let dueCursor = new Date(`${dueDateText}T00:00:00`);
    if (Number.isNaN(dueCursor.getTime())) return Math.max(balance, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (dueCursor <= today) {
      balance += installment;
      dueCursor = shiftDateByRefundOption(dueCursor, loan.refund_option);
    }

    return Math.max(balance, 0);
  };

  const filteredLoanLifecycleRows = useMemo(() => {
    const keyword = lifecycleSearch.trim().toLowerCase();

    return loanLifecycleRows.filter((loan) => {
      const status = String(loan.status || '').toLowerCase();
      const canHold = status === 'approved' || status === 'released';
      const canClose = status !== 'closed' && status !== 'rejected';

      if (lifecycleStatusFilter !== 'all' && status !== lifecycleStatusFilter) return false;
      if (lifecycleActionFilter === 'can_hold' && !canHold) return false;
      if (lifecycleActionFilter === 'can_close' && !canClose) return false;

      if (!keyword) return true;

      const haystack = [
        loan.loan_code || `LR-${loan.id}`,
        loan.customer_no || '',
        loan.customer_name || '',
        loan.field_officer || '',
        status,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [loanLifecycleRows, lifecycleSearch, lifecycleStatusFilter, lifecycleActionFilter]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-teal-100 px-4 py-8 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-16 -left-10 h-72 w-72 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-sky-200 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-teal-200 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className={`${shellCardClass} flex items-center justify-between p-6 md:p-8`}>
          <div>
            <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Microfinance Admin
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900 md:text-3xl">Settings Workspace</h1>
            <p className="mt-1 text-sm text-slate-600">Create, organize, and maintain Routes, Groups, and Centers.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/microfinance')}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-700"
          >
            Back
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { key: 'routes', label: 'Routes', icon: '???' },
            { key: 'centers', label: 'Centers', icon: '??' },
            { key: 'groups', label: 'Groups', icon: '??' },
            { key: 'penalty', label: 'Penalty Rate', icon: '??' },
            { key: 'loan_lifecycle', label: 'Loan Hold/Close', icon: '??' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-lg'
                  : 'bg-white/80 text-slate-700 border border-white/80 hover:bg-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'routes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={submitRoute} className={`${shellCardClass} p-6 md:p-7 space-y-4`}>
              <h2 className="text-lg font-bold text-slate-900">{routeForm.id ? 'Edit Route' : 'Create Route'}</h2>
              <input
                value={routeForm.name}
                onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                placeholder="Route name"
                className={inputClass}
                required
              />
              <input
                value={routeForm.code}
                onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })}
                placeholder="Route code"
                className={inputClass}
                required
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={routeForm.is_active}
                  onChange={(e) => setRouteForm({ ...routeForm, is_active: e.target.checked })}
                />
                Active
              </label>
              <div className="flex gap-2">
                <button disabled={routeLoading} className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-700 hover:to-sky-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2">
                  {routeLoading && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>}
                  {routeLoading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={resetRouteForm} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Clear</button>
              </div>
            </form>

            <div className={`${shellCardClass} p-6 md:p-7`}>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Route List</h2>
              <div className="space-y-3 max-h-[420px] overflow-auto">
                {routes.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-cyan-100/80 bg-white/85 p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">Code: {item.code} • {item.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setRouteForm(item)} className="text-xs px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-semibold">Edit</button>
                      <button onClick={() => deleteItem('routes', item.id)} className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg font-semibold">Delete</button>
                    </div>
                  </div>
                ))}
                {!routes.length && <p className="text-sm text-slate-500">No routes yet.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={submitGroup} className={`${shellCardClass} p-6 md:p-7 space-y-4`}>
              <h2 className="text-lg font-bold text-slate-900">{groupForm.id ? 'Edit Group' : 'Create Group'}</h2>
              <select
                value={groupForm.mf_route_id}
                onChange={(e) =>
                  setGroupForm({
                    ...groupForm,
                    mf_route_id: Number(e.target.value),
                    mf_center_id: 0,
                  })
                }
                className={inputClass}
                required
              >
                <option value={0}>Select route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>{route.name} ({route.code})</option>
                ))}
              </select>
              <select
                value={groupForm.mf_center_id}
                onChange={(e) => setGroupForm({ ...groupForm, mf_center_id: Number(e.target.value) })}
                className={inputClass}
                required
              >
                <option value={0}>Select center</option>
                {centers
                  .filter((center) => center.mf_route_id === groupForm.mf_route_id)
                  .map((center) => (
                    <option key={center.id} value={center.id}>{center.name} ({center.code})</option>
                  ))}
              </select>
              <input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Group name"
                className={inputClass}
                required
              />
              <input
                value={groupForm.code}
                onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })}
                placeholder="Group code"
                className={inputClass}
                required
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={groupForm.is_active}
                  onChange={(e) => setGroupForm({ ...groupForm, is_active: e.target.checked })}
                />
                Active
              </label>
              <div className="flex gap-2">
                <button disabled={groupLoading} className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-700 hover:to-sky-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2">
                  {groupLoading && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>}
                  {groupLoading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={resetGroupForm} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Clear</button>
              </div>
            </form>

            <div className={`${shellCardClass} p-6 md:p-7`}>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Group List</h2>
              <div className="space-y-3 max-h-[420px] overflow-auto">
                {groups.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-cyan-100/80 bg-white/85 p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">Code: {item.code} • Route: {item.route?.name ?? 'N/A'} • Center: {item.center?.name ?? 'N/A'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setGroupForm({ id: item.id, mf_route_id: item.mf_route_id, mf_center_id: item.mf_center_id, name: item.name, code: item.code, is_active: item.is_active })} className="text-xs px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-semibold">Edit</button>
                      <button onClick={() => deleteItem('groups', item.id)} className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg font-semibold">Delete</button>
                    </div>
                  </div>
                ))}
                {!groups.length && <p className="text-sm text-slate-500">No groups yet.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'centers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={submitCenter} className={`${shellCardClass} p-6 md:p-7 space-y-4`}>
              <h2 className="text-lg font-bold text-slate-900">{centerForm.id ? 'Edit Center' : 'Create Center'}</h2>
              <select
                value={centerForm.mf_route_id}
                onChange={(e) => setCenterForm({ ...centerForm, mf_route_id: Number(e.target.value) })}
                className={inputClass}
                required
              >
                <option value={0}>Select route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>{route.name} ({route.code})</option>
                ))}
              </select>
              <input
                value={centerForm.name}
                onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                placeholder="Center name"
                className={inputClass}
                required
              />
              <input
                value={centerForm.code}
                onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })}
                placeholder="Center code"
                className={inputClass}
                required
              />
              <input
                value={centerForm.meeting_day}
                onChange={(e) => setCenterForm({ ...centerForm, meeting_day: e.target.value })}
                placeholder="Meeting day (optional)"
                className={inputClass}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={centerForm.is_active}
                  onChange={(e) => setCenterForm({ ...centerForm, is_active: e.target.checked })}
                />
                Active
              </label>
              <div className="flex gap-2">
                <button disabled={centerLoading} className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-700 hover:to-sky-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2">
                  {centerLoading && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>}
                  {centerLoading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={resetCenterForm} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Clear</button>
              </div>
            </form>

            <div className={`${shellCardClass} p-6 md:p-7`}>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Center List</h2>
              <div className="space-y-3 max-h-[420px] overflow-auto">
                {centers.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-cyan-100/80 bg-white/85 p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">Code: {item.code} • Route: {item.route?.name ?? 'N/A'} • Day: {item.meeting_day || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setCenterForm({ id: item.id, mf_route_id: item.mf_route_id, name: item.name, code: item.code, meeting_day: item.meeting_day ?? '', is_active: item.is_active })} className="text-xs px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-semibold">Edit</button>
                      <button onClick={() => deleteItem('centers', item.id)} className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg font-semibold">Delete</button>
                    </div>
                  </div>
                ))}
                {!centers.length && <p className="text-sm text-slate-500">No centers yet.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'penalty' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={submitPenalty} className={`${shellCardClass} p-6 md:p-7 space-y-4`}>
              <h2 className="text-lg font-bold text-slate-900">{penaltyForm.id ? 'Update Penalty Rate' : 'Add Initial Penalty Rate'}</h2>
              <p className="text-sm text-slate-600">
                Create the initial late-payment penalty record first, then update it later when needed.
              </p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={penaltyForm.penalty_rate}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, penalty_rate: e.target.value })}
                placeholder="Penalty rate %"
                className={inputClass}
                required
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={penaltyForm.is_active}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, is_active: e.target.checked })}
                />
                Active
              </label>
              <div className="flex gap-2">
                <button disabled={penaltyLoading} className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-700 hover:to-sky-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2">
                  {penaltyLoading && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>}
                  {penaltyLoading ? 'Saving...' : penaltyForm.id ? 'Update' : 'Add Initial Record'}
                </button>
                <button type="button" onClick={resetPenaltyForm} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Reset</button>
              </div>
            </form>

            <div className={`${shellCardClass} p-6 md:p-7`}>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Current Penalty Setting</h2>
              {penaltySetting ? (
                <div className="rounded-2xl border border-cyan-100/80 bg-white/85 p-4 shadow-sm">
                  <p className="font-semibold text-slate-900">Late Payment Penalty</p>
                  <p className="text-sm text-slate-600 mt-1">Rate: {Number(penaltySetting.penalty_rate || 0).toFixed(2)}%</p>
                  <p className="text-xs text-slate-500 mt-1">Status: {penaltySetting.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No penalty setting found. Add the initial record from the form.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'loan_lifecycle' && (
          <div className={`${shellCardClass} p-6 md:p-7 space-y-4`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Loan Hold / Close Control</h2>
                <p className="text-sm text-slate-600">
                  Hold loan: stop arrears and remove due dates temporarily. Close loan: permanently close in critical situations.
                </p>
              </div>
              <button
                type="button"
                onClick={loadAll}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={lifecycleSearch}
                onChange={(e) => setLifecycleSearch(e.target.value)}
                className={inputClass}
                placeholder="Search loan code, customer, officer"
              />
              <select
                value={lifecycleStatusFilter}
                onChange={(e) => setLifecycleStatusFilter(e.target.value as 'all' | 'requested' | 'approved' | 'released' | 'hold')}
                className={inputClass}
              >
                <option value="all">All Status</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="released">Released</option>
                <option value="hold">Hold</option>
              </select>
              <select
                value={lifecycleActionFilter}
                onChange={(e) => setLifecycleActionFilter(e.target.value as 'all' | 'can_hold' | 'can_close')}
                className={inputClass}
              >
                <option value="all">All Action Types</option>
                <option value="can_hold">Can Hold</option>
                <option value="can_close">Can Close</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
              <table className="min-w-full text-sm text-left text-slate-700">
                <thead className="bg-cyan-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Loan Code</th>
                    <th className="px-3 py-2 font-semibold">Customer No</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Field Officer</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Due Date</th>
                    <th className="px-3 py-2 font-semibold">Next Payment</th>
                    <th className="px-3 py-2 font-semibold">Arrears</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoanLifecycleRows.map((loan) => {
                    const status = String(loan.status || '').toLowerCase();

                    return (
                      <tr key={loan.id} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40">
                        <td className="px-3 py-2 font-semibold text-slate-900">{loan.loan_code || `LR-${loan.id}`}</td>
                        <td className="px-3 py-2">{loan.customer_no || '-'}</td>
                        <td className="px-3 py-2">{loan.customer_name || '-'}</td>
                        <td className="px-3 py-2">{loan.field_officer || '-'}</td>
                        <td className="px-3 py-2 capitalize">{status || '-'}</td>
                        <td className="px-3 py-2">{formatDate(loan.due_date)}</td>
                        <td className="px-3 py-2">{formatDate(loan.next_payment_date)}</td>
                        <td className="px-3 py-2">{getProjectedArrears(loan).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            {(status === 'approved' || status === 'released') && (
                              <button
                                type="button"
                                onClick={() => openLifecycleModal(loan, 'hold')}
                                className="text-xs px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-semibold"
                              >
                                Hold
                              </button>
                            )}
                            {status !== 'closed' && status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => openLifecycleModal(loan, 'close')}
                                className="text-xs px-2.5 py-1.5 bg-rose-100 text-rose-700 rounded-lg font-semibold"
                              >
                                Close Loan
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredLoanLifecycleRows.length && !lifecycleLoading && (
                    <tr>
                      <td className="px-3 py-5 text-center text-slate-500" colSpan={9}>
                        No loans match the selected filters.
                      </td>
                    </tr>
                  )}
                  {lifecycleLoading && (
                    <tr>
                      <td className="px-3 py-5 text-center text-slate-500" colSpan={9}>
                        Loading loans...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-cyan-100">
              <h3 className="text-lg font-bold text-slate-900">{modal.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{modal.message}</p>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 text-white text-sm font-semibold"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-cyan-100">
              <h3 className="text-lg font-bold text-slate-900">Confirm Delete</h3>
              <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this item?</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {lifecycleModal.open && lifecycleModal.loan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-cyan-100">
              <h3 className="text-lg font-bold text-slate-900">
                {lifecycleModal.action === 'hold' ? 'Put Loan On Hold' : 'Close Loan'}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Loan: {lifecycleModal.loan.loan_code || `LR-${lifecycleModal.loan.id}`} • Customer: {lifecycleModal.loan.customer_name || '-'}
              </p>
              <textarea
                className="mt-3 w-full rounded-xl border border-cyan-100 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                rows={4}
                value={lifecycleModal.reason}
                onChange={(e) => setLifecycleModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder={
                  lifecycleModal.action === 'hold'
                    ? 'Reason (e.g. customer accident / emergency)'
                    : 'Reason (e.g. customer death)'
                }
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={closeLifecycleModal}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={submitLifecycleAction}
                  disabled={lifecycleActionLoading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 text-white text-sm font-semibold disabled:opacity-70"
                >
                  {lifecycleActionLoading ? 'Saving...' : lifecycleModal.action === 'hold' ? 'Confirm Hold' : 'Confirm Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
