"use client";

// "Book a session with Cayden" — now a product with a ledger.
// States:
//   no credits  → the first session is free: claim it.
//   ≥1 credit   → schedule via the booking link + buy another (checkout).
// Credits are granted by /api/coaching/claim-free (first) and the Stripe
// webhook (paid); scheduling itself happens on the external booking link.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/button";

export function BookingCard({
  bookingUrl,
  freeUsed,
  credits,
}: {
  bookingUrl: string;
  /** Whether the one free session has been claimed. */
  freeUsed: boolean;
  /** Total sessions granted (free + paid). */
  credits: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [checkingOut, setCheckingOut] = useState(false);

  function claimFree() {
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/coaching/claim-free", { method: "POST" });
        const json = await res.json();
        if (!res.ok && res.status !== 409) {
          setError(json.error ?? "Could not claim the session.");
          return;
        }
        router.refresh();
      } catch {
        setError("Network problem. Try again.");
      }
    });
  }

  async function buySession() {
    setError(null);
    setCheckingOut(true);
    try {
      const res = await fetch("/api/coaching/checkout", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not start checkout.");
        setCheckingOut(false);
        return;
      }
      window.location.assign(json.url);
    } catch {
      setError("Network problem. Try again.");
      setCheckingOut(false);
    }
  }

  return (
    <div className="rounded-xl bg-moss-wash p-4 ring-1 ring-moss/25">
      {!freeUsed ? (
        <>
          <p className="type-label text-ink">
            Your first session with Cayden is on the house.
          </p>
          <p className="type-caption mt-0.5 text-graphite">
            Thirty minutes, one on one — the coach behind the coach.
          </p>
          <button
            type="button"
            onClick={claimFree}
            disabled={pending}
            className="type-label mt-3 inline-flex items-center gap-2 rounded-lg bg-moss px-4 py-2.5 text-[oklch(0.98_0.01_150)] transition-opacity hover:opacity-90"
          >
            {pending ? <Spinner /> : null}
            Claim your free session
          </button>
        </>
      ) : (
        <>
          <p className="type-label text-ink">
            {credits > 0
              ? `Session${credits > 1 ? "s" : ""} ready to schedule: ${credits}`
              : "Want to go deeper?"}
          </p>
          <p className="type-caption mt-0.5 text-graphite">
            {credits > 0
              ? "Pick a time that works — Cayden confirms by email."
              : "Book another live session with Cayden."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {credits > 0 ? (
              <a
                href={bookingUrl}
                target={bookingUrl.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="type-label rounded-lg bg-moss px-4 py-2.5 text-[oklch(0.98_0.01_150)] transition-opacity hover:opacity-90"
              >
                Schedule it →
              </a>
            ) : null}
            <button
              type="button"
              onClick={buySession}
              disabled={checkingOut}
              className="type-label inline-flex items-center gap-2 rounded-lg border border-moss/40 px-4 py-2.5 text-ink transition-colors hover:bg-moss/10"
            >
              {checkingOut ? <Spinner /> : null}
              Book another session
            </button>
          </div>
        </>
      )}
      {error ? <p className="type-caption mt-2 text-rust">{error}</p> : null}
    </div>
  );
}
