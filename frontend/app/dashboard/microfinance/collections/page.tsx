'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoanRow = {
  id: number;
  branch_id?: number | string | null;
  field_officer?: string | null;
  field_officer_id?: number | string | null;
  loan_code?: string | null;
  customer_no: string;
  customer_code?: string | null;
  customer_name: string;
  loan_scope: 'route_loan' | 'center_loan' | 'direct_loan';
  mf_route_id?: number | string | null;
  route_name?: string | null;
  route_code?: string | null;
  route?: { id: number; name: string; code: string } | null;
  center?: { id: number; name: string; code: string } | null;
  group?: { id: number; name: string; code: string } | null;
  loan_amount?: number | string;
  installment_amount: number | string;
  refundable_amount: number | string;
  penalty_rate?: number | string | null;
  penalty_grace_days?: number | string | null;
  due_date?: string | null;
  next_payment_date?: string | null;
  refund_option?: 'day' | 'week' | 'month' | string;
  arrears_balance?: number | string;
  status: string;
};

type CollectionRow = {
  id?: number;
  mf_loan_request_id: number;
  collected_amount: number | string;
  collection_date?: string;
};

type AuthUser = {
  id: number;
  name?: string;
  email?: string;
  branch_id?: number | null;
  designation?: { id: number; name: string } | null;
  employee?: { id: number; first_name?: string; last_name?: string; email?: string } | null;
};

const API_BASE = 'http://localhost:8000/api';

export default function CollectionManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [activeMode, setActiveMode] = useState<'center' | 'route' | 'office' | 'today' | 'next'>('center');
  const [finderCustomerNo, setFinderCustomerNo] = useState('');
  const [officeView, setOfficeView] = useState<'all' | 'today_debt' | 'date_debt'>('all');
  const [debtTargetDate, setDebtTargetDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [query, setQuery] = useState('');
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [collectModal, setCollectModal] = useState<{
    open: boolean;
    loanId: number | null;
    loanCode: string;
    customerName: string;
    amount: string;
    paymentType: 'cash' | 'check' | 'bank_transfer';
    paymentReference: string;
    installmentAmount: number;
    dueDate: string;
    penaltyRate: number;
    graceDays: number;
    note: string;
    date: string;
  }>({
    open: false,
    loanId: null,
    loanCode: '',
    customerName: '',
    amount: '',
    paymentType: 'cash',
    paymentReference: '',
    installmentAmount: 0,
    dueDate: '',
    penaltyRate: 0,
    graceDays: 0,
    note: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [collectSaving, setCollectSaving] = useState(false);
  const [noticeModal, setNoticeModal] = useState({ open: false, title: '', message: '' });
  const [loanDetailsModal, setLoanDetailsModal] = useState<{ open: boolean; loan: LoanRow | null }>({
    open: false,
    loan: null,
  });

  const designationName = String(authUser?.designation?.name || '').toLowerCase();
  const isFieldOfficer = designationName.includes('field') && designationName.includes('officer');
  const isAdmin =
    designationName.includes('admin') || String(authUser?.email || '').toLowerCase() === 'superadmin@softcodelk.com';

  const officerNameCandidates = useMemo(() => {
    const fullName = [authUser?.employee?.first_name || '', authUser?.employee?.last_name || '']
      .join(' ')
      .trim();

    return [authUser?.name, fullName, authUser?.email, authUser?.employee?.email]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter((value, index, arr) => value !== '' && arr.indexOf(value) === index);
  }, [authUser]);

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

    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setAuthUser(JSON.parse(storedUser));
      } catch {
        setAuthUser(null);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadLoans = async () => {
      setLoading(true);
      try {
        const [loanResponse, collectionResponse] = await Promise.all([
          axios.get(`${API_BASE}/microfinance/loan-requests`, {
            headers,
            params:
              isFieldOfficer && authUser?.branch_id
                ? {
                    status: 'approved',
                    branch_id: authUser.branch_id,
                    field_officer: authUser?.name || undefined,
                  }
                : { status: 'approved' },
          }),
          axios.get(`${API_BASE}/microfinance/collections`, {
            headers,
          }),
        ]);

        setLoans(Array.isArray(loanResponse.data) ? loanResponse.data : []);
        setCollections(Array.isArray(collectionResponse.data) ? collectionResponse.data : []);
      } catch {
        setLoans([]);
        setCollections([]);
      } finally {
        setLoading(false);
      }
    };

    loadLoans();
  }, [token, headers, isFieldOfficer, authUser?.branch_id, authUser?.name]);

  const scopedLoans = useMemo(() => {
    if (!isFieldOfficer) return loans;

    const branchId = Number(authUser?.branch_id || 0);
    const authOfficerId = Number(authUser?.employee?.id || 0);

    return loans.filter((loan) => {
      const loanBranchId = Number(loan.branch_id || 0);
      const loanOfficer = String(loan.field_officer || '').trim().toLowerCase();
      const loanOfficerId = Number(loan.field_officer_id || 0);

      const isBranchMatch = branchId > 0 ? loanBranchId === branchId : true;
      const isOfficerIdMatch = authOfficerId > 0 && loanOfficerId > 0 ? loanOfficerId === authOfficerId : false;
      const isOfficerNameMatch = loanOfficer !== '' ? officerNameCandidates.includes(loanOfficer) : false;
      const isOfficerMatch = isOfficerIdMatch || isOfficerNameMatch;

      return isBranchMatch && isOfficerMatch;
    });
  }, [loans, isFieldOfficer, authUser?.branch_id, authUser?.employee?.id, officerNameCandidates]);

  const paidTotalByLoan = useMemo(() => {
    const map = new Map<number, number>();

    collections.forEach((row) => {
      const loanId = Number(row.mf_loan_request_id || 0);
      if (!loanId) return;

      const amount = Number(row.collected_amount || 0);
      map.set(loanId, (map.get(loanId) || 0) + amount);
    });

    return map;
  }, [collections]);

  const getPaidTotal = (loanId: number) => paidTotalByLoan.get(loanId) || 0;
  const getOutstandingBalance = (loan: LoanRow) => {
    const totalPayable = Number(loan.refundable_amount || 0);
    const paidTotal = getPaidTotal(loan.id);
    return Math.max(totalPayable - paidTotal, 0);
  };

  const shiftDateByRefundOption = (date: Date, refundOption: string) => {
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

  const getProjectedArrearsBalance = (loan: LoanRow) => {
    let balance = Number(loan.arrears_balance || 0);
    const installmentAmount = Number(loan.installment_amount || 0);
    if (installmentAmount <= 0 || !loan.due_date) return balance;

    let dueCursor = new Date(`${loan.due_date}T00:00:00`);
    if (Number.isNaN(dueCursor.getTime())) return balance;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mode = String(loan.refund_option || 'month');

    while (dueCursor <= today) {
      balance += installmentAmount;
      dueCursor = shiftDateByRefundOption(dueCursor, mode);
    }

    return balance;
  };

  const getExtraPayment = (loan: LoanRow) => {
    const projectedBalance = getProjectedArrearsBalance(loan);
    return Math.max(-projectedBalance, 0);
  };

  const getArrearsAmount = (loan: LoanRow) => {
    const projectedBalance = getProjectedArrearsBalance(loan);
    return Math.max(projectedBalance, 0);
  };

  const formatDateDisplay = (value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';

    const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
    const parts = datePart.split('-');

    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);

      if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
        const parsed = new Date(year, month - 1, day);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        }
      }
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;

    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isLoanCodeText = (value: string) => /^(RL-|CL-|DL-)/i.test(value.trim());

  const getFinderLoanCode = (loan: LoanRow) => {
    const loanCodeField = String(loan.loan_code || '').trim();
    const customerNoField = String(loan.customer_no || '').trim();
    const customerCodeField = String(loan.customer_code || '').trim();

    if (loanCodeField) return loanCodeField;
    if (isLoanCodeText(customerNoField)) return customerNoField;
    if (isLoanCodeText(customerCodeField)) return customerCodeField;

    return `LR-${loan.id}`;
  };

  const getFinderCustomerNo = (loan: LoanRow) => {
    const customerNoField = String(loan.customer_no || '').trim();
    const customerCodeField = String(loan.customer_code || '').trim();

    if (customerNoField && !isLoanCodeText(customerNoField)) return customerNoField;
    if (customerCodeField && !isLoanCodeText(customerCodeField)) return customerCodeField;

    return customerCodeField || customerNoField || '-';
  };

  const scopeType = activeMode === 'center' ? 'center_loan' : activeMode === 'route' ? 'route_loan' : null;

  const commonFinderResults = useMemo(() => {
    const keyword = finderCustomerNo.trim().toLowerCase();
    if (!keyword) return [] as LoanRow[];

    return scopedLoans
      .filter((loan) => {
        const customerNo = String(loan.customer_no || '').toLowerCase();
        const customerCode = String(loan.customer_code || '').toLowerCase();
        return customerNo.includes(keyword) || customerCode.includes(keyword);
      })
      .sort((a, b) => String(a.customer_no || '').localeCompare(String(b.customer_no || '')))
      .slice(0, 20);
  }, [finderCustomerNo, scopedLoans]);

  const filteredLoans = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return scopedLoans.filter((loan) => {
      if (scopeType && loan.loan_scope !== scopeType) return false;
      if (!keyword) return true;

      const haystack = [
        loan.customer_no || '',
        loan.customer_name || '',
        loan.route?.name || loan.route_name || '',
        loan.center?.name || '',
        loan.group?.name || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [scopedLoans, query, scopeType]);

  const routeCollections = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const routeMap = new Map<
      number,
      {
        routeId: number;
        routeName: string;
        routeCode: string;
        loanCount: number;
        totalInstallment: number;
        nextDueDate: string | null;
      }
    >();

    const getRouteMeta = (loan: LoanRow) => {
      const routeId = Number(loan.route?.id ?? loan.mf_route_id ?? 0);
      const routeName = loan.route?.name || loan.route_name || (routeId ? `Route ${routeId}` : '-');
      const routeCode = loan.route?.code || loan.route_code || (routeId ? `R${String(routeId).padStart(3, '0')}` : '-');
      return { routeId, routeName, routeCode };
    };

    scopedLoans
      .filter((loan) => {
        if (loan.loan_scope !== 'route_loan') return false;
        const routeId = Number(loan.route?.id ?? loan.mf_route_id ?? 0);
        return routeId > 0;
      })
      .forEach((loan) => {
        const { routeId, routeName, routeCode } = getRouteMeta(loan);
        const existing = routeMap.get(routeId) || {
          routeId,
          routeName,
          routeCode,
          loanCount: 0,
          totalInstallment: 0,
          nextDueDate: null,
        };

        existing.loanCount += 1;
        existing.totalInstallment += Number(loan.installment_amount || 0);

        if (loan.due_date) {
          if (!existing.nextDueDate || loan.due_date < existing.nextDueDate) {
            existing.nextDueDate = loan.due_date;
          }
        }

        routeMap.set(routeId, existing);
      });

    const rows = Array.from(routeMap.values());

    if (!keyword) {
      return rows.sort((a, b) => a.routeName.localeCompare(b.routeName));
    }

    return rows
      .filter((row) => [row.routeName, row.routeCode].join(' ').toLowerCase().includes(keyword))
      .sort((a, b) => a.routeName.localeCompare(b.routeName));
  }, [scopedLoans, query]);

  const centerCollections = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const centerMap = new Map<
      number,
      {
        centerId: number;
        centerName: string;
        centerCode: string;
        routeName: string;
        routeCode: string;
        loanCount: number;
        totalInstallment: number;
        nextDueDate: string | null;
      }
    >();

    scopedLoans
      .filter((loan) => loan.loan_scope === 'center_loan' && loan.center?.id)
      .forEach((loan) => {
        const centerId = loan.center!.id;
        const existing = centerMap.get(centerId) || {
          centerId,
          centerName: loan.center?.name || '-',
          centerCode: loan.center?.code || '-',
          routeName: loan.route?.name || '-',
          routeCode: loan.route?.code || '-',
          loanCount: 0,
          totalInstallment: 0,
          nextDueDate: null,
        };

        existing.loanCount += 1;
        existing.totalInstallment += Number(loan.installment_amount || 0);

        if (loan.due_date) {
          if (!existing.nextDueDate || loan.due_date < existing.nextDueDate) {
            existing.nextDueDate = loan.due_date;
          }
        }

        centerMap.set(centerId, existing);
      });

    const rows = Array.from(centerMap.values());

    if (!keyword) {
      return rows.sort((a, b) => a.centerName.localeCompare(b.centerName));
    }

    return rows
      .filter((row) => {
        const haystack = [row.centerName, row.centerCode, row.routeName, row.routeCode].join(' ').toLowerCase();
        return haystack.includes(keyword);
      })
      .sort((a, b) => a.centerName.localeCompare(b.centerName));
  }, [scopedLoans, query]);

  const groupCollections = useMemo(() => {
    if (!selectedCenterId) return [];

    const keyword = query.trim().toLowerCase();
    const groupMap = new Map<
      number,
      {
        groupId: number;
        groupName: string;
        groupCode: string;
        loanCount: number;
        totalInstallment: number;
        nextDueDate: string | null;
      }
    >();

    scopedLoans
      .filter((loan) => loan.loan_scope === 'center_loan' && loan.center?.id === selectedCenterId)
      .forEach((loan) => {
        const groupId = loan.group?.id || 0;
        const existing = groupMap.get(groupId) || {
          groupId,
          groupName: loan.group?.name || 'No Group',
          groupCode: loan.group?.code || '-',
          loanCount: 0,
          totalInstallment: 0,
          nextDueDate: null,
        };

        existing.loanCount += 1;
        existing.totalInstallment += Number(loan.installment_amount || 0);

        if (loan.due_date) {
          if (!existing.nextDueDate || loan.due_date < existing.nextDueDate) {
            existing.nextDueDate = loan.due_date;
          }
        }

        groupMap.set(groupId, existing);
      });

    const rows = Array.from(groupMap.values());

    if (!keyword) {
      return rows.sort((a, b) => a.groupName.localeCompare(b.groupName));
    }

    return rows
      .filter((row) => [row.groupName, row.groupCode].join(' ').toLowerCase().includes(keyword))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [scopedLoans, selectedCenterId, query]);

  const selectedCenter = useMemo(
    () => centerCollections.find((row) => row.centerId === selectedCenterId) || null,
    [centerCollections, selectedCenterId]
  );

  const selectedGroup = useMemo(
    () => groupCollections.find((row) => row.groupId === selectedGroupId) || null,
    [groupCollections, selectedGroupId]
  );

  const selectedRoute = useMemo(
    () => routeCollections.find((row) => row.routeId === selectedRouteId) || null,
    [routeCollections, selectedRouteId]
  );

  const groupLoanRecords = useMemo(() => {
    if (!selectedCenterId || selectedGroupId === null) return [];

    const keyword = query.trim().toLowerCase();

    const rows = scopedLoans.filter(
      (loan) =>
        loan.loan_scope === 'center_loan' &&
        loan.center?.id === selectedCenterId &&
        (loan.group?.id || 0) === selectedGroupId
    );

    if (!keyword) return rows;

    return rows.filter((loan) => {
      const haystack = [loan.customer_no, loan.customer_name, loan.group?.name || '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [scopedLoans, selectedCenterId, selectedGroupId, query]);

  const routeLoanRecords = useMemo(() => {
    if (!selectedRouteId) return [];

    const keyword = query.trim().toLowerCase();

    const rows = scopedLoans.filter(
      (loan) =>
        loan.loan_scope === 'route_loan' && Number(loan.route?.id ?? loan.mf_route_id ?? 0) === selectedRouteId
    );

    if (!keyword) return rows;

    return rows.filter((loan) => {
      const haystack = [loan.customer_no, loan.customer_name, loan.route?.name || loan.route_name || '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [scopedLoans, selectedRouteId, query]);

  const totalInstallment = useMemo(
    () => filteredLoans.reduce((sum, loan) => sum + Number(loan.installment_amount || 0), 0),
    [filteredLoans]
  );

  const todayDate = new Date().toISOString().slice(0, 10);
  const officeDebtDate =
    officeView === 'today_debt' ? todayDate : officeView === 'date_debt' ? debtTargetDate : null;

  const officeDisplayLoans = useMemo(() => {
    if (activeMode === 'today') {
      return filteredLoans.filter((loan) => {
        const dueDate = String(loan.due_date || '').slice(0, 10);
        return dueDate === todayDate && getOutstandingBalance(loan) > 0;
      });
    }

    if (activeMode === 'next') {
      return filteredLoans.filter((loan) => {
        const dueDate = String(loan.due_date || '').slice(0, 10);
        return dueDate === debtTargetDate && getOutstandingBalance(loan) > 0;
      });
    }

    if (activeMode !== 'office') return filteredLoans;
    if (!officeDebtDate) return filteredLoans;

    return filteredLoans.filter((loan) => {
      const dueDate = String(loan.due_date || '').slice(0, 10);
      if (dueDate !== officeDebtDate) return false;
      return getOutstandingBalance(loan) > 0;
    });
  }, [activeMode, officeDebtDate, filteredLoans, todayDate, debtTargetDate]);

  const officeDebtAmount = useMemo(
    () =>
      officeDisplayLoans.reduce(
        (sum, loan) => sum + Math.min(Number(loan.installment_amount || 0), getOutstandingBalance(loan)),
        0
      ),
    [officeDisplayLoans]
  );

  const withDueDateCount = useMemo(
    () => filteredLoans.filter((loan) => Boolean(loan.due_date)).length,
    [filteredLoans]
  );

  const displayRecordCount =
    activeMode === 'center'
      ? selectedGroupId !== null
        ? groupLoanRecords.length
        : selectedCenterId
          ? groupCollections.length
          : centerCollections.length
      : activeMode === 'route'
        ? selectedRouteId
          ? routeLoanRecords.length
          : routeCollections.length
      : officeDisplayLoans.length;

  const displayInstallmentTotal =
    activeMode === 'center'
      ? selectedGroupId !== null
        ? groupLoanRecords.reduce((sum, row) => sum + Number(row.installment_amount || 0), 0)
        : selectedCenterId
          ? groupCollections.reduce((sum, row) => sum + Number(row.totalInstallment || 0), 0)
          : centerCollections.reduce((sum, row) => sum + Number(row.totalInstallment || 0), 0)
      : activeMode === 'route'
        ? selectedRouteId
          ? routeLoanRecords.reduce((sum, row) => sum + Number(row.installment_amount || 0), 0)
          : routeCollections.reduce((sum, row) => sum + Number(row.totalInstallment || 0), 0)
      : activeMode === 'today' || activeMode === 'next' || officeDebtDate
        ? officeDebtAmount
        : totalInstallment;

  const displayDueDateCount =
    activeMode === 'center'
      ? selectedGroupId !== null
        ? groupLoanRecords.filter((row) => Boolean(row.due_date)).length
        : selectedCenterId
          ? groupCollections.filter((row) => Boolean(row.nextDueDate)).length
          : centerCollections.filter((row) => Boolean(row.nextDueDate)).length
      : activeMode === 'route'
        ? selectedRouteId
          ? routeLoanRecords.filter((row) => Boolean(row.due_date)).length
          : routeCollections.filter((row) => Boolean(row.nextDueDate)).length
      : officeDisplayLoans.filter((loan) => Boolean(loan.due_date)).length;

  useEffect(() => {
    if (activeMode !== 'center' && selectedCenterId !== null) {
      setSelectedCenterId(null);
    }
    if (activeMode !== 'center' && selectedGroupId !== null) {
      setSelectedGroupId(null);
    }
    if (activeMode !== 'route') {
      setSelectedRouteId((prev) => (prev !== null ? null : prev));
    }
  }, [activeMode, selectedCenterId, selectedGroupId]);

  useEffect(() => {
    if (selectedCenterId === null && selectedGroupId !== null) {
      setSelectedGroupId(null);
    }
  }, [selectedCenterId, selectedGroupId]);

  useEffect(() => {
    if (activeMode !== 'office' && officeView !== 'all') {
      setOfficeView('all');
    }
  }, [activeMode, officeView]);

  const openCollectModal = (loan: LoanRow) => {
    const graceDays = Number(loan.penalty_grace_days ?? 2);
    const penaltyRate = Number(loan.penalty_rate ?? 0);

    setCollectModal({
      open: true,
      loanId: loan.id,
      loanCode: getFinderLoanCode(loan),
      customerName: loan.customer_name,
      amount: Number(loan.installment_amount || 0).toFixed(2),
      paymentType: 'cash',
      paymentReference: '',
      installmentAmount: Number(loan.installment_amount || 0),
      dueDate: loan.due_date || '',
      penaltyRate: Number.isFinite(penaltyRate) ? penaltyRate : 0,
      graceDays: Number.isFinite(graceDays) && graceDays >= 0 ? graceDays : 0,
      note: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const openLoanDetailsModal = (loan: LoanRow) => {
    setLoanDetailsModal({ open: true, loan });
  };

  const closeLoanDetailsModal = () => {
    setLoanDetailsModal({ open: false, loan: null });
  };

  const closeCollectModal = () => {
    setCollectModal({
      open: false,
      loanId: null,
      loanCode: '',
      customerName: '',
      amount: '',
      paymentType: 'cash',
      paymentReference: '',
      installmentAmount: 0,
      dueDate: '',
      penaltyRate: 0,
      graceDays: 0,
      note: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const penaltyPreview = useMemo(() => {
    if (!collectModal.open) {
      return { lateDays: 0, penaltyAmount: 0 };
    }

    if (!collectModal.dueDate || !collectModal.date || collectModal.penaltyRate <= 0) {
      return { lateDays: 0, penaltyAmount: 0 };
    }

    const dueDate = new Date(`${collectModal.dueDate}T00:00:00`);
    const payDate = new Date(`${collectModal.date}T00:00:00`);

    if (Number.isNaN(dueDate.getTime()) || Number.isNaN(payDate.getTime())) {
      return { lateDays: 0, penaltyAmount: 0 };
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const dayDiff = Math.floor((payDate.getTime() - dueDate.getTime()) / msPerDay);

    if (dayDiff <= collectModal.graceDays) {
      return { lateDays: 0, penaltyAmount: 0 };
    }

    const lateDays = dayDiff - collectModal.graceDays;
    const penaltyAmount = (collectModal.installmentAmount * collectModal.penaltyRate * lateDays) / 100;

    return {
      lateDays,
      penaltyAmount,
    };
  }, [
    collectModal.open,
    collectModal.dueDate,
    collectModal.date,
    collectModal.penaltyRate,
    collectModal.graceDays,
    collectModal.installmentAmount,
  ]);

  const submitCollection = async () => {
    if (!collectModal.loanId) {
      setNoticeModal({ open: true, title: 'Error', message: 'Loan record is missing.' });
      return;
    }

    if (!collectModal.amount || Number(collectModal.amount) <= 0) {
      setNoticeModal({ open: true, title: 'Validation', message: 'Please enter a valid collection amount.' });
      return;
    }

    if (collectModal.paymentType !== 'cash' && !collectModal.paymentReference.trim()) {
      setNoticeModal({ open: true, title: 'Validation', message: 'Reference is required for check and bank transfer payments.' });
      return;
    }

    setCollectSaving(true);
    try {
      const response = await axios.post(
        `${API_BASE}/microfinance/collections`,
        {
          loan_request_id: collectModal.loanId,
          collection_date: collectModal.date,
          collected_amount: Number(collectModal.amount),
          payment_type: collectModal.paymentType,
          payment_reference: collectModal.paymentReference || undefined,
          note: collectModal.note || undefined,
        },
        { headers }
      );

      const savedCollection = response?.data?.data;
      if (savedCollection?.mf_loan_request_id) {
        setCollections((prev) => [
          ...prev,
          {
            id: Number(savedCollection.id || 0),
            mf_loan_request_id: Number(savedCollection.mf_loan_request_id),
            collected_amount: Number(savedCollection.collected_amount || 0),
            collection_date: String(savedCollection.collection_date || ''),
          },
        ]);
      }

      const loanDates = response?.data?.loan_dates;
      const breakdown = response?.data?.breakdown || {};
      if (loanDates?.due_date || loanDates?.next_payment_date) {
        setLoans((prev) =>
          prev.map((loan) => {
            if (loan.id !== collectModal.loanId) return loan;

            return {
              ...loan,
              due_date: loanDates.due_date || loan.due_date,
              next_payment_date: loanDates.next_payment_date || loan.next_payment_date,
              arrears_balance:
                typeof breakdown.arrears_outstanding_after !== 'undefined'
                  ? Number(breakdown.arrears_outstanding_after || 0) - Number(breakdown.extra_payment_after || 0)
                  : loan.arrears_balance,
            };
          })
        );
      }

      closeCollectModal();
      setNoticeModal({
        open: true,
        title: 'Collection Saved',
        message:
          `Arrears Outstanding (Before): ${Number(breakdown.arrears_outstanding_before || 0).toFixed(2)}\n` +
          `Arrears Deducted: ${Number(breakdown.arrears_deducted || 0).toFixed(2)}\n` +
          `Arrears Outstanding (After): ${Number(breakdown.arrears_outstanding_after || 0).toFixed(2)}\n` +
          `Capital Collection: ${Number(breakdown.capital_amount || 0).toFixed(2)}\n` +
          `Interest Collection: ${Number(breakdown.interest_amount || 0).toFixed(2)}\n` +
          `Penalty Collection: ${Number(breakdown.penalty_amount || 0).toFixed(2)}\n` +
          `Penalty Rate: ${Number(breakdown.penalty_rate || 0).toFixed(2)}% | Grace Days: ${Number(breakdown.grace_days || 0)} | Late Days: ${Number(breakdown.late_days || 0)}\n` +
          `Profit (Interest + Penalty): ${Number(breakdown.profit_amount || 0).toFixed(2)}\n` +
          `Business Fund (Capital): ${Number(breakdown.business_fund_amount || 0).toFixed(2)}\n` +
          `Outstanding Principal: ${Number(breakdown.outstanding_principal_after || 0).toFixed(2)}`,
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to save collection.';
      setNoticeModal({ open: true, title: 'Collection Error', message });
    } finally {
      setCollectSaving(false);
    }
  };

  const modeMeta =
    activeMode === 'center'
      ? {
          badge: 'Center Desk',
          title: 'Center Collection',
          subtitle: 'Daily center-level collection tracking with due-date visibility.',
          glow: 'from-emerald-400/50 to-teal-400/20',
          accent: 'from-emerald-500 to-teal-500',
        }
      : activeMode === 'route'
        ? {
            badge: 'Route Desk',
            title: 'Route Collection',
            subtitle: 'Manage route-based installments and upcoming payment windows.',
            glow: 'from-blue-400/50 to-cyan-400/20',
            accent: 'from-blue-500 to-cyan-500',
          }
        : activeMode === 'today'
          ? {
              badge: 'Today Desk',
              title: 'Debt To Be Collected Today',
              subtitle: 'Focus on all due installments scheduled for today.',
              glow: 'from-rose-400/45 to-orange-300/25',
              accent: 'from-rose-500 to-orange-500',
            }
          : activeMode === 'next'
            ? {
                badge: 'Next Day Desk',
                title: 'Next Collection Loans',
                subtitle: 'Prepare upcoming collections for the next day.',
                glow: 'from-indigo-400/45 to-sky-300/25',
                accent: 'from-indigo-500 to-sky-500',
              }
        : {
            badge: 'Office Desk',
            title: 'Office Collection',
            subtitle: 'Handle direct office collections and manual repayment follow-up.',
            glow: 'from-amber-400/55 to-orange-400/20',
            accent: 'from-amber-500 to-orange-500',
          };

  const cards = [
    {
      id: 'center' as const,
      title: 'Center Collection',
      subtitle: 'Collect installments center-wise',
      color: 'from-emerald-500 to-teal-500',
      bg: 'from-emerald-50 to-teal-50',
    },
    {
      id: 'route' as const,
      title: 'Route Collection',
      subtitle: 'Collect installments route-wise',
      color: 'from-blue-500 to-cyan-500',
      bg: 'from-blue-50 to-cyan-50',
    },
    ...(isFieldOfficer
      ? [
          {
            id: 'today' as const,
            title: 'Debt Today',
            subtitle: 'Loans due for collection today',
            color: 'from-rose-500 to-orange-500',
            bg: 'from-rose-50 to-orange-50',
          },
          {
            id: 'next' as const,
            title: 'Next Collection',
            subtitle: 'Loans scheduled for next day collection',
            color: 'from-indigo-500 to-sky-500',
            bg: 'from-indigo-50 to-sky-50',
          },
        ]
      : [
          {
            id: 'office' as const,
            title: 'Office Collection',
            subtitle: 'Collect direct/office installments',
            color: 'from-amber-500 to-orange-500',
            bg: 'from-amber-50 to-orange-50',
          },
        ]),
  ];

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-100 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-20 left-16 h-72 w-72 rounded-full bg-emerald-300 blur-3xl"></div>
        <div className="absolute top-24 right-4 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-300 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_20px_60px_-30px_rgba(14,116,144,0.45)] p-6 md:p-7">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 border border-cyan-100">
                {modeMeta.badge}
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">{modeMeta.title}</h1>
              <p className="text-sm text-slate-600 mt-1">{modeMeta.subtitle}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/microfinance')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm"
            >
              Back
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/85 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Collection Records</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{displayRecordCount}</p>
            </div>
            <div className="rounded-xl bg-white/85 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Installment</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{displayInstallmentTotal.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-white/85 border border-white shadow-sm p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">With Due Date</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{displayDueDateCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setActiveMode(card.id);
                setQuery('');
              }}
              className={`text-left rounded-2xl border p-4 shadow-sm transition-all duration-300 bg-gradient-to-br ${card.bg} relative overflow-hidden ${
                activeMode === card.id
                  ? 'border-transparent ring-2 ring-cyan-300 shadow-xl scale-[1.01]'
                  : 'border-white/70 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-r ${card.color} opacity-20 blur-xl`}></div>
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white bg-gradient-to-r ${card.color}`}>
                {card.id === 'center' ? 'C' : card.id === 'route' ? 'R' : card.id === 'today' ? 'T' : card.id === 'next' ? 'N' : 'O'}
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">{card.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{card.subtitle}</p>
            </button>
          ))}
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Common Loan Finder</h2>
            <div className="relative min-w-[280px]">
              <input
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-black focus:outline-none focus:ring-2 focus:ring-cyan-200"
                placeholder="Find by Customer No"
                value={finderCustomerNo}
                onChange={(e) => setFinderCustomerNo(e.target.value)}
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">⌕</span>
            </div>
          </div>

          {!finderCustomerNo.trim() ? (
            <p className="mt-3 text-sm text-slate-500">Type customer number to quickly find any loan and collect installment.</p>
          ) : commonFinderResults.length === 0 ? (
            <p className="mt-3 text-sm text-rose-600">No loan found for this customer number.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-cyan-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                <thead className="bg-cyan-50/70 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Loan Code</th>
                    <th className="px-3 py-2 font-semibold">Customer No</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Scope</th>
                    <th className="px-3 py-2 font-semibold">Installment</th>
                    <th className="px-3 py-2 font-semibold">Outstanding</th>
                    <th className="px-3 py-2 font-semibold">Due Date</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {commonFinderResults.map((loan) => (
                    <tr key={`finder-${loan.id}`} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{getFinderLoanCode(loan)}</span>
                      </td>
                      <td className="px-3 py-2">{getFinderCustomerNo(loan)}</td>
                      <td className="px-3 py-2">{loan.customer_name}</td>
                      <td className="px-3 py-2 capitalize">{String(loan.loan_scope || '-').replace('_', ' ')}</td>
                      <td className="px-3 py-2">{Number(loan.installment_amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-rose-700 font-semibold">{getOutstandingBalance(loan).toFixed(2)}</td>
                      <td className="px-3 py-2">{formatDateDisplay(loan.due_date)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openLoanDetailsModal(loan)}
                            className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 text-xs font-semibold"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openCollectModal(loan)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold hover:from-emerald-600 hover:to-teal-600"
                          >
                            Collect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white/86 backdrop-blur-xl rounded-3xl border border-cyan-100 shadow-[0_18px_40px_-24px_rgba(14,116,144,0.5)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r ${modeMeta.accent}`}></span>
              {activeMode === 'center'
                ? selectedGroupId !== null
                  ? `Loan Records - ${selectedGroup?.groupName || 'Selected Group'}`
                  : selectedCenterId
                    ? `Group Collection List - ${selectedCenter?.centerName || 'Selected Center'}`
                  : 'Center Collection List'
                : activeMode === 'route'
                  ? selectedRouteId
                    ? `Loan Records - ${selectedRoute?.routeName || 'Selected Route'}`
                    : 'Route Collection List'
                  : activeMode === 'today'
                    ? 'Debt To Be Collected Today'
                    : activeMode === 'next'
                      ? `Collection Loans - ${debtTargetDate}`
                  : officeView === 'today_debt'
                    ? 'Debt To Be Collected Today'
                    : officeView === 'date_debt'
                      ? `Debt To Be Collected - ${debtTargetDate || 'Selected Date'}`
                    : 'Office Collection List'}
            </h2>
            {activeMode === 'center' && selectedGroupId !== null && (
              <button
                type="button"
                onClick={() => setSelectedGroupId(null)}
                className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 text-xs font-semibold"
              >
                Back to Groups
              </button>
            )}
            {activeMode === 'center' && selectedCenterId && selectedGroupId === null && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupId(null);
                  setSelectedCenterId(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 text-xs font-semibold"
              >
                Back to Centers
              </button>
            )}
            {activeMode === 'route' && selectedRouteId !== null && (
              <button
                type="button"
                onClick={() => setSelectedRouteId(null)}
                className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 text-xs font-semibold"
              >
                Back to Routes
              </button>
            )}
            {activeMode === 'office' && isAdmin && (
              <div className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 p-1">
                <button
                  type="button"
                  onClick={() => setOfficeView('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    officeView === 'all' ? 'bg-white text-cyan-800 shadow-sm' : 'text-cyan-700'
                  }`}
                >
                  All Active Loans
                </button>
                <button
                  type="button"
                  onClick={() => setOfficeView('today_debt')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    officeView === 'today_debt' ? 'bg-white text-cyan-800 shadow-sm' : 'text-cyan-700'
                  }`}
                >
                  Debt Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setDebtTargetDate(tomorrow.toISOString().slice(0, 10));
                    setOfficeView('date_debt');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    officeView === 'date_debt' ? 'bg-white text-cyan-800 shadow-sm' : 'text-cyan-700'
                  }`}
                >
                  Next Day
                </button>
              </div>
            )}
            {activeMode === 'office' && isAdmin && officeView === 'date_debt' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={debtTargetDate}
                  onChange={(e) => {
                    setDebtTargetDate(e.target.value);
                    setOfficeView('date_debt');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-white text-sm text-slate-800"
                />
              </div>
            )}
            {isFieldOfficer && activeMode === 'next' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={debtTargetDate}
                  onChange={(e) => setDebtTargetDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-white text-sm text-slate-800"
                />
              </div>
            )}
            <div className="relative min-w-[260px]">
              <input
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-cyan-100 bg-white text-sm text-black focus:outline-none focus:ring-2 focus:ring-cyan-200"
                placeholder={
                  activeMode === 'center' && selectedGroupId !== null
                    ? 'Search loan code / customer'
                    : activeMode === 'center' && selectedCenterId
                      ? 'Search group name / code'
                      : activeMode === 'route' && selectedRouteId !== null
                        ? 'Search loan code / customer'
                        : activeMode === 'route'
                          ? 'Search route name / code'
                          : activeMode === 'today'
                            ? 'Search today debt by loan / customer / route'
                            : activeMode === 'next'
                              ? 'Search selected day loans by loan / customer / route'
                          : activeMode === 'office' && officeView === 'today_debt'
                            ? 'Search debt today by loan / customer / route'
                            : activeMode === 'office' && officeView === 'date_debt'
                              ? 'Search selected day debt by loan / customer / route'
                    : 'Search loan code / customer / route'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">⌕</span>
            </div>
          </div>

          {(activeMode === 'center'
            ? selectedGroupId !== null
              ? groupLoanRecords.length
              : selectedCenterId
                ? groupCollections.length
                : centerCollections.length
            : activeMode === 'route'
              ? selectedRouteId !== null
                ? routeLoanRecords.length
                : routeCollections.length
            : officeDisplayLoans.length) === 0 ? (
            <div className={`mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br ${modeMeta.glow} p-8 text-sm text-slate-700 text-center`}>
              {activeMode === 'center'
                ? selectedGroupId !== null
                  ? 'No loans found for selected group.'
                  : selectedCenterId
                    ? 'No groups found for selected center.'
                  : 'No centers found for center collection mode.'
                : activeMode === 'route'
                  ? selectedRouteId !== null
                    ? 'No loans found for selected route.'
                    : 'No routes found for route collection mode.'
                : activeMode === 'today'
                  ? 'No due debt found for today.'
                  : activeMode === 'next'
                    ? `No due loans found for ${debtTargetDate}.`
                : officeView === 'today_debt'
                  ? 'No due debt found for today.'
                  : officeView === 'date_debt'
                    ? `No due debt found for ${debtTargetDate || 'selected date'}.`
                  : 'No records found for this collection mode.'}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100">
              <table className="min-w-full text-sm text-left text-slate-700 bg-white">
                {activeMode === 'center' ? (
                  <>
                    <thead className="bg-gradient-to-r from-slate-100 to-cyan-50 text-slate-800">
                      {selectedGroupId !== null ? (
                        <tr>
                          <th className="px-3 py-2 font-semibold">Loan Code</th>
                          <th className="px-3 py-2 font-semibold">Customer No</th>
                          <th className="px-3 py-2 font-semibold">Customer</th>
                          <th className="px-3 py-2 font-semibold">Loan Amount</th>
                          <th className="px-3 py-2 font-semibold">Installment</th>
                          <th className="px-3 py-2 font-semibold">Paid Total</th>
                          <th className="px-3 py-2 font-semibold">Outstanding</th>
                          <th className="px-3 py-2 font-semibold">Arrears</th>
                          <th className="px-3 py-2 font-semibold">Extra Payment</th>
                          <th className="px-3 py-2 font-semibold">Due Date</th>
                          <th className="px-3 py-2 font-semibold">Next Payment</th>
                          <th className="px-3 py-2 font-semibold">Action</th>
                        </tr>
                      ) : selectedCenterId ? (
                        <tr>
                          <th className="px-3 py-2 font-semibold">Group Code</th>
                          <th className="px-3 py-2 font-semibold">Group Name</th>
                          <th className="px-3 py-2 font-semibold">Loan Count</th>
                          <th className="px-3 py-2 font-semibold">Total Installment</th>
                          <th className="px-3 py-2 font-semibold">Next Due Date</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-3 py-2 font-semibold">Center Code</th>
                          <th className="px-3 py-2 font-semibold">Center Name</th>
                          <th className="px-3 py-2 font-semibold">Route</th>
                          <th className="px-3 py-2 font-semibold">Loan Count</th>
                          <th className="px-3 py-2 font-semibold">Total Installment</th>
                          <th className="px-3 py-2 font-semibold">Next Due Date</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {selectedGroupId !== null
                        ? groupLoanRecords.map((loan) => (
                            <tr
                              key={`loan-${loan.id}`}
                              onClick={() => openLoanDetailsModal(loan)}
                              className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{loan.customer_no}</span>
                              </td>
                              <td className="px-3 py-2">{loan.customer_code || '-'}</td>
                              <td className="px-3 py-2">{loan.customer_name}</td>
                              <td className="px-3 py-2">{Number(loan.loan_amount || 0).toFixed(2)}</td>
                              <td className="px-3 py-2">{Number(loan.installment_amount || 0).toFixed(2)}</td>
                              <td className="px-3 py-2 text-emerald-700 font-semibold">{getPaidTotal(loan.id).toFixed(2)}</td>
                              <td className="px-3 py-2 text-rose-700 font-semibold">{getOutstandingBalance(loan).toFixed(2)}</td>
                              <td className="px-3 py-2 text-red-700 font-semibold">{getArrearsAmount(loan).toFixed(2)}</td>
                              <td className="px-3 py-2 text-violet-700 font-semibold">{getExtraPayment(loan).toFixed(2)}</td>
                              <td className="px-3 py-2">{formatDateDisplay(loan.due_date)}</td>
                              <td className="px-3 py-2">{formatDateDisplay(loan.next_payment_date)}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCollectModal(loan);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold hover:from-emerald-600 hover:to-teal-600"
                                >
                                  Collect
                                </button>
                              </td>
                            </tr>
                          ))
                        : selectedCenterId
                          ? groupCollections.map((row) => (
                            <tr key={`group-${row.groupId}`} className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors">
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{row.groupCode}</span>
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedGroupId(row.groupId)}
                                  className="text-cyan-700 hover:text-cyan-900 font-semibold"
                                >
                                  {row.groupName}
                                </button>
                              </td>
                              <td className="px-3 py-2">{row.loanCount}</td>
                              <td className="px-3 py-2">{row.totalInstallment.toFixed(2)}</td>
                              <td className="px-3 py-2">{formatDateDisplay(row.nextDueDate)}</td>
                            </tr>
                          ))
                        : centerCollections.map((row) => (
                            <tr
                              key={row.centerId}
                              onClick={() => setSelectedCenterId(row.centerId)}
                              className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{row.centerCode}</span>
                              </td>
                              <td className="px-3 py-2">{row.centerName}</td>
                              <td className="px-3 py-2">{row.routeName}</td>
                              <td className="px-3 py-2">{row.loanCount}</td>
                              <td className="px-3 py-2">{row.totalInstallment.toFixed(2)}</td>
                              <td className="px-3 py-2">{formatDateDisplay(row.nextDueDate)}</td>
                            </tr>
                          ))}
                    </tbody>
                  </>
                ) : activeMode === 'route' ? (
                  <>
                    <thead className="bg-gradient-to-r from-slate-100 to-cyan-50 text-slate-800">
                      {selectedRouteId !== null ? (
                        <tr>
                          <th className="px-3 py-2 font-semibold">Loan Code</th>
                          <th className="px-3 py-2 font-semibold">Customer No</th>
                          <th className="px-3 py-2 font-semibold">Customer</th>
                          <th className="px-3 py-2 font-semibold">Center</th>
                          <th className="px-3 py-2 font-semibold">Loan Amount</th>
                          <th className="px-3 py-2 font-semibold">Installment</th>
                          <th className="px-3 py-2 font-semibold">Paid Total</th>
                          <th className="px-3 py-2 font-semibold">Outstanding</th>
                          <th className="px-3 py-2 font-semibold">Arrears</th>
                          <th className="px-3 py-2 font-semibold">Extra Payment</th>
                          <th className="px-3 py-2 font-semibold">Due Date</th>
                          <th className="px-3 py-2 font-semibold">Next Payment</th>
                          <th className="px-3 py-2 font-semibold">Action</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-3 py-2 font-semibold">Route Code</th>
                          <th className="px-3 py-2 font-semibold">Route Name</th>
                          <th className="px-3 py-2 font-semibold">Loan Count</th>
                          <th className="px-3 py-2 font-semibold">Total Installment</th>
                          <th className="px-3 py-2 font-semibold">Next Due Date</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {selectedRouteId !== null
                        ? routeLoanRecords.map((loan) => (
                            <tr
                              key={`route-loan-${loan.id}`}
                              onClick={() => openLoanDetailsModal(loan)}
                              className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{loan.customer_no}</span>
                              </td>
                              <td className="px-3 py-2">{loan.customer_code || '-'}</td>
                              <td className="px-3 py-2">{loan.customer_name}</td>
                              <td className="px-3 py-2">{loan.center?.name || '-'}</td>
                              <td className="px-3 py-2">{Number(loan.loan_amount || 0).toFixed(2)}</td>
                              <td className="px-3 py-2">{Number(loan.installment_amount || 0).toFixed(2)}</td>
                              <td className="px-3 py-2 text-emerald-700 font-semibold">{getPaidTotal(loan.id).toFixed(2)}</td>
                              <td className="px-3 py-2 text-rose-700 font-semibold">{getOutstandingBalance(loan).toFixed(2)}</td>
                              <td className="px-3 py-2 text-red-700 font-semibold">{getArrearsAmount(loan).toFixed(2)}</td>
                              <td className="px-3 py-2 text-violet-700 font-semibold">{getExtraPayment(loan).toFixed(2)}</td>
                              <td className="px-3 py-2">{formatDateDisplay(loan.due_date)}</td>
                              <td className="px-3 py-2">{formatDateDisplay(loan.next_payment_date)}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCollectModal(loan);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold hover:from-emerald-600 hover:to-teal-600"
                                >
                                  Collect
                                </button>
                              </td>
                            </tr>
                          ))
                        : routeCollections.map((row) => (
                            <tr
                              key={`route-${row.routeId}`}
                              onClick={() => setSelectedRouteId(row.routeId)}
                              className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{row.routeCode}</span>
                              </td>
                              <td className="px-3 py-2">{row.routeName}</td>
                              <td className="px-3 py-2">{row.loanCount}</td>
                              <td className="px-3 py-2">{row.totalInstallment.toFixed(2)}</td>
                              <td className="px-3 py-2">{formatDateDisplay(row.nextDueDate)}</td>
                            </tr>
                          ))}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead className="bg-gradient-to-r from-slate-100 to-cyan-50 text-slate-800">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Loan Code</th>
                        <th className="px-3 py-2 font-semibold">Customer No</th>
                        <th className="px-3 py-2 font-semibold">Customer</th>
                        <th className="px-3 py-2 font-semibold">Route</th>
                        <th className="px-3 py-2 font-semibold">Center</th>
                        <th className="px-3 py-2 font-semibold">Loan Amount</th>
                        <th className="px-3 py-2 font-semibold">Installment</th>
                        <th className="px-3 py-2 font-semibold">Paid Total</th>
                        <th className="px-3 py-2 font-semibold">Outstanding</th>
                        <th className="px-3 py-2 font-semibold">Arrears</th>
                        <th className="px-3 py-2 font-semibold">Extra Payment</th>
                        <th className="px-3 py-2 font-semibold">Due Date</th>
                        <th className="px-3 py-2 font-semibold">Next Payment</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {officeDisplayLoans.map((loan) => (
                        <tr
                          key={loan.id}
                          onClick={() => openLoanDetailsModal(loan)}
                          className="border-b border-cyan-100 last:border-b-0 hover:bg-cyan-50/40 transition-colors cursor-pointer"
                        >
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{loan.customer_no}</span>
                          </td>
                          <td className="px-3 py-2">{loan.customer_code || '-'}</td>
                          <td className="px-3 py-2">{loan.customer_name}</td>
                          <td className="px-3 py-2">{loan.route?.name || loan.route_name || '-'}</td>
                          <td className="px-3 py-2">{loan.center?.name || '-'}</td>
                          <td className="px-3 py-2">{Number(loan.loan_amount || 0).toFixed(2)}</td>
                          <td className="px-3 py-2">{Number(loan.installment_amount || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-emerald-700 font-semibold">{getPaidTotal(loan.id).toFixed(2)}</td>
                          <td className="px-3 py-2 text-rose-700 font-semibold">{getOutstandingBalance(loan).toFixed(2)}</td>
                          <td className="px-3 py-2 text-red-700 font-semibold">{getArrearsAmount(loan).toFixed(2)}</td>
                          <td className="px-3 py-2 text-violet-700 font-semibold">{getExtraPayment(loan).toFixed(2)}</td>
                          <td className="px-3 py-2">{formatDateDisplay(loan.due_date)}</td>
                          <td className="px-3 py-2">{formatDateDisplay(loan.next_payment_date)}</td>
                          <td className="px-3 py-2 capitalize">
                            <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                              {loan.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          )}
        </div>

        {collectModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm px-4 py-6">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.75)]">
              <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-5 py-5 text-white">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl"></div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/85">Collection Desk</p>
                <h3 className="text-xl font-extrabold mt-1">Collect Installment</h3>
                <p className="mt-1 text-sm text-white/90">{collectModal.customerName} | {collectModal.loanCode}</p>
              </div>

              <div className="p-5 space-y-4 text-black bg-gradient-to-b from-emerald-50/35 to-white">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 rounded-2xl border border-emerald-100 bg-white p-3 text-xs">
                  <div>
                    <p className="uppercase text-slate-500">Due Date</p>
                    <p className="font-semibold text-slate-800">{formatDateDisplay(collectModal.dueDate)}</p>
                  </div>
                  <div>
                    <p className="uppercase text-slate-500">Penalty Rate</p>
                    <p className="font-semibold text-slate-800">{collectModal.penaltyRate.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="uppercase text-slate-500">Grace Days</p>
                    <p className="font-semibold text-slate-800">{collectModal.graceDays}</p>
                  </div>
                  <div>
                    <p className="uppercase text-slate-500">Late Days</p>
                    <p className="font-semibold text-slate-800">{penaltyPreview.lateDays}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="uppercase text-slate-500">Est. Penalty</p>
                    <p className="font-semibold text-rose-700">{penaltyPreview.penaltyAmount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-600">Amount</label>
                    <input
                      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-emerald-100 bg-white"
                      value={collectModal.amount}
                      onChange={(e) => setCollectModal((p) => ({ ...p, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-600">Collection Date</label>
                    <input
                      type="date"
                      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-emerald-100 bg-white"
                      value={collectModal.date}
                      onChange={(e) => setCollectModal((p) => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-600">Pay Type</label>
                    <select
                      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-emerald-100 bg-white"
                      value={collectModal.paymentType}
                      onChange={(e) =>
                        setCollectModal((p) => ({
                          ...p,
                          paymentType: e.target.value as 'cash' | 'check' | 'bank_transfer',
                        }))
                      }
                    >
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-600">Reference</label>
                    <input
                      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-emerald-100 bg-white"
                      value={collectModal.paymentReference}
                      onChange={(e) => setCollectModal((p) => ({ ...p, paymentReference: e.target.value }))}
                      placeholder="Cheque no / TXN ID / Bank reference"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold uppercase text-slate-600">Note</label>
                    <textarea
                      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-emerald-100 bg-white"
                      rows={3}
                      value={collectModal.note}
                      onChange={(e) => setCollectModal((p) => ({ ...p, note: e.target.value }))}
                      placeholder="Optional collection note"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-emerald-100 bg-white px-5 py-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCollectModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCollection}
                  disabled={collectSaving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {collectSaving ? 'Saving...' : 'Confirm Collection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loanDetailsModal.open && loanDetailsModal.loan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm px-4 py-6">
            <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.75)]">
              <div className="relative bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-500 px-5 py-5 text-white">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl"></div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/85">Loan Intelligence Card</p>
                    <h3 className="text-xl font-extrabold mt-1">Loan Details</h3>
                    <p className="text-sm text-white/90 mt-1">{loanDetailsModal.loan.customer_name} | {loanDetailsModal.loan.customer_no}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeLoanDetailsModal}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{loanDetailsModal.loan.loan_scope}</span>
                  <span className="inline-flex rounded-full bg-emerald-400/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{loanDetailsModal.loan.status}</span>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-b from-cyan-50/35 to-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-700">
                  <div className="rounded-xl border border-cyan-100 bg-white p-3"><p className="text-xs text-slate-500">Route</p><p className="font-semibold">{loanDetailsModal.loan.route?.name || loanDetailsModal.loan.route_name || '-'}</p></div>
                  <div className="rounded-xl border border-cyan-100 bg-white p-3"><p className="text-xs text-slate-500">Center</p><p className="font-semibold">{loanDetailsModal.loan.center?.name || '-'}</p></div>
                  <div className="rounded-xl border border-cyan-100 bg-white p-3"><p className="text-xs text-slate-500">Group</p><p className="font-semibold">{loanDetailsModal.loan.group?.name || '-'}</p></div>

                  <div className="rounded-xl border border-cyan-100 bg-white p-3"><p className="text-xs text-slate-500">Loan Amount</p><p className="font-semibold text-slate-900">{Number(loanDetailsModal.loan.loan_amount || 0).toFixed(2)}</p></div>
                  <div className="rounded-xl border border-cyan-100 bg-white p-3"><p className="text-xs text-slate-500">Refundable Amount</p><p className="font-semibold text-slate-900">{Number(loanDetailsModal.loan.refundable_amount || 0).toFixed(2)}</p></div>
                  <div className="rounded-xl border border-cyan-100 bg-white p-3"><p className="text-xs text-slate-500">Installment Amount</p><p className="font-semibold text-slate-900">{Number(loanDetailsModal.loan.installment_amount || 0).toFixed(2)}</p></div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="text-xs text-emerald-700">Paid Total</p><p className="font-extrabold text-emerald-700">{getPaidTotal(loanDetailsModal.loan.id).toFixed(2)}</p></div>
                  <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3"><p className="text-xs text-rose-700">Outstanding Balance</p><p className="font-extrabold text-rose-700">{getOutstandingBalance(loanDetailsModal.loan).toFixed(2)}</p></div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3"><p className="text-xs text-amber-700">Arrears</p><p className="font-extrabold text-amber-700">{getArrearsAmount(loanDetailsModal.loan).toFixed(2)}</p></div>

                  <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="text-xs text-violet-700">Extra Payment</p><p className="font-extrabold text-violet-700">{getExtraPayment(loanDetailsModal.loan).toFixed(2)}</p></div>
                  <div className="rounded-xl border border-cyan-100 bg-white p-3"><p className="text-xs text-slate-500">Due Date</p><p className="font-semibold">{formatDateDisplay(loanDetailsModal.loan.due_date)}</p></div>
                  <div className="rounded-xl border border-cyan-100 bg-white p-3"><p className="text-xs text-slate-500">Next Payment Date</p><p className="font-semibold">{formatDateDisplay(loanDetailsModal.loan.next_payment_date)}</p></div>
                </div>
              </div>

              <div className="border-t border-cyan-100 bg-white px-5 py-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeLoanDetailsModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeLoanDetailsModal();
                    openCollectModal(loanDetailsModal.loan as LoanRow);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold"
                >
                  Collect From This Loan
                </button>
              </div>
            </div>
          </div>
        )}

        {noticeModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-cyan-100">
              <h3 className="text-lg font-bold text-slate-900">{noticeModal.title}</h3>
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{noticeModal.message}</p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setNoticeModal({ open: false, title: '', message: '' })}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
