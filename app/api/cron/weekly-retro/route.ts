import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromAddress, getResend } from "@/lib/resend";
import {
  weeklyRetroHtml,
  weeklyRetroSubject,
  weeklyRetroText,
} from "@/lib/emails/weekly-retro";
import type { Profile } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function weekdayInTz(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  })
    .format(now)
    .toLowerCase();
}

function weekStartInTz(timezone: string, now: Date): string {
  // ISO week start = Monday. We use a Mon-anchored week the same way
  // the rest of the app does (lib/utils.weekStartFor). Return YYYY-MM-DD.
  const local = new Date(
    new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime(),
  );
  const day = local.getDay() === 0 ? 7 : local.getDay(); // Sun -> 7
  local.setDate(local.getDate() - (day - 1));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(local);
}

function weekRangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export async function GET(request: NextRequest) {
  // Same fail-closed bearer check pattern as the daily prompt cron.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("Weekly retro cron: CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const provided = Buffer.from(auth);
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const ok =
    provided.length === expected.length &&
    timingSafeEqual(provided, expected);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.app";
  const now = new Date();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, name, retro_day, timezone, subscription_status, onboarded_at",
    )
    .not("onboarded_at", "is", null)
    .in("subscription_status", ["trial", "active"])
    .limit(10_000);

  if (error) {
    console.error("Weekly retro cron: profile fetch failed", error);
    return NextResponse.json({ error: "Profile fetch failed" }, { status: 500 });
  }

  const profiles = (data ?? []) as Pick<
    Profile,
    | "id"
    | "email"
    | "name"
    | "retro_day"
    | "timezone"
    | "subscription_status"
    | "onboarded_at"
  >[];

  let attempted = 0;
  let sent = 0;
  let skippedNotRetroDay = 0;
  let skippedAlreadyDone = 0;
  const errors: { id: string; reason: string }[] = [];

  for (const p of profiles) {
    const todayWeekday = weekdayInTz(p.timezone, now);
    if (p.retro_day !== todayWeekday) {
      skippedNotRetroDay++;
      continue;
    }
    const weekStart = weekStartInTz(p.timezone, now);

    // Don't email if the user already wrote (or skipped) this week's retro.
    const { data: existing } = await supabase
      .from("weekly_retros")
      .select("ai_synthesis, skipped")
      .eq("user_id", p.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    const e = existing as
      | { ai_synthesis: string | null; skipped: boolean }
      | null;
    if (e?.skipped || (e?.ai_synthesis && e.ai_synthesis.length > 0)) {
      skippedAlreadyDone++;
      continue;
    }

    attempted++;
    try {
      const resend = getResend();
      const weekRange = weekRangeLabel(weekStart);
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: p.email,
        subject: weeklyRetroSubject(),
        text: weeklyRetroText({ name: p.name, appUrl, weekRange }),
        html: weeklyRetroHtml({ name: p.name, appUrl, weekRange }),
      });
      if (result.error) {
        console.error("Weekly retro: Resend error", p.id, result.error);
        errors.push({ id: p.id, reason: result.error.message ?? "send failed" });
        continue;
      }
      sent++;
    } catch (err) {
      console.error("Weekly retro: send threw", p.id, err);
      errors.push({
        id: p.id,
        reason: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    scanned: profiles.length,
    attempted,
    sent,
    skippedNotRetroDay,
    skippedAlreadyDone,
    errorCount: errors.length,
    errors: errors.slice(0, 25),
  });
}
