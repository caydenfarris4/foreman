import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  CLAUDE_MODEL,
  getAnthropic,
  parseMonthlyJson,
} from "@/lib/anthropic";
import { buildMonthlySystemPrompt } from "@/lib/prompts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { accessFor, canUseAi } from "@/lib/billing";
import { hasActiveCohortAccess } from "@/lib/cohorts";
import type { Profile, WeeklyRetro } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  // Anchor for the month — must be the 1st of a month (YYYY-MM-01).
  month_start: z.string().regex(/^\d{4}-\d{2}-01$/),
});

const MIN_RETROS_FOR_SYNTHESIS = 4;

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "retro-monthly");
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
  const { month_start } = parsed.data;

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
    const cohortBypass = await hasActiveCohortAccess(supabase, user.id);
    if (!cohortBypass) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 402 },
      );
    }
  }

  // Reuse cached synthesis if we have it.
  const { data: cached } = await supabase
    .from("monthly_syntheses")
    .select("ai_summary, framework_focus, retro_count")
    .eq("user_id", user.id)
    .eq("month_start", month_start)
    .maybeSingle();
  if (cached) {
    const c = cached as {
      ai_summary: string;
      framework_focus: string | null;
      retro_count: number;
    };
    return NextResponse.json({
      summary: c.ai_summary,
      framework_focus: c.framework_focus,
      retro_count: c.retro_count,
      cached: true,
    });
  }

  // Pull every retro that starts inside the month.
  const monthEnd = monthEndDate(month_start);
  const { data: retroRows } = await supabase
    .from("weekly_retros")
    .select(
      "week_start, wins, struggles, lessons, ai_synthesis, framework_focus, skipped",
    )
    .eq("user_id", user.id)
    .gte("week_start", month_start)
    .lte("week_start", monthEnd)
    .order("week_start", { ascending: true });
  const retros = (retroRows ?? []) as Pick<
    WeeklyRetro,
    | "week_start"
    | "wins"
    | "struggles"
    | "lessons"
    | "ai_synthesis"
    | "framework_focus"
    | "skipped"
  >[];

  const eligible = retros.filter((r) => !r.skipped && r.ai_synthesis);
  if (eligible.length < MIN_RETROS_FOR_SYNTHESIS) {
    return NextResponse.json(
      {
        error: `Need at least ${MIN_RETROS_FOR_SYNTHESIS} completed retros in the month. You have ${eligible.length}.`,
      },
      { status: 400 },
    );
  }

  const systemPrompt = buildMonthlySystemPrompt(profile);
  const userBlock = eligible
    .map(
      (r, i) =>
        `=== Week ${i + 1} (starting ${r.week_start}) ===
Wins:
${r.wins || "(none written)"}

Struggles:
${r.struggles || "(none written)"}

Lessons:
${r.lessons || "(none written)"}

Your weekly synthesis:
${r.ai_synthesis ?? ""}
`,
    )
    .join("\n\n");

  let summary: string | null = null;
  let framework_focus: "foundation" | "framing" | "finishing" =
    profile.current_phase;

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Month starting ${month_start}. ${eligible.length} retros.

${userBlock}

Respond with the JSON object specified in your instructions.`,
        },
      ],
    });
    const text = message.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const parsedJson = parseMonthlyJson(text);
    if (parsedJson) {
      summary = parsedJson.summary.trim();
      framework_focus = parsedJson.framework_focus;
    } else {
      summary = text.trim();
    }
  } catch (err) {
    console.error("Anthropic monthly call failed", err);
    return NextResponse.json(
      { error: "Could not generate synthesis. Try again shortly." },
      { status: 502 },
    );
  }

  if (!summary || summary.length === 0) {
    return NextResponse.json(
      { error: "Empty synthesis from the model" },
      { status: 502 },
    );
  }

  const { error: upsertError } = await supabase
    .from("monthly_syntheses")
    .upsert(
      {
        user_id: user.id,
        month_start,
        ai_summary: summary,
        framework_focus,
        retro_count: eligible.length,
      },
      { onConflict: "user_id,month_start" },
    );
  if (upsertError) {
    console.error("Monthly synth save failed", upsertError.message);
    // Still return the synthesis — saving is best-effort.
  }

  return NextResponse.json({
    summary,
    framework_focus,
    retro_count: eligible.length,
    cached: false,
  });
}

function monthEndDate(monthStartISO: string): string {
  // monthStartISO is YYYY-MM-01. Return last day of the month as YYYY-MM-DD.
  const d = new Date(`${monthStartISO}T00:00:00Z`);
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  );
  return next.toISOString().slice(0, 10);
}
