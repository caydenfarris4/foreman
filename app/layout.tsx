import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foreman — Coaching for first-time managers",
  description:
    "A daily coaching companion built on the Under Construction framework. Foundation, framing, finishing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
