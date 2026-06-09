'use client';

import { useEffect } from 'react';
import { argsLookLikeExtensionNoise, isExtensionNoise } from './extensionNoisePatterns';

const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug'] as const;
const originalConsoleMethods = new Map<(typeof CONSOLE_METHODS)[number], typeof console.log>();

function patchConsole() {
  CONSOLE_METHODS.forEach((method) => {
    if (!originalConsoleMethods.has(method)) {
      originalConsoleMethods.set(method, console[method].bind(console));
    }

    console[method] = (...args: unknown[]) => {
      if (argsLookLikeExtensionNoise(args)) return;
      originalConsoleMethods.get(method)?.(...args);
    };
  });
}

function patchPromiseRejections() {
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!isExtensionNoise(event.reason)) return;
    event.preventDefault();
    event.stopImmediatePropagation?.();
  };

  const onWindowError = (event: ErrorEvent) => {
    if (!isExtensionNoise(event.error ?? event.message)) return;
    event.preventDefault();
    event.stopImmediatePropagation?.();
  };

  window.addEventListener('unhandledrejection', onUnhandledRejection, true);
  window.addEventListener('error', onWindowError, true);

  return () => {
    window.removeEventListener('unhandledrejection', onUnhandledRejection, true);
    window.removeEventListener('error', onWindowError, true);
  };
}

/**
 * Suppresses benign noise from browser extensions (copy helpers, Chrome messaging).
 */
export default function ExtensionNoiseFilter() {
  useEffect(() => {
    patchConsole();
    return patchPromiseRejections();
  }, []);

  return null;
}
