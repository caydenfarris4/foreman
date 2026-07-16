import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";

// Public account-deletion instructions. Google Play's Data Safety form and
// Apple's account-deletion guideline both require a web URL where users can
// delete their account or learn how — this page is that URL. The actual
// flow lives in-app at /app/settings (DeleteAccountForm → deleteAccount).
export const metadata: Metadata = {
  title: "Delete your account — Foreman",
  description: "How to permanently delete your Foreman account and data.",
};

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-14">
      <Wordmark />
      <h1 className="type-h1 mt-8 text-ink">Delete your account</h1>
      <p className="type-body mt-3 text-graphite">
        You can permanently delete your Foreman account and all of its data
        yourself, from inside the app. Deletion is immediate and cannot be
        undone.
      </p>

      <ol className="type-body mt-6 list-decimal space-y-2 pl-5 text-ink">
        <li>Sign in to Foreman.</li>
        <li>
          Open <strong>You → Settings</strong>.
        </li>
        <li>
          In the <strong>Danger zone</strong> at the bottom, choose{" "}
          <strong>Delete account</strong> and type DELETE to confirm.
        </li>
      </ol>

      <div className="mt-8 rounded-lg border border-rule bg-chalk p-5">
        <p className="type-cap text-graphite">WHAT GETS DELETED</p>
        <p className="type-body mt-3 text-ink">
          Your profile and onboarding answers, every daily check-in and
          coaching response, your situation library, notes and journal, weekly
          retros and monthly syntheses, growth plans and inspections, and any
          cohort membership. An active subscription is canceled immediately.
        </p>
        <p className="type-body mt-3 text-graphite">
          Our payment processor (Stripe) retains transaction records as
          required by law. Nothing else is kept.
        </p>
      </div>

      <p className="type-body mt-8 text-graphite">
        Can&rsquo;t sign in? Email{" "}
        <a href="mailto:cfarriscoaching@gmail.com?subject=Account%20deletion%20request">
          cfarriscoaching@gmail.com
        </a>{" "}
        from the address on your account and we&rsquo;ll delete it for you
        within 30 days.
      </p>

      <div className="mt-8">
        <Button asChild variant="secondary" size="md">
          <Link href="/login?next=/app/settings">Sign in to delete</Link>
        </Button>
      </div>
    </main>
  );
}
