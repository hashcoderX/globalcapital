'use client';

import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import { WidgetCloseGate } from '@/lib/useWidgetsFixed';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function HRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const apiBase = getApiBaseUrl();
  const widgetPrefix = 'hrm_layout_widget_';
  const [token, setToken] = useState('');
  const [hiddenWidgetKeys, setHiddenWidgetKeys] = useState<string[]>([]);
  const [widgetNotice, setWidgetNotice] = useState<string | null>(null);

  const navigation = [
    { key: 'nav_employees', name: 'Employees', href: '/dashboard/hrm/employees', icon: '👥' },
    { key: 'nav_departments', name: 'Departments', href: '/dashboard/hrm/departments', icon: '🏢' },
    { key: 'nav_designations', name: 'Designations', href: '/dashboard/hrm/designations', icon: '📋' },
    { key: 'nav_candidates', name: 'Candidates', href: '/dashboard/hrm/candidates', icon: '🎯' },
  ];
  const visibleNavigation = navigation.filter(
    (item) => !hiddenWidgetKeys.includes(`${widgetPrefix}${item.key}`)
  );

  const fetchWidgetPreferences = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${apiBase}/dashboard/widgets`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const widgets = Array.isArray(response.data?.widgets) ? response.data.widgets : [];
      const hiddenKeys = widgets
        .filter((item: { widget_key?: string; is_visible?: boolean | number | null }) => !item?.is_visible)
        .map((item: { widget_key?: string }) => item.widget_key)
        .filter((key: unknown): key is string => typeof key === 'string' && key.startsWith(widgetPrefix));

      setHiddenWidgetKeys(hiddenKeys);
      setWidgetNotice(null);
    } catch {
      setWidgetNotice('Failed to load widget preferences.');
    }
  }, [apiBase, token, widgetPrefix]);

  const saveWidgetPreference = useCallback(
    async (widgetKey: string, isVisible: boolean) => {
      if (!token) return false;

      const normalizedKey = widgetKey.trim();
      if (!normalizedKey || normalizedKey.length > 120) {
        setWidgetNotice('Invalid widget key. Please refresh and try again.');
        return false;
      }

      try {
        await axios.patch(
          `${apiBase}/dashboard/widgets`,
          {
            widget_key: normalizedKey,
            is_visible: Boolean(isVisible),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );
        setWidgetNotice(null);
        return true;
      } catch {
        setWidgetNotice('Failed to save widget preference.');
        return false;
      }
    },
    [apiBase, token]
  );

  const hideWidget = useCallback(
    async (widgetKey: string) => {
      const ok = await saveWidgetPreference(widgetKey, false);
      if (!ok) return;
      setHiddenWidgetKeys((prev) => (prev.includes(widgetKey) ? prev : [...prev, widgetKey]));
    },
    [saveWidgetPreference]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchWidgetPreferences();
  }, [token, fetchWidgetPreferences]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HRM Navigation */}
      {!hiddenWidgetKeys.includes(`${widgetPrefix}top_nav`) && (
        <div className="bg-white shadow-sm border-b relative">
          <WidgetCloseGate>
            <button
              type="button"
              onClick={() => hideWidget(`${widgetPrefix}top_nav`)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm z-20"
              aria-label="Hide HRM top navigation widget"
              title="Hide widget"
            >
              ×
            </button>
          </WidgetCloseGate>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center py-4 gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-8 gap-2 sm:gap-0">
              {!hiddenWidgetKeys.includes(`${widgetPrefix}title`) && (
                <div className="relative w-fit">
                  <WidgetCloseGate>
                    <button
                      type="button"
                      onClick={() => hideWidget(`${widgetPrefix}title`)}
                      className="absolute -right-9 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm"
                      aria-label="Hide HRM title widget"
                      title="Hide widget"
                    >
                      ×
                    </button>
                  </WidgetCloseGate>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Human Resources</h1>
                </div>
              )}
              <nav className="flex space-x-3 sm:space-x-6 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
                {visibleNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                    <WidgetCloseGate>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void hideWidget(`${widgetPrefix}${item.key}`);
                        }}
                        className="ml-2 h-5 w-5 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300"
                        aria-label={`Hide ${item.name} navigation widget`}
                        title="Hide widget"
                      >
                        ×
                      </button>
                    </WidgetCloseGate>
                  </Link>
                ))}
                {visibleNavigation.length === 0 && (
                  <span className="text-sm text-gray-500">All navigation widgets are hidden.</span>
                )}
              </nav>
            </div>
            {!hiddenWidgetKeys.includes(`${widgetPrefix}back_dashboard`) && (
              <div className="flex justify-end relative">
                <WidgetCloseGate>
                  <button
                    type="button"
                    onClick={() => hideWidget(`${widgetPrefix}back_dashboard`)}
                    className="absolute -left-9 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300 shadow-sm"
                    aria-label="Hide back to dashboard widget"
                    title="Hide widget"
                  >
                    ×
                  </button>
                </WidgetCloseGate>
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  ← Back to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {widgetNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {widgetNotice}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}