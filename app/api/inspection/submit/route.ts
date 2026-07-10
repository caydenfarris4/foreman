import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CLAUDE_MODEL,
  getAnthropic,
  parseInspectionReportJson,
} from "@/lib/anthropic";
import { buildInspectionReportPrompt } from "@/lib/prompts";
import { validateReportProse } from "@/lib/inspection/governance";
import {
  completionRateFrom,
  scoreInspection,
  type DimensionRead,
  type LayerReads,
} from "@/lib/inspection/scoring";
import { routeInspection } from "@/lib/inspection/router";
import {
  buildGrowthEvidence,
  daysUntilInspection,
  INSPECTION_INTERVAL_DAYS,
  isInspectionDue,
} from "@/lib/inspection/evidence";
import { enforceRateLimit } from "@/lib/rate-limit";
import { accessFor, canUseAi } from "@/lib/billing";
import { principleByKey } from "@/lib/inspection/principles";
import { getFromAddress, getResend } from "@/lib/resend";
import { reportReadyHtml, reportReadySubject } from "@/lib/emails/inspection";
import type {
  JournalKind,
  PrincipleKey,
  PrincipleSelection,
  Profile,
} from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

function bandWord(a: number): string {
  if (a >= 0.75) return "strong";
  if (a >= 0.55) return "solid";
  if (a >= 0.35) return "emerging";
  return "early";
}

function describe(dim: DimensionRead | undefined): string {
  if (!dim || dim.confidence === "low") {
    return "not enough history to read this with confidence yet";
  }
  const dir =
    dim.direction === "baseline"
      ? "a starting read"
      : dim.direction === "narrowing"
        ? "moving toward the stated path"
        : dim.direction === "widening"
          ? "drifting from the stated path"
          : "holding steady";
  return `${bandWord(dim.alignment)}, ${dir}`;
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "inspection-submit");
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const answers =
    raw && typeof raw === "object" && "answers" in raw
      ? (raw as { answers: Record<string, unknown> }).answers
      : null;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }
  if (Object.keys(answers).length > 60) {
    return NextResponse.json({ error: "Too many answers" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("name, email, role_title, subscription_status, trial_ends_at")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Pick<
    Profile,
    "name" | "email" | "role_title" | "subscription_status" | "trial_ends_at"
  > | null;
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (!canUseAi(accessFor(profile))) {
    return NextResponse.json({ error: "Subscription required" }, { status: 402 });
  }

  // Weighted principles from the current plan.
  const { data: planRow } = await supabase
    .from("growth_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .maybeSingle();
  const planId = (planRow as { id: string } | null)?.id ?? null;
  if (!planId) {
    return NextResponse.json(
      { error: "Set up your plan before running an inspection." },
      { status: 400 },
    );
  }
  const { data: selRows } = await supabase
    .from("principle_selections")
    .select("principle")
    .eq("plan_id", planId);
  const weighted = ((selRows ?? []) as Pick<PrincipleSelection, "principle">[]).map(
    (s) => s.principle,
  );
  if (weighted.length < 2) {
    return NextResponse.json(
      { error: "Choose your principles before running an inspection." },
      { status: 400 },
    );
  }

  // Prior sent inspection (for comparison) + cycle number.
  const admin = createAdminClient();
  const { data: priorRows } = await admin
    .from("inspections")
    .select("cycle_number, layer_reads, sent_at, status, flag_status")
    .eq("user_id", user.id)
    .order("cycle_number", { ascending: false })
    .limit(1);
  const priorRow = (priorRows ?? [])[0] as
    | {
        cycle_number: number;
        layer_reads: unknown;
        sent_at: string | null;
        status: string;
        flag_status: string;
      }
    | undefined;

  // Firm six-month cycle: a walk-through in review blocks a new one, and a
  // sent report locks the site until the next inspection is due.
  if (priorRow && priorRow.status !== "sent" && priorRow.flag_status === "routed") {
    return NextResponse.json(
      { error: "Your walk-through is already in review. The report lands here once it clears." },
      { status: 409 },
    );
  }
  if (priorRow?.sent_at && !isInspectionDue(priorRow.sent_at)) {
    const days = daysUntilInspection(priorRow.sent_at);
    return NextResponse.json(
      {
        error: `Inspections run on a six-month cycle. Your next walk-through unlocks in ${days} day${days === 1 ? "" : "s"}. Until then, the daily and weekly work is the build.`,
      },
      { status: 409 },
    );
  }

  const cycleNumber = priorRow ? priorRow.cycle_number + 1 : 1;
  const priorSent = priorRow?.sent_at ? (priorRow.layer_reads as LayerReads) : null;
  const isBaseline = cycleNumber === 1 || !priorSent;

  // Growth window: since the last sent report, or the trailing six months for
  // a baseline. Everything the report may point to comes from this record.
  const windowStartISO =
    priorRow?.sent_at ??
    new Date(Date.now() - INSPECTION_INTERVAL_DAYS * 86400_000).toISOString();
  const windowStartDate = windowStartISO.slice(0, 10);

  const [
    { data: completionRows },
    { count: checkinCount },
    { data: situationRows },
    { data: retroRows },
    { data: doneGoalRows },
    { data: journalRows },
    { count: habitCheckCount },
  ] = await Promise.all([
    // Behavioral anchor: cascade completion history (all-time, for scoring).
    supabase
      .from("cascade_checkin_goals")
      .select("completed")
      .eq("user_id", user.id)
      .limit(5000),
    supabase
      .from("daily_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .gte("checkin_date", windowStartDate),
    supabase
      .from("situations")
      .select("title")
      .eq("user_id", user.id)
      .gte("created_at", windowStartISO)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("weekly_retros")
      .select("framework_focus, skipped")
      .eq("user_id", user.id)
      .gte("week_start", windowStartDate)
      .order("week_start", { ascending: false })
      .limit(60),
    supabase
      .from("growth_goals")
      .select("level")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("updated_at", windowStartISO)
      .limit(2000),
    supabase
      .from("journal_entries")
      .select("kind, body, source")
      .eq("user_id", user.id)
      .gte("created_at", windowStartISO)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("habit_checks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("check_date", windowStartDate),
  ]);
  const completionRate = completionRateFrom(
    (completionRows ?? []) as { completed: boolean }[],
  );

  const retros = (retroRows ?? []) as {
    framework_focus: string | null;
    skipped: boolean;
  }[];
  const filedRetros = retros.filter((r) => !r.skipped);
  const doneByLevel = ((doneGoalRows ?? []) as { level: string }[]).reduce(
    (acc, g) => {
      acc[g.level] = (acc[g.level] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const journal = (journalRows ?? []) as {
    kind: JournalKind;
    body: string;
    source: string | null;
  }[];
  const evidence = buildGrowthEvidence({
    windowStartISO,
    checkinCount: checkinCount ?? 0,
    situationTitles: ((situationRows ?? []) as { title: string }[]).map(
      (s) => s.title,
    ),
    retroCount: filedRetros.length,
    latestRetroFocus:
      filedRetros.find((r) => r.framework_focus)?.framework_focus ?? null,
    boardsCompleted: doneByLevel.daily ?? 0,
    weeklyGoalsCompleted: doneByLevel.weekly ?? 0,
    monthlyGoalsCompleted: doneByLevel.monthly ?? 0,
    journalReflections: journal.filter((j) => j.kind === "reflection").length,
    journalQuotes: journal
      .filter((j) => j.kind === "quote")
      .slice(0, 4)
      .map((j) => ({ body: j.body, source: j.source })),
    journalInsights: journal.filter((j) => j.kind === "insight").length,
    habitChecks: habitCheckCount ?? 0,
  });

  const { layerReads, trajectory } = scoreInspection({
    answers,
    weighted,
    completionRate,
    prior: priorSent,
  });

  // Build the qualitative read summary (never raw numbers) for the report.
  const weightedSummary = weighted
    .map((p) => `- ${principleByKey(p as PrincipleKey).name}: ${describe(layerReads.byPrinciple[p as PrincipleKey])}`)
    .join("\n");
  const userBlock = `This is ${isBaseline ? "their baseline inspection" : `inspection cycle ${cycleNumber}, comparing against the prior one`}.

FOUNDATION (identity): ${describe(layerReads.foundation)}
FRAME (their chosen principles):
${weightedSummary}
FINISH WORK (daily behavior): ${describe(layerReads.finish)}
Overall trajectory: ${trajectory.overall}.
${completionRate == null ? "There is little check-in history yet." : `They completed roughly ${Math.round(completionRate * 100)} percent of their tracked cascade goals.`}
${evidence.promptBlock ? `\n${evidence.promptBlock}\n` : ""}
Write the ${isBaseline ? "baseline" : "comparison"} report now as the JSON object specified.`;

  // Generate the report, regenerating once if it breaks a programmatic rule.
  const system = buildInspectionReportPrompt(profile, isBaseline);
  let report: string | null = null;
  let hardNote: string | null = null;
  try {
    const anthropic = getAnthropic();
    for (let attempt = 0; attempt < 2 && report == null; attempt++) {
      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1600,
        system,
        messages: [
          {
            role: "user",
            content:
              attempt === 0
                ? userBlock
                : `${userBlock}\n\nYour previous attempt broke a formatting rule (an em dash, a bullet, an emoji, a hashtag, or a state score). Rewrite it clean.`,
          },
        ],
      });
      const text = message.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      const parsed = parseInspectionReportJson(text);
      if (!parsed) continue;
      const proseOk = validateReportProse(parsed.report).ok;
      const noteOk =
        !parsed.hard_note || validateReportProse(parsed.hard_note).ok;
      if (proseOk && noteOk) {
        report = parsed.report;
        hardNote = isBaseline ? null : parsed.hard_note;
      }
    }
  } catch (err) {
    console.error("Inspection report generation failed", err);
    return NextResponse.json(
      { error: "Could not generate the report. Try again shortly." },
      { status: 502 },
    );
  }

  // If the model never produced clean prose, force human review with a safe
  // placeholder rather than showing ungoverned text.
  let forcedReview = false;
  if (report == null) {
    report =
      "Your inspection answers are saved. This report is being reviewed before it reaches you.";
    forcedReview = true;
  }

  const decision = routeInspection({
    layerReads,
    trajectory,
    prior: priorSent,
    completionRate,
    hasHardNote: !!hardNote,
    isBaseline,
  });
  const routed = decision.routed || forcedReview;
  const flagReasons = forcedReview
    ? [...new Set([...decision.reasons, "low_confidence"])]
    : decision.reasons;

  const nowIso = new Date().toISOString();
  const { data: upserted, error: upsertError } = await admin
    .from("inspections")
    .upsert(
      {
        user_id: user.id,
        cycle_number: cycleNumber,
        is_baseline: isBaseline,
        status: routed ? "drafted" : "sent",
        raw_answers: answers,
        layer_reads: layerReads,
        // growth_stats rides inside the trajectory jsonb: the report page's
        // "record" strip, frozen as of this inspection (no schema change).
        trajectory_read: { ...trajectory, growth_stats: evidence.stats },
        generated_report: report,
        flag_status: routed ? "routed" : "cleared",
        flag_reasons: flagReasons,
        sent_at: routed ? null : nowIso,
      },
      { onConflict: "user_id,cycle_number" },
    )
    .select("id")
    .single();
  if (upsertError || !upserted) {
    console.error("Inspection upsert failed", upsertError?.message);
    return NextResponse.json({ error: "Could not save the inspection." }, { status: 500 });
  }

  if (routed) {
    await admin.from("review_queue_items").upsert(
      {
        inspection_id: (upserted as { id: string }).id,
        flag_reasons: flagReasons,
        status: "pending",
      },
      { onConflict: "inspection_id" },
    );
  } else {
    // Delivery is notify-then-read-in-app: the email points here, the report
    // lives here. Best effort; a mail hiccup must not eat the inspection.
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.app";
      await getResend().emails.send({
        from: getFromAddress(),
        to: profile.email,
        subject: reportReadySubject(),
        html: reportReadyHtml({ name: profile.name, appUrl, hasNote: false }),
      });
    } catch (err) {
      console.error("Inspection report-ready email failed", err);
    }
  }

  return NextResponse.json({
    cycle_number: cycleNumber,
    is_baseline: isBaseline,
    routed,
    // The user only sees the report once it's cleared/sent.
    report: routed ? null : report,
  });
}
