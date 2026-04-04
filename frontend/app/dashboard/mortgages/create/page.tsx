"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ModuleHeader from "../_components/ModuleHeader";
import SectionCard from "../_components/SectionCard";

type Step =
  | "profile"
  | "financial"
  | "coBorrower"
  | "loanCollateral"
  | "documentsReview";

const STEP_ORDER: Step[] = [
  "profile",
  "financial",
  "coBorrower",
  "loanCollateral",
  "documentsReview",
];

const STEP_LABELS: Record<Step, string> = {
  profile: "Profile",
  financial: "Financial",
  coBorrower: "Guarantor",
  loanCollateral: "Loan & Collateral",
  documentsReview: "Documents & Review",
};

const hasText = (value: string) => value.trim().length > 0;
const hasPositiveNumber = (value: string) => {
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0;
};

const generateFileCode = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CUS-${yyyy}${mm}${dd}-${random}`;
};

export default function CreateMortgage() {
  const [token, setToken] = useState("");
  const [step, setStep] = useState<Step>("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"confirm" | "error" | "info">("info");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const router = useRouter();

  // Customer details
  const [fullName, setFullName] = useState("");
  const [fileCode, setFileCode] = useState("");
  const [nic, setNic] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [maritalStatus, setMaritalStatus] = useState<
    "single" | "married" | "divorced" | "widowed"
  >("single");
  const [nationality, setNationality] = useState("");
  // Contact
  const [permanentAddress, setPermanentAddress] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  // Employment & Income
  const [employmentType, setEmploymentType] = useState<
    "salaried" | "self_employed" | "business"
  >("salaried");
  const [employerName, setEmployerName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [otherIncomeSources, setOtherIncomeSources] = useState("");
  // Credit & Risk
  const [existingLoans, setExistingLoans] = useState(false);
  const [monthlyLoanObligations, setMonthlyLoanObligations] = useState("");
  const [creditScore, setCreditScore] = useState("");
  // Co-Borrower / Guarantor
  const [coBorrowerName, setCoBorrowerName] = useState("");
  const [coBorrowerNic, setCoBorrowerNic] = useState("");
  const [coBorrowerRelationship, setCoBorrowerRelationship] = useState("");
  const [coBorrowerAddress, setCoBorrowerAddress] = useState("");
  const [coBorrowerContact, setCoBorrowerContact] = useState("");
  const [coBorrowerIncome, setCoBorrowerIncome] = useState("");

  // Mortgage Loan Details
  const [mortgageType, setMortgageType] = useState<
    "land" | "house" | "vehicle" | "gold" | "other"
  >("land");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestType, setInterestType] = useState<"fixed" | "reducing">(
    "fixed"
  );
  const [tenureMonths, setTenureMonths] = useState("");
  const [installmentFrequency, setInstallmentFrequency] = useState<
    "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [interestCalculationFrequency, setInterestCalculationFrequency] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("monthly");
  const [processingFee, setProcessingFee] = useState("");
  const [insuranceFee, setInsuranceFee] = useState("");
  const [penaltyRate, setPenaltyRate] = useState("");

  // Collateral Details
  const [assetType, setAssetType] = useState<
    "land" | "house" | "vehicle" | "gold" | "other"
  >("land");
  const [assetDescription, setAssetDescription] = useState("");
  const [ownershipType, setOwnershipType] = useState<"single" | "joint">(
    "single"
  );
  // Legal
  const [deedNumber, setDeedNumber] = useState("");
  const [deedDate, setDeedDate] = useState("");
  const [surveyPlanNumber, setSurveyPlanNumber] = useState("");
  const [registrationOffice, setRegistrationOffice] = useState("");
  const [lawyerName, setLawyerName] = useState("");
  // Valuation
  const [marketValue, setMarketValue] = useState("");
  const [forcedSaleValue, setForcedSaleValue] = useState("");
  const [valuationDate, setValuationDate] = useState("");
  const [valuerName, setValuerName] = useState("");
  // Physical
  const [assetAddress, setAssetAddress] = useState("");
  const [landSizeOrBuildingArea, setLandSizeOrBuildingArea] = useState("");
  const [boundaries, setBoundaries] = useState("");
  // Vehicle
  const [vehicleRegNo, setVehicleRegNo] = useState("");
  const [vehicleEngineNo, setVehicleEngineNo] = useState("");
  const [vehicleChassisNo, setVehicleChassisNo] = useState("");
  const [vehicleManufactureYear, setVehicleManufactureYear] = useState("");

  // Documents
  const [customerDocuments, setCustomerDocuments] = useState<{ type: string; file: File }[]>([]);
  const [assetDocuments, setAssetDocuments] = useState<{ type: string; file: File }[]>([]);
  const [legalDocuments, setLegalDocuments] = useState<{ type: string; file: File }[]>([]);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/");
    } else {
      setToken(t);
      setFileCode((prev) => prev || generateFileCode());
    }
  }, [router]);

  const nextStep = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };

  const prevStep = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const stepTitle = useMemo(() => {
    switch (step) {
      case "profile":
        return "Customer & Contact Profile";
      case "financial":
        return "Employment, Income & Credit";
      case "coBorrower":
        return "Co-Borrower / Guarantor Details";
      case "loanCollateral":
        return "Loan & Collateral Details";
      case "documentsReview":
        return "Documents, Review & Submit";
    }
  }, [step]);

  const isProfileStepComplete = useMemo(() => {
    return (
      hasText(fullName) &&
      hasText(nic) &&
      hasText(dateOfBirth) &&
      hasText(permanentAddress) &&
      hasText(mobileNumber)
    );
  }, [fullName, nic, dateOfBirth, permanentAddress, mobileNumber]);

  const isFinancialStepComplete = useMemo(() => {
    return hasPositiveNumber(monthlyIncome);
  }, [monthlyIncome]);

  const isCoBorrowerStepComplete = useMemo(() => {
    const hasAny =
      hasText(coBorrowerName) ||
      hasText(coBorrowerNic) ||
      hasText(coBorrowerRelationship) ||
      hasText(coBorrowerAddress) ||
      hasText(coBorrowerContact) ||
      hasText(coBorrowerIncome);

    if (!hasAny) return true;

    return (
      hasText(coBorrowerName) &&
      hasText(coBorrowerNic) &&
      hasText(coBorrowerRelationship) &&
      hasText(coBorrowerAddress) &&
      hasPositiveNumber(coBorrowerIncome)
    );
  }, [coBorrowerName, coBorrowerNic, coBorrowerRelationship, coBorrowerAddress, coBorrowerContact, coBorrowerIncome]);

  const isLoanCollateralStepComplete = useMemo(() => {
    const approvedOk = !hasText(approvedAmount) || hasPositiveNumber(approvedAmount);
    return (
      hasPositiveNumber(requestedAmount) &&
      hasPositiveNumber(interestRate) &&
      hasPositiveNumber(tenureMonths) &&
      approvedOk
    );
  }, [requestedAmount, approvedAmount, interestRate, tenureMonths]);

  const isDocumentsReviewStepComplete = true;

  const isStepComplete = (targetStep: Step) => {
    switch (targetStep) {
      case "profile":
        return isProfileStepComplete;
      case "financial":
        return isFinancialStepComplete;
      case "coBorrower":
        return isCoBorrowerStepComplete;
      case "loanCollateral":
        return isLoanCollateralStepComplete;
      case "documentsReview":
        return isDocumentsReviewStepComplete;
      default:
        return false;
    }
  };

  const currentStepIndex = STEP_ORDER.indexOf(step);
  const firstIncompleteIndex = STEP_ORDER.findIndex((s) => !isStepComplete(s));
  const maxReachableIndex = firstIncompleteIndex === -1 ? STEP_ORDER.length - 1 : firstIncompleteIndex;
  const isCurrentStepComplete = isStepComplete(step);

  const openModal = (kind: "confirm" | "error" | "info", title: string, message: string) => {
    setModalKind(kind);
    setModalTitle(title);
    setModalMessage(message);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Create Customer
      const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
      const first = nameParts[0] || fullName.trim();
      const last = nameParts.slice(1).join(" ") || "N/A";
      const customerPayload = {
        customer_code: fileCode.trim() || undefined,
        first_name: first,
        last_name: last,
        email,
        phone: mobileNumber,
        nic_passport: nic,
        date_of_birth: dateOfBirth,
        gender,
        marital_status: maritalStatus,
        nationality,
        permanent_address: permanentAddress,
        current_address: currentAddress,
        employment_type: employmentType,
        employer_name: employerName,
        job_title: jobTitle,
        monthly_income: parseFloat(monthlyIncome || "0"),
        other_income_sources: otherIncomeSources,
        existing_loans: existingLoans,
        monthly_loan_obligations: parseFloat(
          monthlyLoanObligations || "0"
        ),
        credit_score: creditScore ? parseInt(creditScore) : null,
      };
      let createdCustomerId: number | null = null;

      try {
        const custRes = await axios.post(
          "http://localhost:8000/api/customers",
          customerPayload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        createdCustomerId = custRes.data.id;
      } catch (customerError: any) {
        const backendError = String(
          customerError?.response?.data?.error || customerError?.response?.data?.message || ""
        ).toLowerCase();
        const maybeDuplicate =
          backendError.includes("duplicate") ||
          backendError.includes("unique") ||
          backendError.includes("nic_passport") ||
          backendError.includes("email");

        if (!maybeDuplicate) {
          throw customerError;
        }

        const lookupValue = (nic || email).trim();
        if (!lookupValue) {
          throw customerError;
        }

        const existingRes = await axios.get("http://localhost:8000/api/customers", {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: lookupValue, per_page: 100 },
        });

        const existingRows = Array.isArray(existingRes.data?.data)
          ? existingRes.data.data
          : [];

        const existingCustomer = existingRows.find((row: any) => {
          const rowNic = String(row?.nic_passport || "").trim().toLowerCase();
          const rowEmail = String(row?.email || "").trim().toLowerCase();
          const inputNic = String(nic || "").trim().toLowerCase();
          const inputEmail = String(email || "").trim().toLowerCase();
          return (inputNic && rowNic === inputNic) || (inputEmail && rowEmail === inputEmail);
        });

        if (!existingCustomer?.id) {
          throw customerError;
        }

        createdCustomerId = existingCustomer.id;
      }

      if (!createdCustomerId) {
        throw new Error("Unable to create or resolve customer record.");
      }

      // Upload selected customer documents
      for (const doc of customerDocuments) {
        const fd = new FormData();
        fd.append("document_type", doc.type);
        fd.append("file", doc.file);
        await axios.post(
          `http://localhost:8000/api/customers/${createdCustomerId}/documents`,
          fd,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Create Mortgage
      // Conditionally include sub-sections only if provided
      const hasLegal = deedNumber || deedDate || surveyPlanNumber || registrationOffice || lawyerName;
      const hasValuation = marketValue || forcedSaleValue || valuationDate || valuerName;
      const hasPhysical = assetAddress || landSizeOrBuildingArea || boundaries;
      const normalizedAssetDescription = assetDescription.trim() || `${assetType} collateral`;

      const normalizedMortgageType = mortgageType;

      const mortgagePayload: any = {
        customer_id: createdCustomerId,
        mortgage_type: normalizedMortgageType,
        requested_amount: parseFloat(requestedAmount || "0"),
        approved_amount: approvedAmount
          ? parseFloat(approvedAmount)
          : undefined,
        interest_rate: parseFloat(interestRate || "0"),
        interest_type: interestType,
        tenure_months: parseInt(tenureMonths || "0"),
        installment_frequency: installmentFrequency,
        interest_calculation_frequency: interestCalculationFrequency,
        processing_fee: parseFloat(processingFee || "0"),
        insurance_fee: parseFloat(insuranceFee || "0"),
        penalty_rate: parseFloat(penaltyRate || "0"),
        asset: {
          asset_type: assetType,
          description: normalizedAssetDescription,
          ownership_type: ownershipType,
        },
      };

      // Attach co-borrower only if provided
      if (coBorrowerName || coBorrowerNic || coBorrowerRelationship || coBorrowerAddress || coBorrowerIncome) {
        mortgagePayload.co_borrower = {
          full_name: coBorrowerName,
          nic: coBorrowerNic,
          relationship: coBorrowerRelationship,
          address: coBorrowerAddress,
          contact_number: coBorrowerContact || undefined,
          monthly_income: coBorrowerIncome ? parseFloat(coBorrowerIncome) : undefined,
        };
      }

      // Attach optional legal/valuation/physical sections only if they have values
      if (hasLegal) {
        mortgagePayload.asset.legal = {
          deed_number: deedNumber || undefined,
          deed_date: deedDate || undefined,
          survey_plan_number: surveyPlanNumber || undefined,
          registration_office: registrationOffice || undefined,
          lawyer_name: lawyerName || undefined,
        };
      }
      if (hasValuation) {
        mortgagePayload.asset.valuation = {
          market_value: marketValue ? parseFloat(marketValue) : undefined,
          forced_sale_value: forcedSaleValue ? parseFloat(forcedSaleValue) : undefined,
          valuation_date: valuationDate || undefined,
          valuer_name: valuerName || undefined,
        };
      }
      if (hasPhysical) {
        mortgagePayload.asset.physical = {
          address: assetAddress || undefined,
          area: landSizeOrBuildingArea || undefined,
          boundaries: boundaries || undefined,
        };
      }
      // Always include vehicle section only if assetType is vehicle and any value provided
      if (assetType === "vehicle" && (vehicleRegNo || vehicleEngineNo || vehicleChassisNo || vehicleManufactureYear)) {
        mortgagePayload.asset.vehicle = {
          registration_number: vehicleRegNo || undefined,
          engine_number: vehicleEngineNo || undefined,
          chassis_number: vehicleChassisNo || undefined,
          manufacture_year: vehicleManufactureYear || undefined,
        };
      }

      console.log('Mortgage Payload:', mortgagePayload);

      const mortRes = await axios.post(
        "http://localhost:8000/api/mortgages",
        mortgagePayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const mortgageId = mortRes.data.id;

      // Upload mortgage asset documents
      for (const doc of assetDocuments) {
        const fd = new FormData();
        fd.append("document_type", doc.type);
        fd.append("file", doc.file);
        await axios.post(
          `http://localhost:8000/api/mortgages/${mortgageId}/documents`,
          fd,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Upload mortgage legal documents
      for (const doc of legalDocuments) {
        const fd = new FormData();
        fd.append("document_type", doc.type);
        fd.append("file", doc.file);
        await axios.post(
          `http://localhost:8000/api/mortgages/${mortgageId}/documents`,
          fd,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      router.push(`/dashboard/mortgages/${mortgageId}`);
    } catch (e: any) {
      console.error('Mortgage creation error:', e);
      if (e.response && e.response.data) {
        if (e.response.data.errors) {
          // Validation errors
          const errorMessages = Object.values(e.response.data.errors).flat().join('\n');
          openModal("error", "Validation Errors", errorMessages);
        } else if (e.response.data.message) {
          openModal("error", "Submission Error", String(e.response.data.message));
        } else {
          openModal("error", "Server Error", JSON.stringify(e.response.data));
        }
      } else {
        openModal("error", "Network Error", "Failed to create mortgage. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestSubmit = () => {
    if (isSubmitting || !isCurrentStepComplete) return;
    openModal("confirm", "Confirm Submission", "Are you sure you want to submit this mortgage application?");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-24 left-8 h-80 w-80 rounded-full bg-cyan-300 blur-3xl"></div>
        <div className="absolute top-24 right-8 h-72 w-72 rounded-full bg-blue-300 blur-3xl"></div>
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-teal-300 blur-3xl"></div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ModuleHeader
          title="New Mortgage Application"
          subtitle="Step-by-step guided form"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mortgages', href: '/dashboard/mortgages' },
            { label: 'New' },
          ]}
          actions={(
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-lg bg-gradient-to-r from-slate-600 to-gray-800 px-4 py-2 text-white shadow-sm transition hover:opacity-95"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.back()}
                className="rounded-lg bg-gradient-to-r from-gray-500 to-zinc-700 px-4 py-2 text-white shadow-sm transition hover:opacity-95"
              >
                Back
              </button>
            </div>
          )}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Step indicator */}
        <div className="rounded-2xl border border-white/70 bg-white/80 backdrop-blur-xl p-4 shadow-[0_16px_40px_-24px_rgba(14,116,144,0.55)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {STEP_ORDER.map((key, i) => {
              const active = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const isLocked = i > maxReachableIndex;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (!isLocked) setStep(key);
                }}
                disabled={isLocked}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  isCurrent
                    ? "border-cyan-300 bg-gradient-to-r from-cyan-100 to-blue-100"
                    : active
                    ? "border-cyan-100 bg-cyan-50/60"
                    : "border-slate-200 bg-slate-50"
                } ${isLocked ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    isCurrent
                      ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-sm"
                      : active
                      ? "bg-cyan-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {i + 1}
                </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isCurrent ? "text-cyan-800" : "text-slate-600"}`}>
                      {STEP_LABELS[key]}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          </div>
        </div>

        {/* Step content */}
        <SectionCard
          title={stepTitle}
          description="Provide the required information for this step"
          className="border border-white/70 bg-white/85 backdrop-blur-xl shadow-[0_18px_45px_-28px_rgba(14,116,144,0.55)]"
        >
          <div className="space-y-6 [&_input]:rounded-xl [&_input]:border-cyan-100 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2 [&_input]:text-black [&_input]:shadow-sm [&_input]:outline-none [&_input]:transition [&_input]:focus:border-cyan-300 [&_input]:focus:ring-2 [&_input]:focus:ring-cyan-200 [&_select]:rounded-xl [&_select]:border-cyan-100 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2 [&_select]:text-black [&_select]:shadow-sm [&_select]:outline-none [&_select]:transition [&_select]:focus:border-cyan-300 [&_select]:focus:ring-2 [&_select]:focus:ring-cyan-200 [&_textarea]:rounded-xl [&_textarea]:border-cyan-100 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-black [&_textarea]:shadow-sm [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-cyan-300 [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-cyan-200">
          {step === "profile" && (
            <>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Customer</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  File Code
                </label>
                <input
                  value={fileCode}
                  onChange={(e) => setFileCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="e.g. CUS-2026-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  NIC / Passport
                </label>
                <input
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Marital Status
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nationality
                </label>
                <input
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
            </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Contact</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Permanent Address
                  </label>
                  <textarea
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current Address
                  </label>
                  <textarea
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile Number
                  </label>
                  <input
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            </>
          )}

          {step === "financial" && (
            <>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Employment & Income</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employer / Business Name
                </label>
                <input
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Job Title / Business Type
                </label>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Monthly Income
                </label>
                <input
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Other Income Sources
                </label>
                <textarea
                  value={otherIncomeSources}
                  onChange={(e) => setOtherIncomeSources(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
            </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Credit & Risk</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Existing Loans
                </label>
                <select
                  value={existingLoans ? "yes" : "no"}
                  onChange={(e) => setExistingLoans(e.target.value === "yes")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Monthly Loan Obligations
                </label>
                <input
                  value={monthlyLoanObligations}
                  onChange={(e) => setMonthlyLoanObligations(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Credit Score (if available)
                </label>
                <input
                  value={creditScore}
                  onChange={(e) => setCreditScore(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Bank Statements (uploads)
                </label>
                <input type="file" multiple />
              </div>
            </div>
            </div>
            </>
          )}

          {step === "coBorrower" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  value={coBorrowerName}
                  onChange={(e) => setCoBorrowerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  NIC / Passport
                </label>
                <input
                  value={coBorrowerNic}
                  onChange={(e) => setCoBorrowerNic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Relationship to Borrower
                </label>
                <input
                  value={coBorrowerRelationship}
                  onChange={(e) => setCoBorrowerRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  value={coBorrowerAddress}
                  onChange={(e) => setCoBorrowerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Number
                </label>
                <input
                  value={coBorrowerContact}
                  onChange={(e) => setCoBorrowerContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Income Details (Monthly)
                </label>
                <input
                  value={coBorrowerIncome}
                  onChange={(e) => setCoBorrowerIncome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
            </div>
          )}

          {step === "loanCollateral" && (
            <>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Loan Terms</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mortgage Type
                </label>
                <select
                  value={mortgageType}
                  onChange={(e) => setMortgageType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  {["land", "house", "vehicle", "gold", "other"].map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Requested Amount
                </label>
                <input
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Approved Amount
                </label>
                <input
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Interest Rate (%)
                </label>
                <input
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Interest Type
                </label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="fixed">Fixed</option>
                  <option value="reducing">Reducing Balance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Loan Tenure (months)
                </label>
                <input
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Refund Frequency
                </label>
                <select
                  value={installmentFrequency}
                  onChange={(e) =>
                    setInstallmentFrequency(e.target.value as any)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Interest Calculation Frequency
                </label>
                <select
                  value={interestCalculationFrequency}
                  onChange={(e) =>
                    setInterestCalculationFrequency(e.target.value as any)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Processing Fee
                </label>
                <input
                  value={processingFee}
                  onChange={(e) => setProcessingFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Insurance Fee
                </label>
                <input
                  value={insuranceFee}
                  onChange={(e) => setInsuranceFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Penalty Rate (%)
                </label>
                <input
                  value={penaltyRate}
                  onChange={(e) => setPenaltyRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
            </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Collateral</p>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Asset Type
                  </label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  >
                    {["land", "house", "vehicle", "gold", "other"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ownership Type
                  </label>
                  <select
                    value={ownershipType}
                    onChange={(e) => setOwnershipType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  >
                    <option value="single">Single</option>
                    <option value="joint">Joint</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset Description
                </label>
                <textarea
                  value={assetDescription}
                  onChange={(e) => setAssetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <h4 className="text-sm font-semibold text-gray-800">Legal Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deed Number
                  </label>
                  <input
                    value={deedNumber}
                    onChange={(e) => setDeedNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deed Date
                  </label>
                  <input
                    type="date"
                    value={deedDate}
                    onChange={(e) => setDeedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Survey Plan Number
                  </label>
                  <input
                    value={surveyPlanNumber}
                    onChange={(e) => setSurveyPlanNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Registration Office
                  </label>
                  <input
                    value={registrationOffice}
                    onChange={(e) => setRegistrationOffice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Lawyer Name
                  </label>
                  <input
                    value={lawyerName}
                    onChange={(e) => setLawyerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-800">Valuation Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Market Value
                  </label>
                  <input
                    value={marketValue}
                    onChange={(e) => setMarketValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Forced Sale Value
                  </label>
                  <input
                    value={forcedSaleValue}
                    onChange={(e) => setForcedSaleValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Valuation Date
                  </label>
                  <input
                    type="date"
                    value={valuationDate}
                    onChange={(e) => setValuationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Valuer Name
                  </label>
                  <input
                    value={valuerName}
                    onChange={(e) => setValuerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-800">Physical Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address / Location
                  </label>
                  <input
                    value={assetAddress}
                    onChange={(e) => setAssetAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Land Size / Building Area
                  </label>
                  <input
                    value={landSizeOrBuildingArea}
                    onChange={(e) => setLandSizeOrBuildingArea(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Boundaries / Identification marks
                  </label>
                  <textarea
                    value={boundaries}
                    onChange={(e) => setBoundaries(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
              </div>

              {assetType === "vehicle" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Registration Number
                    </label>
                    <input
                      value={vehicleRegNo}
                      onChange={(e) => setVehicleRegNo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Engine Number
                    </label>
                    <input
                      value={vehicleEngineNo}
                      onChange={(e) => setVehicleEngineNo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Chassis Number
                    </label>
                    <input
                      value={vehicleChassisNo}
                      onChange={(e) => setVehicleChassisNo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Manufacture Year
                    </label>
                    <input
                      value={vehicleManufactureYear}
                      onChange={(e) => setVehicleManufactureYear(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                    />
                  </div>
                </div>
              )}
            </div>
            </div>
            </>
          )}

          {step === "documentsReview" && (
            <div className="space-y-6">
              <h4 className="text-sm font-semibold text-gray-800">
                Customer Documents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    NIC / Passport copy
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setCustomerDocuments((prev) => [
                        ...prev,
                        { type: "nic_passport", file: e.target.files![0] },
                      ])
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address verification
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setCustomerDocuments((prev) => [
                        ...prev,
                        {
                          type: "address_verification",
                          file: e.target.files![0],
                        },
                      ])
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Salary slips (last 3 months)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setCustomerDocuments((prev) => [
                        ...prev,
                        ...files.map((f) => ({ type: "salary_slip", file: f })),
                      ]);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bank statements
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setCustomerDocuments((prev) => [
                        ...prev,
                        ...files.map((f) => ({ type: "bank_statement", file: f })),
                      ]);
                    }}
                  />
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-800">
                Mortgage Asset Documents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deed copy
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setAssetDocuments((prev) => [
                        ...prev,
                        { type: "deed_copy", file: e.target.files![0] },
                      ])
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Survey plan
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setAssetDocuments((prev) => [
                        ...prev,
                        { type: "survey_plan", file: e.target.files![0] },
                      ])
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Valuation report
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setAssetDocuments((prev) => [
                        ...prev,
                        { type: "valuation_report", file: e.target.files![0] },
                      ])
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Insurance policy
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setAssetDocuments((prev) => [
                        ...prev,
                        { type: "insurance_policy", file: e.target.files![0] },
                      ])
                    }
                  />
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-800">
                Legal & Internal Docs
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mortgage agreement (PDF)
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setLegalDocuments((prev) => [
                        ...prev,
                        { type: "mortgage_agreement", file: e.target.files![0] },
                      ])
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Approval note
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setLegalDocuments((prev) => [
                        ...prev,
                        { type: "approval_note", file: e.target.files![0] },
                      ])
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Release letter (after settlement)
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files &&
                      setLegalDocuments((prev) => [
                        ...prev,
                        { type: "release_letter", file: e.target.files![0] },
                      ])
                    }
                  />
                </div>
              </div>
              <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
                <p className="text-sm font-medium text-slate-800">Review</p>
                <p className="mt-1 text-sm text-slate-600">
                  Review your mortgage details and submit.
                </p>
              </div>
            </div>
          )}
          </div>
        </SectionCard>

        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={isSubmitting || currentStepIndex === 0}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
          {step === "documentsReview" ? (
            <button
              onClick={requestSubmit}
              disabled={isSubmitting || !isCurrentStepComplete}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2 text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={isSubmitting || !isCurrentStepComplete}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2 text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cyan-100 bg-white shadow-2xl">
            <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">{modalTitle}</h3>
            </div>
            <div className="px-5 py-4">
              <p className="whitespace-pre-line text-sm text-slate-700">{modalMessage}</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-cyan-100 bg-slate-50 px-5 py-4">
              {modalKind === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      closeModal();
                      await handleSubmit();
                    }}
                    className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
