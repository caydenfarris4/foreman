"use server";

// Daily habit checklist — the small no-writing goals on the daily check-in
// ("made my bed"). Check/uncheck is a per-day row in habit_checks.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

const AddSchema = z.object({ label: z.string().trim().min(2).max(80) });

export async function addHabit(input: unknown): Promise<Result> {
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Give the habit a name." };
  const { supabase, userId } = await currentUser();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Cap the list — a checklist you can finish. (Zeigarnik overload guard.)
  const { count } = await supabase
    .from("daily_habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("active", true);
  if ((count ?? 0) >= 10) {
    return { ok: false, error: "Ten daily habits is plenty. Retire one first." };
  }

  const { error } = await supabase.from("daily_habits").insert({
    user_id: userId,
    label: parsed.data.label,
    active: true,
    sort: (count ?? 0) + 1,
  });
  if (error) return { ok: false, error: "Could not add the habit." };

  revalidatePath("/app");
  revalidatePath("/app/checkin");
  return { ok: true };
}

export async function archiveHabit(input: unknown): Promise<Result> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { supabase, userId } = await currentUser();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("daily_habits")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Could not remove the habit." };

  revalidatePath("/app");
  revalidatePath("/app/checkin");
  return { ok: true };
}

const ToggleSchema = z.object({
  habit_id: z.string().uuid(),
  check_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checked: z.boolean(),
});

export async function setHabitChecked(input: unknown): Promise<Result> {
  const parsed = ToggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { supabase, userId } = await currentUser();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { habit_id, check_date, checked } = parsed.data;

  // Only the user's own habit can be checked (RLS also enforces this).
  const { data: habit } = await supabase
    .from("daily_habits")
    .select("id")
    .eq("id", habit_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!habit) return { ok: false, error: "Habit not found." };

  if (checked) {
    const { error } = await supabase
      .from("habit_checks")
      .upsert(
        { user_id: userId, habit_id, check_date },
        { onConflict: "habit_id,check_date" },
      );
    if (error) return { ok: false, error: "Could not check it off." };
  } else {
    const { error } = await supabase
      .from("habit_checks")
      .delete()
      .eq("habit_id", habit_id)
      .eq("check_date", check_date);
    if (error) return { ok: false, error: "Could not uncheck it." };
  }

  revalidatePath("/app");
  revalidatePath("/app/checkin");
  return { ok: true };
}
