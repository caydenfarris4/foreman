import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const BodySchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  skipped: z.boolean(),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "retro-skip");
  if (limited) return limited;

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

  // Upsert so skipping a week without an existing retro still works.
  const { error } = await supabase.from("weekly_retros").upsert(
    {
      user_id: user.id,
      week_start: parsed.data.week_start,
      skipped: parsed.data.skipped,
    },
    { onConflict: "user_id,week_start" },
  );

  if (error) {
    console.error("Retro skip failed", error.message);
    return NextResponse.json(
      { error: "Could not update" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, skipped: parsed.data.skipped });
}
