import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Lets `next dev` reach Cloudflare bindings (e.g. the R2 cache) via
// getCloudflareContext(). Dev-only; no effect on the production build.
initOpenNextCloudflareForDev();

const SECURITY_HEADERS = [
  // Disallow framing anywhere — no part of the app is meant to be embedded.
  // Blocks clickjacking on the auth, check-in, and upgrade pages.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full URL (incl. ?error=... or filter params) to
  // outbound links / CDNs / third-party scripts.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny powerful features by default. The app uses none of these.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  // Force HTTPS for two years incl. subdomains. The app is served over TLS
  // (Cloudflare); browsers ignore this header over plain HTTP, so it is safe
  // to emit everywhere. SOC 2 transport-security control.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
