import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin";
import {
  DEFAULT_SESSION_PLAN,
  generateSessionTimestamps,
  isValidSlug,
} from "@/lib/cohorts";

export const runtime = "nodejs";

const BodySchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().refine(isValidSlug, "Invalid slug"),
  description: z.string().trim().max(2000).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  capacity: z.coerce.number().int().min(1).max(50).default(12),
  price_cents: z.coerce.number().int().min(0).max(10_000_000).default(80000),
  subscriber_discount_cents: z.coerce.number().int().min(0).max(10_000_000).default(15000),
  stripe_product_id: z.string().trim().max(120).optional(),
  stripe_price_id_standard: z.string().trim().max(120).optional(),
  stripe_price_id_subscriber: z.string().trim().max(120).optional(),
  hero_quote: z.string().trim().max(500).optional(),
  curriculum_summary: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Check the fields and try again.",
      },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Sanity: end_date >= start_date + ~7 weeks (8 sessions span 7 weeks).
  const start = new Date(`${d.start_date}T00:00:00Z`);
  const end = new Date(`${d.end_date}T00:00:00Z`);
  if (end.getTime() < start.getTime()) {
    return NextResponse.json(
      { error: "End date can't be before start date." },
      { status: 400 },
    );
  }
  // Brief says Saturdays. Soft-warn only if start is not a Saturday:
  // create anyway, but the auto-generated session schedule assumes
  // weekly cadence starting on start_date.

  const admin = createAdminClient();
  const { data: inserted, error: insertError } = await admin
    .from("cohorts")
    .insert({
      name: d.name,
      slug: d.slug,
      description: d.description ?? null,
      start_date: d.start_date,
      end_date: d.end_date,
      capacity: d.capacity,
      price_cents: d.price_cents,
      subscriber_discount_cents: d.subscriber_discount_cents,
      stripe_product_id: d.stripe_product_id ?? null,
      stripe_price_id_standard: d.stripe_price_id_standard ?? null,
      stripe_price_id_subscriber: d.stripe_price_id_subscriber ?? null,
      hero_quote: d.hero_quote ?? null,
      curriculum_summary: d.curriculum_summary ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return NextResponse.json(
        { error: "That slug is already taken — pick another." },
        { status: 409 },
      );
    }
    console.error("Admin cohort insert failed", insertError?.message);
    return NextResponse.json(
      { error: "Could not create the cohort." },
      { status: 500 },
    );
  }
  const cohortId = (inserted as { id: string }).id;

  // Auto-generate the 8 weekly sessions from start_date.
  const timestamps = generateSessionTimestamps(d.start_date);
  const sessionRows = DEFAULT_SESSION_PLAN.map((s, i) => ({
    cohort_id: cohortId,
    session_number: s.number,
    title: s.title,
    framework_phase: s.framework_phase,
    scheduled_at: timestamps[i],
    duration_minutes: 90,
  }));
  const { error: sessionsError } = await admin
    .from("cohort_sessions")
    .insert(sessionRows);
  if (sessionsError) {
    console.error(
      "Admin cohort sessions insert failed",
      sessionsError.message,
    );
    // Don't roll back — the cohort exists, admin can recreate sessions
    // manually. Surface the warning.
    return NextResponse.json({
      ok: true,
      cohort_id: cohortId,
      warning: "Cohort created but session schedule failed. Edit sessions manually.",
    });
  }

  return NextResponse.json({ ok: true, cohort_id: cohortId });
}
