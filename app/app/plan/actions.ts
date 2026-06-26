"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  isInspectionLayer,
  isPrincipleKey,
  validateWeightedSelection,
} from "@/lib/inspection/principles";
import type { GoalLevel, GoalStatus } from "@/lib/database.types";

type Result = { ok: true } | { ok: false; error: string };

// Parent level for each cascade level. ten_year is the top (no parent). A goal
// below the top with no parent at the level above is "disconnected" (§4.4).
const PARENT_LEVEL: Record<GoalLevel, GoalLevel | null> = {
  ten_year: null,
  five_year: "ten_year",
  six_month: "five_year",
  monthly: "six_month",
  weekly: "monthly",
  daily: "weekly",
};

const PlanSchema = z.object({
  ten_year_text: z.string().trim().min(200).max(4000),
  five_year_text: z.string().trim().min(10).max(2000),
  six_month_milestone: z.string().trim().min(10).max(2000),
  principles: z.array(z.string()).min(2).max(8),
});

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function savePlan(input: unknown): Promise<Result> {
  const parsed = PlanSchema.safeParse(input);
  if (!parsed.success) {
    const tooShort = parsed.error.issues.find((i) => i.code === "too_small");
    return {
      ok: false,
      error: tooShort
        ? "Your ten-year plan needs at least 200 characters, and the five-year and six-month fields need a sentence each."
        : "Please check every field and try again.",
    };
  }
  const sel = validateWeightedSelection(parsed.data.principles);
  if (!sel.ok) return { ok: false, error: sel.error };

  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { ten_year_text, five_year_text, six_month_milestone } = parsed.data;

  // One current plan per user: update it if it exists, else create version 1.
  const { data: existing } = await supabase
    .from("growth_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();
  const existingPlan = existing as { id: string } | null;

  let planId: string;
  if (existingPlan) {
    planId = existingPlan.id;
    const { error } = await supabase
      .from("growth_plans")
      .update({ ten_year_text, five_year_text, six_month_milestone })
      .eq("id", planId);
    if (error) return { ok: false, error: "Could not save your plan." };
  } else {
    const { data: inserted, error } = await supabase
      .from("growth_plans")
      .insert({
        user_id: userId,
        version: 1,
        ten_year_text,
        five_year_text,
        six_month_milestone,
        is_current: true,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false, error: "Could not create your plan." };
    }
    planId = (inserted as { id: string }).id;
  }

  // Replace the weighted principle selection for this plan.
  await supabase.from("principle_selections").delete().eq("plan_id", planId);
  const { error: selError } = await supabase
    .from("principle_selections")
    .insert(
      sel.keys.map((principle) => ({
        user_id: userId,
        plan_id: planId,
        principle,
      })),
    );
  if (selError) {
    return { ok: false, error: "Saved the plan, but the principles failed." };
  }

  revalidatePath("/app/plan");
  return { ok: true };
}

const GoalSchema = z.object({
  level: z.enum([
    "ten_year",
    "five_year",
    "six_month",
    "monthly",
    "weekly",
    "daily",
  ]),
  body: z.string().trim().min(3).max(500),
  parent_goal_id: z.string().uuid().nullable().optional(),
});

export async function addGoal(input: unknown): Promise<Result> {
  const parsed = GoalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Write a few words for the goal." };
  }
  const { level, body, parent_goal_id } = parsed.data;
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { data: plan } = await supabase
    .from("growth_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();
  const planId = (plan as { id: string } | null)?.id ?? null;

  // A goal "ladders up" if it's the top level or it points at a parent.
  const laddersUp = PARENT_LEVEL[level as GoalLevel] === null || !!parent_goal_id;

  const { error } = await supabase.from("growth_goals").insert({
    user_id: userId,
    plan_id: planId,
    level,
    body,
    parent_goal_id: parent_goal_id ?? null,
    ladders_up: laddersUp,
    status: "open",
  });
  if (error) return { ok: false, error: "Could not add the goal." };

  revalidatePath("/app/plan");
  return { ok: true };
}

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "done", "dropped"]),
});

export async function setGoalStatus(input: unknown): Promise<Result> {
  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("growth_goals")
    .update({ status: parsed.data.status as GoalStatus })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not update the goal." };

  revalidatePath("/app/plan");
  return { ok: true };
}

export async function deleteGoal(input: unknown): Promise<Result> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Detach any children first so we don't orphan a dangling parent ref.
  await supabase
    .from("growth_goals")
    .update({ parent_goal_id: null, ladders_up: false })
    .eq("parent_goal_id", parsed.data.id);
  const { error } = await supabase
    .from("growth_goals")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Could not delete the goal." };

  revalidatePath("/app/plan");
  return { ok: true };
}

const MappingSchema = z.object({
  plan_id: z.string().uuid(),
  mappings: z
    .array(
      z.object({
        principle: z.string(),
        layer: z.string(),
        rationale: z.string().max(600).optional(),
        source: z.enum(["ai", "user"]).optional(),
      }),
    )
    .max(11),
});

// Persist the user-confirmed plan→principle mapping. The user always has final
// say (governance Part 8): whatever they confirm here is what we store.
export async function saveMapping(input: unknown): Promise<Result> {
  const parsed = MappingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Confirm the plan belongs to this user (RLS also enforces this).
  const { data: plan } = await supabase
    .from("growth_plans")
    .select("id")
    .eq("id", parsed.data.plan_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Plan not found." };

  const rows = parsed.data.mappings
    .filter((m) => isPrincipleKey(m.principle) && isInspectionLayer(m.layer))
    .map((m) => ({
      user_id: userId,
      plan_id: parsed.data.plan_id,
      principle: m.principle,
      layer: m.layer,
      ai_rationale: m.rationale ?? null,
      source: m.source ?? "ai",
      confirmed: true,
    }));
  if (rows.length === 0) {
    return { ok: false, error: "Pick at least one principle to confirm." };
  }

  await supabase
    .from("principle_mappings")
    .delete()
    .eq("plan_id", parsed.data.plan_id);
  const { error } = await supabase.from("principle_mappings").insert(rows);
  if (error) return { ok: false, error: "Could not save the mapping." };

  revalidatePath("/app/plan");
  return { ok: true };
}

// ---- Cascade check-ins (BUILD_SPEC §3.4) -----------------------------------

const CheckinSchema = z.object({
  checkin_type: z.enum(["daily", "weekly", "monthly"]),
  period_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reflection: z.string().trim().max(2000).optional(),
  completions: z
    .array(
      z.object({
        goal_id: z.string().uuid(),
        completed: z.boolean(),
      }),
    )
    .max(200),
});

// Record (or update) a daily/weekly/monthly cascade check-in: which goals were
// completed for the period plus an optional reflection. This completion history
// is the behavioral anchor the six-month inspection reads. We never mutate a
// goal's own status here — the check-in is a point-in-time record, separate
// from the goal's lifecycle.
export async function saveCascadeCheckin(input: unknown): Promise<Result> {
  const parsed = CheckinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { checkin_type, period_date, reflection } = parsed.data;

  // Only accept completions for goals this user actually owns (defense in
  // depth on top of RLS — never link a foreign goal id into a check-in).
  const { data: ownGoals } = await supabase
    .from("growth_goals")
    .select("id")
    .eq("user_id", userId);
  const ownIds = new Set(
    ((ownGoals ?? []) as { id: string }[]).map((g) => g.id),
  );
  const completions = parsed.data.completions.filter((c) =>
    ownIds.has(c.goal_id),
  );

  // Upsert the check-in row for this (user, type, period).
  const { data: checkinRow, error: upsertError } = await supabase
    .from("cascade_checkins")
    .upsert(
      {
        user_id: userId,
        checkin_type,
        period_date,
        reflection: reflection && reflection.length ? reflection : null,
      },
      { onConflict: "user_id,checkin_type,period_date" },
    )
    .select("id")
    .single();
  if (upsertError || !checkinRow) {
    return { ok: false, error: "Could not save your check-in." };
  }
  const checkinId = (checkinRow as { id: string }).id;

  // Replace the per-goal completion rows for this check-in.
  await supabase
    .from("cascade_checkin_goals")
    .delete()
    .eq("checkin_id", checkinId);
  if (completions.length) {
    const { error: insertError } = await supabase
      .from("cascade_checkin_goals")
      .insert(
        completions.map((c) => ({
          user_id: userId,
          checkin_id: checkinId,
          goal_id: c.goal_id,
          completed: c.completed,
        })),
      );
    if (insertError) {
      return { ok: false, error: "Saved the note, but goals failed to save." };
    }
  }

  revalidatePath("/app/plan/checkin");
  revalidatePath("/app/plan");
  return { ok: true };
}
