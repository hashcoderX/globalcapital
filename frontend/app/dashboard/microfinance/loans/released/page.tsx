'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type MFRoute = { id: number; name: string; code: string };
type MFCenter = { id: number; mf_route_id: number; name: string; code: string };
type MFGroup = { id: number; mf_route_id: number; mf_center_id: number; name: string; code: string };
type EmployeeOption = { id: number; name: string; designation: string };
type LoanGuarantor = {
  id?: number;
  name?: string;
  nic?: string;
  address?: string;
  contact_no?: string;
  relationship?: string;
};

type LoanRequest = {
  id: number;
  customer_no: string;
  customer_name: string;
  nick_name?: string | null;
  address?: string | null;
  contact_no?: string | null;
  reason?: string | null;
  loan_scope: 'route_loan' | 'center_loan' | 'direct_loan';
  loan_amount: string | number;
  refundable_amount: string | number;
  installment_amount: string | number;
  document_charges?: string | number;
  stamp_charges?: string | number;
  insurance_charges?: string | number;
  charge_payment_mode?: 'deduct_from_loan' | 'hand_cash';
  manager_name?: string;
  field_officer?: string;
  group_leader?: string;
  mf_route_id?: number | null;
  mf_center_id?: number | null;
  mf_group_id?: number | null;
  interest_type: 'flat' | 'reducing';
  interest_rate: string | number;
  terms_count: number;
  refund_option: 'day' | 'week' | 'month';
  status: string;
  route?: { id: number; name: string; code: string } | null;
  center?: { id: number; name: string; code: string } | null;
  group?: { id: number; name: string; code: string } | null;
  loan_request_date: string;
  next_payment_date?: string | null;
  due_date?: string | null;
  loan_end_date?: string | null;
  documents?: {
    id: number;
    document_type: string;
    file_path: string;
    original_name: string;
  }[];
  guarantors?: LoanGuarantor[];
};

const API_BASE = 'http://localhost:8000/api';

export default function ReleasedLoansPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [routes, setRoutes] = useState<MFRoute[]>([]);
  const [centers, setCenters] = useState<MFCenter[]>([]);
  const [groups, setGroups] = useState<MFGroup[]>([]);
  const [managers, setManagers] = useState<EmployeeOption[]>([]);
  const [fieldOfficers, setFieldOfficers] = useState<EmployeeOption[]>([]);
  const [modal, setModal] = useState({ open: false, title: '', message: '' });
  const [documentsModal, setDocumentsModal] = useState<{
    open: boolean;
    loanCode: string;
    customerName: string;
    documents: NonNullable<LoanRequest['documents']>;
  }>({
    open: false,
    loanCode: '',
    customerName: '',
    documents: [],
  });
  const [editModal, setEditModal] = useState<{
    open: boolean;
    loanId: number | null;
    loan_scope: 'route_loan' | 'center_loan' | 'direct_loan';
    mf_route_id: number;
    mf_center_id: number;
    mf_group_id: number;
    manager_name: string;
    field_officer: string;
    group_leader: string;
    customer_name: string;
    nick_name: string;
    address: string;
    contact_no: string;
    reason: string;
    loan_amount: string;
    refund_option: 'day' | 'week' | 'month';
    interest_type: 'flat' | 'reducing';
    interest_rate: string;
    terms_count: string;
    refundable_amount: string;
    installment_amount: string;
    document_charges: string;
    stamp_charges: string;
    insurance_charges: string;
    charge_payment_mode: 'deduct_from_loan' | 'hand_cash';
    loan_request_date: string;
    guarantors: Array<{ name: string; nic: string; address: string; contact_no: string; relationship: string }>;
  }>({
    open: false,
    loanId: null,
    loan_scope: 'center_loan',
    mf_route_id: 0,
    mf_center_id: 0,
    mf_group_id: 0,
    manager_name: '',
    field_officer: '',
    group_leader: '',
    customer_name: '',
    nick_name: '',
    address: '',
    contact_no: '',
    reason: '',
    loan_amount: '',
    refund_option: 'month',
    interest_type: 'flat',
    interest_rate: '',
    terms_count: '',
    refundable_amount: '',
    installment_amount: '',
    document_charges: '',
    stamp_charges: '',
    insurance_charges: '',
    charge_payment_mode: 'hand_cash',
    loan_request_date: '',
    guarantors: [{ name: '', nic: '', address: '', contact_no: '', relationship: '' }],
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [downloadingAgreementId, setDownloadingAgreementId] = useState<number | null>(null);
  const [downloadingReminderId, setDownloadingReminderId] = useState<number | null>(null);
  const [downloadingLegalId, setDownloadingLegalId] = useState<number | null>(null);
  const [editStep, setEditStep] = useState(1);

  const openModal = (message: string, title = 'Notice') => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal({ open: false, title: '', message: '' });
  };

  const openDocumentsModal = (loan: LoanRequest) => {
    const docs = Array.isArray(loan.documents) ? loan.documents : [];

    if (docs.length === 0) {
      openModal('No documents uploaded for this loan yet.', 'Loan Documents');
      return;
    }

    setDocumentsModal({
      open: true,
      loanCode: loan.customer_no,
      customerName: loan.customer_name,
      documents: docs,
    });
  };

  const closeDocumentsModal = () => {
    setDocumentsModal({ open: false, loanCode: '', customerName: '', documents: [] });
  };

  const openEditModal = (loan: LoanRequest) => {
    setEditModal({
      open: true,
      loanId: loan.id,
      loan_scope: loan.loan_scope || 'center_loan',
      mf_route_id: Number(loan.route?.id || loan.mf_route_id || 0),
      mf_center_id: Number(loan.center?.id || loan.mf_center_id || 0),
      mf_group_id: Number(loan.group?.id || loan.mf_group_id || 0),
      manager_name: String(loan.manager_name || ''),
      field_officer: String(loan.field_officer || ''),
      group_leader: String(loan.group_leader || ''),
      customer_name: String(loan.customer_name || ''),
      nick_name: String(loan.nick_name || ''),
      address: String(loan.address || ''),
      contact_no: String(loan.contact_no || ''),
      reason: String(loan.reason || ''),
      loan_amount: String(loan.loan_amount || ''),
      refund_option: loan.refund_option || 'month',
      interest_type: loan.interest_type || 'flat',
      interest_rate: String(loan.interest_rate || ''),
      terms_count: String(loan.terms_count || ''),
      refundable_amount: String(loan.refundable_amount || ''),
      installment_amount: String(loan.installment_amount || ''),
      document_charges: String(loan.document_charges || ''),
      stamp_charges: String(loan.stamp_charges || ''),
      insurance_charges: String(loan.insurance_charges || ''),
      charge_payment_mode: loan.charge_payment_mode || 'hand_cash',
      loan_request_date: String(loan.loan_request_date || '').slice(0, 10),
      guarantors: Array.isArray(loan.guarantors) && loan.guarantors.length > 0
        ? loan.guarantors.map((g) => ({
            name: String(g.name || ''),
            nic: String(g.nic || ''),
            address: String(g.address || ''),
            contact_no: String(g.contact_no || ''),
            relationship: String(g.relationship || ''),
          }))
        : [{ name: '', nic: '', address: '', contact_no: '', relationship: '' }],
    });
    setEditStep(1);
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditModal((prev) => ({ ...prev, open: false, loanId: null }));
  };

  const updateEditField = (field: keyof typeof editModal, value: string) => {
    setEditModal((prev) => ({ ...prev, [field]: value }));
  };

  const saveLoanEdit = async () => {
    if (!editModal.loanId) return;

    try {
      setSavingEdit(true);
      const payload = {
        loan_scope: editModal.loan_scope,
        mf_route_id: editModal.loan_scope === 'direct_loan' ? null : (editModal.mf_route_id || null),
        mf_center_id: editModal.loan_scope === 'center_loan' ? (editModal.mf_center_id || null) : null,
        mf_group_id: editModal.loan_scope === 'center_loan' ? (editModal.mf_group_id || null) : null,
        manager_name: editModal.manager_name,
        field_officer: editModal.field_officer,
        group_leader: editModal.group_leader || null,
        customer_name: editModal.customer_name,
        nick_name: editModal.nick_name || null,
        address: editModal.address,
        contact_no: editModal.contact_no,
        reason: editModal.reason || null,
        loan_amount: Number(editModal.loan_amount || 0),
        refund_option: editModal.refund_option,
        interest_type: editModal.interest_type,
        interest_rate: Number(editModal.interest_rate || 0),
        terms_count: Number(editModal.terms_count || 0),
        refundable_amount: Number(editModal.refundable_amount || 0),
        installment_amount: Number(editModal.installment_amount || 0),
        document_charges: Number(editModal.document_charges || 0),
        stamp_charges: Number(editModal.stamp_charges || 0),
        insurance_charges: Number(editModal.insurance_charges || 0),
        charge_payment_mode: editModal.charge_payment_mode,
        loan_request_date: editModal.loan_request_date || null,
        guarantors: editModal.guarantors.filter((g) => g.name.trim() !== ''),
      };

      const response = await axios.put(
        `${API_BASE}/microfinance/loan-requests/${editModal.loanId}`,
        payload,
        { headers }
      );

      const updated = (response.data?.data ?? response.data) as LoanRequest;
      setLoans((prev) => prev.map((loan) => (loan.id === updated.id ? { ...loan, ...updated } : loan)));
      setEditModal((prev) => ({ ...prev, open: false, loanId: null }));
      openModal('Loan details updated successfully.', 'Success');
    } catch {
      openModal('Failed to update loan details. Please check required fields.', 'Error');
    } finally {
      setSavingEdit(false);
    }
  };

  const updateGuarantor = (index: number, field: 'name' | 'nic' | 'address' | 'contact_no' | 'relationship', value: string) => {
    setEditModal((prev) => ({
      ...prev,
      guarantors: prev.guarantors.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    }));
  };

  const addGuarantorRow = () => {
    setEditModal((prev) => ({
      ...prev,
      guarantors: [...prev.guarantors, { name: '', nic: '', address: '', contact_no: '', relationship: '' }],
    }));
  };

  const removeGuarantorRow = (index: number) => {
    setEditModal((prev) => ({
      ...prev,
      guarantors: prev.guarantors.filter((_, i) => i !== index),
    }));
  };

  const buildDocumentUrl = (filePath: string) => {
    const normalizedPath = (filePath || '').replace(/^public\//, '');
    return `http://localhost:8000/storage/${normalizedPath}`;
  };

  const handleDownloadAgreement = async (loanId: number, customerNo: string) => {
    if (!token) return;

    setDownloadingAgreementId(loanId);
    try {
      const response = await axios.get(
        `${API_BASE}/microfinance/loan-requests/${loanId}/download-agreement`,
        {
          headers,
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const serverFileName = decodeURIComponent(fileNameMatch?.[1] || fileNameMatch?.[2] || '');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = serverFileName || `loan_agreement_${customerNo || loanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      openModal('Agreement downloaded successfully.', 'Success');
    } catch (error: any) {
      let message = 'Failed to download agreement.';
      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          // Keep default message.
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      openModal(message, 'Error');
    } finally {
      setDownloadingAgreementId(null);
    }
  };

  const handleDownloadReminderLetter = async (loanId: number, customerNo: string) => {
    if (!token) return;

    setDownloadingReminderId(loanId);
    try {
      const response = await axios.get(
        `${API_BASE}/microfinance/loan-requests/${loanId}/download-reminder-letter`,
        {
          headers,
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const serverFileName = decodeURIComponent(fileNameMatch?.[1] || fileNameMatch?.[2] || '');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = serverFileName || `reminder_letter_${customerNo || loanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      openModal('Reminder letter downloaded successfully.', 'Success');
    } catch (error: any) {
      let message = 'Failed to download reminder letter.';
      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          // Keep default message.
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      openModal(message, 'Error');
    } finally {
      setDownloadingReminderId(null);
    }
  };

  const handleDownloadLegalLetter = async (loanId: number, customerNo: string) => {
    if (!token) return;

    setDownloadingLegalId(loanId);
    try {
      const response = await axios.get(
        `${API_BASE}/microfinance/loan-requests/${loanId}/download-legal-letter`,
        {
          headers,
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const serverFileName = decodeURIComponent(fileNameMatch?.[1] || fileNameMatch?.[2] || '');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = serverFileName || `legal_letter_${customerNo || loanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      openModal('Legal letter downloaded successfully.', 'Success');
    } catch (error: any) {
      let message = 'Failed to download legal letter.';
      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          // Keep default message.
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      openModal(message, 'Error');
    } finally {
      setDownloadingLegalId(null);
    }
  };

  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [centerFilter, setCenterFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

    const loadApprovedLoans = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE}/microfinance/loan-requests`, {
          headers,
          params: { status: 'approved' },
        });
        setLoans(Array.isArray(response.data) ? response.data : []);
      } catch {
        openModal('Failed to load approved loans.', 'Error');
      } finally {
        setLoading(false);
      }
    };

    loadApprovedLoans();
  }, [token, headers]);

  useEffect(() => {
    if (!token) return;

    const loadMasterData = async () => {
      try {
        const [routeRes, centerRes, groupRes, employeeRes] = await Promise.all([
          axios.get(`${API_BASE}/microfinance/settings/routes`, { headers }),
          axios.get(`${API_BASE}/microfinance/settings/centers`, { headers }),
          axios.get(`${API_BASE}/microfinance/settings/groups`, { headers }),
          axios.get(`${API_BASE}/hr/employees`, { headers }),
        ]);

        setRoutes(Array.isArray(routeRes.data) ? routeRes.data : []);
        setCenters(Array.isArray(centerRes.data) ? centerRes.data : []);
        setGroups(Array.isArray(groupRes.data) ? groupRes.data : []);

        const employeeRows = Array.isArray(employeeRes.data?.data) ? employeeRes.data.data : [];
        const mapped: EmployeeOption[] = employeeRows
          .map((emp: any) => ({
            id: Number(emp?.id || 0),
            name: `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || emp?.email || '',
            designation: String(emp?.designation?.name || ''),
          }))
          .filter((emp: EmployeeOption) => emp.id > 0 && emp.name);

        const managerOnly = mapped.filter((emp) => /manager/i.test(emp.designation));
        const officerOnly = mapped.filter((emp) => /officer/i.test(emp.designation));

        setManagers(managerOnly.length > 0 ? managerOnly : mapped);
        setFieldOfficers(officerOnly.length > 0 ? officerOnly : mapped);
      } catch {
        // keep fallbacks empty
      }
    };

    loadMasterData();
  }, [token, headers]);

  const routeOptions = useMemo(() => {
    const routeMap = new Map<number, string>();
    loans.forEach((loan) => {
      if (loan.route?.id && loan.route?.name) {
        routeMap.set(loan.route.id, loan.route.name);
      }
    });
    return Array.from(routeMap.entries()).map(([id, name]) => ({ id, name }));
  }, [loans]);

  const centerOptions = useMemo(() => {
    const centerMap = new Map<number, { id: number; name: string; routeId: number | null }>();
    loans.forEach((loan) => {
      if (loan.center?.id && loan.center?.name) {
        centerMap.set(loan.center.id, {
          id: loan.center.id,
          name: loan.center.name,
          routeId: loan.route?.id ?? null,
        });
      }
    });

    const selectedRouteId = routeFilter === 'all' ? null : Number(routeFilter);
    return Array.from(centerMap.values()).filter((center) => {
      if (!selectedRouteId) return true;
      return center.routeId === selectedRouteId;
    });
  }, [loans, routeFilter]);

  const editSteps = [
    { id: 1, label: 'Location' },
    { id: 2, label: 'Team' },
    { id: 3, label: 'Customer' },
    { id: 4, label: 'Guarantors' },
    { id: 5, label: 'Loan Details' },
  ] as const;

  const editFilteredCenters = useMemo(
    () => centers.filter((c) => c.mf_route_id === editModal.mf_route_id),
    [centers, editModal.mf_route_id]
  );
  const editFilteredGroups = useMemo(
    () => groups.filter((g) => g.mf_route_id === editModal.mf_route_id && g.mf_center_id === editModal.mf_center_id),
    [groups, editModal.mf_route_id, editModal.mf_center_id]
  );

  useEffect(() => {
    if (!editModal.open) return;

    const amount = Number(editModal.loan_amount || 0);
    const rate = Number(editModal.interest_rate || 0);
    const termCount = Number(editModal.terms_count || 0);

    let monthsEquivalent = termCount;
    if (editModal.refund_option === 'week') {
      monthsEquivalent = termCount / 4;
    } else if (editModal.refund_option === 'day') {
      monthsEquivalent = termCount / 26;
    }

    const monthlyRate = rate / 100;
    let refundable = 0;
    let installment = 0;

    if (editModal.interest_type === 'reducing') {
      const periodsPerMonth = editModal.refund_option === 'day' ? 26 : editModal.refund_option === 'week' ? 4 : 1;
      const periodicRate = monthlyRate / periodsPerMonth;

      if (termCount > 0) {
        if (periodicRate > 0) {
          const factor = Math.pow(1 + periodicRate, termCount);
          installment = (amount * periodicRate * factor) / (factor - 1);
        } else {
          installment = amount / termCount;
        }
        refundable = installment * termCount;
      }
    } else {
      refundable = amount + amount * monthlyRate * monthsEquivalent;
      installment = termCount > 0 ? refundable / termCount : 0;
    }

    setEditModal((prev) => ({
      ...prev,
      refundable_amount: refundable ? refundable.toFixed(2) : '',
      installment_amount: installment ? installment.toFixed(2) : '',
    }));
  }, [editModal.open, editModal.loan_amount, editModal.interest_rate, editModal.terms_count, editModal.refund_option, editModal.interest_type]);

  const filteredLoans = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const selectedRouteId = routeFilter === 'all' ? null : Number(routeFilter);
    const selectedCenterId = centerFilter === 'all' ? null : Number(centerFilter);

    return loans.filter((loan) => {
      if (scopeFilter !== 'all' && loan.loan_scope !== scopeFilter) return false;
      if (selectedRouteId && loan.route?.id !== selectedRouteId) return false;
      if (selectedCenterId && loan.center?.id !== selectedCenterId) return false;

      if (fromDate && loan.loan_request_date < fromDate) return false;
      if (toDate && loan.loan_request_date > toDate) return false;

      if (keyword) {
        const haystack = [
          loan.customer_no,
          loan.customer_name,
          loan.route?.name || '',
          loan.center?.name || '',
          loan.group?.name || '',
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(keyword)) return false;
      }

      return true;
    });
  }, [loans, query, scopeFilter, routeFilter, centerFilter, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, scopeFilter, routeFilter, centerFilter, fromDate, toDate, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedLoans = filteredLoans.slice(startIndex, startIndex + pageSize);

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Approved Loans</h1>
            <p className="text-sm text-gray-600 mt-1">View all approved loan records and filter quickly.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/microfinance/loans')}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
          >
            Back
          </button>
        </div>

        <div className="bg-white/90 rounded-2xl shadow-lg border border-cyan-100 p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 text-black">
          <input
            className="px-3 py-2 rounded-lg border border-cyan-100 text-sm text-black"
            placeholder="Search customer / no"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm text-black" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
            <option value="all">All Scopes</option>
            <option value="center_loan">Center Loan</option>
            <option value="route_loan">Route Loan</option>
            <option value="direct_loan">Direct Loan</option>
          </select>
          <select
            className="px-3 py-2 rounded-lg border border-cyan-100 text-sm text-black"
            value={routeFilter}
            onChange={(e) => {
              setRouteFilter(e.target.value);
              setCenterFilter('all');
            }}
          >
            <option value="all">All Routes</option>
            {routeOptions.map((route) => (
              <option key={route.id} value={route.id}>{route.name}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded-lg border border-cyan-100 text-sm text-black"
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
          >
            <option value="all">All Centers</option>
            {centerOptions.map((center) => (
              <option key={center.id} value={center.id}>{center.name}</option>
            ))}
          </select>
          <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm text-black" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm text-black" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing {filteredLoans.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, filteredLoans.length)} of {filteredLoans.length}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows:</label>
            <select
              className="px-2 py-1 rounded-md border border-cyan-100 text-sm text-black"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-600">
            No approved loans found for selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedLoans.map((loan) => (
              <div key={loan.id} className="bg-white/90 rounded-2xl shadow-lg border border-cyan-100 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">{loan.customer_name}</h2>
                    <p className="text-sm text-gray-600">Loan Code: {loan.customer_no}</p>
                    <p className="text-sm text-gray-600">
                      Scope: {loan.loan_scope === 'center_loan' ? 'Center Loan' : loan.loan_scope === 'route_loan' ? 'Route Loan' : 'Direct Loan'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Route: {loan.route?.name || '-'} | Center: {loan.center?.name || '-'} | Group: {loan.group?.name || '-'}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="mb-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadAgreement(loan.id, loan.customer_no)}
                        disabled={downloadingAgreementId === loan.id}
                        className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {downloadingAgreementId === loan.id ? 'Downloading...' : 'Download Agreement'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadReminderLetter(loan.id, loan.customer_no)}
                        disabled={downloadingReminderId === loan.id}
                        className="px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {downloadingReminderId === loan.id ? 'Downloading...' : 'Reminder Letter'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadLegalLetter(loan.id, loan.customer_no)}
                        disabled={downloadingLegalId === loan.id}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {downloadingLegalId === loan.id ? 'Downloading...' : 'Legal Letter'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(loan)}
                        className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold"
                      >
                        Edit Loan
                      </button>
                      <button
                        type="button"
                        onClick={() => openDocumentsModal(loan)}
                        className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-semibold"
                      >
                        View Documents ({Array.isArray(loan.documents) ? loan.documents.length : 0})
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">Loan Amount</p>
                    <p className="text-xl font-extrabold text-cyan-700">{Number(loan.loan_amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {loan.interest_type} | {Number(loan.interest_rate || 0)}% | {loan.terms_count} {loan.refund_option}(s)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-4">
                  <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Refundable</p>
                    <p className="text-sm font-bold text-gray-900">{Number(loan.refundable_amount || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Installment</p>
                    <p className="text-sm font-bold text-gray-900">{Number(loan.installment_amount || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Next Payment Date</p>
                    <p className="text-sm font-bold text-gray-900">{loan.next_payment_date || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Due Date</p>
                    <p className="text-sm font-bold text-gray-900">{loan.due_date || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Loan End Date</p>
                    <p className="text-sm font-bold text-gray-900">{loan.loan_end_date || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Approved Status</p>
                    <p className="text-sm font-bold text-emerald-700 capitalize">{loan.status}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg border border-cyan-100 bg-white text-sm text-gray-700 disabled:opacity-50"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((page, idx, arr) => {
                  const prevPage = idx > 0 ? arr[idx - 1] : null;
                  const showGap = prevPage !== null && page - prevPage > 1;

                  return (
                    <div key={page} className="flex items-center gap-2">
                      {showGap && <span className="text-sm text-gray-500">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          safePage === page
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                            : 'border border-cyan-100 bg-white text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-cyan-100 bg-white text-sm text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
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
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {editModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl border border-cyan-100 max-h-[90vh] overflow-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Loan Details</h3>
                  <p className="text-sm text-slate-600 mt-1">Step based full editor, same style as Request Loan.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {editSteps.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setEditStep(step.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${editStep === step.id ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-700 border-cyan-100'}`}
                  >
                    {step.id}. {step.label}
                  </button>
                ))}
              </div>

              {editStep === 1 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-black">
                  <select
                    className="px-3 py-2 rounded-lg border border-cyan-100 text-sm"
                    value={editModal.loan_scope}
                    onChange={(e) => {
                      const nextScope = e.target.value as 'route_loan' | 'center_loan' | 'direct_loan';
                      setEditModal((prev) => ({
                        ...prev,
                        loan_scope: nextScope,
                        mf_route_id: 0,
                        mf_center_id: 0,
                        mf_group_id: 0,
                      }));
                    }}
                  >
                    <option value="center_loan">Center Loan</option>
                    <option value="route_loan">Route Loan</option>
                    <option value="direct_loan">Direct Loan</option>
                  </select>

                  {editModal.loan_scope !== 'direct_loan' && (
                    <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" value={editModal.mf_route_id} onChange={(e) => setEditModal((prev) => ({ ...prev, mf_route_id: Number(e.target.value), mf_center_id: 0, mf_group_id: 0 }))}>
                      <option value={0}>Select Route</option>
                      {routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                    </select>
                  )}

                  {editModal.loan_scope === 'center_loan' && (
                    <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" value={editModal.mf_center_id} onChange={(e) => setEditModal((prev) => ({ ...prev, mf_center_id: Number(e.target.value), mf_group_id: 0 }))}>
                      <option value={0}>Select Center</option>
                      {editFilteredCenters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                    </select>
                  )}

                  {editModal.loan_scope === 'center_loan' && (
                    <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" value={editModal.mf_group_id} onChange={(e) => setEditModal((prev) => ({ ...prev, mf_group_id: Number(e.target.value) }))}>
                      <option value={0}>Select Group</option>
                      {editFilteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
                    </select>
                  )}
                </div>
              )}

              {editStep === 2 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-black">
                  <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" value={editModal.manager_name} onChange={(e) => updateEditField('manager_name', e.target.value)}>
                    <option value="">Select Manager</option>
                    {managers.map((m) => <option key={m.id} value={m.name}>{m.name}{m.designation ? ` (${m.designation})` : ''}</option>)}
                  </select>
                  <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" value={editModal.field_officer} onChange={(e) => updateEditField('field_officer', e.target.value)}>
                    <option value="">Select Field Officer</option>
                    {fieldOfficers.map((o) => <option key={o.id} value={o.name}>{o.name}{o.designation ? ` (${o.designation})` : ''}</option>)}
                  </select>
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Group Leader" value={editModal.group_leader} onChange={(e) => updateEditField('group_leader', e.target.value)} />
                </div>
              )}

              {editStep === 3 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-black">
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Customer Name" value={editModal.customer_name} onChange={(e) => updateEditField('customer_name', e.target.value)} />
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Nick Name" value={editModal.nick_name} onChange={(e) => updateEditField('nick_name', e.target.value)} />
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Contact No" value={editModal.contact_no} onChange={(e) => updateEditField('contact_no', e.target.value)} />
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" type="date" value={editModal.loan_request_date} onChange={(e) => updateEditField('loan_request_date', e.target.value)} />
                  <input className="md:col-span-2 px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Address" value={editModal.address} onChange={(e) => updateEditField('address', e.target.value)} />
                  <input className="md:col-span-2 px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Reason" value={editModal.reason} onChange={(e) => updateEditField('reason', e.target.value)} />
                </div>
              )}

              {editStep === 4 && (
                <div className="mt-4 space-y-3 text-black">
                  <div className="flex justify-end">
                    <button type="button" onClick={addGuarantorRow} className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold">+ Add Guarantor</button>
                  </div>
                  {editModal.guarantors.map((g, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-lg border border-cyan-100 p-3">
                      <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Name" value={g.name} onChange={(e) => updateGuarantor(index, 'name', e.target.value)} />
                      <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="NIC" value={g.nic} onChange={(e) => updateGuarantor(index, 'nic', e.target.value)} />
                      <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Contact" value={g.contact_no} onChange={(e) => updateGuarantor(index, 'contact_no', e.target.value)} />
                      <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Relationship" value={g.relationship} onChange={(e) => updateGuarantor(index, 'relationship', e.target.value)} />
                      <div className="flex gap-2">
                        <input className="w-full px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Address" value={g.address} onChange={(e) => updateGuarantor(index, 'address', e.target.value)} />
                        {editModal.guarantors.length > 1 && (
                          <button type="button" onClick={() => removeGuarantorRow(index)} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editStep === 5 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-black">
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Loan Amount" type="number" min="0" value={editModal.loan_amount} onChange={(e) => updateEditField('loan_amount', e.target.value)} />
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Interest Rate" type="number" min="0" step="0.01" value={editModal.interest_rate} onChange={(e) => updateEditField('interest_rate', e.target.value)} />
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Terms Count" type="number" min="1" value={editModal.terms_count} onChange={(e) => updateEditField('terms_count', e.target.value)} />
                  <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" value={editModal.refund_option} onChange={(e) => updateEditField('refund_option', e.target.value)}>
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                  <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" value={editModal.interest_type} onChange={(e) => updateEditField('interest_type', e.target.value)}>
                    <option value="flat">Flat</option>
                    <option value="reducing">Reducing</option>
                  </select>
                  <select className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" value={editModal.charge_payment_mode} onChange={(e) => updateEditField('charge_payment_mode', e.target.value)}>
                    <option value="deduct_from_loan">Deduct from loan</option>
                    <option value="hand_cash">Hand cash</option>
                  </select>

                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm bg-slate-50" placeholder="Refundable Amount" value={editModal.refundable_amount} readOnly />
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm bg-slate-50" placeholder="Installment Amount" value={editModal.installment_amount} readOnly />
                  <div className="px-3 py-2 rounded-lg border border-cyan-100 text-sm bg-slate-50">
                    Net Disbursed: {(
                      editModal.charge_payment_mode === 'deduct_from_loan'
                        ? Math.max(
                          Number(editModal.loan_amount || 0)
                            - Number(editModal.document_charges || 0)
                            - Number(editModal.stamp_charges || 0)
                            - Number(editModal.insurance_charges || 0),
                          0
                        )
                        : Number(editModal.loan_amount || 0)
                    ).toFixed(2)}
                  </div>

                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Document Charges" type="number" min="0" step="0.01" value={editModal.document_charges} onChange={(e) => updateEditField('document_charges', e.target.value)} />
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Stamp Charges" type="number" min="0" step="0.01" value={editModal.stamp_charges} onChange={(e) => updateEditField('stamp_charges', e.target.value)} />
                  <input className="px-3 py-2 rounded-lg border border-cyan-100 text-sm" placeholder="Insurance Charges" type="number" min="0" step="0.01" value={editModal.insurance_charges} onChange={(e) => updateEditField('insurance_charges', e.target.value)} />
                </div>
              )}

              <div className="mt-5 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setEditStep((prev) => Math.max(prev - 1, 1))}
                  disabled={editStep === 1}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold disabled:opacity-50"
                >
                  Back Step
                </button>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                {editStep < editSteps.length ? (
                  <button
                    type="button"
                    onClick={() => setEditStep((prev) => Math.min(prev + 1, editSteps.length))}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveLoanEdit}
                    disabled={savingEdit}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        )}

        {documentsModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl border border-cyan-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Loan Documents</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {documentsModal.customerName} | Loan Code: {documentsModal.loanCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDocumentsModal}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 max-h-[60vh] overflow-auto space-y-2">
                {documentsModal.documents.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-100 bg-cyan-50/60 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{doc.document_type}</p>
                      <p className="text-xs text-slate-500 break-all">{doc.original_name || doc.file_path}</p>
                    </div>
                    <a
                      href={buildDocumentUrl(doc.file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold"
                    >
                      Open
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
