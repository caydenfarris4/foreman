"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

// Mirrors the profiles check constraints (0001, 0002) and the onboarding
// schema; RLS restricts the update to the caller's own row.
const SettingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  role_title: z.string().trim().max(120),
  current_challenge: z.string().trim().max(300),
  sabbath_day: z.enum([...WEEKDAYS, "none"]),
  retro_day: z.enum(WEEKDAYS),
  notification_time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  timezone: z.string().trim().min(1).max(64),
});

export async function updateSettings(input: unknown): Promise<Result> {
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Check every field and try again.",
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      name: d.name,
      role_title: d.role_title || null,
      current_challenge: d.current_challenge || null,
      sabbath_day: d.sabbath_day,
      retro_day: d.retro_day,
      notification_time: d.notification_time + ":00",
      timezone: d.timezone,
    })
    .eq("id", user.id);
  if (error) {
    console.error("Settings save failed", error.message);
    return { ok: false, error: "Could not save. Try again." };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { ok: true };
}
