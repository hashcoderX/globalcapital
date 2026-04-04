"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoanProduct = {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
};

type CustomerDetails = {
  customerNo: string;
  fullName: string;
  nic: string;
  mobile: string;
  address: string;
  businessName: string;
  monthlyIncome: string;
  additionalIncome: string;
  incomeSource: string;
};

type GuarantorDetails = {
  fullName: string;
  nic: string;
  mobile: string;
  relation: string;
  address: string;
  monthlyIncome: string;
};

const DEFAULT_LOAN_PRODUCTS: LoanProduct[] = [
  {
    key: "business_loan",
    name: "Business Loan",
    description: "Working capital and enterprise lending operations.",
    icon: "\ud83c\udfe2",
    color: "from-cyan-500 to-blue-500",
  },
  {
    key: "personal_loan",
    name: "Personal Loan",
    description: "Individual loan issuing and repayment monitoring.",
    icon: "\ud83e\uddd1",
    color: "from-teal-500 to-cyan-500",
  },
  {
    key: "sme_loan",
    name: "SME Loan",
    description: "Small and medium enterprise growth financing.",
    icon: "\ud83d\udecd",
    color: "from-emerald-500 to-cyan-500",
  },
];

const PRODUCT_COLORS = [
  "from-cyan-500 to-blue-500",
  "from-teal-500 to-cyan-500",
  "from-emerald-500 to-cyan-500",
  "from-indigo-500 to-blue-500",
  "from-orange-500 to-amber-500",
  "from-violet-500 to-fuchsia-500",
];

const PRODUCT_ICONS = ["\ud83c\udfe2", "\ud83e\uddd1", "\ud83d\udecd", "\ud83d\ude9c", "\ud83c\udfe0", "\ud83d\ude97", "\ud83c\udf93", "\ud83d\udcb3", "\ud83d\udedf"]; 

export default function NewLoanRequestPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const [token, setToken] = useState("");
  const router = useRouter();
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>(DEFAULT_LOAN_PRODUCTS);
  const [loanProduct, setLoanProduct] = useState<string>(DEFAULT_LOAN_PRODUCTS[0].key);
  const [newProductName, setNewProductName] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductIcon, setNewProductIcon] = useState(PRODUCT_ICONS[0]);
  const [principal, setPrincipal] = useState("1000000");
  const [annualRate, setAnnualRate] = useState("18");
  const [tenureMonths, setTenureMonths] = useState("36");
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    customerNo: "",
    fullName: "",
    nic: "",
    mobile: "",
    address: "",
    businessName: "",
    monthlyIncome: "",
    additionalIncome: "",
    incomeSource: "",
  });
  const [guarantors, setGuarantors] = useState<GuarantorDetails[]>([
    {
      fullName: "",
      nic: "",
      mobile: "",
      relation: "",
      address: "",
      monthlyIncome: "",
    },
  ]);
  const [activeStep, setActiveStep] = useState(1);
  const [stepNotice, setStepNotice] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/");
    } else {
      setToken(storedToken);
    }
  }, [router]);

  useEffect(() => {
    const raw = localStorage.getItem("loan_products_custom");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const customProducts: LoanProduct[] = parsed
        .filter((item) => item && typeof item === "object")
        .map((item, index) => ({
          key: String(item.key || `custom_product_${index + 1}`),
          name: String(item.name || `Custom Product ${index + 1}`),
          description: String(item.description || "Custom loan product."),
          icon: String(item.icon || PRODUCT_ICONS[index % PRODUCT_ICONS.length]),
          color: String(item.color || PRODUCT_COLORS[index % PRODUCT_COLORS.length]),
        }));

      if (customProducts.length > 0) {
        setLoanProducts((prev) => {
          const existing = new Set(prev.map((item) => item.key));
          const appendable = customProducts.filter((item) => !existing.has(item.key));
          return [...prev, ...appendable];
        });
      }
    } catch {
      // Ignore invalid local storage data for custom products.
    }
  }, []);

  const selectedProduct = useMemo(
    () => loanProducts.find((item) => item.key === loanProduct) || loanProducts[0],
    [loanProducts, loanProduct]
  );

  const steps = useMemo(
    () => [
      { id: 1, title: "Loan Product", hint: "Select product and add new products" },
      { id: 2, title: "Customer Details", hint: "Capture primary applicant details" },
      { id: 3, title: "Guarantor Details", hint: "Capture one or more guarantors" },
      { id: 4, title: "Loan Terms", hint: "Amount, rate, tenure, and frequency" },
      { id: 5, title: "Review", hint: "Final confirmation before submission" },
      { id: 6, title: "Document Upload", hint: "Upload supporting documents" },
    ],
    []
  );
  const progressPercent = (activeStep / steps.length) * 100;

  const addLoanProduct = () => {
    const name = newProductName.trim();
    const description = newProductDescription.trim() || "Custom loan product.";
    if (!name) return;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const uniqueKey = `${slug || "custom_loan"}_${Date.now()}`;
    const color = PRODUCT_COLORS[loanProducts.length % PRODUCT_COLORS.length];

    const nextProduct: LoanProduct = {
      key: uniqueKey,
      name,
      description,
      icon: newProductIcon,
      color,
    };

    setLoanProducts((prev) => {
      const next = [...prev, nextProduct];
      const custom = next.filter((item) => !DEFAULT_LOAN_PRODUCTS.some((defaultItem) => defaultItem.key === item.key));
      localStorage.setItem("loan_products_custom", JSON.stringify(custom));
      return next;
    });

    setLoanProduct(uniqueKey);
    setNewProductName("");
    setNewProductDescription("");
    setNewProductIcon(PRODUCT_ICONS[(loanProducts.length + 1) % PRODUCT_ICONS.length]);
  };

  const calculation = useMemo(() => {
    const principalAmount = Number(principal);
    const rate = Number(annualRate);
    const months = Number(tenureMonths);

    if (!Number.isFinite(principalAmount) || principalAmount <= 0 || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(months) || months <= 0) {
      return {
        installments: 0,
        installmentAmount: 0,
        totalPayable: 0,
      };
    }

    const installmentsPerYear = frequency === "weekly" ? 52 : 12;
    const years = months / 12;
    const installments = Math.max(1, Math.round(years * installmentsPerYear));
    const totalInterest = principalAmount * (rate / 100) * years;
    const totalPayable = principalAmount + totalInterest;
    const installmentAmount = totalPayable / installments;

    return {
      installments,
      installmentAmount,
      totalPayable,
    };
  }, [principal, annualRate, tenureMonths, frequency]);

  const formatAmount = (value: number): string => {
    if (!Number.isFinite(value)) return "-";
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const updateGuarantor = (index: number, field: keyof GuarantorDetails, value: string) => {
    setGuarantors((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  };

  const addGuarantor = () => {
    setGuarantors((prev) => [
      ...prev,
      {
        fullName: "",
        nic: "",
        mobile: "",
        relation: "",
        address: "",
        monthlyIncome: "",
      },
    ]);
  };

  const removeGuarantor = (index: number) => {
    setGuarantors((prev) => (prev.length <= 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)));
  };

  const handleDocumentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;

    setDocuments((prev) => {
      const existingKey = new Set(prev.map((file) => `${file.name}_${file.size}_${file.lastModified}`));
      const appendable = selected.filter(
        (file) => !existingKey.has(`${file.name}_${file.size}_${file.lastModified}`)
      );
      return [...prev, ...appendable];
    });

    event.target.value = "";
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const customerInfoComplete =
    customerDetails.customerNo.trim() &&
    customerDetails.fullName.trim() &&
    customerDetails.nic.trim() &&
    customerDetails.mobile.trim() &&
    customerDetails.address.trim() &&
    customerDetails.monthlyIncome.trim() &&
    customerDetails.incomeSource.trim();

  const guarantorHasAnyData = guarantors.some(
    (item) =>
      item.fullName.trim() ||
      item.nic.trim() ||
      item.mobile.trim() ||
      item.relation.trim() ||
      item.address.trim() ||
      item.monthlyIncome.trim()
  );

  const guarantorInfoComplete =
    !guarantorHasAnyData ||
    guarantors.every(
      (item) =>
        !(
          item.fullName.trim() ||
          item.nic.trim() ||
          item.mobile.trim() ||
          item.relation.trim() ||
          item.address.trim() ||
          item.monthlyIncome.trim()
        ) ||
        (item.fullName.trim() && item.nic.trim() && item.mobile.trim() && item.relation.trim() && item.address.trim())
    );

  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!selectedProduct) return "Please select a loan product.";
      return null;
    }

    if (step === 2) {
      if (!customerDetails.customerNo.trim()) return "Customer Number is required.";
      if (!customerDetails.fullName.trim()) return "Customer Full Name is required.";
      if (!customerDetails.nic.trim()) return "Customer NIC / Passport is required.";
      if (!customerDetails.mobile.trim()) return "Customer Mobile Number is required.";
      if (!customerDetails.address.trim()) return "Customer Address is required.";
      const monthlyIncome = Number(customerDetails.monthlyIncome);
      if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return "Customer monthly income is required.";
      if (!customerDetails.incomeSource.trim()) return "Primary income source is required.";
      return null;
    }

    if (step === 3) {
      if (!guarantorInfoComplete) return "Guarantor is optional, but if entered please complete required guarantor fields.";
      return null;
    }

    if (step === 4) {
      const principalAmount = Number(principal);
      const rate = Number(annualRate);
      const months = Number(tenureMonths);
      if (!Number.isFinite(principalAmount) || principalAmount <= 0) return "Enter a valid principal amount.";
      if (!Number.isFinite(rate) || rate < 0) return "Enter a valid yearly interest rate.";
      if (!Number.isFinite(months) || months <= 0) return "Enter a valid tenure in months.";
      return null;
    }

    if (step === 6) {
      if (documents.length === 0) return "Please upload at least one supporting document.";
      return null;
    }

    return null;
  };

  const handleNextStep = () => {
    const error = validateStep(activeStep);
    if (error) {
      setStepNotice(error);
      return;
    }

    setStepNotice("");
    setActiveStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleStepClick = (stepId: number) => {
    if (stepId <= activeStep) {
      setActiveStep(stepId);
      setStepNotice("");
      return;
    }

    const error = validateStep(activeStep);
    if (error) {
      setStepNotice(error);
      return;
    }

    setStepNotice("");
    setActiveStep(stepId);
  };

  const handleSubmitLoanRequest = async () => {
    const step1Error = validateStep(1);
    const step2Error = validateStep(2);
    const step3Error = validateStep(3);
    const step4Error = validateStep(4);
    const step6Error = validateStep(6);

    if (step1Error) {
      setActiveStep(1);
      setStepNotice(step1Error);
      return;
    }

    if (step2Error) {
      setActiveStep(2);
      setStepNotice(step2Error);
      return;
    }

    if (step3Error) {
      setActiveStep(3);
      setStepNotice(step3Error);
      return;
    }

    if (step4Error) {
      setActiveStep(4);
      setStepNotice(step4Error);
      return;
    }

    if (step6Error) {
      setActiveStep(6);
      setStepNotice(step6Error);
      return;
    }

    const nonEmptyGuarantors = guarantors.filter(
      (item) =>
        item.fullName.trim() ||
        item.nic.trim() ||
        item.mobile.trim() ||
        item.relation.trim() ||
        item.address.trim() ||
        item.monthlyIncome.trim()
    );

    setSubmitLoading(true);
    setSubmitError("");
    setSubmitMessage("");

    try {
      const payload = new FormData();
      payload.append("loan_product", selectedProduct?.name || loanProduct);
      payload.append("principal", String(Number(principal)));
      payload.append("annual_rate", String(Number(annualRate)));
      payload.append("tenure_months", String(Number(tenureMonths)));
      payload.append("installment_frequency", frequency);
      payload.append("installments", String(calculation.installments));
      payload.append("installment_amount", String(Number(calculation.installmentAmount.toFixed(2))));
      payload.append("total_payable", String(Number(calculation.totalPayable.toFixed(2))));
      payload.append("customer_details", JSON.stringify(customerDetails));
      payload.append("guarantor_details", JSON.stringify(nonEmptyGuarantors.length ? nonEmptyGuarantors : []));
      payload.append("required_approval_level", "2");

      documents.forEach((document) => {
        payload.append("documents[]", document);
      });

      const response = await axios.post(`${API_URL}/api/loan-requests`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const requestNo = response.data?.data?.request_no;
      setSubmitMessage(requestNo ? `Loan request submitted successfully (${requestNo}).` : "Loan request submitted successfully.");
      setIsSubmitted(true);
      setDocuments([]);
      setStepNotice("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (typeof error.response?.data?.message === "string" && error.response.data.message) ||
          "Failed to submit loan request. Please try again.";
        setSubmitError(message);
      } else {
        setSubmitError("Failed to submit loan request. Please try again.");
      }
    } finally {
      setSubmitLoading(false);
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
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-cyan-200 blur-3xl"></div>
        <div className="absolute top-10 right-10 h-72 w-72 rounded-full bg-blue-200 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-200 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-white/90 rounded-3xl border border-cyan-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Credit Module</p>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">New Loan Request</h1>
            <p className="text-sm text-slate-600 mt-1">Step-by-step process to capture a new loan request.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/loan")}
            className="px-4 py-2 rounded-xl bg-white border border-cyan-200 text-cyan-800 text-sm font-semibold hover:bg-cyan-50"
          >
            Back to Loan Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-cyan-100 bg-white/90 p-6">
            <div className="rounded-xl border border-cyan-100 bg-white p-4">
              <div className="h-2 rounded-full bg-cyan-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-2">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    className={`rounded-xl border px-3 py-2 text-left transition-all ${
                      activeStep === step.id
                        ? "border-cyan-300 bg-cyan-50"
                        : step.id < activeStep
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-cyan-100 bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">Step {step.id}</p>
                    <p className="text-xs font-semibold text-slate-700">{step.title}</p>
                  </button>
                ))}
              </div>
            </div>

            {activeStep === 1 && (
              <>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Step 1</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Loan Products</h2>
                <p className="text-sm text-slate-600 mt-1">Select a product and optionally add more products.</p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loanProducts.map((item) => {
                    const active = loanProduct === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setLoanProduct(item.key)}
                        className={`text-left rounded-xl border p-4 transition-all ${
                          active
                            ? "border-cyan-300 bg-cyan-50 shadow-sm"
                            : "border-cyan-100 bg-white hover:bg-cyan-50/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center text-xl text-white`}>
                            {item.icon}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-600">{item.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">Add Loan Product</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Product name (e.g. Agriculture Loan)"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <input
                      value={newProductDescription}
                      onChange={(e) => setNewProductDescription(e.target.value)}
                      placeholder="Short description"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <select
                      value={newProductIcon}
                      onChange={(e) => setNewProductIcon(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      {PRODUCT_ICONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={addLoanProduct}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-700 hover:to-blue-700"
                  >
                    Add Product
                  </button>
                </div>
              </>
            )}

            {activeStep === 2 && (
              <>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Step 2</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Customer Details</h2>
                <p className="text-sm text-slate-600 mt-1">Capture complete applicant and income details.</p>

                <div className="mt-6 rounded-xl border border-cyan-100 bg-white p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={customerDetails.customerNo}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, customerNo: e.target.value }))
                      }
                      placeholder="Customer Number *"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <input
                      value={customerDetails.fullName}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      placeholder="Full Name *"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <input
                      value={customerDetails.nic}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, nic: e.target.value }))
                      }
                      placeholder="NIC / Passport *"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <input
                      value={customerDetails.mobile}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, mobile: e.target.value }))
                      }
                      placeholder="Mobile Number *"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <input
                      value={customerDetails.businessName}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, businessName: e.target.value }))
                      }
                      placeholder="Business Name (Optional)"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900 md:col-span-2"
                    />
                    <input
                      type="number"
                      min="0"
                      value={customerDetails.monthlyIncome}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, monthlyIncome: e.target.value }))
                      }
                      placeholder="Monthly Income *"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <input
                      value={customerDetails.incomeSource}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, incomeSource: e.target.value }))
                      }
                      placeholder="Primary Income Source *"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <input
                      type="number"
                      min="0"
                      value={customerDetails.additionalIncome}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, additionalIncome: e.target.value }))
                      }
                      placeholder="Additional Income (Optional)"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900 md:col-span-2"
                    />
                    <textarea
                      value={customerDetails.address}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({ ...prev, address: e.target.value }))
                      }
                      placeholder="Customer Address *"
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900 md:col-span-2"
                      rows={3}
                    />
                  </div>
                </div>
              </>
            )}

            {activeStep === 3 && (
              <>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Step 3</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Guarantor Details</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Guarantor is optional. If entered, complete all required fields.
                </p>

                <div className="mt-6 rounded-xl border border-cyan-100 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">
                      Guarantors
                    </p>
                    <button
                      type="button"
                      onClick={addGuarantor}
                      className="px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-800 text-xs font-semibold hover:bg-cyan-200"
                    >
                      Add Guarantor
                    </button>
                  </div>

                  {guarantors.map((item, index) => (
                    <div
                      key={`guarantor_${index}`}
                      className="rounded-lg border border-cyan-100 bg-cyan-50/30 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-700">Guarantor {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeGuarantor(index)}
                          className="px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold hover:bg-rose-200"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={item.fullName}
                          onChange={(e) => updateGuarantor(index, "fullName", e.target.value)}
                          placeholder="Full Name *"
                          className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                        <input
                          value={item.nic}
                          onChange={(e) => updateGuarantor(index, "nic", e.target.value)}
                          placeholder="NIC / Passport *"
                          className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                        <input
                          value={item.mobile}
                          onChange={(e) => updateGuarantor(index, "mobile", e.target.value)}
                          placeholder="Mobile Number *"
                          className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                        <input
                          value={item.relation}
                          onChange={(e) => updateGuarantor(index, "relation", e.target.value)}
                          placeholder="Relationship to Customer *"
                          className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                        <input
                          value={item.monthlyIncome}
                          onChange={(e) => updateGuarantor(index, "monthlyIncome", e.target.value)}
                          placeholder="Monthly Income (Optional)"
                          className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                        <textarea
                          value={item.address}
                          onChange={(e) => updateGuarantor(index, "address", e.target.value)}
                          placeholder="Address *"
                          className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900 md:col-span-2"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeStep === 4 && (
              <>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Step 4</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Loan Terms</h2>
                <p className="text-sm text-slate-600 mt-1">Set repayment frequency, amount, rate, and tenure.</p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                      Selected Product
                    </label>
                    <input
                      value={selectedProduct?.name || "-"}
                      readOnly
                      className="w-full rounded-xl border border-cyan-100 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                      Installment Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as "monthly" | "weekly")}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                      Principal Amount
                    </label>
                    <input
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                      Interest Rate % (Yearly)
                    </label>
                    <input
                      value={annualRate}
                      onChange={(e) => setAnnualRate(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                      Tenure (Months)
                    </label>
                    <input
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(e.target.value)}
                      className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>
              </>
            )}

            {activeStep === 5 && (
              <>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Step 5</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Review</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Confirm selected product, customer, guarantor, and loan terms.
                </p>

                <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-2 text-sm">
                  <p>
                    <span className="font-semibold text-slate-700">Product:</span> {selectedProduct?.name || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Customer:</span> {customerDetails.fullName || "-"} ({
                      customerDetails.customerNo || "-"
                    })
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Monthly Income:</span> {formatAmount(Number(customerDetails.monthlyIncome || 0))}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Income Source:</span> {customerDetails.incomeSource || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Guarantors:</span> {guarantors.length}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Principal:</span> {formatAmount(Number(principal || 0))}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Interest:</span> {annualRate || "0"}%
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Tenure:</span> {tenureMonths || "0"} months
                  </p>
                </div>
              </>
            )}

            {activeStep === 6 && (
              <>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Step 6</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Document Upload</h2>
                <p className="text-sm text-slate-600 mt-1">Upload one or more supporting documents before submission.</p>

                <div className="mt-6 rounded-xl border border-cyan-100 bg-white p-4 space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Supporting Documents (Multiple files allowed: PDF, DOC, DOCX, JPG, PNG)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleDocumentSelect}
                    className="w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-900"
                  />

                  {documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((document, index) => (
                        <div
                          key={`${document.name}_${document.lastModified}_${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-cyan-100 bg-cyan-50/40 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{document.name}</p>
                            <p className="text-xs text-slate-500">{(document.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold hover:bg-rose-200"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700">No documents selected yet. You can choose multiple files at once or add more in batches.</p>
                  )}
                </div>
              </>
            )}

            {stepNotice && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {stepNotice}
              </div>
            )}

            {submitMessage && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {submitMessage}
              </div>
            )}

            {submitError && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveStep((prev) => Math.max(prev - 1, 1));
                  setStepNotice("");
                }}
                disabled={activeStep === 1}
                className="px-4 py-2 rounded-lg border border-cyan-200 bg-white text-cyan-800 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back Step
              </button>

              {activeStep < steps.length ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-700 hover:to-blue-700"
                >
                  Next Step
                </button>
              ) : isSubmitted ? (
                <div className="px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold">
                  Loan Request Already Submitted
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitLoanRequest}
                  disabled={submitLoading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitLoading ? "Submitting..." : "Submit Loan Request"}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white/90 p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Calculation Preview</p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-900">Shared Formula</h3>
            <p className="text-sm text-slate-600 mt-1">All selected loan products use this same calculation.</p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                <p className="text-slate-500">Installments</p>
                <p className="text-lg font-bold text-slate-900">{calculation.installments}</p>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                <p className="text-slate-500">Installment Amount</p>
                <p className="text-lg font-bold text-slate-900">{formatAmount(calculation.installmentAmount)}</p>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                <p className="text-slate-500">Total Payable</p>
                <p className="text-lg font-bold text-slate-900">{formatAmount(calculation.totalPayable)}</p>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                <p className="text-slate-500">Customer Details</p>
                <p
                  className={`text-sm font-bold ${
                    customerInfoComplete ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {customerInfoComplete ? "Completed" : "Missing required fields"}
                </p>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                <p className="text-slate-500">Guarantor Details</p>
                <p
                  className={`text-sm font-bold ${
                    guarantorInfoComplete ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {guarantorInfoComplete
                    ? guarantorHasAnyData
                      ? `Completed (${guarantors.length})`
                      : "Optional (Not provided)"
                    : "Missing required guarantor fields"}
                </p>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                <p className="text-slate-500">Documents</p>
                <p className={`text-sm font-bold ${documents.length > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                  {documents.length > 0 ? `Uploaded (${documents.length})` : "Upload required"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
