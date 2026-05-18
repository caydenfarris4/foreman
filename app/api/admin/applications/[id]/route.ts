import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

const PatchSchema = z.object({
  decision: z.enum(["accept", "reject", "withdraw"]),
  notes: z.string().trim().max(1000).optional(),
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

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {};
  if (parsed.data.decision === "accept") {
    update.status = "accepted";
    update.accepted_at = now;
  } else if (parsed.data.decision === "reject") {
    update.status = "rejected";
  } else if (parsed.data.decision === "withdraw") {
    update.status = "withdrew";
    update.withdrew_at = now;
  }

  const { error } = await admin
    .from("cohort_participants")
    .update(update)
    .eq("id", id);
  if (error) {
    console.error("Admin application PATCH failed", error.message);
    return NextResponse.json(
      { error: "Could not update application." },
      { status: 500 },
    );
  }

  // Resend trigger lives in a future email-automation pass.
  return NextResponse.json({ ok: true });
}
