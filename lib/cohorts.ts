import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Cohort,
  Database,
  ParticipantStatus,
  Profile,
} from "@/lib/database.types";

// ---------- pricing ----------------------------------------------------

// Returns the cents the caller will be charged at checkout given their
// subscription state. Subscribers with status=active get the discount.
export function priceForUser(
  cohort: Pick<
    Cohort,
    "price_cents" | "subscriber_discount_cents"
  >,
  profile: Pick<Profile, "subscription_status"> | null,
): { cents: number; isDiscounted: boolean } {
  const isSubscriber = profile?.subscription_status === "active";
  const discount = cohort.subscriber_discount_cents ?? 0;
  if (isSubscriber && discount > 0) {
    return {
      cents: Math.max(0, cohort.price_cents - discount),
      isDiscounted: true,
    };
  }
  return { cents: cohort.price_cents, isDiscounted: false };
}

// Returns the right Stripe price id for a given user. Per-cohort DB values
// override; otherwise the env-configured prices apply to every cohort:
// STRIPE_PRICE_COHORT (standard $800) and optional
// STRIPE_PRICE_COHORT_SUBSCRIBER (the automatic $650 subscriber rate —
// falls back to standard when unset).
export function stripePriceIdForUser(
  cohort: Pick<
    Cohort,
    "stripe_price_id_standard" | "stripe_price_id_subscriber"
  >,
  profile: Pick<Profile, "subscription_status"> | null,
): string | null {
  const isSubscriber = profile?.subscription_status === "active";
  const standard =
    cohort.stripe_price_id_standard || process.env.STRIPE_PRICE_COHORT || null;
  const subscriber =
    cohort.stripe_price_id_subscriber ||
    process.env.STRIPE_PRICE_COHORT_SUBSCRIBER ||
    null;
  if (isSubscriber && subscriber) return subscriber;
  return standard;
}

// ---------- session schedule generator ---------------------------------

// Cohorts meet weekly for 8 weeks, Saturdays 10am Mountain Time. Given
// a start_date (a Saturday), build the 8 scheduled_at timestamps as ISO
// strings in UTC.
//
// Mountain Time at 10am is 17:00 UTC during MST (UTC-7) and 16:00 UTC
// during MDT (UTC-6). We compute the right offset for each Saturday.
export function generateSessionTimestamps(startDate: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    // Construct local-Denver 10am on the i-th Saturday after start.
    const d = new Date(`${startDate}T10:00:00`);
    d.setDate(d.getDate() + i * 7);
    const utcMs = denverWallToUtc(d);
    out.push(new Date(utcMs).toISOString());
  }
  return out;
}

// Given a naive Date interpreted as a Denver wall-clock time, return
// the UTC ms epoch.
function denverWallToUtc(d: Date): number {
  // Format as YYYY-MM-DDTHH:mm:ss to feed Intl.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const wall = `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
  // Use Intl to find what UTC instant Denver would see this wall time.
  // First, assume the wall time is UTC, get the Date.
  const naiveUtc = Date.parse(`${wall}Z`);
  // Then find what Denver clock that UTC moment would show, compute the
  // offset, and apply.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(naiveUtc));
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "00";
  const seenWall = Date.parse(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get(
      "minute",
    )}:${get("second")}Z`,
  );
  const offset = naiveUtc - seenWall;
  return naiveUtc + offset;
}

// Default 8-session curriculum. Admin can edit titles in the panel.
export const DEFAULT_SESSION_PLAN: Array<{
  number: number;
  title: string;
  framework_phase: "foundation" | "framing" | "finishing";
}> = [
  { number: 1, title: "Foundation — who you are when no one's watching", framework_phase: "foundation" },
  { number: 2, title: "Foundation — the principles you actually live by", framework_phase: "foundation" },
  { number: 3, title: "Framing — expectations and the 1:1 that matters", framework_phase: "framing" },
  { number: 4, title: "Framing — accountability without the theater", framework_phase: "framing" },
  { number: 5, title: "Framing — feedback as a discipline, not a moment", framework_phase: "framing" },
  { number: 6, title: "Finishing — culture is what you tolerate", framework_phase: "finishing" },
  { number: 7, title: "Finishing — the legacy question", framework_phase: "finishing" },
  { number: 8, title: "Close — the next 90 days, written down", framework_phase: "finishing" },
];

// ---------- access checks ---------------------------------------------

// Returns true when the user is an active cohort participant whose free
// app access window is still open. Used to bypass the subscription
// paywall during and just after a cohort run.
export async function hasActiveCohortAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("cohort_participants")
    .select("status, free_app_access_until")
    .eq("user_id", userId)
    .in("status", ["paid", "enrolled", "completed"]);
  if (!data) return false;
  const now = Date.now();
  return (data as {
    status: ParticipantStatus;
    free_app_access_until: string | null;
  }[]).some(
    (p) =>
      p.free_app_access_until &&
      new Date(p.free_app_access_until).getTime() > now,
  );
}

// ---------- slug helpers ----------------------------------------------

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 60 &&
    SLUG_REGEX.test(value)
  );
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------- date display helpers --------------------------------------

export function formatCohortDateRange(
  startDate: string,
  endDate: string,
): string {
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const fmtStart = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
  const fmtEnd = end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fmtStart} – ${fmtEnd}`;
}

export function formatCohortPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
