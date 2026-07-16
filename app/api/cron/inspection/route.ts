import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromAddress, getResend } from "@/lib/resend";
import {
  inspectionDueHtml,
  inspectionDueSubject,
  reviewNudgeHtml,
  reviewNudgeSubject,
} from "@/lib/emails/inspection";
import {
  listUnsubscribeHeaders,
  unsubscribeUrl,
} from "@/lib/emails/unsubscribe";
import { inspectionDueAt } from "@/lib/inspection/evidence";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Daily inspection cron, two jobs in one pass:
//  1. "Time to walk the site" invites — sent once, the day a user's firm
//     six-month cycle comes due (24h window; run this daily).
//  2. The review-queue nudge to Cayden — routed reports never auto-release,
//     so pending items get a daily reminder until the queue is clear.
export async function GET(request: NextRequest) {
  // Same fail-closed bearer check pattern as the other crons.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("Inspection cron: CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const provided = Buffer.from(auth);
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const ok =
    provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://foreman.app";
  const now = Date.now();

  // ---- Job 1: six-month due invites --------------------------------------
  const { data: inspectionRows, error: inspectionsError } = await admin
    .from("inspections")
    .select("user_id, status, sent_at, created_at")
    .limit(10_000);
  if (inspectionsError) {
    console.error("Inspection cron: fetch failed", inspectionsError.message);
    return NextResponse.json({ error: "Inspection fetch failed" }, { status: 500 });
  }
  const rows = (inspectionRows ?? []) as {
    user_id: string;
    status: string;
    sent_at: string | null;
    created_at: string;
  }[];

  // Latest sent report per user; a draft in flight means no invite.
  const latestSent = new Map<string, string>();
  const inFlight = new Set<string>();
  for (const r of rows) {
    if (r.status !== "sent") {
      inFlight.add(r.user_id);
      continue;
    }
    if (!r.sent_at) continue;
    const prev = latestSent.get(r.user_id);
    if (!prev || r.sent_at > prev) latestSent.set(r.user_id, r.sent_at);
  }

  // Due today: the cycle unlocked within the last 24h. A daily run sends each
  // invite exactly once; the in-app card keeps nudging after that.
  const dueUserIds: string[] = [];
  for (const [userId, sentAt] of latestSent) {
    if (inFlight.has(userId)) continue;
    const dueMs = new Date(inspectionDueAt(sentAt)).getTime();
    if (now >= dueMs && now - dueMs < 24 * 3600_000) dueUserIds.push(userId);
  }

  let invitesSent = 0;
  const errors: { id: string; reason: string }[] = [];
  if (dueUserIds.length) {
    const { data: profileRows } = await admin
      .from("profiles")
      .select("id, email, name, subscription_status, onboarded_at, emails_paused")
      .in("id", dueUserIds)
      .not("onboarded_at", "is", null)
      .in("subscription_status", ["trial", "active"])
      .eq("emails_paused", false);
    const profiles = (profileRows ?? []) as {
      id: string;
      email: string;
      name: string | null;
    }[];
    for (const p of profiles) {
      try {
        const unsubUrl = unsubscribeUrl(appUrl, p.id);
        const result = await getResend().emails.send({
          from: getFromAddress(),
          to: p.email,
          subject: inspectionDueSubject(),
          html: inspectionDueHtml({
            name: p.name,
            appUrl,
            unsubscribeUrl: unsubUrl,
          }),
          headers: listUnsubscribeHeaders(unsubUrl),
        });
        if (result.error) {
          errors.push({ id: p.id, reason: result.error.message ?? "send failed" });
          continue;
        }
        invitesSent++;
      } catch (err) {
        errors.push({
          id: p.id,
          reason: err instanceof Error ? err.message : "unknown error",
        });
      }
    }
  }

  // ---- Job 2: daily review-queue nudge to Cayden --------------------------
  const { count: pendingCount } = await admin
    .from("review_queue_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  let nudgesSent = 0;
  if ((pendingCount ?? 0) > 0) {
    const { data: adminRows } = await admin
      .from("profiles")
      .select("id, email")
      .eq("is_admin", true);
    for (const a of (adminRows ?? []) as { id: string; email: string }[]) {
      try {
        const result = await getResend().emails.send({
          from: getFromAddress(),
          to: a.email,
          subject: reviewNudgeSubject(pendingCount ?? 0),
          html: reviewNudgeHtml({ count: pendingCount ?? 0, appUrl }),
        });
        if (result.error) {
          errors.push({ id: a.id, reason: result.error.message ?? "send failed" });
          continue;
        }
        nudgesSent++;
      } catch (err) {
        errors.push({
          id: a.id,
          reason: err instanceof Error ? err.message : "unknown error",
        });
      }
    }
  }

  return NextResponse.json({
    timestamp: new Date(now).toISOString(),
    usersWithSentReports: latestSent.size,
    dueToday: dueUserIds.length,
    invitesSent,
    pendingReviews: pendingCount ?? 0,
    nudgesSent,
    errorCount: errors.length,
    errors: errors.slice(0, 25),
  });
}
