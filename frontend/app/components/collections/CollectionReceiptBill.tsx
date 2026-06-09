"use client";

import { Printer, X } from "lucide-react";
import { useRef, useState } from "react";

export type CollectionReceipt = {
  bill_no: string;
  product_type: string;
  product_label: string;
  reference: string;
  source_id: number;
  customer_name: string;
  customer_no: string | null;
  loan_product: string;
  payment_date: string;
  payment_type: string;
  payment_reference: string | null;
  paid_amount: number;
  principal_paid: number;
  interest_paid: number;
  penalty_paid: number;
  arrears_before: number;
  arrears_after: number;
  outstanding: number;
  total_paid_cumulative: number;
  installment_amount: number;
  next_due_date: string | null;
  note: string | null;
  collection_id: number | null;
  printed_at?: string;
};

export type ReceiptPrintFormat = "thermal-80" | "dot-matrix" | "a4";

function formatAmount(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function line(label: string, value: string, bold = false) {
  return (
    <div className={`receipt-row flex justify-between gap-2 text-[11px] leading-tight ${bold ? "font-bold" : ""}`}>
      <span className="text-slate-700 shrink-0">{label}</span>
      <span className="text-slate-900 text-right break-all">{value}</span>
    </div>
  );
}

const PRINT_FORMATS: { id: ReceiptPrintFormat; label: string; hint: string }[] = [
  { id: "thermal-80", label: "Thermal 80mm", hint: "POS / receipt printer" },
  { id: "dot-matrix", label: "Dot matrix", hint: "Continuous / tractor feed" },
  { id: "a4", label: "A4 / Letter", hint: "Office laser or inkjet" },
];

function previewWidthClass(format: ReceiptPrintFormat): string {
  if (format === "thermal-80") return "max-w-[80mm]";
  if (format === "dot-matrix") return "max-w-[190mm]";
  return "max-w-[210mm]";
}

function printStyles(format: ReceiptPrintFormat): string {
  const shared = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, monospace;
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0 auto;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 2px 0;
      word-break: break-word;
    }
    .row span:last-child { text-align: right; max-width: 55%; }
    .title { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .paid-box {
      border: 1px solid #000;
      padding: 6px;
      margin: 6px 0;
      text-align: center;
    }
    .paid-box .amt { font-size: 14px; font-weight: 700; }
    .receipt-row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .receipt-row span:last-child { text-align: right; max-width: 58%; word-break: break-word; }
  `;

  if (format === "thermal-80") {
    return `${shared}
      body { font-size: 11px; padding: 6px; width: 72mm; max-width: 72mm; }
      @media print {
        @page { size: 80mm auto; margin: 3mm; }
        body { width: 72mm; max-width: 72mm; padding: 0; }
      }`;
  }

  if (format === "dot-matrix") {
    return `${shared}
      body { font-size: 12px; padding: 10px; width: 180mm; max-width: 180mm; }
      @media print {
        @page { size: auto; margin: 8mm; }
        body { width: 180mm; max-width: 180mm; padding: 0; }
      }`;
  }

  return `${shared}
    body { font-size: 12px; padding: 12px; width: 100%; max-width: 180mm; }
    @media print {
      @page { size: A4 portrait; margin: 12mm; }
      body { width: 100%; max-width: 180mm; padding: 0; }
    }`;
}

type Props = {
  open: boolean;
  receipt: CollectionReceipt | null;
  onClose: () => void;
  companyName?: string;
  defaultPrintFormat?: ReceiptPrintFormat;
};

export default function CollectionReceiptBill({
  open,
  receipt,
  onClose,
  companyName = "BMS Collection Center",
  defaultPrintFormat = "thermal-80",
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printFormat, setPrintFormat] = useState<ReceiptPrintFormat>(defaultPrintFormat);

  if (!open || !receipt) return null;

  const handlePrint = (format: ReceiptPrintFormat = printFormat) => {
    const node = printRef.current;
    if (!node) return;

    const width = format === "thermal-80" ? 420 : format === "dot-matrix" ? 760 : 820;
    const height = format === "thermal-80" ? 720 : 900;
    const printWindow = window.open("", "_blank", `width=${width},height=${height}`);
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${receipt.bill_no}</title>
  <style>${printStyles(format)}</style>
</head>
<body>
  ${node.innerHTML}
  <script>window.onload = function(){ window.focus(); window.print(); }</script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[96vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Collection receipt</p>
            <p className="text-sm font-extrabold text-slate-900">{receipt.bill_no}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Paper / printer</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRINT_FORMATS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPrintFormat(item.id)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  printFormat === item.id
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-bold text-slate-900">{item.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{item.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div
            ref={printRef}
            className={`mx-auto w-full ${previewWidthClass(printFormat)} bg-white border border-dashed border-slate-400 p-3 font-mono text-[11px] text-black shadow-sm`}
          >
            <div className="center text-center mb-2">
              <p className="title text-xs font-bold uppercase">{companyName}</p>
              <p className="text-[10px] font-bold uppercase mt-1">OFFICIAL COLLECTION RECEIPT</p>
              <p className="text-[10px] mt-0.5">{receipt.product_label}</p>
            </div>

            <hr className="divider border-t border-dashed border-slate-800 my-2" />

            {line("Bill No", receipt.bill_no)}
            {line("Date", formatDate(receipt.payment_date))}
            {line("Reference", receipt.reference)}
            {line("Customer", receipt.customer_name || "—", true)}
            {line("Customer No", receipt.customer_no || "—")}
            {line("Product", receipt.loan_product || "—")}

            <hr className="divider border-t border-dashed border-slate-800 my-2" />

            <div className="paid-box border border-slate-800 py-2 px-2 my-2 text-center">
              <p className="text-[10px] uppercase">Amount paid today</p>
              <p className="amt text-sm font-bold mt-0.5">LKR {formatAmount(receipt.paid_amount)}</p>
            </div>

            {line("Principal paid", formatAmount(receipt.principal_paid))}
            {line("Interest paid", formatAmount(receipt.interest_paid))}
            {line("Penalty paid", formatAmount(receipt.penalty_paid))}
            {line("Arrears (before)", formatAmount(receipt.arrears_before))}
            {line("Arrears (after)", formatAmount(receipt.arrears_after))}
            {line("Total paid to date", formatAmount(receipt.total_paid_cumulative), true)}
            {line("Outstanding balance", formatAmount(receipt.outstanding), true)}
            {line("Installment", formatAmount(receipt.installment_amount))}
            {line("Next due date", formatDate(receipt.next_due_date))}

            <hr className="divider border-t border-dashed border-slate-800 my-2" />

            {line("Pay type", receipt.payment_type.replace(/_/g, " ").toUpperCase())}
            {receipt.payment_reference ? line("Reference no", receipt.payment_reference) : null}
            {receipt.note ? line("Note", receipt.note) : null}

            <p className="text-center text-[9px] mt-3 text-slate-600">
              Thank you — keep this receipt
              <br />
              {receipt.printed_at ? new Date(receipt.printed_at).toLocaleString() : new Date().toLocaleString()}
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 p-4 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => handlePrint(printFormat)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Printer className="h-4 w-4" />
            Print bill
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
