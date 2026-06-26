import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/utils";
import {
  checkinAnchorLevelFor,
  checkinLevelFor,
  periodDateFor,
} from "@/lib/inspection/periods";
import type {
  CascadeCheckin,
  CascadeCheckinGoal,
  CascadeCheckinType,
  GrowthGoal,
  Profile,
} from "@/lib/database.types";
import { CascadeCheckinForm } from "./checkin-form";

type SearchParams = { type?: string };

function parseType(value: string | undefined): CascadeCheckinType {
  return value === "weekly" || value === "monthly" ? value : "daily";
}

function periodLabel(type: CascadeCheckinType, periodDate: string): string {
  const d = new Date(`${periodDate}T12:00:00Z`);
  if (type === "daily") {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  if (type === "monthly") {
    return d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(d)} – ${fmt(end)}`;
}

export default async function CascadeCheckinPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const type = parseType(params.type);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Pick<Profile, "timezone"> | null;
  if (!profile) redirect("/onboarding");

  const today = todayInTimezone(profile.timezone);
  const periodDate = periodDateFor(type, today);
  const level = checkinLevelFor(type);
  const anchorLevel = checkinAnchorLevelFor(type);

  const [goalsRes, anchorRes, existingRes] = await Promise.all([
    supabase
      .from("growth_goals")
      .select("id, body, parent_goal_id, status")
      .eq("user_id", user.id)
      .eq("level", level)
      .neq("status", "dropped")
      .order("created_at", { ascending: true }),
    supabase
      .from("growth_goals")
      .select("id, body")
      .eq("user_id", user.id)
      .eq("level", anchorLevel)
      .neq("status", "dropped")
      .order("created_at", { ascending: true }),
    supabase
      .from("cascade_checkins")
      .select("id, reflection")
      .eq("user_id", user.id)
      .eq("checkin_type", type)
      .eq("period_date", periodDate)
      .maybeSingle(),
  ]);

  const goals = (goalsRes.data ?? []) as Pick<
    GrowthGoal,
    "id" | "body" | "parent_goal_id" | "status"
  >[];
  const anchorGoals = (anchorRes.data ?? []) as Pick<GrowthGoal, "id" | "body">[];
  const existing = existingRes.data as Pick<
    CascadeCheckin,
    "id" | "reflection"
  > | null;

  let initialCompletions: Record<string, boolean> = {};
  if (existing) {
    const { data: completionRows } = await supabase
      .from("cascade_checkin_goals")
      .select("goal_id, completed")
      .eq("checkin_id", existing.id);
    initialCompletions = Object.fromEntries(
      ((completionRows ?? []) as Pick<
        CascadeCheckinGoal,
        "goal_id" | "completed"
      >[]).map((r) => [r.goal_id, r.completed]),
    );
  }

  return (
    <CascadeCheckinForm
      type={type}
      periodDate={periodDate}
      periodLabel={periodLabel(type, periodDate)}
      goals={goals}
      anchorGoals={anchorGoals}
      initialCompletions={initialCompletions}
      initialReflection={existing?.reflection ?? ""}
    />
  );
}
