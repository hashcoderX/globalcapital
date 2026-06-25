'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'dashboard_widgets_fixed';
const CHANGE_EVENT = 'dashboard-widgets-fixed-change';

function readWidgetsFixed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function writeWidgetsFixed(value: boolean) {
  localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useWidgetsFixed() {
  const [widgetsFixed, setWidgetsFixedState] = useState(false);

  useEffect(() => {
    setWidgetsFixedState(readWidgetsFixed());

    const sync = () => setWidgetsFixedState(readWidgetsFixed());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setWidgetsFixed = useCallback((value: boolean) => {
    setWidgetsFixedState(value);
    writeWidgetsFixed(value);
  }, []);

  const toggleWidgetsFixed = useCallback(() => {
    const next = !readWidgetsFixed();
    setWidgetsFixedState(next);
    writeWidgetsFixed(next);
  }, []);

  return {
    widgetsFixed,
    setWidgetsFixed,
    toggleWidgetsFixed,
    showWidgetCloseButtons: !widgetsFixed,
  };
}

export function WidgetCloseGate({ children }: { children: ReactNode }) {
  const { showWidgetCloseButtons } = useWidgetsFixed();
  if (!showWidgetCloseButtons) return null;
  return children;
}
