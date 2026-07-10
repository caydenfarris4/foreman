import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

const PatchSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z
    .enum(["draft", "open", "full", "in_progress", "completed", "archived"])
    .optional(),
  capacity: z.coerce.number().int().min(1).max(50).optional(),
  price_cents: z.coerce.number().int().min(0).max(10_000_000).optional(),
  subscriber_discount_cents: z.coerce
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .nullable()
    .optional(),
  stripe_product_id: z.string().trim().max(120).nullable().optional(),
  stripe_price_id_standard: z.string().trim().max(120).nullable().optional(),
  stripe_price_id_subscriber: z.string().trim().max(120).nullable().optional(),
  hero_quote: z.string().trim().max(500).nullable().optional(),
  curriculum_summary: z.string().trim().max(2000).nullable().optional(),
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
    .from("cohorts")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("Admin cohort PATCH failed", error.message);
    return NextResponse.json(
      { error: "Could not save changes." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
