'use client';

import React from "react";
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  onHideWidget?: () => void;
  hideWidgetAriaLabel?: string;
}

export default function ModuleHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  onHideWidget,
  hideWidgetAriaLabel,
}: ModuleHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-xl">
      <div className="absolute inset-0 opacity-20">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1920 1080">
          <defs>
            <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="#22d3ee" offset="0" />
              <stop stopColor="#3b82f6" offset="0.5" />
              <stop stopColor="#6366f1" offset="1" />
            </linearGradient>
          </defs>
          <circle cx="200" cy="200" r="180" fill="url(#g)" />
          <circle cx="1600" cy="180" r="140" fill="url(#g)" />
          <circle cx="1200" cy="900" r="220" fill="url(#g)" />
        </svg>
      </div>
      <div className="relative p-6 sm:p-8">
        {onHideWidget ? (
          <WidgetCloseGate>
            <button
              type="button"
              onClick={onHideWidget}
              className="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/50 bg-white/85 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
              aria-label={hideWidgetAriaLabel || `Hide ${title} widget`}
            >
              ×
            </button>
          </WidgetCloseGate>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm sm:text-base text-cyan-100/90">{subtitle}</p>
            )}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="mt-2 text-xs sm:text-sm text-cyan-100/90">
                {breadcrumbs.map((b, i) => (
                  <span key={i}>
                    {b.href ? (
                      <a href={b.href} className="underline decoration-cyan-200/60 underline-offset-2 hover:text-white">
                        {b.label}
                      </a>
                    ) : (
                      <span className="font-medium">{b.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <span className="mx-2">/</span>}
                  </span>
                ))}
              </nav>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
