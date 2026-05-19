'use client';

import { useEffect } from 'react';

const isExtensionNoise = (value: unknown) => {
  const message = String(
    value instanceof Error ? value.message : value ?? ''
  ).toLowerCase();

  return (
    message.includes('message channel closed before a response was received') ||
    message.includes('extension context invalidated')
  );
};

/**
 * Suppresses known benign errors injected by browser extensions (e.g. copy helpers).
 * Does not hide application errors from this codebase.
 */
export default function ExtensionNoiseFilter() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isExtensionNoise(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', onUnhandledRejection);
  }, []);

  return null;
}
