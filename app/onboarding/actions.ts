"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const sabbathSchema = z.enum([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "none",
]);

const OnboardingSchema = z.object({
  name: z.string().trim().min(1).max(80),
  current_role: z.string().trim().min(1).max(120),
  promoted_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .or(z.literal(""))
    .optional(),
  team_size: z.coerce.number().int().min(0).max(10_000),
  team_context: z.string().trim().min(1).max(2_000),
  industry: z.string().trim().max(120).optional().default(""),
  current_challenge: z.string().trim().min(1).max(2_000),
  sabbath_day: sabbathSchema,
  notification_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  timezone: z.string().trim().min(1).max(64),
});

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData.entries());
  const parsed = OnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "field"}: ${issue.message}`)
      .join("; ");
    redirect(`/onboarding?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      name: data.name,
      current_role: data.current_role,
      promoted_at: data.promoted_at || null,
      team_size: data.team_size,
      team_context: data.team_context,
      industry: data.industry || null,
      current_challenge: data.current_challenge,
      sabbath_day: data.sabbath_day,
      notification_time: data.notification_time + ":00",
      timezone: data.timezone,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/app");
}
