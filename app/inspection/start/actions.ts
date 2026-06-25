"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  PRINCIPLES,
  INSPECTION_LAYERS,
  validateWeightedSelection,
} from "@/lib/inspection/principles";

const PRINCIPLE_KEYS = PRINCIPLES.map((p) => p.key) as [string, ...string[]];
const LAYER_KEYS = INSPECTION_LAYERS.map((l) => l.key) as [string, ...string[]];

const PayloadSchema = z.object({
  tenYear: z.string().trim().min(200).max(5000),
  fiveYear: z.string().trim().max(5000).optional().default(""),
  sixMonth: z.string().trim().min(1).max(2000),
  principles: z.array(z.enum(PRINCIPLE_KEYS)).min(2).max(4),
  mappings: z
    .array(
      z.object({
        principle: z.enum(PRINCIPLE_KEYS),
        layer: z.enum(LAYER_KEYS),
        rationale: z.string().trim().max(500),
        source: z.enum(["ai", "user"]).default("ai"),
      }),
    )
    .min(1)
    .max(11),
  monthly: z.string().trim().min(1).max(500),
  weekly: z.string().trim().max(500).optional().default(""),
  daily: z.string().trim().max(500).optional().default(""),
});

export type GrowthOnboardingInput = z.input<typeof PayloadSchema>;

export type SaveResult = { ok: true } | { ok: false; error: string };

function addDaysISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthsISO(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

const today = () => new Date().toISOString().slice(0, 10);

export async function saveGrowthOnboarding(
  input: GrowthOnboardingInput,
): Promise<SaveResult> {
  const parsed = PayloadSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "Growth onboarding validation failed",
      parsed.error.issues.map((i) => i.path.join(".")),
    );
    return { ok: false, error: "Please check every field and try again." };
  }
  const data = parsed.data;

  // The chosen principles must still be a valid weighted set (2 to 4).
  const selection = validateWeightedSelection(data.principles);
  if (!selection.ok) return { ok: false, error: selection.error };

  // Mappings may only reference principles; drop any the user removed and
  // dedupe. (The user always owns the final mapping, GOVERNANCE Part 8.)
  const mapSeen = new Set<string>();
  const mappings = data.mappings.filter((m) => {
    if (mapSeen.has(m.principle)) return false;
    mapSeen.add(m.principle);
    return true;
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // First run only: refuse if a current plan already exists rather than
  // colliding on the one-current-plan unique index.
  const { data: existing } = await supabase
    .from("growth_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Your growth plan is already set up." };
  }

  // 1. The plan.
  const { data: plan, error: planErr } = await supabase
    .from("growth_plans")
    .insert({
      user_id: user.id,
      version: 1,
      ten_year_text: data.tenYear,
      five_year_text: data.fiveYear || null,
      six_month_milestone: data.sixMonth,
      is_current: true,
    })
    .select("id")
    .single();
  if (planErr || !plan) {
    console.error("growth_plans insert failed", planErr?.message);
    return { ok: false, error: "Could not save your plan. Please try again." };
  }
  const planId = plan.id;

  // 2. Weighted principle selections.
  const { error: selErr } = await supabase.from("principle_selections").insert(
    selection.keys.map((principle) => ({
      user_id: user.id,
      plan_id: planId,
      principle,
    })),
  );
  if (selErr) {
    console.error("principle_selections insert failed", selErr.message);
    return { ok: false, error: "Could not save your principles." };
  }

  // 3. Confirmed plan-to-principle mappings.
  const { error: mapErr } = await supabase.from("principle_mappings").insert(
    mappings.map((m) => ({
      user_id: user.id,
      plan_id: planId,
      principle: m.principle,
      layer: m.layer,
      ai_rationale: m.rationale || null,
      source: m.source,
      confirmed: true,
    })),
  );
  if (mapErr) {
    console.error("principle_mappings insert failed", mapErr.message);
    return { ok: false, error: "Could not save your mapping." };
  }

  // 4. The starting cascade: six-month milestone down through daily, each
  //    laddering to the level above. A level with no parent text is a
  //    disconnected goal (ladders_up = false), surfaced gently, never blocked
  //    (BUILD_SPEC §4.4).
  const sixMonth = await supabase
    .from("growth_goals")
    .insert({
      user_id: user.id,
      plan_id: planId,
      level: "six_month",
      parent_goal_id: null,
      body: data.sixMonth,
      period_start: today(),
      period_end: addMonthsISO(6),
      ladders_up: true,
    })
    .select("id")
    .single();
  if (sixMonth.error || !sixMonth.data) {
    console.error("six_month goal insert failed", sixMonth.error?.message);
    return { ok: false, error: "Could not save your milestone." };
  }

  let parentId: string | null = sixMonth.data.id;

  if (data.monthly) {
    const monthly = await supabase
      .from("growth_goals")
      .insert({
        user_id: user.id,
        plan_id: planId,
        level: "monthly",
        parent_goal_id: parentId,
        body: data.monthly,
        period_start: today(),
        period_end: addMonthsISO(1),
        ladders_up: parentId !== null,
      })
      .select("id")
      .single();
    if (monthly.error || !monthly.data) {
      console.error("monthly goal insert failed", monthly.error?.message);
      return { ok: false, error: "Could not save your monthly goal." };
    }
    parentId = monthly.data.id;
  } else {
    parentId = null;
  }

  if (data.weekly) {
    const weekly = await supabase
      .from("growth_goals")
      .insert({
        user_id: user.id,
        plan_id: planId,
        level: "weekly",
        parent_goal_id: parentId,
        body: data.weekly,
        period_start: today(),
        period_end: addDaysISO(7),
        ladders_up: parentId !== null,
      })
      .select("id")
      .single();
    if (weekly.error || !weekly.data) {
      console.error("weekly goal insert failed", weekly.error?.message);
      return { ok: false, error: "Could not save your weekly goal." };
    }
    parentId = weekly.data.id;
  } else {
    parentId = null;
  }

  if (data.daily) {
    const daily = await supabase.from("growth_goals").insert({
      user_id: user.id,
      plan_id: planId,
      level: "daily",
      parent_goal_id: parentId,
      body: data.daily,
      period_start: today(),
      period_end: today(),
      ladders_up: parentId !== null,
    });
    if (daily.error) {
      console.error("daily goal insert failed", daily.error.message);
      return { ok: false, error: "Could not save your daily goal." };
    }
  }

  return { ok: true };
}
