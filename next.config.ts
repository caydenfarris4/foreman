import type { NextConfig } from "next";

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
