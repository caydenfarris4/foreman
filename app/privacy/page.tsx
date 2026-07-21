import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { privacyHtml } from "@/lib/legal/privacy-html";

// Static legal page. Content is generated from docs/legal/privacy.md by
// scripts/build-legal.mjs — first-party trusted HTML, no user input.
// This URL goes in the Play Console store listing and Data Safety form.
export const metadata: Metadata = {
  title: "Privacy Policy — Foreman",
  description: "What data Foreman collects, why, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link href="/">
        <Wordmark />
      </Link>
      <div
        className="legal-prose mt-8"
        dangerouslySetInnerHTML={{ __html: privacyHtml }}
      />
    </main>
  );
}
