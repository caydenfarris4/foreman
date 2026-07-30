import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Newsreader, Hanken_Grotesk } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

// Chrome fires `beforeinstallprompt` once, early, and only surfaces its own
// install UI unless we intercept it. This runs before hydration so the event
// is never missed; components read window.__foremanInstallEvent via
// components/pwa/use-install-prompt.ts.
const INSTALL_CAPTURE = `
window.__foremanInstallEvent = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__foremanInstallEvent = e;
  window.dispatchEvent(new Event('foreman:install-ready'));
});
window.addEventListener('appinstalled', function () {
  window.__foremanInstallEvent = null;
  window.dispatchEvent(new Event('foreman:install-done'));
});
`;

// Cornerstone design system: Newsreader (light, literary serif) for display
// and prompts; Hanken Grotesk for everything else, including the letter-spaced
// caps that used to be mono.
const serif = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Foreman — Coaching for first-time managers",
  description:
    "A daily coaching companion built on the Under Construction framework. Foundation, framing, finishing.",
  applicationName: "Foreman",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Foreman",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fefbf7", // cream — matches globals.css and the PWA manifest
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable}`}
    >
      <body>
        <Script id="install-capture" strategy="beforeInteractive">
          {INSTALL_CAPTURE}
        </Script>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
