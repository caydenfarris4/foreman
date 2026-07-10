import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  CLAUDE_MODEL,
  COACHING_FALLBACK,
  getAnthropic,
  parseRetroJson,
} from "@/lib/anthropic";
import { buildRetroSystemPrompt } from "@/lib/prompts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { accessFor, canUseAi } from "@/lib/billing";
import { hasActiveCohortAccess } from "@/lib/cohorts";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wins: z.string().trim().max(4000),
  struggles: z.string().trim().max(4000),
  lessons: z.string().trim().max(4000),
  // When true, re-run Claude over edited fields and overwrite the
  // existing synthesis. Default false preserves the original
  // "first synthesis wins" behavior.
  regenerate: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "retro-submit");
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
  const { week_start, wins, struggles, lessons } = parsed.data;

  // Require at least one field of substance — otherwise there's nothing to
  // synthesize. "Substance" = something more than a few characters.
  const nonEmpty = [wins, struggles, lessons].filter((s) => s.length >= 10);
  if (nonEmpty.length === 0) {
    return NextResponse.json(
      {
        error:
          "Give the foreman something to work with — fill in at least one field with a sentence or two.",
      },
      { status: 400 },
    );
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
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Mirror the UI paywall on the server. Same reasoning as the
  // check-in route — Claude calls cost money.
  if (!canUseAi(accessFor(profile))) {
    // Cohort participants keep AI access through their free window.
    const cohortBypass = await hasActiveCohortAccess(supabase, user.id);
    if (!cohortBypass) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 402 },
      );
    }
  }

  const { data: existing } = await supabase
    .from("weekly_retros")
    .select("id, ai_synthesis, framework_focus")
    .eq("user_id", user.id)
    .eq("week_start", week_start)
    .maybeSingle();

  // Short-circuit only when caller didn't ask for a regenerate. Lets
  // users edit their retro and re-synthesize.
  if (
    !parsed.data.regenerate &&
    existing &&
    typeof (existing as { ai_synthesis?: string | null }).ai_synthesis === "string" &&
    (existing as { ai_synthesis: string }).ai_synthesis.length > 0
  ) {
    const e = existing as {
      ai_synthesis: string;
      framework_focus: string | null;
    };
    return NextResponse.json({
      synthesis: e.ai_synthesis,
      framework_focus: e.framework_focus,
    });
  }

  const systemPrompt = buildRetroSystemPrompt(profile);

  let synthesisText: string | null = null;
  let frameworkFocus: "foundation" | "framing" | "finishing" =
    profile.current_phase;

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Week starting ${week_start}.

Wins:
${wins || "(none written)"}

Struggles:
${struggles || "(none written)"}

Lessons:
${lessons || "(none written)"}

Respond with the JSON object specified in your instructions.`,
        },
      ],
    });
    const text = message.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const parsedJson = parseRetroJson(text);
    if (parsedJson) {
      synthesisText = parsedJson.synthesis.trim();
      frameworkFocus = parsedJson.framework_focus;
    } else {
      synthesisText = text.trim() || COACHING_FALLBACK;
    }
  } catch (err) {
    console.error("Anthropic retro call failed", err);
    synthesisText = COACHING_FALLBACK;
  }

  const { error: upsertError } = await supabase.from("weekly_retros").upsert(
    {
      user_id: user.id,
      week_start,
      wins,
      struggles,
      lessons,
      ai_synthesis: synthesisText,
      framework_focus: frameworkFocus,
    },
    { onConflict: "user_id,week_start" },
  );

  if (upsertError) {
    console.error("Failed to save retro", upsertError);
    return NextResponse.json(
      { error: "Could not save your retro. Please retry." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    synthesis: synthesisText,
    framework_focus: frameworkFocus,
  });
}
