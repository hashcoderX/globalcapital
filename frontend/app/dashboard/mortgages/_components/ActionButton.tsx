'use client';

import clsx from 'clsx';
import { ReactNode } from 'react';

type Variant = 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'default';
type Size = 'sm' | 'md';

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  className?: string;
}

export default function ActionButton({
  label,
  onClick,
  icon,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
}: ActionButtonProps) {
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1 text-xs'
    : 'px-4 py-2 text-sm';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    success: 'bg-gradient-to-r from-emerald-500 to-green-500',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500',
    info: 'bg-gradient-to-r from-indigo-500 to-violet-500',
    danger: 'bg-gradient-to-r from-rose-500 to-red-600',
    default: 'bg-gradient-to-r from-gray-500 to-zinc-700',
  }[variant];

  const baseClasses = 'inline-flex items-center gap-2 rounded-lg text-white shadow-sm border border-white/10 transition will-change-transform hover:translate-y-px hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(baseClasses, sizeClasses, variantClasses, className)}
    >
      {icon ? <span className="h-4 w-4">{icon}</span> : null}
      <span>{label}</span>
    </button>
  );
}
