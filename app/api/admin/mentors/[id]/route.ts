import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

const PatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  title: z.string().trim().max(120).nullable().optional(),
  company: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  photo_url: z.string().trim().url().max(500).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  linkedin_url: z.string().trim().url().max(500).nullable().optional(),
  expertise_areas: z.array(z.string().trim().max(40)).max(20).optional(),
  rate_per_session_cents: z.coerce
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .optional(),
  values_aligned: z.boolean().optional(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("mentors")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("Admin mentor PATCH failed", error.message);
    return NextResponse.json(
      { error: "Could not save changes." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft-delete: set active=false. Real delete would orphan
  // cohort_sessions.guest_mentor_id (the FK is on-delete set null,
  // which works, but losing the bio is destructive).
  const admin = createAdminClient();
  const { error } = await admin
    .from("mentors")
    .update({ active: false })
    .eq("id", id);
  if (error) {
    console.error("Admin mentor soft-delete failed", error.message);
    return NextResponse.json(
      { error: "Could not deactivate mentor." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
