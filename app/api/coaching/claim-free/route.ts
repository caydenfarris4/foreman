import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Claim the one free 1:1 session every user gets. The partial unique index
// (one kind='free' row per user) makes this race-safe: a double-click or
// replay collides on the index and returns the friendly 409.
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "coaching-claim");
  if (limited) return limited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("coaching_sessions").insert({
    user_id: user.id,
    kind: "free",
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Your free session is already claimed — schedule it below." },
        { status: 409 },
      );
    }
    console.error("Free session claim failed", error.message);
    return NextResponse.json(
      { error: "Could not claim the session. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
