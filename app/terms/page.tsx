import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { termsHtml } from "@/lib/legal/terms-html";

// Static legal page. Content is generated from docs/legal/terms.md by
// scripts/build-legal.mjs — first-party trusted HTML, no user input.
export const metadata: Metadata = {
  title: "Terms of Service — Foreman",
  description: "The terms that govern your use of Foreman.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link href="/">
        <Wordmark />
      </Link>
      <div
        className="legal-prose mt-8"
        dangerouslySetInnerHTML={{ __html: termsHtml }}
      />
    </main>
  );
}
