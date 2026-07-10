import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLAUDE_MODEL, getAnthropic } from "@/lib/anthropic";
import { buildCoachChatSystemPrompt } from "@/lib/prompts";
import { inspectionContextLine } from "@/lib/inspection/context";
import { recordedKnowledgeBlock } from "@/lib/journal-context";
import { enforceRateLimit } from "@/lib/rate-limit";
import { accessFor, canUseAi } from "@/lib/billing";
import { hasActiveCohortAccess } from "@/lib/cohorts";
import type { JournalEntry } from "@/lib/database.types";
import type { TrajectoryRead } from "@/lib/inspection/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

// The Coach tab conversation. Contained by design: the client holds the
// transcript and sends the recent window; nothing is stored server-side.
// Key points are kept via the journal ("insight"), which then feeds back in
// through the recorded-knowledge block.
const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
});

const HISTORY_WINDOW = 12;

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "coach-chat");
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

  // The API expects the last turn to be the user's.
  const window = parsed.data.messages.slice(-HISTORY_WINDOW);
  if (window[window.length - 1]?.role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from you" },
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

  // Same grounding as the daily coaching: latest sent inspection + the user's
  // recorded knowledge. Both failure-safe (empty when absent).
  const [{ data: lastInspection }, { data: journalRows }] = await Promise.all([
    supabase
      .from("inspections")
      .select("trajectory_read")
      .eq("user_id", user.id)
      .not("sent_at", "is", null)
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select("kind, body, source, entry_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);
  const contextLine = inspectionContextLine(
    (lastInspection as { trajectory_read: TrajectoryRead | null } | null)
      ?.trajectory_read ?? null,
  );
  const knowledgeBlock = recordedKnowledgeBlock(
    (journalRows ?? []) as Pick<
      JournalEntry,
      "kind" | "body" | "source" | "entry_date"
    >[],
  );
  const systemPrompt = [
    buildCoachChatSystemPrompt(profile),
    contextLine,
    knowledgeBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: window,
    });
    const text = message.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new Error("empty response");
    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("Coach chat call failed", err);
    return NextResponse.json(
      { error: "The coach stepped off the site for a second. Try again." },
      { status: 502 },
    );
  }
}
