"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ModuleHeader from "../_components/ModuleHeader";
import SectionCard from "../_components/SectionCard";

type Step =
  | "customer"
  | "contact"
  | "employment"
  | "credit"
  | "coBorrower"
  | "loan"
  | "asset"
  | "documents"
  | "review";

export default function CreateMortgage() {
  const [token, setToken] = useState("");
  const [step, setStep] = useState<Step>("customer");
  const router = useRouter();

  // Customer details
  const [fullName, setFullName] = useState("");
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
    "land" | "house" | "apartment" | "vehicle" | "gold" | "other"
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
    }
  }, [router]);

  const nextStep = () => {
    const order: Step[] = [
      "customer",
      "contact",
      "employment",
      "credit",
      "coBorrower",
      "loan",
      "asset",
      "documents",
      "review",
    ];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  };

  const prevStep = () => {
    const order: Step[] = [
      "customer",
      "contact",
      "employment",
      "credit",
      "coBorrower",
      "loan",
      "asset",
      "documents",
      "review",
    ];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const stepTitle = useMemo(() => {
    switch (step) {
      case "customer":
        return "Customer Details";
      case "contact":
        return "Contact Details";
      case "employment":
        return "Employment & Income";
      case "credit":
        return "Credit & Risk";
      case "coBorrower":
        return "Co-Borrower / Guarantor Details";
      case "loan":
        return "Mortgage Loan Details";
      case "asset":
        return "Mortgage Item / Collateral Details";
      case "documents":
        return "Documents & Attachments";
      case "review":
        return "Review & Submit";
    }
  }, [step]);

  const handleSubmit = async () => {
    if (!token) return;
    try {
      // Create Customer
      const [first, last] = fullName.split(" ").length > 1
        ? [fullName.split(" ")[0], fullName.split(" ").slice(1).join(" ")]
        : [fullName, ""];
      const customerPayload = {
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
      const custRes = await axios.post(
        "http://localhost:8000/api/customers",
        customerPayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const createdCustomerId = custRes.data.id;

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

      const mortgagePayload: any = {
        customer_id: createdCustomerId,
        mortgage_type: mortgageType,
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
          description: assetDescription,
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
          alert(`Validation errors:\n${errorMessages}`);
        } else if (e.response.data.message) {
          alert(`Error: ${e.response.data.message}`);
        } else {
          alert(`Server error: ${JSON.stringify(e.response.data)}`);
        }
      } else {
        alert("Failed to create mortgage. Please check your connection and try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {(
            [
              "customer",
              "contact",
              "employment",
              "credit",
              "coBorrower",
              "loan",
              "asset",
              "documents",
              "review",
            ] as Step[]
          ).map((key, i, arr) => {
            const active = i <= arr.indexOf(step);
            return (
              <div key={key} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {i + 1}
                </div>
                {i < arr.length - 1 && (
                  <div
                    className={`h-1 w-10 rounded-full ${
                      active
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <SectionCard
          title={stepTitle}
          description="Provide the required information for this step"
        >
          {step === "customer" && (
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
          )}

          {step === "contact" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Permanent Address
                </label>
                <textarea
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Address
                </label>
                <textarea
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <input
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
            </div>
          )}

          {step === "employment" && (
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
          )}

          {step === "credit" && (
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

          {step === "loan" && (
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
                  {["land", "house", "apartment", "vehicle", "gold", "other"].map(
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
          )}

          {step === "asset" && (
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
          )}

          {step === "documents" && (
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
            </div>
          )}

          {step === "review" && (
            <div>
              <p className="text-gray-700">
                Review your mortgage details and submit.
              </p>
            </div>
          )}
        </SectionCard>

        <div className="flex justify-between">
          <button
            onClick={prevStep}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-50"
          >
            Back
          </button>
          {step === "review" ? (
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2 text-white shadow-sm transition hover:opacity-95"
            >
              Submit Application
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2 text-white shadow-sm transition hover:opacity-95"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
