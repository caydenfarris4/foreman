import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminPage } from "@/lib/admin";
import type { Cohort } from "@/lib/database.types";
import {
  formatCohortDateRange,
  formatCohortPrice,
} from "@/lib/cohorts";

export default async function AdminHome() {
  await requireAdminPage();
  const supabase = createAdminClient();

  // Cohorts overview.
  const { data: cohortRows } = await supabase
    .from("cohorts")
    .select(
      "id, name, slug, start_date, end_date, status, capacity, price_cents",
    )
    .order("start_date", { ascending: false })
    .limit(10);
  const cohorts = (cohortRows ?? []) as Pick<
    Cohort,
    | "id"
    | "name"
    | "slug"
    | "start_date"
    | "end_date"
    | "status"
    | "capacity"
    | "price_cents"
  >[];

  // Pending applications across all cohorts.
  const { count: pendingApps } = await supabase
    .from("cohort_participants")
    .select("id", { count: "exact", head: true })
    .eq("status", "applied");

  // Recent applications needing attention (>3 business days old).
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const { count: stalePending } = await supabase
    .from("cohort_participants")
    .select("id", { count: "exact", head: true })
    .eq("status", "applied")
    .lt("applied_at", threeDaysAgo.toISOString());

  // Accepted but not paid — payment-window watch.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: paymentLate } = await supabase
    .from("cohort_participants")
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted")
    .lt("accepted_at", sevenDaysAgo.toISOString());

  // Inspection reports waiting on review — these never auto-release.
  const { count: pendingReviews } = await supabase
    .from("review_queue_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="space-y-8">
      <div>
        <p className="type-cap text-graphite">ADMIN HOME</p>
        <h1 className="type-h1 mt-2 text-ink">The site office.</h1>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Pending applications"
          value={pendingApps ?? 0}
          alert={(stalePending ?? 0) > 0}
          sub={
            (stalePending ?? 0) > 0
              ? `${stalePending} over the 5-day SLA`
              : "All within SLA"
          }
        />
        <StatCard
          label="Awaiting payment"
          value={paymentLate ?? 0}
          alert={(paymentLate ?? 0) > 0}
          sub={
            (paymentLate ?? 0) > 0
              ? "Past the 7-day window"
              : "All current"
          }
        />
        <StatCard
          label="Active cohorts"
          value={
            cohorts.filter((c) =>
              ["open", "full", "in_progress"].includes(c.status),
            ).length
          }
          sub={`${cohorts.length} total`}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/app/admin/review"
          className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
            (pendingReviews ?? 0) > 0
              ? "border-oak bg-oak-wash hover:bg-oak/20"
              : "border-rule bg-chalk hover:bg-paper2/40"
          }`}
        >
          <span>
            <span className="type-cap text-graphite">INSPECTIONS</span>
            <span className="type-label mt-1 block text-ink">
              Review queue
              {(pendingReviews ?? 0) > 0 ? ` · ${pendingReviews} waiting` : ""}
            </span>
          </span>
          <span className="type-label text-oak-dim">Open →</span>
        </Link>
        <Link
          href="/admin/mentors"
          className="flex items-center justify-between rounded-lg border border-rule bg-chalk p-4 transition-colors hover:bg-paper2/40"
        >
          <span>
            <span className="type-cap text-graphite">COHORT PROGRAM</span>
            <span className="type-label mt-1 block text-ink">Guest mentors</span>
          </span>
          <span className="type-label text-oak-dim">Open →</span>
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <p className="type-cap text-graphite">RECENT COHORTS</p>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/cohorts">View all</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/cohorts/new">New cohort</Link>
            </Button>
          </div>
        </div>
        <div className="mt-3 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-chalk">
          {cohorts.length === 0 ? (
            <div className="p-5">
              <p className="type-body text-graphite">
                No cohorts yet.{" "}
                <Link
                  href="/admin/cohorts/new"
                  className="underline hover:text-ink"
                >
                  Create the first one.
                </Link>
              </p>
            </div>
          ) : (
            cohorts.map((c) => (
              <Link
                key={c.id}
                href={`/admin/cohorts/${c.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-paper2/40"
              >
                <div>
                  <p className="type-label text-ink">{c.name}</p>
                  <p className="type-caption text-graphite">
                    {formatCohortDateRange(c.start_date, c.end_date)} ·{" "}
                    {formatCohortPrice(c.price_cents)}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alert ? "border-rust bg-rust-wash" : "border-rule bg-chalk"
      }`}
    >
      <p className="type-cap text-graphite">{label}</p>
      <p className="type-h1 mt-1 text-ink">{value}</p>
      {sub ? (
        <p
          className={`type-caption mt-1 ${
            alert ? "text-rust" : "text-graphite"
          }`}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, "neutral"> = {};
  void variant;
  const labels: Record<string, string> = {
    draft: "Draft",
    open: "Open",
    full: "Full",
    in_progress: "In progress",
    completed: "Completed",
    archived: "Archived",
  };
  return (
    <Badge variant="neutral" size="sm">
      {labels[status] ?? status}
    </Badge>
  );
}
