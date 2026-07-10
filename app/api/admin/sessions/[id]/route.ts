import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

const PatchSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  scheduled_at: z.string().datetime().optional(),
  meeting_url: z.string().trim().url().max(500).nullable().optional(),
  guest_mentor_id: z.string().trim().uuid().nullable().optional(),
  prep_materials: z.string().trim().max(20000).nullable().optional(),
  recording_url: z.string().trim().url().max(500).nullable().optional(),
  facilitator_notes: z.string().trim().max(20000).nullable().optional(),
  framework_phase: z
    .enum(["foundation", "framing", "finishing"])
    .nullable()
    .optional(),
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
    .from("cohort_sessions")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("Admin session PATCH failed", error.message);
    return NextResponse.json(
      { error: "Could not save changes." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
