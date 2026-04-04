'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Banknote } from 'lucide-react';

type ProductTypeRow = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  interest_rate?: number | string | null;
  interest_type?: 'fixed' | 'reducing' | null;
  tenure_months?: number | null;
  installment_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
};
function isRemovedProductTypeName(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  return normalized === 'hirepurchase'
    || normalized === 'loan'
    || normalized === 'hirepurchaseloan'
    || normalized === 'hirepurcheseloan';
}

type GuarantorInput = {
  name: string;
  nic: string;
  phone: string;
  address: string;
};

type RepaymentInstallmentRow = {
  installment_no: number;
  payment_date: string;
  amount: string;
};

type CustomerDetail = {
  id: number;
  customer_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nic_passport?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | null;
  nationality?: string | null;
  email?: string | null;
  phone?: string | null;
  permanent_address?: string | null;
  current_address?: string | null;
  employment_type?: 'salaried' | 'self_employed' | 'business' | null;
  employer_name?: string | null;
  job_title?: string | null;
  monthly_income?: number | string | null;
  other_income_sources?: string | null;
  existing_loans?: boolean | null;
  monthly_loan_obligations?: number | string | null;
  credit_score?: number | string | null;
};

export default function IssueFinancePage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [productTypes, setProductTypes] = useState<ProductTypeRow[]>([]);

  const [registerStep, setRegisterStep] = useState(1);
  const [savingRegister, setSavingRegister] = useState(false);
  const [regCustomerNo, setRegCustomerNo] = useState('');
  const [regFinanceType, setRegFinanceType] = useState('vehicle');
  const [regProductType, setRegProductType] = useState('');
  const [regStartDate, setRegStartDate] = useState('');
  const [regSubmissionMode, setRegSubmissionMode] = useState<'pending_approval' | 'active'>('pending_approval');
  const [regInterestRate, setRegInterestRate] = useState('18');
  const [regInterestType, setRegInterestType] = useState<'fixed' | 'reducing'>('fixed');
  const [regTenureMonths, setRegTenureMonths] = useState('36');
  const [regFrequency, setRegFrequency] = useState('monthly');
  const [regScheduleMode, setRegScheduleMode] = useState<'auto' | 'fixed_day' | 'custom_date'>('auto');
  const [regFirstInstallmentDate, setRegFirstInstallmentDate] = useState('');
  const [regCollectionDayOfMonth, setRegCollectionDayOfMonth] = useState('1');
  const [regGraceDays, setRegGraceDays] = useState('0');
  const [regInstallmentMode, setRegInstallmentMode] = useState<'auto' | 'manual'>('auto');
  const [regManualInstallmentAmount, setRegManualInstallmentAmount] = useState('');
  const [regInstallmentPlan, setRegInstallmentPlan] = useState<RepaymentInstallmentRow[]>([]);
  const [regYear1Amount, setRegYear1Amount] = useState('');
  const [regYear2Amount, setRegYear2Amount] = useState('');
  const [regYear3PlusAmount, setRegYear3PlusAmount] = useState('');
  const [regBulkRegularAmount, setRegBulkRegularAmount] = useState('');
  const [regBulkLastAmount, setRegBulkLastAmount] = useState('');

  const [regVehicleNo, setRegVehicleNo] = useState('');
  const [regChassisNo, setRegChassisNo] = useState('');
  const [regEngineNo, setRegEngineNo] = useState('');
  const [regMakeModel, setRegMakeModel] = useState('');
  const [regVehicleYear, setRegVehicleYear] = useState('');
  const [regAssetRef, setRegAssetRef] = useState('');
  const [regAmount, setRegAmount] = useState('');
  const [regDraftValue, setRegDraftValue] = useState('');
  const [regDownPayment, setRegDownPayment] = useState('');
  const [regValuationAmount, setRegValuationAmount] = useState('');
  const [regValuationDate, setRegValuationDate] = useState('');
  const [regValuerName, setRegValuerName] = useState('');

  const [regGuarantors, setRegGuarantors] = useState<GuarantorInput[]>([
    { name: '', nic: '', phone: '', address: '' },
  ]);

  const [regDocuments, setRegDocuments] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatingCustomerNo, setGeneratingCustomerNo] = useState(false);
  const [loadingCustomerDetail, setLoadingCustomerDetail] = useState(false);
  const [regCustomerDetail, setRegCustomerDetail] = useState<CustomerDetail | null>(null);
  const [regCustomerFirstName, setRegCustomerFirstName] = useState('');
  const [regCustomerLastName, setRegCustomerLastName] = useState('');
  const [regCustomerNic, setRegCustomerNic] = useState('');
  const [regCustomerDob, setRegCustomerDob] = useState('');
  const [regCustomerGender, setRegCustomerGender] = useState<'male' | 'female' | 'other'>('male');
  const [regCustomerMaritalStatus, setRegCustomerMaritalStatus] = useState<'single' | 'married' | 'divorced' | 'widowed'>('single');
  const [regCustomerNationality, setRegCustomerNationality] = useState('Sri Lankan');
  const [regCustomerPhone, setRegCustomerPhone] = useState('');
  const [regCustomerEmail, setRegCustomerEmail] = useState('');
  const [regCustomerPermanentAddress, setRegCustomerPermanentAddress] = useState('');
  const [regCustomerCurrentAddress, setRegCustomerCurrentAddress] = useState('');
  const [regEmploymentType, setRegEmploymentType] = useState<'salaried' | 'self_employed' | 'business'>('salaried');
  const [regEmployerName, setRegEmployerName] = useState('');
  const [regJobTitle, setRegJobTitle] = useState('');
  const [regMonthlyIncome, setRegMonthlyIncome] = useState('');
  const [regOtherIncomeSources, setRegOtherIncomeSources] = useState('');
  const [regExistingLoans, setRegExistingLoans] = useState(false);
  const [regMonthlyLoanObligations, setRegMonthlyLoanObligations] = useState('');
  const [regCreditScore, setRegCreditScore] = useState('');
  const [savingCustomerProfile, setSavingCustomerProfile] = useState(false);
  const [showProductTypeModal, setShowProductTypeModal] = useState(false);
  const [newProductTypeName, setNewProductTypeName] = useState('');
  const [newProductTypeDescription, setNewProductTypeDescription] = useState('');
  const [newProductInterestRate, setNewProductInterestRate] = useState('18');
  const [newProductInterestType, setNewProductInterestType] = useState<'fixed' | 'reducing'>('fixed');
  const [newProductTenureMonths, setNewProductTenureMonths] = useState('36');
  const [newProductFrequency, setNewProductFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [savingProductType, setSavingProductType] = useState(false);

  const wizardSteps = [
    { id: 1, label: 'Basic', hint: 'Product setup and finance terms' },
    { id: 2, label: 'Customer', hint: 'Load and verify customer profile' },
    { id: 3, label: 'Vehicle', hint: 'Vehicle and valuation details' },
    { id: 4, label: 'Guarantor', hint: 'Security party details' },
    { id: 5, label: 'Repayment', hint: 'Repayment plan and scheduling' },
    { id: 6, label: 'Documents', hint: 'Supporting files upload' },
  ] as const;

  const activeWizardStep = useMemo(
    () => wizardSteps.find((s) => s.id === registerStep) ?? wizardSteps[0],
    [registerStep],
  );
  const isDraftLoanSelected = useMemo(() => {
    const normalized = String(regProductType || '')
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized.includes('draft');
  }, [regProductType]);
  const visibleWizardSteps = useMemo(
    () => wizardSteps.filter((step) => !(isDraftLoanSelected && step.id === 5)),
    [wizardSteps, isDraftLoanSelected],
  );
  const activeWizardIndex = useMemo(
    () => Math.max(0, visibleWizardSteps.findIndex((step) => step.id === registerStep)),
    [visibleWizardSteps, registerStep],
  );

  useEffect(() => {
    if (isDraftLoanSelected && registerStep === 5) {
      setRegisterStep(6);
    }
  }, [isDraftLoanSelected, registerStep]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/');
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      await Promise.all([fetchProductTypes(token), generateCustomerNo(token)]);
    };

    run();
  }, [token]);

  const fetchProductTypes = async (authToken: string) => {
    try {
      const response = await axios.get('http://localhost:8000/api/finance-product-types', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      const allowedProductTypes = (data as ProductTypeRow[])
        .filter((item) => !isRemovedProductTypeName(String(item.name || '')))
        .sort((a, b) => a.name.localeCompare(b.name));
      setProductTypes(allowedProductTypes);
      if (allowedProductTypes.length > 0 && (!regProductType || isRemovedProductTypeName(regProductType))) {
        const first = allowedProductTypes[0];
        if (first?.name) {
          setRegProductType(first.name);
          applyProductTypeDefaults(first);
        }
      }
    } catch {
      setProductTypes([]);
    }
  };

  const applyProductTypeDefaults = (productType: ProductTypeRow) => {
    if (productType.interest_rate !== null && productType.interest_rate !== undefined && productType.interest_rate !== '') {
      setRegInterestRate(String(productType.interest_rate));
    }

    if (productType.interest_type === 'fixed' || productType.interest_type === 'reducing') {
      setRegInterestType(productType.interest_type);
    }

    if (productType.tenure_months !== null && productType.tenure_months !== undefined) {
      setRegTenureMonths(String(productType.tenure_months));
    }

    if (productType.installment_frequency) {
      setRegFrequency(productType.installment_frequency);
    }
  };

  const handleProductTypeChange = (name: string) => {
    setRegProductType(name);
    const selected = productTypes.find((pt) => pt.name === name);
    if (selected) {
      applyProductTypeDefaults(selected);
    }
  };

  const resetProductTypeModal = () => {
    setShowProductTypeModal(false);
    setNewProductTypeName('');
    setNewProductTypeDescription('');
    setNewProductInterestRate('18');
    setNewProductInterestType('fixed');
    setNewProductTenureMonths('36');
    setNewProductFrequency('monthly');
  };

  const saveNewProductType = async () => {
    if (!token) return;

    const name = newProductTypeName.trim();
    const interestRate = Number(newProductInterestRate);
    const tenureMonths = Number(newProductTenureMonths);

    if (!name) {
      setErrorMessage('Product type name is required.');
          if (isRemovedProductTypeName(name)) {
            setErrorMessage('Hire Purchase/Loan product type has been removed.');
            return;
          }
      return;
    }
    if (!Number.isFinite(interestRate) || interestRate < 0) {
      setErrorMessage('Interest rate must be a valid number.');
      return;
    }
    if (!Number.isFinite(tenureMonths) || tenureMonths <= 0) {
      setErrorMessage('Tenure must be a valid number of months.');
      return;
    }

    try {
      setSavingProductType(true);
      setErrorMessage('');
      const response = await axios.post(
        'http://localhost:8000/api/finance-product-types',
        {
          name,
          description: newProductTypeDescription.trim() || undefined,
          interest_rate: interestRate,
          interest_type: newProductInterestType,
          tenure_months: tenureMonths,
          installment_frequency: newProductFrequency,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const created = response.data as ProductTypeRow;
      setProductTypes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      handleProductTypeChange(created.name);
      resetProductTypeModal();
    } catch {
      setErrorMessage('Failed to create product type.');
    } finally {
      setSavingProductType(false);
    }
  };

  const getInstallmentsPerYear = (frequency: string) => {
    switch (String(frequency).toLowerCase()) {
      case 'daily':
        return 365;
      case 'weekly':
        return 52;
      case 'quarterly':
        return 4;
      case 'yearly':
        return 1;
      default:
        return 12;
    }
  };

  const computeInstallmentCount = () => {
    const tenureMonths = Number(regTenureMonths);
    if (!Number.isFinite(tenureMonths) || tenureMonths <= 0) return 0;
    const years = tenureMonths / 12;
    const count = Math.round(years * getInstallmentsPerYear(regFrequency));
    return Math.max(1, count);
  };

  const calculateBaseInstallmentFromLeaseTerms = (): number | null => {
    const assetAmount = Number(regAmount);
    const downPayment = Number(regDownPayment || 0);
    const annualRatePercent = Number(regInterestRate);
    const tenureMonths = Number(regTenureMonths);

    if (!Number.isFinite(assetAmount) || assetAmount <= 0) return null;
    if (!Number.isFinite(downPayment) || downPayment < 0) return null;
    if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) return null;
    if (!Number.isFinite(tenureMonths) || tenureMonths <= 0) return null;

    const financedAmount = Math.max(assetAmount - downPayment, 0);
    if (financedAmount <= 0) return null;

    const installmentsPerYear = getInstallmentsPerYear(regFrequency);
    const years = tenureMonths / 12;
    const installmentCount = Math.max(1, Math.round(years * installmentsPerYear));
    const annualRate = annualRatePercent / 100;
    const periodRate = installmentsPerYear > 0 ? annualRate / installmentsPerYear : 0;

    let installment = 0;
    if (regInterestType === 'reducing' && periodRate > 0) {
      const pow = Math.pow(1 + periodRate, installmentCount);
      installment = financedAmount * periodRate * pow / (pow - 1);
    } else {
      const totalInterest = financedAmount * annualRate * years;
      installment = (financedAmount + totalInterest) / installmentCount;
    }

    if (!Number.isFinite(installment) || installment <= 0) return null;
    return Math.round(installment * 100) / 100;
  };

  const calculatedBaseInstallment = useMemo(
    () => calculateBaseInstallmentFromLeaseTerms(),
    [regAmount, regDownPayment, regInterestRate, regTenureMonths, regFrequency, regInterestType],
  );
  const calculatedSpeedDraftMonthlyInterest = useMemo(() => {
    if (!isDraftLoanSelected) return null;

    const draftValue = Number(regDraftValue);
    const annualRatePercent = Number(regInterestRate);

    if (!Number.isFinite(draftValue) || draftValue <= 0) return null;
    if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) return null;

    const monthlyInterest = draftValue * ((annualRatePercent / 12) / 100);
    if (!Number.isFinite(monthlyInterest) || monthlyInterest < 0) return null;

    return Math.round(monthlyInterest * 100) / 100;
  }, [isDraftLoanSelected, regDraftValue, regInterestRate]);

  useEffect(() => {
    if (regInstallmentMode !== 'manual') return;
    if (regManualInstallmentAmount.trim() !== '') return;
    if (!Number.isFinite(calculatedBaseInstallment || NaN) || (calculatedBaseInstallment || 0) <= 0) return;

    setRegManualInstallmentAmount((calculatedBaseInstallment as number).toFixed(2));
  }, [regInstallmentMode, regManualInstallmentAmount, calculatedBaseInstallment]);

  const getSeedDate = () => {
    const seed = regFirstInstallmentDate || regStartDate;
    if (seed) return seed;
    return new Date().toISOString().slice(0, 10);
  };

  const incrementByFrequency = (dateText: string) => {
    const date = new Date(`${dateText}T00:00:00`);
    const frequency = String(regFrequency).toLowerCase();

    if (frequency === 'daily') date.setDate(date.getDate() + 1);
    else if (frequency === 'weekly') date.setDate(date.getDate() + 7);
    else if (frequency === 'quarterly') date.setMonth(date.getMonth() + 3);
    else if (frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);
    else date.setMonth(date.getMonth() + 1);

    return date.toISOString().slice(0, 10);
  };

  const generateInstallmentPlan = (defaultAmount?: number) => {
    const count = computeInstallmentCount();
    const manual = Number(regManualInstallmentAmount);
    const calculated = calculateBaseInstallmentFromLeaseTerms();
    const amount = Number.isFinite(defaultAmount) && (defaultAmount ?? 0) > 0
      ? Number(defaultAmount)
      : Number.isFinite(manual) && manual > 0
        ? manual
        : Number.isFinite(calculated || NaN) && (calculated || 0) > 0
          ? Number(calculated)
          : 0;

    if (count <= 0) {
      setRegInstallmentPlan([]);
      return;
    }

    let paymentDate = getSeedDate();
    const rows: RepaymentInstallmentRow[] = [];
    for (let i = 1; i <= count; i++) {
      rows.push({
        installment_no: i,
        payment_date: paymentDate,
        amount: amount > 0 ? amount.toFixed(2) : '',
      });
      paymentDate = incrementByFrequency(paymentDate);
    }

    setRegInstallmentPlan(rows);
  };

  const applyEqualAmounts = () => {
    const manual = Number(regManualInstallmentAmount);
    const calculated = calculateBaseInstallmentFromLeaseTerms();
    const baseAmount = Number.isFinite(manual) && manual > 0
      ? manual
      : Number.isFinite(calculated || NaN) && (calculated || 0) > 0
        ? Number(calculated)
        : NaN;

    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      setErrorMessage('Enter Manual Monthly Payment Amount first.');
      return;
    }

    if (!Number.isFinite(manual) || manual <= 0) {
      setRegManualInstallmentAmount(baseAmount.toFixed(2));
    }

    if (regInstallmentPlan.length === 0) {
      generateInstallmentPlan(baseAmount);
      return;
    }

    setRegInstallmentPlan((prev) => prev.map((r) => ({ ...r, amount: baseAmount.toFixed(2) })));
  };

  const applyYearlyStepUp = () => {
    const year1 = Number(regYear1Amount);
    const year2 = Number(regYear2Amount);
    const year3 = Number(regYear3PlusAmount);
    if (!Number.isFinite(year1) || year1 <= 0 || !Number.isFinite(year2) || year2 <= 0 || !Number.isFinite(year3) || year3 <= 0) {
      setErrorMessage('Year 1, Year 2, and Year 3+ amounts must be valid.');
      return;
    }

    const count = computeInstallmentCount();
    if (count <= 0) return;
    if (regInstallmentPlan.length === 0) {
      generateInstallmentPlan(year1);
    }

    const perYear = Math.max(1, getInstallmentsPerYear(regFrequency));
    setRegInstallmentPlan((prev) => prev.map((row, idx) => {
      const yearNo = Math.floor(idx / perYear) + 1;
      const selected = yearNo === 1 ? year1 : yearNo === 2 ? year2 : year3;
      return { ...row, amount: selected.toFixed(2) };
    }));
  };

  const applyBulkLastPayment = () => {
    const regular = Number(regBulkRegularAmount);
    const last = Number(regBulkLastAmount);
    if (!Number.isFinite(regular) || regular <= 0 || !Number.isFinite(last) || last <= 0) {
      setErrorMessage('Regular amount and last bulk amount must be valid.');
      return;
    }

    if (regInstallmentPlan.length === 0) {
      generateInstallmentPlan(regular);
    }

    setRegInstallmentPlan((prev) => prev.map((row, idx) => {
      if (idx === prev.length - 1) {
        return { ...row, amount: last.toFixed(2) };
      }
      return { ...row, amount: regular.toFixed(2) };
    }));
  };

  const totalPlannedInstallments = useMemo(() => {
    return regInstallmentPlan.reduce((sum, row) => {
      const amount = Number(row.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [regInstallmentPlan]);

  const generateCustomerNo = async (authToken: string) => {
    try {
      setGeneratingCustomerNo(true);
      const response = await axios.get('http://localhost:8000/api/customers/generate-code', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });

      const generatedCode = String(response.data?.customer_no || '').trim();
      if (generatedCode) {
        setRegCustomerNo(generatedCode);
        setRegCustomerDetail(null);
      }
    } catch {
      // manual input fallback
    } finally {
      setGeneratingCustomerNo(false);
    }
  };

  const fetchCustomerDetails = async (authToken: string, customerNoInput: string) => {
    const customerNo = customerNoInput.trim();
    if (!customerNo) {
      setRegCustomerDetail(null);
      return false;
    }

    try {
      setLoadingCustomerDetail(true);

      const response = await axios.get(`http://localhost:8000/api/customers/by-code/${encodeURIComponent(customerNo)}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });

      const customer = response.data as CustomerDetail;
      setRegCustomerDetail(customer);
      setRegCustomerFirstName(String(customer.first_name || ''));
      setRegCustomerLastName(String(customer.last_name || ''));
      setRegCustomerNic(String(customer.nic_passport || ''));
      setRegCustomerDob(String(customer.date_of_birth || '').slice(0, 10));
      setRegCustomerGender((customer.gender as 'male' | 'female' | 'other') || 'male');
      setRegCustomerMaritalStatus((customer.marital_status as 'single' | 'married' | 'divorced' | 'widowed') || 'single');
      setRegCustomerNationality(String(customer.nationality || 'Sri Lankan'));
      setRegCustomerPhone(String(customer.phone || ''));
      setRegCustomerEmail(String(customer.email || ''));
      setRegCustomerPermanentAddress(String(customer.permanent_address || ''));
      setRegCustomerCurrentAddress(String(customer.current_address || ''));
      setRegEmploymentType((customer.employment_type as 'salaried' | 'self_employed' | 'business') || 'salaried');
      setRegEmployerName(String(customer.employer_name || ''));
      setRegJobTitle(String(customer.job_title || ''));
      setRegMonthlyIncome(String(customer.monthly_income || ''));
      setRegOtherIncomeSources(String(customer.other_income_sources || ''));
      setRegExistingLoans(Boolean(customer.existing_loans));
      setRegMonthlyLoanObligations(String(customer.monthly_loan_obligations || ''));
      setRegCreditScore(String(customer.credit_score || ''));
      return true;
    } catch {
      setRegCustomerDetail(null);
      return false;
    } finally {
      setLoadingCustomerDetail(false);
    }
  };

  const createCustomerFromStep2 = async (authToken: string) => {
    if (!regCustomerNo.trim()) {
      setErrorMessage('Customer No is required.');
      return false;
    }
    if (!regCustomerFirstName.trim() || !regCustomerLastName.trim()) {
      setErrorMessage('First Name and Last Name are required.');
      return false;
    }
    if (!regCustomerPhone.trim()) {
      setErrorMessage('Phone is required.');
      return false;
    }
    if (!regCustomerNic.trim()) {
      setErrorMessage('NIC/Passport is required.');
      return false;
    }
    if (!regCustomerDob) {
      setErrorMessage('Date of Birth is required.');
      return false;
    }
    if (!regCustomerPermanentAddress.trim()) {
      setErrorMessage('Permanent Address is required.');
      return false;
    }

    try {
      setSavingCustomerProfile(true);
      setErrorMessage('');

      const response = await axios.post(
        'http://localhost:8000/api/customers',
        {
          customer_code: regCustomerNo.trim(),
          first_name: regCustomerFirstName.trim(),
          last_name: regCustomerLastName.trim(),
          phone: regCustomerPhone.trim(),
          nic_passport: regCustomerNic.trim(),
          date_of_birth: regCustomerDob,
          gender: regCustomerGender,
          marital_status: regCustomerMaritalStatus,
          nationality: regCustomerNationality.trim() || null,
          email: regCustomerEmail.trim() || null,
          permanent_address: regCustomerPermanentAddress.trim(),
          current_address: regCustomerCurrentAddress.trim() || null,
          employment_type: regEmploymentType,
          employer_name: regEmployerName.trim() || null,
          job_title: regJobTitle.trim() || null,
          monthly_income: regMonthlyIncome ? Number(regMonthlyIncome) : null,
          other_income_sources: regOtherIncomeSources.trim() || null,
          existing_loans: regExistingLoans,
          monthly_loan_obligations: regMonthlyLoanObligations ? Number(regMonthlyLoanObligations) : null,
          credit_score: regCreditScore ? Number(regCreditScore) : null,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
          },
        },
      );

      setRegCustomerDetail(response.data as CustomerDetail);
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const msg = String(error.response?.data?.message || 'Failed to register customer.');
        setErrorMessage(msg);
      } else {
        setErrorMessage('Failed to register customer.');
      }
      return false;
    } finally {
      setSavingCustomerProfile(false);
    }
  };

  useEffect(() => {
    if (!token || registerStep !== 2 || !regCustomerNo.trim()) return;
    fetchCustomerDetails(token, regCustomerNo);
  }, [token, registerStep, regCustomerNo]);

  const goToNextStep = async () => {
    if (registerStep === 2) {
      if (!token) return;
      const ok = await fetchCustomerDetails(token, regCustomerNo);
      if (!ok) {
        const created = await createCustomerFromStep2(token);
        if (!created) {
          setErrorMessage('Customer not found. Enter customer Basic, Contact, and Income details to register.');
          return;
        }
      }
    }

    const currentIndex = visibleWizardSteps.findIndex((s) => s.id === registerStep);
    if (currentIndex < 0) {
      setRegisterStep(visibleWizardSteps[0]?.id ?? 1);
      return;
    }

    const nextStep = visibleWizardSteps[currentIndex + 1];
    if (nextStep) {
      setRegisterStep(nextStep.id);
    }
  };

  const submitRegister = async () => {
    if (!token) return;

    const amount = Number(regAmount);
    const down = regDownPayment ? Number(regDownPayment) : 0;
    const draftValue = regDraftValue ? Number(regDraftValue) : NaN;
    const rate = Number(regInterestRate);
    const tenure = Number(regTenureMonths);
    const manualInstallment = regManualInstallmentAmount ? Number(regManualInstallmentAmount) : 0;

    if (!regCustomerNo.trim()) {
      setErrorMessage('Customer No is required.');
      setRegisterStep(1);
      return;
    }
    if (!regProductType.trim()) {
      setErrorMessage('Product Type is required.');
      setRegisterStep(1);
      return;
    }
    let ensuredCustomerDetail = regCustomerDetail;
    if (!ensuredCustomerDetail) {
      const fetched = await fetchCustomerDetails(token, regCustomerNo);
      if (fetched) {
        ensuredCustomerDetail = regCustomerDetail;
      } else {
        const created = await createCustomerFromStep2(token);
        if (!created) {
          setErrorMessage('Customer not found. Enter customer Basic, Contact, and Income details in Step 2 and register customer first.');
          setRegisterStep(2);
          return;
        }
        const fetchedAfterCreate = await fetchCustomerDetails(token, regCustomerNo);
        if (!fetchedAfterCreate) {
          setErrorMessage('Customer registration completed, but customer could not be reloaded. Please check Step 2.');
          setRegisterStep(2);
          return;
        }
        ensuredCustomerDetail = regCustomerDetail;
      }
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Asset value must be a valid amount.');
      setRegisterStep(3);
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setErrorMessage('Interest rate must be valid.');
      setRegisterStep(1);
      return;
    }
    if (!Number.isFinite(tenure) || tenure <= 0) {
      setErrorMessage('Tenure must be valid.');
      setRegisterStep(1);
      return;
    }
    if (!isDraftLoanSelected && regInstallmentMode === 'manual' && (!Number.isFinite(manualInstallment) || manualInstallment <= 0)) {
      setErrorMessage('Manual monthly payment must be a valid amount.');
      setRegisterStep(5);
      return;
    }
    if (!isDraftLoanSelected && regInstallmentMode === 'manual' && regInstallmentPlan.length === 0) {
      setErrorMessage('Generate the installment plan in Repayment step.');
      setRegisterStep(5);
      return;
    }

    if (isDraftLoanSelected && Number.isFinite(draftValue) && draftValue > amount) {
      setErrorMessage('Draft Value cannot be greater than Vehicle Value.');
      setRegisterStep(3);
      return;
    }

    const normalizedManualRows = regInstallmentPlan.map((row) => ({
      installment_no: row.installment_no,
      payment_date: row.payment_date,
      amount: Number(row.amount),
    }));

    if (!isDraftLoanSelected && regInstallmentMode === 'manual') {
      const invalidRow = normalizedManualRows.find((row) => !row.payment_date || !Number.isFinite(row.amount) || row.amount <= 0);
      if (invalidRow) {
        setErrorMessage('Each installment row must have payment date and valid amount.');
        setRegisterStep(5);
        return;
      }
    }

    const effectiveDownPayment = isDraftLoanSelected && Number.isFinite(draftValue) && draftValue > 0
      ? Math.max(amount - draftValue, 0)
      : (Number.isFinite(down) ? down : 0);

    try {
      setSavingRegister(true);
      setErrorMessage('');

      const createResponse = await axios.post(
        'http://localhost:8000/api/finances',
        {
          customer_no: regCustomerNo.trim(),
          finance_type: regFinanceType,
          product_type: regProductType,
          asset_reference: regAssetRef || regVehicleNo || undefined,
          amount,
          down_payment: effectiveDownPayment,
          interest_rate: rate,
          interest_type: regInterestType,
          tenure_months: tenure,
          installment_frequency: regFrequency,
          manual_installment_amount: !isDraftLoanSelected && regInstallmentMode === 'manual'
            ? Number(normalizedManualRows[0]?.amount || manualInstallment)
            : undefined,
          start_date: regStartDate || undefined,
          status: regSubmissionMode,
          vehicle_details: {
            vehicle_no: regVehicleNo || null,
            chassis_no: regChassisNo || null,
            engine_no: regEngineNo || null,
            make_model: regMakeModel || null,
            year: regVehicleYear || null,
          },
          valuation_details: {
            valuation_amount: regValuationAmount || null,
            valuation_date: regValuationDate || null,
            valuer_name: regValuerName || null,
          },
          guarantor_details: regGuarantors
            .filter((g) => g.name.trim() !== '' || g.nic.trim() !== '' || g.phone.trim() !== '' || g.address.trim() !== '')
            .map((g) => ({
              name: g.name || null,
              nic: g.nic || null,
              phone: g.phone || null,
              address: g.address || null,
            })),
          repayment_plan: isDraftLoanSelected ? undefined : {
            schedule_mode: regScheduleMode,
            first_installment_date: regFirstInstallmentDate || null,
            collection_day_of_month: regScheduleMode === 'fixed_day' ? Number(regCollectionDayOfMonth || 1) : null,
            grace_period_days: Number(regGraceDays || 0),
            installment_frequency: regFrequency,
            installment_mode: regInstallmentMode,
            manual_installment_amount: regInstallmentMode === 'manual' ? Number(normalizedManualRows[0]?.amount || manualInstallment) : null,
            installments: regInstallmentMode === 'manual' ? normalizedManualRows : [],
            total_planned_amount: regInstallmentMode === 'manual' ? Number(totalPlannedInstallments.toFixed(2)) : null,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const financeId = Number(createResponse?.data?.id || 0);

      if (financeId > 0 && regDocuments.length > 0) {
        for (const file of regDocuments) {
          const formData = new FormData();
          formData.append('document_type', 'finance_supporting');
          formData.append('file', file);

          await axios.post(
            `http://localhost:8000/api/finances/${financeId}/documents`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'multipart/form-data',
              },
            },
          );
        }
      }

      router.push('/dashboard/finance');
    } catch (error: unknown) {
      const fallback = 'Failed to register finance agreement.';
      if (axios.isAxiosError(error)) {
        setErrorMessage(String(error.response?.data?.message || fallback));
      } else {
        setErrorMessage(fallback);
      }
    } finally {
      setSavingRegister(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-20 left-14 h-72 w-72 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute top-20 right-8 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-300 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-5">
        <div className="bg-white/90 rounded-3xl border border-cyan-100 p-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Finance Section</p>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Issue Finance</h1>
            <p className="text-sm text-slate-600 mt-1">Create and submit a new finance agreement with full onboarding details.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/finance')}
            className="px-4 py-2 rounded-xl bg-white border border-cyan-200 text-cyan-800 text-sm font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="bg-white/90 rounded-3xl border border-cyan-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
            <p className="text-sm text-slate-600">Step {activeWizardStep.id} of 6: {activeWizardStep.hint}</p>
          </div>

          <div className="px-6 py-4 border-b border-cyan-100 bg-white">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px] font-semibold">
              {visibleWizardSteps.map((step) => {
                const isActive = registerStep === step.id;
                const isDone = registerStep > step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setRegisterStep(step.id)}
                    className={`rounded-xl px-3 py-2 border text-left transition-colors ${isActive ? 'bg-cyan-50 text-cyan-800 border-cyan-200' : isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    <div className="font-bold">{step.id}. {step.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-80">{step.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto bg-slate-50/40">
            {registerStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Basic Details</p>
                  <p className="text-xs text-slate-500 mt-1">Identify the customer and define the finance product terms.</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Customer No</label>
                    <div className="flex items-center gap-2">
                      <input value={regCustomerNo} onChange={(e) => { setRegCustomerNo(e.target.value); setRegCustomerDetail(null); }} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="e.g. 5, 00005, or CUS-260323-00005" />
                      <button
                        type="button"
                        onClick={async () => { if (token) await generateCustomerNo(token); }}
                        disabled={generatingCustomerNo}
                        className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50 disabled:opacity-60"
                      >
                        {generatingCustomerNo ? 'Generating...' : 'Generate'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!token) return;
                          const ok = await fetchCustomerDetails(token, regCustomerNo);
                          if (!ok) {
                            setErrorMessage('Customer not found. Continue to Step 2 and enter Basic, Contact, and Income details to register this customer.');
                            setRegisterStep(2);
                          } else {
                            setErrorMessage('');
                            setRegisterStep(2);
                          }
                        }}
                        disabled={loadingCustomerDetail}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        {loadingCustomerDetail ? 'Checking...' : 'Check Customer'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Finance Type</label>
                    <select value={regFinanceType} onChange={(e) => setRegFinanceType(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900">
                      <option value="vehicle">Vehicle</option>
                      <option value="equipment">Equipment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Product Type</label>
                    <div className="space-y-2">
                      <select value={regProductType} onChange={(e) => handleProductTypeChange(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900">
                        <option value="">Select product type</option>
                        {productTypes.map((pt) => (
                          <option key={pt.id} value={pt.name}>{pt.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setShowProductTypeModal(true)} className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50">
                        Add Product Type
                      </button>
                      {isDraftLoanSelected && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
                          Draft Loan selected: this issue will also be saved in the dedicated Draft Loans table for separate calculations.
                        </p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-xl border border-cyan-100 bg-white p-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                      {isDraftLoanSelected ? 'Interest Rate % (Yearly on Draft Value)' : 'Interest Rate %'}
                    </label>
                    <input value={regInterestRate} onChange={(e) => setRegInterestRate(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="e.g. 18" />
                    {isDraftLoanSelected && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Monthly interest = Draft Value x ((Yearly Interest Rate %) / 12).
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Interest Type</label>
                    <select value={regInterestType} onChange={(e) => setRegInterestType(e.target.value as 'fixed' | 'reducing')} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900">
                      <option value="fixed">Fixed</option>
                      <option value="reducing">Reducing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Tenure (Months)</label>
                    <input value={regTenureMonths} onChange={(e) => setRegTenureMonths(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="e.g. 36" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Installment Frequency</label>
                    <select value={regFrequency} onChange={(e) => setRegFrequency(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900">
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="daily">Daily</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-cyan-100 bg-white p-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Approval Option</label>
                    <select
                      value={regSubmissionMode}
                      onChange={(e) => setRegSubmissionMode(e.target.value as 'pending_approval' | 'active')}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="pending_approval">Send for Approval</option>
                      <option value="active">Activate Immediately</option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">Default is approval flow. Records will not be active until approved.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-cyan-100 bg-white p-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Start Date</label>
                    <input type="date" value={regStartDate} onChange={(e) => setRegStartDate(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                  </div>
                </div>
              </div>
            )}

            {registerStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Customer Details</p>
                  <p className="text-xs text-slate-500 mt-1">If customer exists, fetch profile. If not registered, add Basic, Contact, and Income details and register here.</p>
                </div>

                <div className="rounded-xl border border-cyan-100 bg-white p-4">
                  <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Customer No</label>
                      <input value={regCustomerNo} onChange={(e) => { setRegCustomerNo(e.target.value); setRegCustomerDetail(null); }} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Enter Customer No (e.g. 5 or full code)" />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) return;
                        const ok = await fetchCustomerDetails(token, regCustomerNo);
                        if (!ok) setErrorMessage('Customer not found. Fill details below and register customer.');
                        else setErrorMessage('');
                      }}
                      disabled={loadingCustomerDetail}
                      className="rounded-lg border border-cyan-200 bg-white px-4 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50 disabled:opacity-60"
                    >
                      {loadingCustomerDetail ? 'Loading...' : 'Get Customer Details'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) return;
                        const created = await createCustomerFromStep2(token);
                        if (created) setErrorMessage('');
                      }}
                      disabled={savingCustomerProfile}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {savingCustomerProfile ? 'Registering...' : 'Register Customer'}
                    </button>
                  </div>
                </div>

                {regCustomerDetail && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm text-emerald-800">
                    Existing customer profile loaded from system. You can review/edit details below.
                  </div>
                )}

                <div className="rounded-xl border border-cyan-100 bg-white p-4 space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Basic Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">First Name</label>
                      <input value={regCustomerFirstName} onChange={(e) => setRegCustomerFirstName(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Last Name</label>
                      <input value={regCustomerLastName} onChange={(e) => setRegCustomerLastName(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">NIC / Passport</label>
                      <input value={regCustomerNic} onChange={(e) => setRegCustomerNic(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Date of Birth</label>
                      <input type="date" value={regCustomerDob} onChange={(e) => setRegCustomerDob(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Gender</label>
                      <select value={regCustomerGender} onChange={(e) => setRegCustomerGender(e.target.value as 'male' | 'female' | 'other')} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Marital Status</label>
                      <select value={regCustomerMaritalStatus} onChange={(e) => setRegCustomerMaritalStatus(e.target.value as 'single' | 'married' | 'divorced' | 'widowed')} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900">
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-100 bg-white p-4 space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Contact Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Phone</label>
                      <input value={regCustomerPhone} onChange={(e) => setRegCustomerPhone(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Email</label>
                      <input value={regCustomerEmail} onChange={(e) => setRegCustomerEmail(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Nationality</label>
                      <input value={regCustomerNationality} onChange={(e) => setRegCustomerNationality(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Permanent Address</label>
                      <input value={regCustomerPermanentAddress} onChange={(e) => setRegCustomerPermanentAddress(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Current Address</label>
                      <input value={regCustomerCurrentAddress} onChange={(e) => setRegCustomerCurrentAddress(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-100 bg-white p-4 space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Income Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Employment Type</label>
                      <select value={regEmploymentType} onChange={(e) => setRegEmploymentType(e.target.value as 'salaried' | 'self_employed' | 'business')} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900">
                        <option value="salaried">Salaried</option>
                        <option value="self_employed">Self Employed</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Employer Name</label>
                      <input value={regEmployerName} onChange={(e) => setRegEmployerName(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Job Title</label>
                      <input value={regJobTitle} onChange={(e) => setRegJobTitle(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Monthly Income</label>
                      <input value={regMonthlyIncome} onChange={(e) => setRegMonthlyIncome(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Other Income Sources</label>
                      <input value={regOtherIncomeSources} onChange={(e) => setRegOtherIncomeSources(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Monthly Loan Obligations</label>
                      <input value={regMonthlyLoanObligations} onChange={(e) => setRegMonthlyLoanObligations(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Credit Score</label>
                      <input value={regCreditScore} onChange={(e) => setRegCreditScore(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                    </div>
                    <div className="flex items-center gap-2 pt-7">
                      <input id="existing-loans" type="checkbox" checked={regExistingLoans} onChange={(e) => setRegExistingLoans(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cyan-600" />
                      <label htmlFor="existing-loans" className="text-sm text-slate-700">Has Existing Loans</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {registerStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Vehicle & Valuation</p>
                  <p className="text-xs text-slate-500 mt-1">Capture vehicle identity and valuation figures used for approval.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Vehicle No</label>
                    <input value={regVehicleNo} onChange={(e) => setRegVehicleNo(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="e.g. CAB-1234" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Chassis No</label>
                    <input value={regChassisNo} onChange={(e) => setRegChassisNo(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Engine No</label>
                    <input value={regEngineNo} onChange={(e) => setRegEngineNo(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Make / Model</label>
                    <input value={regMakeModel} onChange={(e) => setRegMakeModel(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="e.g. Toyota Axio" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Year</label>
                    <input value={regVehicleYear} onChange={(e) => setRegVehicleYear(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="e.g. 2020" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Asset Reference</label>
                    <input value={regAssetRef} onChange={(e) => setRegAssetRef(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Optional ref" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Vehicle Value</label>
                    <input value={regAmount} onChange={(e) => setRegAmount(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Total value" />
                  </div>
                  {isDraftLoanSelected && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Draft Value</label>
                      <input value={regDraftValue} onChange={(e) => setRegDraftValue(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Draft value to issue" />
                      {Number.isFinite(calculatedSpeedDraftMonthlyInterest || NaN) && (calculatedSpeedDraftMonthlyInterest || 0) >= 0 && (
                        <p className="mt-1 text-[11px] font-semibold text-cyan-700">
                          Estimated Monthly Interest: {(calculatedSpeedDraftMonthlyInterest as number).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Down Payment</label>
                    <input
                      value={isDraftLoanSelected && Number.isFinite(Number(regDraftValue)) && Number(regDraftValue) > 0 && Number(regAmount) >= Number(regDraftValue)
                        ? String((Number(regAmount) - Number(regDraftValue)).toFixed(2))
                        : regDownPayment}
                      onChange={(e) => setRegDownPayment(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                      placeholder="Customer contribution"
                      readOnly={isDraftLoanSelected && Number.isFinite(Number(regDraftValue)) && Number(regDraftValue) > 0}
                    />
                    {isDraftLoanSelected && (
                      <p className="mt-1 text-[11px] text-slate-500">For Speed Draft, Down Payment is auto-derived as Vehicle Value - Draft Value.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Valuation Amount</label>
                    <input value={regValuationAmount} onChange={(e) => setRegValuationAmount(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Valued amount" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Valuation Date</label>
                    <input type="date" value={regValuationDate} onChange={(e) => setRegValuationDate(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Valuer Name</label>
                    <input value={regValuerName} onChange={(e) => setRegValuerName(e.target.value)} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Valuer" />
                  </div>
                </div>
              </div>
            )}

            {registerStep === 4 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Guarantor Profile</p>
                  <p className="text-xs text-slate-500 mt-1">Capture one or many guarantors for risk mitigation.</p>
                </div>
                <div className="space-y-3">
                  {regGuarantors.map((guarantor, index) => (
                    <div key={`guarantor-${index}`} className="rounded-xl border border-cyan-100 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Guarantor {index + 1}</p>
                        {regGuarantors.length > 1 && (
                          <button type="button" onClick={() => setRegGuarantors((prev) => prev.filter((_, i) => i !== index))} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">Remove</button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Guarantor Name</label>
                          <input value={guarantor.name} onChange={(e) => setRegGuarantors((prev) => prev.map((g, i) => i === index ? { ...g, name: e.target.value } : g))} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">NIC</label>
                          <input value={guarantor.nic} onChange={(e) => setRegGuarantors((prev) => prev.map((g, i) => i === index ? { ...g, nic: e.target.value } : g))} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Phone</label>
                          <input value={guarantor.phone} onChange={(e) => setRegGuarantors((prev) => prev.map((g, i) => i === index ? { ...g, phone: e.target.value } : g))} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Address</label>
                          <input value={guarantor.address} onChange={(e) => setRegGuarantors((prev) => prev.map((g, i) => i === index ? { ...g, address: e.target.value } : g))} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={() => setRegGuarantors((prev) => [...prev, { name: '', nic: '', phone: '', address: '' }])} className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50">
                    + Add Another Guarantor
                  </button>
                </div>
              </div>
            )}

            {registerStep === 5 && !isDraftLoanSelected && (
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Repayment Plan</p>
                  <p className="text-xs text-slate-500 mt-1">Define repayment scheduling mode and first installment setup.</p>
                </div>

                <div className="rounded-xl border border-cyan-100 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Monthly Payment Mode</label>
                    <select
                      value={regInstallmentMode}
                      onChange={(e) => setRegInstallmentMode(e.target.value as 'auto' | 'manual')}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="auto">Auto Calculate</option>
                      <option value="manual">Manual Monthly Payment</option>
                    </select>
                  </div>

                  {regInstallmentMode === 'manual' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Base Installment Amount</label>
                        <input
                          value={regManualInstallmentAmount}
                          onChange={(e) => setRegManualInstallmentAmount(e.target.value)}
                          className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                          placeholder="e.g. 25000"
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-slate-600">
                            Calculated from lease amount, interest, tenure: <span className="font-semibold text-cyan-800">{calculatedBaseInstallment ? calculatedBaseInstallment.toFixed(2) : '-'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!calculatedBaseInstallment || calculatedBaseInstallment <= 0) {
                                setErrorMessage('Enter valid lease amount, interest rate and tenure to calculate installment.');
                                return;
                              }
                              setErrorMessage('');
                              setRegManualInstallmentAmount(calculatedBaseInstallment.toFixed(2));
                            }}
                            className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 font-semibold text-cyan-800 hover:bg-cyan-100"
                          >
                            Use Calculated
                          </button>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage('');
                            generateInstallmentPlan();
                          }}
                          className="w-full rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                        >
                          Generate Installment Loop by Tenure
                        </button>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Scheduling Mode</label>
                    <select
                      value={regScheduleMode}
                      onChange={(e) => setRegScheduleMode(e.target.value as 'auto' | 'fixed_day' | 'custom_date')}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="auto">Auto (Based on Start Date + Frequency)</option>
                      <option value="fixed_day">Fixed Day of Month</option>
                      <option value="custom_date">Custom First Installment Date</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Grace Period (Days)</label>
                    <input
                      value={regGraceDays}
                      onChange={(e) => setRegGraceDays(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                      placeholder="e.g. 0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">First Installment Date</label>
                    <input
                      type="date"
                      value={regFirstInstallmentDate}
                      onChange={(e) => setRegFirstInstallmentDate(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Installment Frequency</label>
                    <select
                      value={regFrequency}
                      onChange={(e) => setRegFrequency(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="daily">Daily</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  {regScheduleMode === 'fixed_day' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Collection Day of Month</label>
                      <input
                        value={regCollectionDayOfMonth}
                        onChange={(e) => setRegCollectionDayOfMonth(e.target.value)}
                        className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                        placeholder="1-31"
                      />
                    </div>
                  )}
                </div>

                {regInstallmentMode === 'manual' && (
                  <div className="rounded-xl border border-cyan-100 bg-white p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button type="button" onClick={applyEqualAmounts} className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50">Apply Same for All</button>
                      <div>
                        <input value={regYear1Amount} onChange={(e) => setRegYear1Amount(e.target.value)} className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-900" placeholder="Year 1 amount" />
                      </div>
                      <div>
                        <input value={regYear2Amount} onChange={(e) => setRegYear2Amount(e.target.value)} className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-900" placeholder="Year 2 amount" />
                      </div>
                      <div>
                        <input value={regYear3PlusAmount} onChange={(e) => setRegYear3PlusAmount(e.target.value)} className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-900" placeholder="Year 3+ amount" />
                      </div>
                      <button type="button" onClick={applyYearlyStepUp} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">Apply Year Step-Up</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <input value={regBulkRegularAmount} onChange={(e) => setRegBulkRegularAmount(e.target.value)} className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-900" placeholder="Regular installment amount" />
                      </div>
                      <div>
                        <input value={regBulkLastAmount} onChange={(e) => setRegBulkLastAmount(e.target.value)} className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-xs text-slate-900" placeholder="Last bulk payment amount" />
                      </div>
                      <button type="button" onClick={applyBulkLastPayment} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100">Apply Bulk Last Payment</button>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        <div className="col-span-2">Installment</div>
                        <div className="col-span-5">Payment Date</div>
                        <div className="col-span-5">Amount</div>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {regInstallmentPlan.map((row, index) => (
                          <div key={`plan-${row.installment_no}`} className="grid grid-cols-12 items-center px-3 py-2 gap-2">
                            <div className="col-span-2 text-xs font-semibold text-slate-700">#{row.installment_no}</div>
                            <div className="col-span-5">
                              <input
                                type="date"
                                value={row.payment_date}
                                onChange={(e) => setRegInstallmentPlan((prev) => prev.map((r, i) => i === index ? { ...r, payment_date: e.target.value } : r))}
                                className="w-full rounded-lg border border-cyan-100 bg-white px-2 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                            <div className="col-span-5">
                              <input
                                value={row.amount}
                                onChange={(e) => setRegInstallmentPlan((prev) => prev.map((r, i) => i === index ? { ...r, amount: e.target.value } : r))}
                                className="w-full rounded-lg border border-cyan-100 bg-white px-2 py-1.5 text-xs text-slate-900"
                                placeholder="Amount"
                              />
                            </div>
                          </div>
                        ))}
                        {regInstallmentPlan.length === 0 && (
                          <div className="px-3 py-6 text-xs text-slate-500 text-center">Generate installment loop to edit payment dates and values.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
                      Installments: <span className="font-semibold">{regInstallmentPlan.length}</span> | Planned Total: <span className="font-semibold">{totalPlannedInstallments.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {registerStep === 6 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Document Checklist</p>
                  <p className="text-xs text-slate-500 mt-1">Upload supporting files. You can submit without documents and upload later as well.</p>
                </div>
                <input type="file" multiple onChange={(e) => setRegDocuments(Array.from(e.target.files || []))} className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900" />
                {regDocuments.length > 0 && (
                  <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3 text-xs text-slate-700 space-y-1">
                    {regDocuments.map((f, index) => (
                      <div key={`${f.name}-${index}`}>{f.name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-cyan-100 bg-white flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Step {activeWizardIndex + 1}/{visibleWizardSteps.length}: <span className="font-semibold text-slate-700">{activeWizardStep.label}</span>
            </div>

            <div className="flex items-center gap-2">
              {registerStep > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = visibleWizardSteps.findIndex((s) => s.id === registerStep);
                    if (currentIndex > 0) {
                      setRegisterStep(visibleWizardSteps[currentIndex - 1].id);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-cyan-200 text-cyan-800 text-sm font-semibold"
                >
                  Previous
                </button>
              )}
              {registerStep !== visibleWizardSteps[visibleWizardSteps.length - 1]?.id && (
                <button type="button" onClick={goToNextStep} className="px-4 py-2 rounded-lg bg-cyan-100 border border-cyan-200 text-cyan-800 text-sm font-semibold">
                  Next
                </button>
              )}
              {registerStep === visibleWizardSteps[visibleWizardSteps.length - 1]?.id && (
                <button type="button" disabled={savingRegister} onClick={submitRegister} className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  {savingRegister ? 'Saving...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </div>
        </div>

        {showProductTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-cyan-100 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-cyan-100 px-5 py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-700">Finance Setup</p>
                  <h3 className="text-lg font-bold text-slate-900">Add Product Type</h3>
                </div>
                <button
                  type="button"
                  onClick={resetProductTypeModal}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Type Name</label>
                    <input
                      value={newProductTypeName}
                      onChange={(e) => setNewProductTypeName(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                      placeholder="e.g. Balloon Lease"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Description</label>
                    <input
                      value={newProductTypeDescription}
                      onChange={(e) => setNewProductTypeDescription(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Interest Rate %</label>
                    <input
                      value={newProductInterestRate}
                      onChange={(e) => setNewProductInterestRate(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                      placeholder="e.g. 18"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Interest Type</label>
                    <select
                      value={newProductInterestType}
                      onChange={(e) => setNewProductInterestType(e.target.value as 'fixed' | 'reducing')}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="reducing">Reducing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Tenure (Months)</label>
                    <input
                      value={newProductTenureMonths}
                      onChange={(e) => setNewProductTenureMonths(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                      placeholder="e.g. 36"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Installment Frequency</label>
                    <select
                      value={newProductFrequency}
                      onChange={(e) => setNewProductFrequency(e.target.value as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="daily">Daily</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-cyan-100 px-5 py-4">
                <button
                  type="button"
                  onClick={resetProductTypeModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNewProductType}
                  disabled={savingProductType}
                  className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:from-cyan-700 hover:to-blue-700 disabled:opacity-60"
                >
                  {savingProductType ? 'Saving...' : 'Save Product Type'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
