import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Daily cohort lifecycle transitions (COHORT_BRIEF):
//   open|full  → in_progress   when start_date arrives
//   in_progress → completed    when end_date passes
//   open → full                when paid seats reach capacity
//   accepted → applied         when the 7-day payment window lapses
// Secured like the other crons: Authorization: Bearer ${CRON_SECRET}.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("Cron: CRON_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const results: Record<string, number> = {};

  // start_date arrived → in_progress
  {
    const { data } = await admin
      .from("cohorts")
      .update({ status: "in_progress" })
      .in("status", ["open", "full"])
      .lte("start_date", today)
      .select("id");
    results.started = (data ?? []).length;
  }

  // end_date passed → completed
  {
    const { data } = await admin
      .from("cohorts")
      .update({ status: "completed" })
      .eq("status", "in_progress")
      .lt("end_date", today)
      .select("id");
    results.completed = (data ?? []).length;
  }

  // paid seats at capacity → full
  {
    const { data: openCohorts } = await admin
      .from("cohorts")
      .select("id, capacity")
      .eq("status", "open");
    let filled = 0;
    for (const c of (openCohorts ?? []) as { id: string; capacity: number }[]) {
      const { count } = await admin
        .from("cohort_participants")
        .select("id", { count: "exact", head: true })
        .eq("cohort_id", c.id)
        .in("status", ["paid", "enrolled"]);
      if ((count ?? 0) >= c.capacity) {
        await admin.from("cohorts").update({ status: "full" }).eq("id", c.id);
        filled += 1;
      }
    }
    results.filled = filled;
  }

  // 7-day payment window lapsed → seat released (accepted → applied)
  {
    const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data } = await admin
      .from("cohort_participants")
      .update({ status: "applied", accepted_at: null })
      .eq("status", "accepted")
      .lt("accepted_at", cutoff)
      .select("id");
    results.reverted = (data ?? []).length;
  }

  return NextResponse.json({ ok: true, ...results });
}
