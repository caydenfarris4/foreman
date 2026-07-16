import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CoachingSession, Profile } from "@/lib/database.types";
import { CoachChat } from "./coach-chat";
import { BookingCard } from "./booking-card";

// The Coach tab: a contained conversation grounded in Under Construction —
// the coach in the author's voice — plus 1:1 sessions with Cayden.
// Sessions are a product: the first is free, after that Stripe checkout
// grants credits (see /api/coaching/* and the webhook's 'coaching' branch).

// Scheduling link (Calendly etc.); falls back to email.
const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ??
  "mailto:cfarriscoaching@gmail.com?subject=Coaching%20session";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ coaching?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profileRow }, { data: sessionRows }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase
      .from("coaching_sessions")
      .select("kind")
      .eq("user_id", user.id),
  ]);
  const profile = profileRow as Pick<Profile, "name"> | null;
  const firstName = profile?.name?.split(/\s+/)[0] ?? null;
  const sessions = (sessionRows ?? []) as Pick<CoachingSession, "kind">[];
  const freeUsed = sessions.some((s) => s.kind === "free");
  const credits = sessions.length;

  return (
    <div className="px-3 pb-8 pt-6">
      <header className="flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blueprint text-[oklch(0.98_0.01_80)]">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
            <path d="M4 10.5L11 4l7 6.5" />
            <path d="M6 9.5V18h10V9.5" />
          </svg>
        </div>
        <div>
          <h1 className="type-h2 text-ink">Your Coach</h1>
          <p className="type-caption mt-0.5 flex items-center gap-1.5 text-graphite">
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            Grounded in the book · always here
          </p>
        </div>
      </header>

      {params.coaching === "success" ? (
        <div className="mt-4 rounded-lg bg-moss-wash p-4 ring-1 ring-moss/25">
          <p className="type-cap text-moss">PAYMENT RECEIVED</p>
          <p className="type-body-sm mt-1 text-ink2">
            Your session credit is in — schedule it below whenever you&apos;re
            ready.
          </p>
        </div>
      ) : params.coaching === "cancelled" ? (
        <div className="mt-4 rounded-lg border border-rule bg-chalk p-4">
          <p className="type-body-sm text-graphite">
            No charge — checkout was cancelled. The button below is here when
            you&apos;re ready.
          </p>
        </div>
      ) : null}

      <div className="mt-5">
        <CoachChat firstName={firstName} />
      </div>

      {/* Live sessions with Cayden — first one's free, then paid. */}
      <div className="mt-6">
        <BookingCard
          bookingUrl={BOOKING_URL}
          freeUsed={freeUsed}
          credits={credits}
        />
      </div>
    </div>
  );
}
