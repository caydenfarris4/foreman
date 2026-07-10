import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { CoachChat } from "./coach-chat";

// The Coach tab: a contained conversation grounded in Under Construction —
// the coach in the author's voice, plus a path to a live session with Cayden.
// (The daily check-in and habit checklist live on Home now.)

// Configure with a scheduling link (Calendly etc.); falls back to email.
const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ??
  "mailto:cayden.farris03@gmail.com?subject=Coaching%20session";

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as Pick<Profile, "name"> | null;
  const firstName = profile?.name?.split(/\s+/)[0] ?? null;

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

      <div className="mt-5">
        <CoachChat firstName={firstName} />
      </div>

      {/* Live session with Cayden — the human behind the coach. */}
      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-moss-wash p-4 ring-1 ring-moss/25">
        <div>
          <p className="type-label text-ink">Want to go deeper?</p>
          <p className="type-caption mt-0.5 text-graphite">
            Book a live session with Cayden — the coach behind the coach.
          </p>
        </div>
        <a
          href={BOOKING_URL}
          target={BOOKING_URL.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          className="type-label shrink-0 rounded-lg bg-moss px-4 py-2.5 text-[oklch(0.98_0.01_150)] transition-opacity hover:opacity-90"
        >
          Book
        </a>
      </div>
    </div>
  );
}
