import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  CLAUDE_MODEL,
  COACHING_FALLBACK,
  getAnthropic,
  parseCoachingJson,
} from "@/lib/anthropic";
import { buildSystemPrompt } from "@/lib/prompts";
import { inspectionContextLine } from "@/lib/inspection/context";
import { recordedKnowledgeBlock } from "@/lib/journal-context";
import type { JournalEntry } from "@/lib/database.types";
import { enforceRateLimit } from "@/lib/rate-limit";
import { accessFor, canUseAi } from "@/lib/billing";
import type { TrajectoryRead } from "@/lib/inspection/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prompt_text: z.string().min(1).max(2000),
  user_response: z.string().min(20).max(8000),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "checkin-submit");
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
  const { checkin_date, prompt_text, user_response } = parsed.data;

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

  // Mirror the UI paywall on the server. A churned/expired user can't
  // bypass it by POSTing directly — Claude calls cost money.
  if (!canUseAi(accessFor(profile))) {
    return NextResponse.json(
      { error: "Subscription required" },
      { status: 402 },
    );
  }

  // Don't re-coach a completed check-in.
  const { data: existing } = await supabase
    .from("daily_checkins")
    .select("id, completed_at, ai_coaching, framework_phase, tags")
    .eq("user_id", user.id)
    .eq("checkin_date", checkin_date)
    .maybeSingle();

  if (existing?.completed_at && existing.ai_coaching) {
    return NextResponse.json({
      coaching: existing.ai_coaching,
      phase: existing.framework_phase,
      tags: existing.tags ?? [],
    });
  }

  // Ground coaching in the user's latest inspection (RLS only exposes sent
  // inspections, which is exactly what we want here).
  const { data: lastInspection } = await supabase
    .from("inspections")
    .select("trajectory_read")
    .eq("user_id", user.id)
    .not("sent_at", "is", null)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const contextLine = inspectionContextLine(
    (lastInspection as { trajectory_read: TrajectoryRead | null } | null)
      ?.trajectory_read ?? null,
  );

  // Recorded knowledge: the user's journal (kept quotes, saved insights,
  // recent reflections) becomes coaching context. Failure-safe — if the
  // journal tables/columns aren't migrated yet, data is null and the block
  // is empty; coaching proceeds exactly as before.
  const { data: journalRows } = await supabase
    .from("journal_entries")
    .select("kind, body, source, entry_date")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);
  const knowledgeBlock = recordedKnowledgeBlock(
    (journalRows ?? []) as Pick<
      JournalEntry,
      "kind" | "body" | "source" | "entry_date"
    >[],
  );

  const systemPrompt = [buildSystemPrompt(profile), contextLine, knowledgeBlock]
    .filter(Boolean)
    .join("\n\n");

  let coachingText: string | null = null;
  let phase: "foundation" | "framing" | "finishing" = profile.current_phase;
  let tags: string[] = [];
  let title: string | null = null;

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Today's prompt: ${prompt_text}\n\nMy response:\n${user_response}\n\nRespond with the JSON object specified in your instructions.`,
        },
      ],
    });
    const text = message.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const parsedJson = parseCoachingJson(text);
    if (parsedJson) {
      coachingText = parsedJson.coaching.trim();
      phase = parsedJson.phase;
      tags = parsedJson.tags.slice(0, 8);
      title = parsedJson.title.trim().slice(0, 120);
    } else {
      coachingText = text.trim() || COACHING_FALLBACK;
    }
  } catch (err) {
    console.error("Anthropic call failed", err);
    coachingText = COACHING_FALLBACK;
  }

  const now = new Date().toISOString();
  const { data: upserted, error: upsertError } = await supabase
    .from("daily_checkins")
    .upsert(
      {
        user_id: user.id,
        checkin_date,
        prompt_text,
        user_response,
        ai_coaching: coachingText,
        framework_phase: phase,
        tags,
        completed_at: now,
      },
      { onConflict: "user_id,checkin_date" },
    )
    .select("id")
    .single();

  if (upsertError || !upserted) {
    console.error("Failed to save checkin", upsertError);
    return NextResponse.json(
      { error: "Could not save your check-in. Please retry." },
      { status: 500 },
    );
  }

  // Always create a situation row from a completed check-in (per product
  // decision — the library is the killer feature).
  if (coachingText && coachingText !== COACHING_FALLBACK) {
    const derivedTitle =
      title ??
      user_response.split(/\s+/).slice(0, 8).join(" ") + (user_response.length > 60 ? "…" : "");
    await supabase.from("situations").insert({
      user_id: user.id,
      title: derivedTitle,
      situation: user_response,
      coaching: coachingText,
      framework_phase: phase,
      tags,
      source_checkin_id: upserted.id,
    });
  }

  return NextResponse.json({
    coaching: coachingText,
    phase,
    tags,
  });
}
