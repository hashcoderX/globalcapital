import React from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  className?: string;
}

export default function SectionCard({ title, description, actions, children, padded = true, className = "" }: SectionCardProps) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate-800">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}
