import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isValidSlug } from "@/lib/cohorts";
import { EMAIL_MAX_LEN } from "@/lib/validation";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(3)
    .max(EMAIL_MAX_LEN)
    .refine((v) => v.includes("@"), "Invalid email"),
  name: z.string().trim().max(120).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const limited = await enforceRateLimit(request, "cohort-waitlist");
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
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: cohortRow } = await admin
    .from("cohorts")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();
  const cohort = cohortRow as { id: string; status: string } | null;
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }

  const { error } = await admin.from("cohort_waitlist").insert({
    cohort_id: cohort.id,
    email: parsed.data.email.toLowerCase(),
    name: parsed.data.name ?? null,
  });

  if (error && error.code !== "23505") {
    // Anything other than the unique-violation collision is a real error.
    console.error("Waitlist insert failed", error.message);
    return NextResponse.json(
      { error: "Could not save your spot. Try again shortly." },
      { status: 500 },
    );
  }

  // Whether new or duplicate, respond the same — don't expose membership.
  return NextResponse.json({ ok: true });
}
