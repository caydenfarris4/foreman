"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const months = z.enum(["0-3", "4-6", "7-9", "10-12"]);
const teamSize = z.enum(["1-3", "4-6", "7-10", "11+"]);
const retroDay = z.enum(["friday", "saturday", "sunday", "monday"]);
const challenge = z.enum([
  "feedback",
  "delegation",
  "conflict",
  "underperformer",
  "scope",
  "manager",
]);

const OnboardingSchema = z.object({
  name: z.string().trim().min(1).max(80),
  current_role: z.string().trim().min(1).max(120),
  months_managing: months,
  team_size_bucket: teamSize,
  challenge,
  notification_time: z.string().regex(/^\d{2}:\d{2}$/),
  retro_day: retroDay,
  timezone: z.string().trim().min(1).max(64),
});

const MONTHS_AGO_MIDPOINT: Record<z.infer<typeof months>, number> = {
  "0-3": 2,
  "4-6": 5,
  "7-9": 8,
  "10-12": 11,
};

const TEAM_SIZE_MIDPOINT: Record<z.infer<typeof teamSize>, number> = {
  "1-3": 2,
  "4-6": 5,
  "7-10": 8,
  "11+": 12,
};

const CHALLENGE_LABEL: Record<z.infer<typeof challenge>, string> = {
  feedback: "Giving hard feedback — telling the truth when it costs you.",
  delegation: "Letting go of the work — still doing IC work after hours.",
  conflict: "Conflict on the team — two people, one stuck thing.",
  underperformer: "A struggling report you've known about for weeks.",
  scope: "Saying no to scope — the team is doing 1.5 teams' work.",
  manager: "Managing up — the boss is the bottleneck.",
};

function dateMonthsAgo(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

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

  const d = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      name: d.name,
      current_role: d.current_role,
      promoted_at: dateMonthsAgo(MONTHS_AGO_MIDPOINT[d.months_managing]),
      team_size: TEAM_SIZE_MIDPOINT[d.team_size_bucket],
      current_challenge: CHALLENGE_LABEL[d.challenge],
      notification_time: d.notification_time + ":00",
      retro_day: d.retro_day,
      timezone: d.timezone,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/app");
}
