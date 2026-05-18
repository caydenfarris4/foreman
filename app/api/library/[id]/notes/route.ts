import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

const BodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, "library-notes");
  if (limited) return limited;

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
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Make sure the situation belongs to the user before attaching a note.
  const { data: situation } = await supabase
    .from("situations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!situation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("situation_notes")
    .insert({
      situation_id: id,
      user_id: user.id,
      body: parsed.data.body,
    })
    .select("id, body, created_at")
    .single();

  if (error || !data) {
    console.error("Add note failed", error?.message);
    return NextResponse.json(
      { error: "Could not save note" },
      { status: 500 },
    );
  }
  return NextResponse.json({ note: data });
}
