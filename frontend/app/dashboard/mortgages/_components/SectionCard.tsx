'use client';

import React from "react";
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  className?: string;
  onHideWidget?: () => void;
  hideWidgetAriaLabel?: string;
}

export default function SectionCard({
  title,
  description,
  actions,
  children,
  padded = true,
  className = "",
  onHideWidget,
  hideWidgetAriaLabel,
}: SectionCardProps) {
  return (
    <section className={`relative rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate-800">{description}</p>}
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {actions && <div>{actions}</div>}
            {onHideWidget ? (
              <WidgetCloseGate>
                <button
                  type="button"
                  onClick={onHideWidget}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-700"
                  aria-label={hideWidgetAriaLabel || `Hide ${title || 'section'} widget`}
                >
                  ×
                </button>
              </WidgetCloseGate>
            ) : null}
          </div>
        </div>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}
