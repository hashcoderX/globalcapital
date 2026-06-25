'use client';

import React from "react";
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  onHideWidget?: () => void;
  hideWidgetAriaLabel?: string;
}

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border-cyan-400/30",
  success: "bg-gradient-to-br from-emerald-500/15 to-green-500/15 border-emerald-400/30",
  warning: "bg-gradient-to-br from-amber-500/15 to-orange-500/15 border-amber-400/30",
  danger: "bg-gradient-to-br from-rose-500/15 to-red-500/15 border-rose-400/30",
  neutral: "bg-gradient-to-br from-slate-500/10 to-gray-500/10 border-slate-400/20",
};

export default function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
  onHideWidget,
  hideWidgetAriaLabel,
}: StatCardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border ${toneMap[tone]} p-4 shadow-sm transition hover:shadow-md hover:ring-1 hover:ring-slate-200/60`}>
      {onHideWidget ? (
        <WidgetCloseGate>
          <button
            type="button"
            onClick={onHideWidget}
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white/85 text-xs font-bold text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-700"
            aria-label={hideWidgetAriaLabel || `Hide ${label} widget`}
          >
            ×
          </button>
        </WidgetCloseGate>
      ) : null}
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/60 text-slate-700 shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <div className="text-xs font-medium text-slate-600">{label}</div>
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
        </div>
      </div>
    </div>
  );
}
