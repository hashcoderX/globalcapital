import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Keep local development isolated from machine-level env leakage.
// This project should always proxy /api to the local bms backend.
const apiProxyTarget = "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Allows `next dev` (Turbopack) without conflicting with the PWA webpack plugin.
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${apiProxyTarget}/storage/:path*`,
      },
      {
        source: "/media/:path*",
        destination: `${apiProxyTarget}/media/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/finance/reports/income-expense",
        destination: "/dashboard/reports/income-expense",
        permanent: true,
      },
      {
        source: "/dashboard/finance/reports/general-ledger",
        destination: "/dashboard/reports/general-ledger",
        permanent: true,
      },
      {
        source: "/dashboard/finance/reports/cash-flow",
        destination: "/dashboard/reports/cash-flow",
        permanent: true,
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
  },
});

export default function nextConfigWrapper(phase: string) {
  if (phase === PHASE_PRODUCTION_BUILD) {
    return withPWA(nextConfig);
  }

  return nextConfig;
}
