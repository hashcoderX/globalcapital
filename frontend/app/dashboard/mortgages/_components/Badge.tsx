'use client';

import React from "react";
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  onHideWidget?: () => void;
  hideWidgetAriaLabel?: string;
}

const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-100 text-slate-800 border border-slate-200",
  success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border border-amber-200",
  danger: "bg-rose-100 text-rose-800 border border-rose-200",
  info: "bg-cyan-100 text-cyan-800 border border-cyan-200",
};

export default function Badge({ label, variant = "default", onHideWidget, hideWidgetAriaLabel }: BadgeProps) {
  return (
    <span className={`relative inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[variant]}`}>
      {onHideWidget ? (
        <WidgetCloseGate>
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onHideWidget();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onHideWidget();
              }
            }}
            className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/70 bg-white/85 text-[10px] font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
            aria-label={hideWidgetAriaLabel || `Hide ${label} widget`}
          >
            ×
          </span>
        </WidgetCloseGate>
      ) : null}
      {label}
    </span>
  );
}
