'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, title, children, footer, onClose, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-xl';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={clsx('relative w-full mx-4 rounded-2xl bg-white shadow-xl', width)}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">Close</button>
        </div>
        <div className="px-4 py-4">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-end gap-2">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
