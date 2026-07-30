"use client";

/**
 * foreman.coach/start — the page behind the QR code printed in the book.
 * The printed URL never changes; this page's MODE does.
 *
 * PHASE 1 (past): a waitlist. Captured the reader's email → POST
 * /api/waitlist (stored in Supabase, confirmation sent via Resend). The
 * waitlist UI, API route, and stored emails all stay intact below — flip
 * MODE back to "waitlist" to resurrect it.
 *
 * PHASE 2 (now): launch. Foreman ships as the web app itself — scanners go
 * straight to signup for the 14-day trial, and after they're in, the Home
 * screen offers "Add to home screen" (components/pwa/install-card.tsx), which
 * installs the PWA full-screen with the Foreman icon. No app store involved.
 * Send the collected waitlist the launch email with
 * scripts/send-launch-email.mjs.
 */

// ---- PHASE FLAG -------------------------------------------------------
// "waitlist" = capture emails (Phase 1). "launch" = live app (Phase 2).
const MODE: "waitlist" | "launch" = "launch";

// ---- EDITABLE COPY ----------------------------------------------------
// Rewrite freely; the layout below doesn't care about the words.
const HEADLINE = "You're still under construction. So is this.";
const SUBHEAD =
  "Get early access to Foreman — daily direction for leaders who are building before they feel ready.";
const CTA_LABEL = "Get early access";
const PLACEHOLDER = "you@example.com";
const SUCCESS_TITLE = "You're on the list.";
const SUCCESS_BODY = "Check your inbox — confirmation is on its way.";
const ALREADY_BODY = "You were already on the list. You're set.";

// Launch-mode copy.
const LAUNCH_HEADLINE = "Foreman is live.";
const LAUNCH_SUBHEAD =
  "Daily direction for leaders who are building before they feel ready. Free for 14 days — right from your phone, no download needed.";
const LAUNCH_CTA = "Start your 14-day trial";
const LAUNCH_NOTE =
  "Tip: once you're in, add Foreman to your home screen — it opens full-screen like an app.";

import { useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { Spinner } from "@/components/ui/button";

export default function StartPage() {
  return MODE === "waitlist" ? <Waitlist /> : <Launch />;
}

function Launch() {
  return (
    <main className="flex min-h-screen flex-col bg-paper px-6 pb-10 pt-14">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Wordmark />

        <div className="mt-12 flex-1">
          <div className="h-[3px] w-10 rounded-full bg-blueprint" />
          <p className="type-cap mt-4 text-blueprint">FROM THE BOOK</p>
          <h1 className="type-display mt-3 text-ink">{LAUNCH_HEADLINE}</h1>
          <p className="type-body-lg mt-4 text-graphite">{LAUNCH_SUBHEAD}</p>

          <div className="mt-8">
            <Link
              href="/signup"
              className="type-label flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-[16px] text-[oklch(0.97_0.01_80)] transition-colors hover:bg-[oklch(0.26_0.02_55)]"
            >
              {LAUNCH_CTA} →
            </Link>
            <p className="type-caption mt-3 text-graphite">{LAUNCH_NOTE}</p>
            <p className="type-caption mt-6 text-graphite">
              Already building here?{" "}
              <Link href="/login" className="underline">
                Log in
              </Link>
              .
            </p>
          </div>
        </div>

        <p className="type-caption mt-10 text-graphite">
          Built from the job site, not the penthouse.
        </p>
      </div>
    </main>
  );
}

function Waitlist() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "sending" }
    | { phase: "done"; already: boolean }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

  async function submit() {
    const value = email.trim();
    if (!value) return;
    setState({ phase: "sending" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, source: "book_qr" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState({
          phase: "error",
          message: json.error ?? "Something broke. Try again.",
        });
        return;
      }
      setState({ phase: "done", already: !!json.alreadyOnList });
    } catch {
      setState({
        phase: "error",
        message: "Network hiccup — your email wasn't saved. Try again.",
      });
    }
  }

  const sending = state.phase === "sending";

  return (
    <main className="flex min-h-screen flex-col bg-paper px-6 pb-10 pt-14">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Wordmark />

        <div className="mt-12 flex-1">
          <div className="h-[3px] w-10 rounded-full bg-blueprint" />
          <p className="type-cap mt-4 text-blueprint">FROM THE BOOK</p>
          <h1 className="type-display mt-3 text-ink">{HEADLINE}</h1>
          <p className="type-body-lg mt-4 text-graphite">{SUBHEAD}</p>

          {state.phase === "done" ? (
            <div className="mt-8 rounded-xl bg-moss-wash p-5 ring-1 ring-moss/25">
              <p className="type-cap text-moss">CONFIRMED</p>
              <p className="type-h2 mt-1.5 text-ink">{SUCCESS_TITLE}</p>
              <p className="type-body-sm mt-1.5 text-graphite">
                {state.already ? ALREADY_BODY : SUCCESS_BODY}
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <label htmlFor="waitlist-email" className="type-label text-ink2">
                Email
              </label>
              <input
                id="waitlist-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={PLACEHOLDER}
                disabled={sending}
                className="type-body mt-2 w-full rounded-lg border border-rule bg-chalk px-4 py-3.5 text-ink outline-none transition-colors focus:border-blueprint"
              />
              {state.phase === "error" ? (
                <p className="type-caption mt-2 text-rust">{state.message}</p>
              ) : null}
              <button
                type="button"
                onClick={submit}
                disabled={sending || !email.trim()}
                className="type-label mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-[16px] text-[oklch(0.97_0.01_80)] transition-colors hover:bg-[oklch(0.26_0.02_55)] disabled:bg-shell disabled:text-haze"
              >
                {sending ? (
                  <>
                    <Spinner /> Saving your spot…
                  </>
                ) : (
                  `${CTA_LABEL} →`
                )}
              </button>
              <p className="type-caption mt-3 text-graphite">
                One email when the app ships. No noise before that.
              </p>
            </div>
          )}
        </div>

        <p className="type-caption mt-10 text-graphite">
          Built from the job site, not the penthouse.
        </p>
      </div>
    </main>
  );
}

