import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromAddress, getResend } from "@/lib/resend";
import {
  cohortApplicationReceivedHtml,
  cohortApplicationReceivedSubject,
} from "@/lib/emails/cohort";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isValidSlug } from "@/lib/cohorts";
import type { Cohort } from "@/lib/database.types";

export const runtime = "nodejs";

const BodySchema = z.object({
  application_text: z.string().trim().min(40).max(4000),
  why_joining: z.string().trim().max(4000).optional(),
  current_team_size: z.coerce.number().int().min(0).max(500).optional(),
  current_challenge: z.string().trim().max(2000).optional(),
  agreed_to_commitment: z.literal(true),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const limited = await enforceRateLimit(request, "cohort-apply");
  if (limited) return limited;

  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill out every required field." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Cohort must exist AND be open.
  const { data: cohortRow } = await supabase
    .from("cohorts")
    .select("id, name, status, capacity")
    .eq("slug", slug)
    .maybeSingle();
  const cohort = cohortRow as Pick<
    Cohort,
    "id" | "name" | "status" | "capacity"
  > | null;
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }
  if (cohort.status !== "open") {
    return NextResponse.json(
      { error: "This cohort is no longer accepting applications." },
      { status: 409 },
    );
  }

  // Inserts use the admin client to bypass RLS (only the select policies
  // are defined; participants can't insert their own row through anon
  // RLS). The unique (cohort_id, user_id) constraint blocks duplicates.
  const admin = createAdminClient();
  const { data: inserted, error: insertError } = await admin
    .from("cohort_participants")
    .insert({
      cohort_id: cohort.id,
      user_id: user.id,
      application_text: parsed.data.application_text,
      why_joining: parsed.data.why_joining ?? null,
      current_team_size: parsed.data.current_team_size ?? null,
      current_challenge: parsed.data.current_challenge ?? null,
      agreed_to_commitment: parsed.data.agreed_to_commitment,
      status: "applied",
    })
    .select("id")
    .single();

  if (insertError) {
    // 23505 = unique_violation in Postgres
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "You've already applied to this cohort." },
        { status: 409 },
      );
    }
    console.error("Cohort apply insert failed", insertError.message);
    return NextResponse.json(
      { error: "Could not submit your application. Try again shortly." },
      { status: 500 },
    );
  }

  // Confirmation email — fire and forget; a mail hiccup must never fail
  // the application itself.
  try {
    const { data: profRow } = await admin
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle();
    const prof = profRow as { name: string | null; email: string } | null;
    if (prof?.email) {
      const resend = getResend();
      await resend.emails.send({
        from: getFromAddress(),
        to: prof.email,
        subject: cohortApplicationReceivedSubject(cohort.name),
        html: cohortApplicationReceivedHtml({
          name: prof.name,
          cohortName: cohort.name,
        }),
      });
    }
  } catch (err) {
    console.error("Cohort application email failed", err);
  }

  return NextResponse.json({
    ok: true,
    application_id: (inserted as { id: string }).id,
  });
}
