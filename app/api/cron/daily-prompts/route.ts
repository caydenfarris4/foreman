import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromAddress, getResend } from "@/lib/resend";
import {
  dailyPromptHtml,
  dailyPromptSubject,
  dailyPromptText,
} from "@/lib/emails/daily-prompt";
import {
  reflectionPromptHtml,
  reflectionPromptSubject,
  reflectionPromptText,
} from "@/lib/emails/reflection-prompt";
import { promptForDay } from "@/lib/prompts/daily";
import { reflectionForDay } from "@/lib/prompts/reflection";
import type { FrameworkPhase, Profile } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Returns true if the user's notification_time hour matches the current
// hour in their timezone right now.
function isNotificationHour(
  notificationTime: string,
  timezone: string,
  now: Date,
): boolean {
  const targetHour = parseInt(notificationTime.slice(0, 2), 10);
  if (!Number.isFinite(targetHour)) return false;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });
  const localHour = parseInt(formatter.format(now), 10);
  return localHour === targetHour;
}

function weekdayInTz(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  })
    .format(now)
    .toLowerCase();
}

function dateInTz(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function GET(request: NextRequest) {
  // GitHub Actions (and Vercel Cron, if you switch back) sends
  // `Authorization: Bearer ${CRON_SECRET}`. Fail closed: if CRON_SECRET
  // is unset in this environment, refuse to run rather than letting any
  // caller trigger emails to every user.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("Cron: CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const provided = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  const ok =
    provided.length === expectedBuf.length &&
    timingSafeEqual(provided, expectedBuf);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.app";
  const now = new Date();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, name, current_phase, sabbath_day, notification_time, timezone, subscription_status, onboarded_at",
    )
    .not("onboarded_at", "is", null)
    .in("subscription_status", ["trial", "active"])
    .limit(10_000);

  if (error) {
    console.error("Cron: profile fetch failed", error);
    return NextResponse.json({ error: "Profile fetch failed" }, { status: 500 });
  }

  const profiles = (data ?? []) as Pick<
    Profile,
    | "id"
    | "email"
    | "name"
    | "current_phase"
    | "sabbath_day"
    | "notification_time"
    | "timezone"
    | "subscription_status"
    | "onboarded_at"
  >[];

  let attempted = 0;
  let sent = 0;
  let reflectionsSent = 0;
  let skippedHour = 0;
  let skippedAlreadyChecked = 0;
  const errors: { id: string; reason: string }[] = [];

  for (const p of profiles) {
    if (!isNotificationHour(p.notification_time, p.timezone, now)) {
      skippedHour++;
      continue;
    }
    const today = dateInTz(p.timezone, now);

    // Sabbath is no longer a pause. Send a reflection prompt instead of the
    // coaching prompt. We don't write to daily_checkins for it — the sabbath
    // reflection is contemplative, not a managerial check-in — so it stays out
    // of streaks, the library, and the weekly retro. Idempotency relies on the
    // hourly cadence, the same as the coaching path does in practice.
    if (p.sabbath_day === weekdayInTz(p.timezone, now)) {
      const reflectionPrompt = reflectionForDay(today, p.id);
      try {
        const resend = getResend();
        const result = await resend.emails.send({
          from: getFromAddress(),
          to: p.email,
          subject: reflectionPromptSubject(),
          text: reflectionPromptText({
            name: p.name,
            promptText: reflectionPrompt,
            appUrl,
          }),
          html: reflectionPromptHtml({
            name: p.name,
            promptText: reflectionPrompt,
            appUrl,
          }),
        });
        if (result.error) {
          console.error("Cron: Resend reflection error", p.id, result.error);
          errors.push({
            id: p.id,
            reason: result.error.message ?? "send failed",
          });
          continue;
        }
        reflectionsSent++;
      } catch (err) {
        console.error("Cron: reflection send threw", p.id, err);
        errors.push({
          id: p.id,
          reason: err instanceof Error ? err.message : "unknown error",
        });
      }
      continue;
    }

    attempted++;

    // If a check-in row already exists for today AND it has a response,
    // don't email — the user has already done today.
    const { data: existing } = await supabase
      .from("daily_checkins")
      .select("id, user_response, completed_at")
      .eq("user_id", p.id)
      .eq("checkin_date", today)
      .maybeSingle();
    const existingRow = existing as
      | { id: string; user_response: string | null; completed_at: string | null }
      | null;
    if (existingRow?.completed_at && existingRow.user_response) {
      skippedAlreadyChecked++;
      continue;
    }

    const promptText =
      existingRow
        ? // If a row exists without a response, reuse the prompt that was
          // already locked in for the day (don't re-randomize).
          (
            (
              await supabase
                .from("daily_checkins")
                .select("prompt_text")
                .eq("id", existingRow.id)
                .single()
            ).data as { prompt_text: string } | null
          )?.prompt_text ?? promptForDay(p.current_phase as FrameworkPhase, today, p.id)
        : promptForDay(p.current_phase as FrameworkPhase, today, p.id);

    // Lock in the prompt for today by writing the row before we send. If
    // sending fails we'll have a row with no response; the dashboard/check-in
    // page will pick it up tomorrow morning the same way.
    if (!existingRow) {
      const { error: insertError } = await supabase
        .from("daily_checkins")
        .insert({
          user_id: p.id,
          checkin_date: today,
          prompt_text: promptText,
        });
      if (insertError) {
        console.error("Cron: insert checkin failed", p.id, insertError);
        errors.push({ id: p.id, reason: insertError.message });
        continue;
      }
    }

    try {
      const resend = getResend();
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: p.email,
        subject: dailyPromptSubject(),
        text: dailyPromptText({ name: p.name, promptText, appUrl }),
        html: dailyPromptHtml({ name: p.name, promptText, appUrl }),
      });
      if (result.error) {
        console.error("Cron: Resend error", p.id, result.error);
        errors.push({ id: p.id, reason: result.error.message ?? "send failed" });
        continue;
      }
      sent++;
    } catch (err) {
      console.error("Cron: send threw", p.id, err);
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
    reflectionsSent,
    skippedHour,
    skippedAlreadyChecked,
    errorCount: errors.length,
    errors: errors.slice(0, 25),
  });
}
