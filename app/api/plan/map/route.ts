import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CLAUDE_MODEL, getAnthropic, parseMappingJson } from "@/lib/anthropic";
import { buildMappingSystemPrompt } from "@/lib/prompts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { accessFor, canUseAi } from "@/lib/billing";
import type { GrowthPlan, Profile } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "plan-map");
  if (limited) return limited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (!canUseAi(accessFor(profile))) {
    return NextResponse.json({ error: "Subscription required" }, { status: 402 });
  }

  const { data: planRow } = await supabase
    .from("growth_plans")
    .select("id, ten_year_text, five_year_text, six_month_milestone")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .maybeSingle();
  const plan = planRow as Pick<
    GrowthPlan,
    "id" | "ten_year_text" | "five_year_text" | "six_month_milestone"
  > | null;
  if (!plan) {
    return NextResponse.json(
      { error: "Write your plan before mapping it." },
      { status: 400 },
    );
  }

  const userBlock = `TEN-YEAR PLAN:
${plan.ten_year_text}

FIVE-YEAR PLAN:
${plan.five_year_text ?? "(not written)"}

SIX-MONTH MILESTONE:
${plan.six_month_milestone ?? "(not written)"}

Map this plan to the principles. Respond with the JSON object from your instructions.`;

  let mappings;
  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system: buildMappingSystemPrompt(),
      messages: [{ role: "user", content: userBlock }],
    });
    const text = message.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    mappings = parseMappingJson(text);
  } catch (err) {
    console.error("Plan map: Anthropic call failed", err);
    return NextResponse.json(
      { error: "Could not map your plan. Try again shortly." },
      { status: 502 },
    );
  }

  if (!mappings || mappings.length === 0) {
    return NextResponse.json(
      { error: "The mapping came back empty. Try again, or pick principles yourself." },
      { status: 502 },
    );
  }

  // Suggestions only — the user confirms (and may edit) before we store them.
  return NextResponse.json({ plan_id: plan.id, mappings });
}
