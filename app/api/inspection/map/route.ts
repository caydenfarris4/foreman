import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { accessFor, canUseAi } from "@/lib/billing";
import { mapPlanToPrinciples } from "@/lib/inspection/mapping";
import {
  PRINCIPLES,
  validateWeightedSelection,
} from "@/lib/inspection/principles";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRINCIPLE_KEYS = PRINCIPLES.map((p) => p.key) as [string, ...string[]];

// Mirrors the onboarding step that produces the plan text. The ten-year plan
// has a substance floor (BUILD_SPEC §3.1 step 1: "suggest 200 characters").
const BodySchema = z.object({
  tenYear: z.string().trim().min(200).max(5000),
  fiveYear: z.string().trim().max(5000).optional(),
  sixMonth: z.string().trim().max(2000).optional(),
  principles: z.array(z.enum(PRINCIPLE_KEYS)).min(1).max(11),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "inspection-map");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Selection must still be 2 to 4 valid principles (§3.1 step 3).
  const selection = validateWeightedSelection(parsed.data.principles);
  if (!selection.ok) {
    return NextResponse.json({ error: selection.error }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_status, trial_ends_at, onboarded_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // The mapping calls Claude, which costs money. Mirror the paywall the same
  // way the daily check-in route does so a churned user can't POST around it.
  if (!canUseAi(accessFor(profile))) {
    return NextResponse.json({ error: "Subscription required" }, { status: 402 });
  }

  const result = await mapPlanToPrinciples(
    {
      tenYear: parsed.data.tenYear,
      fiveYear: parsed.data.fiveYear,
      sixMonth: parsed.data.sixMonth,
    },
    selection.keys,
  );

  return NextResponse.json(result);
}
