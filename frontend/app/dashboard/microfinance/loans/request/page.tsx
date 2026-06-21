'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl, resolveStorageAssetUrl } from '@/lib/api';

type MFRoute = { id: number; name: string; code: string };
type MFCenter = { id: number; mf_route_id: number; name: string; code: string };
type MFGroup = { id: number; mf_route_id: number; mf_center_id: number; name: string; code: string };
type ManagerOption = { id: number; name: string; designation: string; branch: string };
type MFLoanProduct = {
  id: number;
  name: string;
  loan_amount?: number | string | null;
  amount?: number | string | null;
  principal_amount?: number | string | null;
  interest_rate: number;
  interest_type: 'flat' | 'reducing';
  terms_count: number;
  refund_option: 'day' | 'week' | 'month';
  is_active: boolean;
};

type Guarantor = {
  name: string;
  nic: string;
  address: string;
  contact_no: string;
  relationship: string;
};

type GuarantorLookupOption = {
  id: number;
  name: string;
  nic: string;
  address: string;
  contact_no: string;
};

type LoanDocumentUpload = {
  document_type: string;
  file: File | null;
};

type ExistingCustomer = {
  id: number;
  customer_code?: string;
  first_name?: string;
  last_name?: string;
  nick_name?: string;
  nic_passport?: string;
  phone?: string;
  permanent_address?: string;
  current_address?: string;
  photo_path?: string;
  photo_url?: string;
  profile_photo?: string;
  customer_photo?: string;
};

const CUSTOMER_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

type ExistingLoanRequest = {
  customer_no?: string;
  nick_name?: string;
};

type AuthRole = {
  id?: number;
  name?: string;
};

type AuthUser = {
  id?: number;
  name?: string;
  email?: string;
  designation?: { id?: number; name?: string } | null;
  employee?: { id?: number; first_name?: string; last_name?: string; email?: string } | null;
  roles?: AuthRole[];
};

const API_BASE = getApiBaseUrl();
const INTEREST_RATE_MAX_DECIMALS = 7;

const sanitizeInterestRateInput = (value: string) => {
  const normalized = value.replace(/,/g, '.').trim();
  if (normalized === '') {
    return '';
  }

  if (!/^\d*\.?\d*$/.test(normalized)) {
    return null;
  }

  const [whole = '', fractional = ''] = normalized.split('.');
  if (fractional.length > INTEREST_RATE_MAX_DECIMALS) {
    return `${whole}.${fractional.slice(0, INTEREST_RATE_MAX_DECIMALS)}`;
  }

  return normalized;
};

const finalizeInterestRate = (value: string) => {
  const sanitized = sanitizeInterestRateInput(value);
  if (sanitized === null || sanitized === '' || sanitized === '.') {
    return '';
  }

  const numeric = Number(sanitized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return '';
  }

  const [whole = '0', fractional = ''] = sanitized.split('.');
  const trimmedFraction = fractional.slice(0, INTEREST_RATE_MAX_DECIMALS).replace(/0+$/, '');

  if (trimmedFraction === '') {
    return whole === '' ? '0' : whole;
  }

  return `${whole || '0'}.${trimmedFraction}`;
};

const resolveLoanAmountFromProduct = (product: MFLoanProduct): string => {
  const directCandidates = [product.loan_amount, product.amount, product.principal_amount];
  for (const candidate of directCandidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric.toFixed(2);
    }
  }

  const fromNameMatch = String(product.name || '').match(/(\d+(?:\.\d+)?)/);
  if (!fromNameMatch) return '';

  const fromName = Number(fromNameMatch[1]);
  if (!Number.isFinite(fromName) || fromName <= 0) return '';
  return fromName.toFixed(2);
};

const isAllowedImageType = (file: File) => {
  const mime = String(file.type || '').toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(mime)) {
    return true;
  }

  const lowerName = String(file.name || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].some((ext) => lowerName.endsWith(ext));
};

const loadImageElement = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image decode failed'));
    };
    image.src = objectUrl;
  });

const compressImageIfNeeded = async (file: File, maxBytes = CUSTOMER_PHOTO_MAX_BYTES): Promise<File> => {
  if (file.size <= maxBytes) {
    return file;
  }

  const image = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }

  let width = image.width;
  let height = image.height;
  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const outputType = 'image/jpeg';
  const qualitySteps = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
  let scale = 1;
  let bestFile = file;

  for (let pass = 0; pass < 4; pass += 1) {
    for (const quality of qualitySteps) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, quality));
      if (!blob) continue;

      const candidate = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: outputType,
        lastModified: Date.now(),
      });

      if (candidate.size < bestFile.size) {
        bestFile = candidate;
      }

      if (candidate.size <= maxBytes) {
        return candidate;
      }
    }

    scale *= 0.85;
    width = Math.max(720, Math.round(image.width * scale));
    height = Math.max(720, Math.round(image.height * scale));
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
  }

  return bestFile;
};

export default function RequestLoanPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; onClose?: () => void }>({
    open: false,
    title: '',
    message: '',
  });

  const openModal = (message: string, title = 'Notice', onClose?: () => void) => {
    setModal({ open: true, title, message, onClose });
  };

  const closeModal = () => {
    const callback = modal.onClose;
    setModal({ open: false, title: '', message: '' });
    if (callback) callback();
  };

  const [routes, setRoutes] = useState<MFRoute[]>([]);
  const [centers, setCenters] = useState<MFCenter[]>([]);
  const [groups, setGroups] = useState<MFGroup[]>([]);
  const [loanProducts, setLoanProducts] = useState<MFLoanProduct[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [fieldOfficers, setFieldOfficers] = useState<ManagerOption[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [customers, setCustomers] = useState<ExistingCustomer[]>([]);
  const [loanRequestNicknamesByCustomerNo, setLoanRequestNicknamesByCustomerNo] = useState<Record<string, string>>({});
  const [showNicSuggestions, setShowNicSuggestions] = useState(false);
  const [customerCodeTouched, setCustomerCodeTouched] = useState(false);
  const [customerCodeLookupLoading, setCustomerCodeLookupLoading] = useState(false);
  const [customerCodeLookupNotice, setCustomerCodeLookupNotice] = useState('');
  const customerCodeLookupRequestRef = useRef(0);
  const customerPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);
  const [customerPhotoPreview, setCustomerPhotoPreview] = useState('');
  const [existingCustomerPhotoUrl, setExistingCustomerPhotoUrl] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [isProductDetailsEditable, setIsProductDetailsEditable] = useState(false);

  const [form, setForm] = useState({
    loan_scope: 'center_loan',
    loan_product_id: 0,
    mf_route_id: 0,
    mf_center_id: 0,
    mf_group_id: 0,
    manager_employee_id: 0,
    manager_name: '',
    field_officer: '',
    group_leader: '',
    customer_no: '',
    customer_code: '',
    customer_name: '',
    nick_name: '',
    nic: '',
    address: '',
    contact_no: '',
    loan_amount: '',
    reason: '',
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
    loan_request_date: new Date().toISOString().split('T')[0],
    charges_collection_status: 'pending',
  });

  const [guarantors, setGuarantors] = useState<Guarantor[]>([
    { name: '', nic: '', address: '', contact_no: '', relationship: '' },
  ]);
  const [guarantorFinderQueryByIndex, setGuarantorFinderQueryByIndex] = useState<Record<number, string>>({});
  const [activeGuarantorFinderIndex, setActiveGuarantorFinderIndex] = useState<number | null>(null);
  const [documents, setDocuments] = useState<LoanDocumentUpload[]>([
    { document_type: 'NIC', file: null },
  ]);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
    [token]
  );
  const loanCodeMetaKey = `${form.loan_scope}|${form.mf_route_id}|${form.mf_center_id}`;
  const steps = useMemo(
    () => [
      { id: 1, title: 'Location Mapping', hint: 'Scope, route, center, group' },
      { id: 2, title: 'Officer & Team', hint: 'Manager and field team details' },
      { id: 3, title: 'Customer Details', hint: 'Loan code, customer profile, NIC' },
      { id: 4, title: 'Guarantors', hint: 'Guarantor information' },
      { id: 5, title: 'Loan Documents', hint: 'Upload supporting files' },
      { id: 6, title: 'Loan Details', hint: 'Amount, terms, and charges' },
    ],
    []
  );
  const progressPercent = (activeStep / steps.length) * 100;

  const normalizeText = (value: string) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const isCollectionOfficer = useMemo(() => {
    const designationName = normalizeText(String(authUser?.designation?.name || ''));
    const roleNames = (authUser?.roles || []).map((role) => normalizeText(String(role?.name || '')));

    if (designationName.includes('collection officer')) {
      return true;
    }

    return roleNames.some((name) => name.includes('collection officer'));
  }, [authUser]);

  const authUserCandidateNames = useMemo(() => {
    const fullEmployeeName = [authUser?.employee?.first_name || '', authUser?.employee?.last_name || '']
      .join(' ')
      .trim();

    return [
      String(authUser?.name || '').trim(),
      fullEmployeeName,
      String(authUser?.employee?.email || '').trim(),
      String(authUser?.email || '').trim(),
    ].filter((value, index, arr) => value !== '' && arr.indexOf(value) === index);
  }, [authUser]);

  const normalizeCustomerNo = (value: string) => value.trim().toUpperCase();

  const selectedLoanProduct = useMemo(
    () => loanProducts.find((product) => product.id === Number(form.loan_product_id || 0)) || null,
    [loanProducts, form.loan_product_id]
  );

  const resolveCustomerPhotoUrl = useCallback((customer: ExistingCustomer): string => {
    const directUrl = String(customer.photo_url || '').trim();
    if (directUrl) {
      return resolveStorageAssetUrl(directUrl);
    }

    const rawPath = String(
      customer.photo_path || customer.profile_photo || customer.customer_photo || ''
    ).trim();
    if (!rawPath) return '';

    return resolveStorageAssetUrl(rawPath);
  }, []);

  const handleCustomerPhotoChange = async (file: File | null) => {
    if (!file) {
      setCustomerPhotoFile(null);
      setCustomerPhotoPreview(existingCustomerPhotoUrl);
      return;
    }

    if (!isAllowedImageType(file)) {
      openModal('Please choose a valid image file (JPG, PNG, or WEBP).', 'Validation');
      return;
    }

    try {
      const optimizedFile = await compressImageIfNeeded(file, CUSTOMER_PHOTO_MAX_BYTES);

      if (optimizedFile.size > CUSTOMER_PHOTO_MAX_BYTES) {
        openModal('Customer photo is too large. Please use an image under 5 MB.', 'Validation');
        return;
      }

      setCustomerPhotoFile(optimizedFile);
    } catch {
      openModal('Unable to process this image. Please choose another file.', 'Validation');
    }
  };

  const clearCustomerPhotoSelection = () => {
    setCustomerPhotoFile(null);
    setCustomerPhotoPreview(existingCustomerPhotoUrl);
    if (customerPhotoInputRef.current) {
      customerPhotoInputRef.current.value = '';
    }
  };

  const uploadCustomerPhoto = async (customerCode: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await axios.post(
      `${API_BASE}/customers/by-code/${encodeURIComponent(normalizeCustomerNo(customerCode))}/photo`,
      formData,
      {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const uploaded = response.data as ExistingCustomer;
    const uploadedUrl = resolveCustomerPhotoUrl(uploaded);
    setExistingCustomerPhotoUrl(uploadedUrl);
    setCustomerPhotoPreview(uploadedUrl);
  };

  const handleInterestRateChange = (value: string) => {
    const sanitized = sanitizeInterestRateInput(value);
    if (sanitized === null) {
      return;
    }

    setForm((prev) => ({ ...prev, interest_rate: sanitized }));
  };

  const handleInterestRateBlur = () => {
    setForm((prev) => {
      const finalized = finalizeInterestRate(prev.interest_rate);
      if (finalized === prev.interest_rate) {
        return prev;
      }

      return { ...prev, interest_rate: finalized };
    });
  };

  const applyLoanProduct = (productId: number) => {
    const selected = loanProducts.find((item) => item.id === productId);
    setIsProductDetailsEditable(false);
    setForm((prev) => {
      if (!selected) {
        return {
          ...prev,
          loan_product_id: 0,
        };
      }

      return {
        ...prev,
        loan_product_id: selected.id,
        loan_amount: resolveLoanAmountFromProduct(selected) || prev.loan_amount,
        interest_rate: finalizeInterestRate(String(selected.interest_rate ?? '')) || '0',
        interest_type: selected.interest_type || 'flat',
        terms_count: String(selected.terms_count ?? ''),
        refund_option: selected.refund_option || 'month',
      };
    });
  };

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
    } else {
      setAuthUser(null);
    }
  }, [router]);

  useEffect(() => {
    if (!isCollectionOfficer) return;
    if (fieldOfficers.length === 0) return;

    const authEmployeeId = Number(authUser?.employee?.id || 0);
    const candidateNames = authUserCandidateNames.map((name) => normalizeText(name));

    let matchedOfficer =
      authEmployeeId > 0 ? fieldOfficers.find((officer) => Number(officer.id) === authEmployeeId) : undefined;

    if (!matchedOfficer) {
      matchedOfficer = fieldOfficers.find((officer) => candidateNames.includes(normalizeText(officer.name)));
    }

    if (!matchedOfficer) {
      return;
    }

    setForm((prev) =>
      prev.field_officer === matchedOfficer.name
        ? prev
        : {
            ...prev,
            field_officer: matchedOfficer.name,
          }
    );
  }, [isCollectionOfficer, fieldOfficers, authUser, authUserCandidateNames]);

  useEffect(() => {
    if (!token) return;

    const loadMasterData = async () => {
      setManagersLoading(true);
      try {
        const [routeRes, centerRes, groupRes, loanProductRes, employeeRes, customerRes, loanRequestRes] = await Promise.all([
          axios.get(`${API_BASE}/microfinance/settings/routes`, { headers }),
          axios.get(`${API_BASE}/microfinance/settings/centers`, { headers }),
          axios.get(`${API_BASE}/microfinance/settings/groups`, { headers }),
          axios.get(`${API_BASE}/microfinance/settings/loan-products`, { headers }),
          axios.get(`${API_BASE}/hr/employees`, { headers }),
          axios.get(`${API_BASE}/customers`, { headers, params: { per_page: 1000 } }),
          axios.get(`${API_BASE}/microfinance/loan-requests`, { headers }),
        ]);

        setRoutes(routeRes.data || []);
        setCenters(centerRes.data || []);
        setGroups(groupRes.data || []);
        setLoanProducts(Array.isArray(loanProductRes.data) ? loanProductRes.data : []);

        const employeeRows = Array.isArray(employeeRes.data?.data) ? employeeRes.data.data : [];
        const mappedEmployees: ManagerOption[] = employeeRows
          .map((emp: any) => {
            const firstName = emp?.first_name || '';
            const lastName = emp?.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const branchName = String(emp?.branch?.name || emp?.branch_name || '').trim();

            return {
              id: Number(emp?.id || 0),
              name: fullName || emp?.email || '',
              designation: emp?.designation?.name || '',
              branch: branchName,
            };
          })
          .filter((emp: ManagerOption) => emp.id > 0 && emp.name);

        const managerOnly = mappedEmployees.filter((emp) =>
          normalizeText(String(emp.designation || '')).includes('manager')
        );
        const officerOnly = mappedEmployees.filter((emp) => /officer/i.test(emp.designation));
        setManagers(managerOnly);
        setFieldOfficers(officerOnly.length > 0 ? officerOnly : mappedEmployees);

        const customerRows = Array.isArray(customerRes.data?.data) ? customerRes.data.data : [];
        setCustomers(customerRows);

        const loanRequestRows: ExistingLoanRequest[] = Array.isArray(loanRequestRes.data) ? loanRequestRes.data : [];
        const nicknameMap = loanRequestRows.reduce<Record<string, string>>((acc, request) => {
          const customerNo = normalizeCustomerNo(String(request.customer_no || ''));
          const nickName = String(request.nick_name || '').trim();

          if (customerNo && nickName) {
            acc[customerNo] = nickName;
          }

          return acc;
        }, {});

        setLoanRequestNicknamesByCustomerNo(nicknameMap);
      } catch {
        openModal('Failed to load route/center/group data.', 'Error');
      } finally {
        setManagersLoading(false);
      }
    };

    loadMasterData();
  }, [token, headers]);

  useEffect(() => {
    const amount = Number(form.loan_amount || 0);
    const interest = Number(form.interest_rate || 0);
    const termCount = Number(form.terms_count || 0);

    let monthsEquivalent = termCount;
    if (form.refund_option === 'week') {
      monthsEquivalent = termCount / 4;
    } else if (form.refund_option === 'day') {
      monthsEquivalent = termCount / 25;
    }

    const monthlyRate = interest / 100;
    let refundable = 0;
    let installment = 0;

    if (form.interest_type === 'reducing') {
      const periodsPerMonth = form.refund_option === 'day' ? 25 : form.refund_option === 'week' ? 4 : 1;
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
      // Flat monthly simple interest: P + (P * r * months)
      refundable = amount + amount * monthlyRate * monthsEquivalent;
      installment = termCount > 0 ? refundable / termCount : 0;
    }

    setForm((prev) => ({
      ...prev,
      refundable_amount: refundable ? refundable.toFixed(2) : '',
      installment_amount: installment ? installment.toFixed(2) : '',
    }));
  }, [form.loan_amount, form.interest_rate, form.terms_count, form.refund_option, form.interest_type]);

  useEffect(() => {
    if (!token) return;

    if (form.loan_scope === 'route_loan' && !form.mf_route_id) {
      setForm((prev) => ({ ...prev, customer_no: '' }));
      return;
    }

    if (form.loan_scope === 'center_loan' && (!form.mf_route_id || !form.mf_center_id)) {
      setForm((prev) => ({ ...prev, customer_no: '' }));
      return;
    }

    const loadCustomerNo = async () => {
      try {
        const response = await axios.get(`${API_BASE}/microfinance/loan-requests/meta`, {
          headers,
          params: {
            loan_scope: form.loan_scope,
            mf_route_id: form.mf_route_id || null,
            mf_center_id: form.mf_center_id || null,
          },
        });

        setForm((prev) => ({ ...prev, customer_no: response.data.customer_no || '' }));
      } catch {
        setForm((prev) => ({ ...prev, customer_no: '' }));
      }
    };

    loadCustomerNo();
  }, [loanCodeMetaKey, token, headers]);

  useEffect(() => {
    const sanitizedNic = (form.nic || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const generatedCode = sanitizedNic ? `CU-${sanitizedNic.slice(-6)}` : '';

    setForm((prev) => {
      if (customerCodeTouched && prev.customer_code.trim() !== '') {
        return prev;
      }

      if (prev.customer_code === generatedCode) {
        return prev;
      }

      return { ...prev, customer_code: generatedCode };
    });
  }, [form.nic, customerCodeTouched]);

  const filteredCenters = centers.filter((c) => c.mf_route_id === form.mf_route_id);
  const filteredGroups = groups.filter(
    (g) => g.mf_route_id === form.mf_route_id && g.mf_center_id === form.mf_center_id
  );
  const selectedRoute = routes.find((r) => r.id === form.mf_route_id);
  const selectedCenter = centers.find((c) => c.id === form.mf_center_id);
  const selectedGroup = groups.find((g) => g.id === form.mf_group_id);
  const termUnitLabel = form.refund_option === 'day' ? 'Days' : form.refund_option === 'week' ? 'Weeks' : 'Months';
  const activeGuarantorCount = guarantors.filter((g) => g.name.trim() !== '').length;
  const totalCharges =
    Number(form.document_charges || 0) +
    Number(form.stamp_charges || 0) +
    Number(form.insurance_charges || 0);
  const netDisbursedAmount = form.charge_payment_mode === 'deduct_from_loan'
    ? Math.max(Number(form.loan_amount || 0) - totalCharges, 0)
    : Number(form.loan_amount || 0);
  const balanceAmount = netDisbursedAmount;

  const nicSuggestions = useMemo(() => {
    const keyword = form.nic.trim().toLowerCase();
    if (!keyword) return [];

    return customers
      .filter((customer) => (customer.nic_passport || '').toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [customers, form.nic]);

  const guarantorLookupOptions = useMemo<GuarantorLookupOption[]>(() => {
    const unique = new Map<string, GuarantorLookupOption>();

    customers.forEach((customer) => {
      const firstName = String(customer.first_name || '').trim();
      const lastName = String(customer.last_name || '').trim();
      const name = `${firstName} ${lastName}`.trim();
      const nic = String(customer.nic_passport || '').trim();

      if (!name || !nic) {
        return;
      }

      const key = `${name.toLowerCase()}|${nic.toLowerCase()}`;
      if (unique.has(key)) {
        return;
      }

      unique.set(key, {
        id: Number(customer.id || 0),
        name,
        nic,
        address: String(customer.current_address || customer.permanent_address || '').trim(),
        contact_no: String(customer.phone || '').trim(),
      });
    });

    return Array.from(unique.values());
  }, [customers]);

  const findGuarantorMatches = (query: string) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];

    return guarantorLookupOptions
      .filter((option) =>
        option.name.toLowerCase().includes(keyword) || option.nic.toLowerCase().includes(keyword)
      )
      .slice(0, 8);
  };

  const fillCustomerFromRecord = useCallback(
    (customer: ExistingCustomer) => {
      const first = (customer.first_name || '').trim();
      const last = (customer.last_name || '').trim();
      const fullName = `${first} ${last}`.trim();
      const address = (customer.current_address || customer.permanent_address || '').trim();
      const customerCode = normalizeCustomerNo(String(customer.customer_code || ''));

      setForm((prev) => ({
        ...prev,
        customer_code: customerCode || prev.customer_code,
        nic: customer.nic_passport || prev.nic,
        customer_name: fullName || prev.customer_name,
        nick_name:
          (customer.nick_name || '').trim() ||
          loanRequestNicknamesByCustomerNo[customerCode] ||
          prev.nick_name,
        address: address || prev.address,
        contact_no: customer.phone || prev.contact_no,
      }));
      const existingPhotoUrl = resolveCustomerPhotoUrl(customer);
      setExistingCustomerPhotoUrl(existingPhotoUrl);
      setCustomerPhotoPreview(existingPhotoUrl);
      setCustomerPhotoFile(null);
      if (customerPhotoInputRef.current) {
        customerPhotoInputRef.current.value = '';
      }
    },
    [loanRequestNicknamesByCustomerNo, resolveCustomerPhotoUrl]
  );

  const lookupCustomerByCode = useCallback(
    async (rawCode: string, showNotFoundNotice = false) => {
      const code = normalizeCustomerNo(rawCode);
      if (!token || code.length < 2) {
        setCustomerCodeLookupNotice('');
        return false;
      }

      const localMatch = customers.find(
        (customer) => normalizeCustomerNo(String(customer.customer_code || '')) === code
      );
      if (localMatch) {
        fillCustomerFromRecord(localMatch);
        setCustomerCodeLookupNotice('');
        return true;
      }

      const requestId = customerCodeLookupRequestRef.current + 1;
      customerCodeLookupRequestRef.current = requestId;
      setCustomerCodeLookupLoading(true);

      try {
        const response = await axios.get(`${API_BASE}/customers/by-code/${encodeURIComponent(code)}`, {
          headers,
        });

        if (customerCodeLookupRequestRef.current !== requestId) {
          return false;
        }

        fillCustomerFromRecord(response.data as ExistingCustomer);
        setCustomerCodeLookupNotice('');
        return true;
      } catch {
        if (customerCodeLookupRequestRef.current !== requestId) {
          return false;
        }

        if (showNotFoundNotice) {
          setCustomerCodeLookupNotice('No registered customer found for this customer number.');
        } else {
          setCustomerCodeLookupNotice('');
        }

        return false;
      } finally {
        if (customerCodeLookupRequestRef.current === requestId) {
          setCustomerCodeLookupLoading(false);
        }
      }
    },
    [token, headers, customers, fillCustomerFromRecord]
  );

  useEffect(() => {
    const code = normalizeCustomerNo(form.customer_code);
    if (code.length < 2) {
      setCustomerCodeLookupNotice('');
      return;
    }

    const timer = window.setTimeout(() => {
      void lookupCustomerByCode(code);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [form.customer_code, lookupCustomerByCode]);

  useEffect(() => {
    if (!customerPhotoFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(customerPhotoFile);
    setCustomerPhotoPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [customerPhotoFile]);

  const applyCustomerFromSuggestion = (customer: ExistingCustomer) => {
    fillCustomerFromRecord(customer);
    setShowNicSuggestions(false);
    setCustomerCodeLookupNotice('');
  };

  const addGuarantor = () => {
    setGuarantors((prev) => [...prev, { name: '', nic: '', address: '', contact_no: '', relationship: '' }]);
  };

  const removeGuarantor = (index: number) => {
    setGuarantors((prev) => prev.filter((_, i) => i !== index));
    setGuarantorFinderQueryByIndex((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const currentIndex = Number(key);
        if (currentIndex < index) {
          next[currentIndex] = value;
        } else if (currentIndex > index) {
          next[currentIndex - 1] = value;
        }
      });
      return next;
    });
    if (activeGuarantorFinderIndex === index) {
      setActiveGuarantorFinderIndex(null);
    }
  };

  const updateGuarantor = (index: number, field: keyof Guarantor, value: string) => {
    setGuarantors((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };

  const applyGuarantorFromFinder = (index: number, option: GuarantorLookupOption) => {
    setGuarantors((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              name: option.name,
              nic: option.nic,
              contact_no: option.contact_no || row.contact_no,
              address: option.address || row.address,
            }
          : row
      )
    );

    setGuarantorFinderQueryByIndex((prev) => ({
      ...prev,
      [index]: `${option.name} (${option.nic})`,
    }));
    setActiveGuarantorFinderIndex(null);
  };

  const addDocument = () => {
    setDocuments((prev) => [...prev, { document_type: '', file: null }]);
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDocumentType = (index: number, value: string) => {
    setDocuments((prev) => prev.map((doc, i) => (i === index ? { ...doc, document_type: value } : doc)));
  };

  const updateDocumentFile = async (index: number, file: File | null) => {
    if (!file) {
      setDocuments((prev) => prev.map((doc, i) => (i === index ? { ...doc, file: null } : doc)));
      return;
    }

    if (!isAllowedImageType(file)) {
      openModal('Only JPG, JPEG, PNG, and WEBP images are allowed.', 'Validation');
      return;
    }

    try {
      const optimizedFile = await compressImageIfNeeded(file, CUSTOMER_PHOTO_MAX_BYTES);
      if (optimizedFile.size > CUSTOMER_PHOTO_MAX_BYTES) {
        openModal('Selected image is too large. Please use an image under 5 MB.', 'Validation');
        return;
      }

      setDocuments((prev) => prev.map((doc, i) => (i === index ? { ...doc, file: optimizedFile } : doc)));
    } catch {
      openModal('Unable to process this image. Please choose another file.', 'Validation');
    }
  };

  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if ((form.loan_scope === 'route_loan' || form.loan_scope === 'center_loan') && !form.mf_route_id) {
        return 'Please select a route to continue.';
      }

      if (form.loan_scope === 'center_loan' && !form.mf_center_id) {
        return 'Please select a center to continue.';
      }

      if (form.loan_scope === 'center_loan' && !form.mf_group_id) {
        return 'Please select a group to continue.';
      }
    }

    if (step === 2) {
      if (!form.manager_employee_id) {
        return 'Please select a manager to continue.';
      }

      if (!form.field_officer.trim()) {
        return 'Please select a field officer to continue.';
      }
    }

    if (step === 3) {
      if (!form.customer_code.trim()) {
        return 'Customer Number is required to continue.';
      }

      if (!form.customer_name.trim()) {
        return 'Please enter customer name to continue.';
      }

      if (!form.nic.trim()) {
        return 'Please enter NIC to continue.';
      }

      if (!form.address.trim()) {
        return 'Please enter customer address to continue.';
      }

      if (!form.contact_no.trim()) {
        return 'Please enter contact number to continue.';
      }
    }

    if (step === 6) {
      if (!form.loan_amount || Number(form.loan_amount) <= 0) {
        return 'Please enter a valid loan amount.';
      }

      const finalizedInterestRate = finalizeInterestRate(form.interest_rate);
      if (!finalizedInterestRate || Number(finalizedInterestRate) < 0) {
        return 'Please enter a valid interest rate.';
      }

      if (!form.terms_count || Number(form.terms_count) < 1) {
        return 'Please enter terms count.';
      }

      if (!form.loan_request_date) {
        return 'Please select loan request date.';
      }
    }

    return null;
  };

  const handleNextStep = () => {
    const error = validateStep(activeStep);
    if (error) {
      openModal(error, 'Validation');
      return;
    }

    setActiveStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleStepClick = (stepId: number) => {
    if (stepId <= activeStep) {
      setActiveStep(stepId);
      return;
    }

    const error = validateStep(activeStep);
    if (error) {
      openModal(error, 'Validation');
      return;
    }

    setActiveStep(stepId);
  };

  const validateBeforeSubmit = () => {
    for (let i = 1; i <= steps.length; i += 1) {
      const error = validateStep(i);
      if (error) {
        setActiveStep(i);
        openModal(error, 'Validation');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateBeforeSubmit()) {
      return;
    }

    setLoading(true);

    const pendingCustomerPhoto = customerPhotoFile;

    try {
      const loanResponse = await axios.post(
        `${API_BASE}/microfinance/loan-requests`,
        {
          ...form,
          loan_code: form.customer_no,
          customer_no: normalizeCustomerNo(form.customer_code),
          customer_code: normalizeCustomerNo(form.customer_code),
          loan_scope: form.loan_scope,
          mf_route_id: form.mf_route_id || null,
          mf_center_id: form.mf_center_id || null,
          mf_group_id: form.mf_group_id || null,
          manager_employee_id: Number(form.manager_employee_id || 0),
          loan_amount: Number(form.loan_amount),
          interest_rate: Number(finalizeInterestRate(form.interest_rate)),
          terms_count: Number(form.terms_count),
          refundable_amount: Number(form.refundable_amount),
          installment_amount: Number(form.installment_amount),
          document_charges: Number(form.document_charges || 0),
          stamp_charges: Number(form.stamp_charges || 0),
          insurance_charges: Number(form.insurance_charges || 0),
          charge_payment_mode: form.charge_payment_mode,
          charges_collection_status: form.charges_collection_status,
          interest_type: form.interest_type,
          guarantors: guarantors.filter((g) => g.name.trim() !== ''),
        },
        { headers }
      );

      let customerPhotoUploadFailed = false;
      if (pendingCustomerPhoto && form.customer_code.trim()) {
        try {
          await uploadCustomerPhoto(form.customer_code, pendingCustomerPhoto);
        } catch {
          customerPhotoUploadFailed = true;
        }
      }

      const loanId = loanResponse?.data?.id;
      if (loanId) {
        const readyDocs: LoanDocumentUpload[] = documents.filter(
          (doc) => doc.file && doc.document_type.trim() !== ''
        );
        if (pendingCustomerPhoto) {
          readyDocs.unshift({
            document_type: 'Customer Photo',
            file: pendingCustomerPhoto,
          });
        }

        if (readyDocs.length > 0) {
          const formData = new FormData();
          readyDocs.forEach((doc) => {
            formData.append('document_types[]', doc.document_type);
            formData.append('documents[]', doc.file as File);
          });

          await axios.post(
            `${API_BASE}/microfinance/loan-requests/${loanId}/documents`,
            formData,
            {
              headers: {
                ...headers,
                'Content-Type': 'multipart/form-data',
              },
            }
          );
        }
      }

      setCustomerPhotoFile(null);
      if (customerPhotoInputRef.current) {
        customerPhotoInputRef.current.value = '';
      }

      openModal(
        customerPhotoUploadFailed
          ? 'Loan request registered, but the customer photo could not be saved. You can upload it again later.'
          : 'Loan request registered successfully.',
        customerPhotoUploadFailed ? 'Warning' : 'Success',
        () => {
          router.push('/dashboard/microfinance/loans');
        }
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to register loan request.';
      openModal(message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-20 -left-16 h-80 w-80 rounded-full bg-emerald-300 blur-3xl"></div>
        <div className="absolute top-32 right-0 h-96 w-96 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-200 blur-3xl"></div>
      </div>
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_20px_60px_-25px_rgba(13,148,136,0.5)] p-6 md:p-8 space-y-8 relative z-10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Loan Officer Workspace
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-3">Request Loan</h1>
              <p className="text-sm text-slate-600 mt-1">Fast, guided registration with auto-generated loan code, editable customer number, and live calculations.</p>
            </div>
            <button type="button" onClick={() => router.push('/dashboard/microfinance/loans')} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold shadow-lg">
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="stepPanel">
                <div className="stepProgressBar">
                  <div className="stepProgressFill" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <div className="stepTabs mt-4">
                  {steps.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => handleStepClick(step.id)}
                      className={`stepTab ${activeStep === step.id ? 'active' : ''} ${step.id < activeStep ? 'done' : ''}`}
                    >
                      <span className="stepNumber">{step.id}</span>
                      <span className="stepText">
                        <span className="stepTitle">{step.title}</span>
                        <span className="stepHint">{step.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {activeStep === 1 && (
              <div className="sectionCard">
                <h2 className="sectionTitle">Location Mapping</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="fieldLabel">Loan Scope *</label>
                    <select
                      className="input"
                      value={form.loan_scope}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          loan_scope: e.target.value,
                          mf_route_id: 0,
                          mf_center_id: 0,
                          mf_group_id: 0,
                          customer_no: '',
                        }))
                      }
                      required
                    >
                      <option value="route_loan">Route Loan</option>
                      <option value="center_loan">Center Loan</option>
                      <option value="direct_loan">Direct Loan</option>
                    </select>
                  </div>
                  {form.loan_scope !== 'direct_loan' && (
                  <div>
                    <label className="fieldLabel">Route *</label>
                    <select className="input" value={form.mf_route_id} onChange={(e) => setForm((p) => ({ ...p, mf_route_id: Number(e.target.value), mf_center_id: 0, mf_group_id: 0 }))} required>
                      <option value={0}>Select Route</option>
                      {routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                    </select>
                  </div>
                  )}
                  {form.loan_scope === 'center_loan' && (
                  <div>
                    <label className="fieldLabel">Center *</label>
                    <select className="input" value={form.mf_center_id} onChange={(e) => setForm((p) => ({ ...p, mf_center_id: Number(e.target.value), mf_group_id: 0 }))} required>
                      <option value={0}>Select Center</option>
                      {filteredCenters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                    </select>
                  </div>
                  )}
                  {form.loan_scope === 'center_loan' && (
                  <div>
                    <label className="fieldLabel">Group *</label>
                    <select className="input" value={form.mf_group_id} onChange={(e) => setForm((p) => ({ ...p, mf_group_id: Number(e.target.value) }))} required>
                      <option value={0}>Select Group</option>
                      {filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
                    </select>
                  </div>
                  )}
                </div>
              </div>
              )}

              {activeStep === 2 && (
              <div className="sectionCard">
                <h2 className="sectionTitle">Officer & Team Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="fieldLabel">Manager *</label>
                    <select
                      className="input"
                      value={form.manager_employee_id}
                      onChange={(e) => {
                        const selectedId = Number(e.target.value || 0);
                        const selectedManager = managers.find((m) => m.id === selectedId);
                        setForm((p) => ({
                          ...p,
                          manager_employee_id: selectedId,
                          manager_name: selectedManager?.name || '',
                        }));
                      }}
                      required
                      disabled={managersLoading}
                    >
                      <option value={0}>{managersLoading ? 'Loading Managers...' : 'Select Manager'}</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                          {manager.designation || manager.branch
                            ? ` (${[manager.designation, manager.branch].filter(Boolean).join(' - ')})`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="fieldLabel">Field Officer *</label>
                    <select
                      className="input"
                      value={form.field_officer}
                      onChange={(e) => setForm((p) => ({ ...p, field_officer: e.target.value }))}
                      required
                      disabled={managersLoading || isCollectionOfficer}
                    >
                      <option value="">{managersLoading ? 'Loading Field Officers...' : 'Select Field Officer'}</option>
                      {fieldOfficers.map((officer) => (
                        <option key={officer.id} value={officer.name}>
                          {officer.name}
                          {officer.designation || officer.branch
                            ? ` (${[officer.designation, officer.branch].filter(Boolean).join(' - ')})`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="fieldLabel">Group Leader</label>
                    <input className="input" placeholder="Enter group leader name" value={form.group_leader} onChange={(e) => setForm((p) => ({ ...p, group_leader: e.target.value }))} />
                  </div>
                </div>
              </div>
              )}

              {activeStep === 3 && (
              <div className="sectionCard emerald">
                <h2 className="sectionTitle">Customer Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="fieldLabel">Loan Code</label>
                    <input className="input bg-slate-100" placeholder="Auto generated from scope/route/center" value={form.customer_no} readOnly />
                  </div>
                  <div>
                    <label className="fieldLabel">Customer Number</label>
                    <input
                      className="input"
                      placeholder="Auto short from NIC (editable)"
                      value={form.customer_code}
                      onChange={(e) => {
                        setCustomerCodeTouched(true);
                        setCustomerCodeLookupNotice('');
                        setForm((p) => ({ ...p, customer_code: e.target.value }));
                      }}
                      onBlur={() => {
                        void lookupCustomerByCode(form.customer_code, true);
                      }}
                    />
                    {customerCodeLookupLoading && (
                      <p className="mt-1 text-xs text-emerald-700">Loading customer details...</p>
                    )}
                    {!customerCodeLookupLoading && customerCodeLookupNotice && (
                      <p className="mt-1 text-xs text-amber-700">{customerCodeLookupNotice}</p>
                    )}
                  </div>
                  <div>
                    <label className="fieldLabel">Customer Name *</label>
                    <input className="input" placeholder="Enter customer full name" value={form.customer_name} onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="fieldLabel">Nick Name</label>
                    <input className="input" placeholder="Enter nick name" value={form.nick_name} onChange={(e) => setForm((p) => ({ ...p, nick_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="fieldLabel">NIC *</label>
                    <div className="relative">
                      <input
                        className="input"
                        placeholder="Enter NIC number"
                        value={form.nic}
                        onFocus={() => setShowNicSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowNicSuggestions(false), 150)}
                        onChange={(e) => {
                          setForm((p) => ({ ...p, nic: e.target.value }));
                          setShowNicSuggestions(true);
                        }}
                        required
                      />

                      {showNicSuggestions && nicSuggestions.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border border-emerald-100 bg-white shadow-xl max-h-56 overflow-auto">
                          {nicSuggestions.map((customer) => {
                            const first = (customer.first_name || '').trim();
                            const last = (customer.last_name || '').trim();
                            const fullName = `${first} ${last}`.trim() || 'Unnamed customer';

                            return (
                              <button
                                key={customer.id}
                                type="button"
                                onMouseDown={() => applyCustomerFromSuggestion(customer)}
                                className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-emerald-50 last:border-b-0"
                              >
                                <p className="text-sm font-semibold text-slate-800">{customer.nic_passport}</p>
                                <p className="text-xs text-slate-500">{fullName}</p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="fieldLabel">Address *</label>
                    <input className="input" placeholder="Enter customer address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="fieldLabel">Contact No *</label>
                    <input className="input" placeholder="Enter contact number" value={form.contact_no} onChange={(e) => setForm((p) => ({ ...p, contact_no: e.target.value }))} required />
                  </div>
                  <div className="md:col-span-3">
                    <label className="fieldLabel">Customer Photo</label>
                    <div className="rounded-xl border border-emerald-100 bg-white/95 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="h-24 w-24 shrink-0 rounded-xl border border-emerald-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                          {customerPhotoPreview ? (
                            <img
                              src={customerPhotoPreview}
                              alt="Customer preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-slate-400 text-center px-2">No photo</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            ref={customerPhotoInputRef}
                            className="customerPhotoInput"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              void handleCustomerPhotoChange(e.target.files?.[0] ?? null);
                            }}
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            JPG, PNG, or WEBP up to 5 MB. Saved on the customer profile and attached to this loan request.
                          </p>
                          {(customerPhotoFile || customerPhotoPreview) && (
                            <button
                              type="button"
                              onClick={clearCustomerPhotoSelection}
                              className="mt-3 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                            >
                              {customerPhotoFile ? 'Remove selected photo' : 'Clear preview'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {activeStep === 4 && (
              <div className="sectionCard cyan">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="sectionTitle">Guarantors</h2>
                  <button type="button" onClick={addGuarantor} className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold">+ Add Guarantor</button>
                </div>
                <div className="space-y-4">
                  {guarantors.map((g, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 border border-cyan-100 rounded-xl p-3 bg-white/95">
                      <div className="md:col-span-5 relative">
                        <label className="fieldLabel">Find Existing Guarantor (Name or NIC)</label>
                        <input
                          className="input"
                          placeholder="Type guarantor name or NIC"
                          value={guarantorFinderQueryByIndex[index] || ''}
                          onFocus={() => setActiveGuarantorFinderIndex(index)}
                          onBlur={() => setTimeout(() => setActiveGuarantorFinderIndex((prev) => (prev === index ? null : prev)), 150)}
                          onChange={(e) => {
                            const value = e.target.value;
                            setGuarantorFinderQueryByIndex((prev) => ({ ...prev, [index]: value }));
                            setActiveGuarantorFinderIndex(index);
                          }}
                        />

                        {activeGuarantorFinderIndex === index && (guarantorFinderQueryByIndex[index] || '').trim() !== '' && (
                          <div className="absolute z-20 mt-1 w-full rounded-xl border border-cyan-100 bg-white shadow-xl max-h-56 overflow-auto">
                            {findGuarantorMatches(guarantorFinderQueryByIndex[index] || '').length === 0 ? (
                              <p className="px-3 py-2 text-xs text-slate-500">No guarantor matches found.</p>
                            ) : (
                              findGuarantorMatches(guarantorFinderQueryByIndex[index] || '').map((option) => (
                                <button
                                  key={`${option.id}-${option.nic}`}
                                  type="button"
                                  onMouseDown={() => applyGuarantorFromFinder(index, option)}
                                  className="w-full text-left px-3 py-2 hover:bg-cyan-50 border-b border-cyan-50 last:border-b-0"
                                >
                                  <p className="text-sm font-semibold text-slate-800">{option.name}</p>
                                  <p className="text-xs text-slate-500">{option.nic}{option.contact_no ? ` • ${option.contact_no}` : ''}</p>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="fieldLabel">Guarantor Name</label>
                        <input className="input" placeholder="Enter name" value={g.name} onChange={(e) => updateGuarantor(index, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="fieldLabel">NIC</label>
                        <input className="input" placeholder="Enter NIC" value={g.nic} onChange={(e) => updateGuarantor(index, 'nic', e.target.value)} />
                      </div>
                      <div>
                        <label className="fieldLabel">Contact No</label>
                        <input className="input" placeholder="Enter contact number" value={g.contact_no} onChange={(e) => updateGuarantor(index, 'contact_no', e.target.value)} />
                      </div>
                      <div>
                        <label className="fieldLabel">Relationship</label>
                        <input className="input" placeholder="Enter relationship" value={g.relationship} onChange={(e) => updateGuarantor(index, 'relationship', e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-full">
                          <label className="fieldLabel">Address</label>
                          <input className="input" placeholder="Enter address" value={g.address} onChange={(e) => updateGuarantor(index, 'address', e.target.value)} />
                        </div>
                        {guarantors.length > 1 && (
                          <button type="button" onClick={() => removeGuarantor(index)} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {activeStep === 5 && (
              <div className="sectionCard cyan">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="sectionTitle">Loan Documents</h2>
                  <button type="button" onClick={addDocument} className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold">+ Add Document</button>
                </div>
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-cyan-100 rounded-xl p-3 bg-white/95">
                      <div>
                        <label className="fieldLabel">Document Type</label>
                        <select
                          className="input"
                          value={doc.document_type}
                          onChange={(e) => updateDocumentType(index, e.target.value)}
                        >
                          <option value="">Select document type</option>
                          <option value="Customer NIC Front">Customer NIC Front</option>
                          <option value="Customer NIC Back">Customer NIC Back</option>
                          <option value="Guarantor Photo">Guarantor Photo</option>
                          <option value="Guarantor Document">Guarantor Document</option>
                          <option value="Customer Photo">Customer Photo</option>
                          <option value="GS Certificate">GS Certificate</option>
                          <option value="Utility Bill">Utility Bill</option>
                          <option value="Income Proof">Income Proof</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="fieldLabel">Upload File</label>
                        <input
                          className="input"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            void updateDocumentFile(index, e.target.files?.[0] ?? null);
                          }}
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        {documents.length > 1 && (
                          <button type="button" onClick={() => removeDocument(index)} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {activeStep === 6 && (
              <div className="sectionCard blue">
                <h2 className="sectionTitle">Loan Details</h2>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-blue-200 bg-white/90 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800">Select Loan Product</h3>
                    <p className="mt-1 text-xs text-slate-600">Choose a product from settings to auto-fill interest type, rate, terms count, and refund option.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="fieldLabel">Loan Product</label>
                        <select
                          className="input"
                          value={form.loan_product_id}
                          onChange={(e) => applyLoanProduct(Number(e.target.value))}
                        >
                          <option value={0}>Select Loan Product (Optional)</option>
                          {loanProducts
                            .filter((product) => Boolean(product.is_active))
                            .map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {finalizeInterestRate(String(product.interest_rate || 0))}% ({product.interest_type}) / {product.terms_count} {product.refund_option}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-slate-700">
                        {selectedLoanProduct ? (
                          <div className="space-y-1">
                            <p><span className="font-semibold text-slate-900">Selected:</span> {selectedLoanProduct.name}</p>
                            <p><span className="font-semibold text-slate-900">Rate:</span> {finalizeInterestRate(String(selectedLoanProduct.interest_rate || 0))}% ({selectedLoanProduct.interest_type})</p>
                            <p><span className="font-semibold text-slate-900">Terms:</span> {selectedLoanProduct.terms_count} ({selectedLoanProduct.refund_option})</p>
                          </div>
                        ) : (
                          <p>Select a product to auto-fill defaults. You can still modify values below.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {!selectedLoanProduct ? (
                    <div className="rounded-xl border border-blue-200 bg-white/95 p-4">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800">Custom Loan Details</h3>
                      <p className="mt-1 text-xs text-slate-600">Adjust any values below as needed before final submission.</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <label className="fieldLabel">Loan Code</label>
                          <input className="input bg-slate-100" placeholder="Auto generated from scope/route/center" value={form.customer_no} readOnly />
                        </div>
                        <div>
                          <label className="fieldLabel">Loan Amount *</label>
                          <input
                            className="input bg-slate-100"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Enter loan amount"
                            value={form.loan_amount}
                            onChange={(e) => setForm((p) => ({ ...p, loan_amount: e.target.value }))}
                            required
                            disabled
                          />
                        </div>
                        <div>
                          <label className="fieldLabel">Reason</label>
                          <input className="input" placeholder="Enter reason for loan" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
                        </div>
                        <div>
                          <label className="fieldLabel">Refund Option *</label>
                          <select className="input" value={form.refund_option} onChange={(e) => setForm((p) => ({ ...p, refund_option: e.target.value }))} required>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                          </select>
                        </div>
                        <div>
                          <label className="fieldLabel">Interest Rate (%) *</label>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.0000001"
                            inputMode="decimal"
                            placeholder="e.g. 5.5555555"
                            value={form.interest_rate}
                            onChange={(e) => handleInterestRateChange(e.target.value)}
                            onBlur={handleInterestRateBlur}
                            required
                          />
                          <p className="text-[11px] text-slate-500 mt-1">Up to {INTEREST_RATE_MAX_DECIMALS} decimal places</p>
                        </div>
                        <div>
                          <label className="fieldLabel">Interest Type *</label>
                          <select className="input" value={form.interest_type} onChange={(e) => setForm((p) => ({ ...p, interest_type: e.target.value }))} required>
                            <option value="flat">Flat</option>
                            <option value="reducing">Reducing</option>
                          </select>
                        </div>
                        <div>
                          <label className="fieldLabel">Terms Count ({termUnitLabel}) *</label>
                          <input className="input" type="number" min="1" step="1" placeholder={`Enter number of ${termUnitLabel.toLowerCase()}`} value={form.terms_count} onChange={(e) => setForm((p) => ({ ...p, terms_count: e.target.value }))} required />
                          <p className="text-[11px] text-slate-500 mt-1">Conversion: 4 weeks = 1 month, 25 days = 1 month</p>
                        </div>
                        <div>
                          <label className="fieldLabel">Refundable Amount</label>
                          <input className="input bg-slate-100" placeholder="Auto calculated" value={form.refundable_amount} readOnly />
                        </div>
                        <div>
                          <label className="fieldLabel">Installment Amount</label>
                          <input className="input bg-slate-100" placeholder="Auto calculated" value={form.installment_amount} readOnly />
                        </div>
                        <div>
                          <label className="fieldLabel">Document Charges</label>
                          <input className="input" type="number" min="0" step="0.01" placeholder="Enter document charges" value={form.document_charges} onChange={(e) => setForm((p) => ({ ...p, document_charges: e.target.value }))} />
                        </div>
                        <div>
                          <label className="fieldLabel">Stamp Charges</label>
                          <input className="input" type="number" min="0" step="0.01" placeholder="Enter stamp charges" value={form.stamp_charges} onChange={(e) => setForm((p) => ({ ...p, stamp_charges: e.target.value }))} />
                        </div>
                        <div>
                          <label className="fieldLabel">Insurance Charges</label>
                          <input className="input" type="number" min="0" step="0.01" placeholder="Enter insurance charges" value={form.insurance_charges} onChange={(e) => setForm((p) => ({ ...p, insurance_charges: e.target.value }))} />
                        </div>
                        <div>
                          <label className="fieldLabel">Charges Collection Mode *</label>
                          <select className="input" value={form.charge_payment_mode} onChange={(e) => setForm((p) => ({ ...p, charge_payment_mode: e.target.value }))} required>
                            <option value="hand_cash">Collect by Hand Cash</option>
                            <option value="deduct_from_loan">Reduce from Loan Amount</option>
                          </select>
                        </div>
                        <div>
                          <label className="fieldLabel">Balance Amount</label>
                          <input
                            className="input bg-slate-100"
                            value={balanceAmount.toFixed(2)}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="fieldLabel">Loan Request Date *</label>
                          <input className="input" type="date" value={form.loan_request_date} onChange={(e) => setForm((p) => ({ ...p, loan_request_date: e.target.value }))} required />
                        </div>
                        <div className="md:col-span-2">
                          <label className="fieldLabel">Charges Collection</label>
                          <label className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm font-semibold text-emerald-900">
                            <input
                              type="checkbox"
                              checked={form.charges_collection_status === 'done'}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  charges_collection_status: e.target.checked ? 'done' : 'pending',
                                }))
                              }
                            />
                            Charges collection done
                          </label>
                          <p className="mt-1 text-xs text-slate-600">
                            Status: {form.charges_collection_status === 'done' ? 'Done' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-blue-200 bg-white/95 p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800">Product Loan Details</h3>
                          <p className="mt-1 text-xs text-slate-600">Loan terms are auto-filled from selected product. Custom section is hidden.</p>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-semibold text-blue-800">
                          <input
                            type="checkbox"
                            checked={isProductDetailsEditable}
                            onChange={(e) => setIsProductDetailsEditable(e.target.checked)}
                          />
                          Enable edit
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <label className="fieldLabel">Loan Code</label>
                          <input className="input bg-slate-100" placeholder="Auto generated from scope/route/center" value={form.customer_no} readOnly />
                        </div>
                        <div>
                          <label className="fieldLabel">Loan Amount *</label>
                          <input
                            className={`input ${isProductDetailsEditable ? '' : 'bg-slate-100'}`}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Enter loan amount"
                            value={form.loan_amount}
                            onChange={(e) => setForm((p) => ({ ...p, loan_amount: e.target.value }))}
                            required
                            disabled={!isProductDetailsEditable}
                            readOnly={!isProductDetailsEditable}
                          />
                        </div>
                        <div>
                          <label className="fieldLabel">Reason</label>
                          <input className="input" placeholder="Enter reason for loan" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
                        </div>
                        <div>
                          <label className="fieldLabel">Refund Option</label>
                          <select
                            className={`input ${isProductDetailsEditable ? '' : 'bg-slate-100'}`}
                            value={form.refund_option}
                            onChange={(e) => setForm((p) => ({ ...p, refund_option: e.target.value }))}
                            disabled={!isProductDetailsEditable}
                          >
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                          </select>
                        </div>
                        <div>
                          <label className="fieldLabel">Interest Rate (%)</label>
                          <input
                            className={`input ${isProductDetailsEditable ? '' : 'bg-slate-100'}`}
                            type="number"
                            min="0"
                            step="0.0000001"
                            inputMode="decimal"
                            value={form.interest_rate}
                            onChange={(e) => handleInterestRateChange(e.target.value)}
                            onBlur={handleInterestRateBlur}
                            disabled={!isProductDetailsEditable}
                            readOnly={!isProductDetailsEditable}
                          />
                        </div>
                        <div>
                          <label className="fieldLabel">Interest Type</label>
                          <select
                            className={`input ${isProductDetailsEditable ? '' : 'bg-slate-100'}`}
                            value={form.interest_type}
                            onChange={(e) => setForm((p) => ({ ...p, interest_type: e.target.value }))}
                            disabled={!isProductDetailsEditable}
                          >
                            <option value="flat">Flat</option>
                            <option value="reducing">Reducing</option>
                          </select>
                        </div>
                        <div>
                          <label className="fieldLabel">Terms Count ({termUnitLabel})</label>
                          <input
                            className={`input ${isProductDetailsEditable ? '' : 'bg-slate-100'}`}
                            type="number"
                            min="1"
                            step="1"
                            value={form.terms_count || ''}
                            onChange={(e) => setForm((p) => ({ ...p, terms_count: e.target.value }))}
                            disabled={!isProductDetailsEditable}
                            readOnly={!isProductDetailsEditable}
                          />
                        </div>
                        <div>
                          <label className="fieldLabel">Refundable Amount</label>
                          <input className="input bg-slate-100" placeholder="Auto calculated" value={form.refundable_amount} readOnly />
                        </div>
                        <div>
                          <label className="fieldLabel">Installment Amount</label>
                          <input className="input bg-slate-100" placeholder="Auto calculated" value={form.installment_amount} readOnly />
                        </div>
                        <div>
                          <label className="fieldLabel">Document Charges</label>
                          <input className="input" type="number" min="0" step="0.01" placeholder="Enter document charges" value={form.document_charges} onChange={(e) => setForm((p) => ({ ...p, document_charges: e.target.value }))} />
                        </div>
                        <div>
                          <label className="fieldLabel">Stamp Charges</label>
                          <input className="input" type="number" min="0" step="0.01" placeholder="Enter stamp charges" value={form.stamp_charges} onChange={(e) => setForm((p) => ({ ...p, stamp_charges: e.target.value }))} />
                        </div>
                        <div>
                          <label className="fieldLabel">Insurance Charges</label>
                          <input className="input" type="number" min="0" step="0.01" placeholder="Enter insurance charges" value={form.insurance_charges} onChange={(e) => setForm((p) => ({ ...p, insurance_charges: e.target.value }))} />
                        </div>
                        <div>
                          <label className="fieldLabel">Charges Collection Mode *</label>
                          <select className="input" value={form.charge_payment_mode} onChange={(e) => setForm((p) => ({ ...p, charge_payment_mode: e.target.value }))} required>
                            <option value="hand_cash">Collect by Hand Cash</option>
                            <option value="deduct_from_loan">Reduce from Loan Amount</option>
                          </select>
                        </div>
                        <div>
                          <label className="fieldLabel">Balance Amount</label>
                          <input className="input bg-slate-100" value={balanceAmount.toFixed(2)} readOnly />
                        </div>
                        <div>
                          <label className="fieldLabel">Loan Request Date *</label>
                          <input className="input" type="date" value={form.loan_request_date} onChange={(e) => setForm((p) => ({ ...p, loan_request_date: e.target.value }))} required />
                        </div>
                        <div className="md:col-span-2">
                          <label className="fieldLabel">Charges Collection</label>
                          <label className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm font-semibold text-emerald-900">
                            <input
                              type="checkbox"
                              checked={form.charges_collection_status === 'done'}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  charges_collection_status: e.target.checked ? 'done' : 'pending',
                                }))
                              }
                            />
                            Charges collection done
                          </label>
                          <p className="mt-1 text-xs text-slate-600">
                            Status: {form.charges_collection_status === 'done' ? 'Done' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              <div className="flex justify-end">
                <div className="w-full flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => Math.max(prev - 1, 1))}
                    disabled={activeStep === 1}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back Step
                  </button>

                  {activeStep < steps.length ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg hover:from-emerald-700 hover:to-teal-700"
                    >
                      Continue
                    </button>
                  ) : (
                    <button disabled={loading} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed hover:from-emerald-700 hover:to-teal-700">
                      {loading && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>}
                      {loading ? 'Registering Loan...' : 'Register Loan'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-1">
              <div className="sticky top-6 rounded-2xl border border-emerald-100 bg-white/90 shadow-lg p-5 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Live Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="summaryTile">
                    <p className="summaryLabel">Loan Code</p>
                    <p className="summaryValue text-xs break-all">{form.customer_no || '-'}</p>
                  </div>
                  <div className="summaryTile">
                    <p className="summaryLabel">Refund Mode</p>
                    <p className="summaryValue capitalize">{form.refund_option}</p>
                  </div>
                  <div className="summaryTile">
                    <p className="summaryLabel">Installment</p>
                    <p className="summaryValue">{form.installment_amount || '0.00'}</p>
                  </div>
                  <div className="summaryTile">
                    <p className="summaryLabel">Refundable</p>
                    <p className="summaryValue">{form.refundable_amount || '0.00'}</p>
                  </div>
                  <div className="summaryTile">
                    <p className="summaryLabel">Interest Type</p>
                    <p className="summaryValue capitalize">{form.interest_type}</p>
                  </div>
                  <div className="summaryTile">
                    <p className="summaryLabel">Total Charges</p>
                    <p className="summaryValue">{totalCharges.toFixed(2)}</p>
                  </div>
                  <div className="summaryTile">
                    <p className="summaryLabel">Net Disbursement</p>
                    <p className="summaryValue">{netDisbursedAmount.toFixed(2)}</p>
                  </div>
                  <div className="summaryTile">
                    <p className="summaryLabel">Balance Amount</p>
                    <p className="summaryValue">{balanceAmount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm space-y-1 text-black">
                  <p><span className="font-semibold">Loan Scope:</span> {form.loan_scope === 'center_loan' ? 'Center Loan' : form.loan_scope === 'route_loan' ? 'Route Loan' : 'Direct Loan'}</p>
                  <p><span className="font-semibold">Route:</span> {selectedRoute?.name || '-'}</p>
                  <p><span className="font-semibold">Center:</span> {selectedCenter?.name || '-'}</p>
                  <p><span className="font-semibold">Group:</span> {selectedGroup?.name || '-'}</p>
                  <p><span className="font-semibold">Guarantors:</span> {activeGuarantorCount}</p>
                  <p><span className="font-semibold">Charges Mode:</span> {form.charge_payment_mode === 'deduct_from_loan' ? 'Reduce from loan' : 'Hand cash'}</p>
                </div>

                <p className="text-xs text-slate-500">
                  Tip: select loan scope, route, and center to generate loan code automatically.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .stepPanel {
          border: 1px solid #a7f3d0;
          border-radius: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.09) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .stepProgressBar {
          width: 100%;
          height: 0.55rem;
          border-radius: 999px;
          background: rgba(148,163,184,0.22);
          overflow: hidden;
        }
        .stepProgressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #10b981 0%, #14b8a6 55%, #06b6d4 100%);
          transition: width 0.3s ease;
        }
        .stepTabs {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
        }
        @media (min-width: 768px) {
          .stepTabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .stepTab {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.85rem;
          padding: 0.55rem 0.7rem;
          text-align: left;
          background: rgba(255,255,255,0.86);
          color: #0f172a;
          transition: all 0.2s ease;
        }
        .stepTab:hover {
          border-color: #67e8f9;
          transform: translateY(-1px);
        }
        .stepTab.active {
          border-color: #14b8a6;
          background: rgba(240,253,250,0.95);
          box-shadow: 0 0 0 3px rgba(45,212,191,0.15);
        }
        .stepTab.done {
          border-color: #6ee7b7;
        }
        .stepNumber {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.7rem;
          height: 1.7rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 800;
          background: #e2e8f0;
          color: #334155;
          flex-shrink: 0;
        }
        .stepTab.active .stepNumber,
        .stepTab.done .stepNumber {
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          color: #ffffff;
        }
        .stepText {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .stepTitle {
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1.1;
        }
        .stepHint {
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.2;
        }
        .input {
          width: 100%;
          border: 1px solid #d1fae5;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 0.75rem;
          padding: 0.68rem 0.9rem;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
        }
        .input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2);
        }
        .customerPhotoInput {
          width: 100%;
          border: 1px solid #d1fae5;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 0.75rem;
          padding: 0.68rem 0.9rem;
          font-size: 0.9rem;
          color: #0f172a;
        }
        .customerPhotoInput::file-selector-button {
          margin-right: 0.75rem;
          border: 0;
          border-radius: 0.55rem;
          padding: 0.45rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 600;
          background: #d1fae5;
          color: #047857;
          cursor: pointer;
        }
        .customerPhotoInput::file-selector-button:hover {
          background: #a7f3d0;
        }
        .sectionCard {
          border: 1px solid #d1fae5;
          border-radius: 1rem;
          padding: 1.1rem;
          background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,253,250,0.72) 100%);
        }
        .sectionCard.cyan {
          border-color: #bae6fd;
          background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(236,254,255,0.8) 100%);
        }
        .sectionCard.blue {
          border-color: #bfdbfe;
          background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(239,246,255,0.78) 100%);
        }
        .sectionCard.emerald {
          border-color: #a7f3d0;
        }
        .sectionTitle {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.01em;
        }
        .fieldLabel {
          display: block;
          margin-bottom: 0.35rem;
          color: #0f172a;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .summaryTile {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.7rem;
          padding: 0.55rem;
        }
        .summaryLabel {
          color: #64748b;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.2rem;
        }
        .summaryValue {
          color: #0f172a;
          font-weight: 700;
        }
      `}</style>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-emerald-100">
            <h3 className="text-lg font-bold text-slate-900">{modal.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{modal.message}</p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
