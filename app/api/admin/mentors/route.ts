import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";

const BodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  photo_url: z.string().trim().url().max(500).optional(),
  email: z.string().trim().email().max(254).optional(),
  linkedin_url: z.string().trim().url().max(500).optional(),
  expertise_areas: z.array(z.string().trim().max(40)).max(20).optional(),
  rate_per_session_cents: z.coerce
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .optional(),
  values_aligned: z.boolean().optional(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
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
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mentors")
    .insert({
      name: parsed.data.name,
      title: parsed.data.title ?? null,
      company: parsed.data.company ?? null,
      bio: parsed.data.bio ?? null,
      photo_url: parsed.data.photo_url ?? null,
      email: parsed.data.email ?? null,
      linkedin_url: parsed.data.linkedin_url ?? null,
      expertise_areas: parsed.data.expertise_areas ?? [],
      rate_per_session_cents: parsed.data.rate_per_session_cents ?? 75000,
      values_aligned: parsed.data.values_aligned ?? false,
      active: parsed.data.active ?? true,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Admin mentor insert failed", error?.message);
    return NextResponse.json(
      { error: "Could not save mentor." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, mentor_id: (data as { id: string }).id });
}
