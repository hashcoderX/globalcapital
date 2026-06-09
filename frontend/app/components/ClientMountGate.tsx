'use client';

import { useEffect, useState, type ReactNode } from 'react';

type ClientMountGateProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Renders children only after the browser has mounted.
 * Avoids hydration mismatches when extensions inject attributes (e.g. fdprocessedid) into forms/buttons.
 */
export default function ClientMountGate({ children, fallback = null }: ClientMountGateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
