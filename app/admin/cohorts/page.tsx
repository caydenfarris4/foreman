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

export default async function AdminCohortsList() {
  await requireAdminPage();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("cohorts")
    .select(
      "id, name, slug, start_date, end_date, status, capacity, price_cents",
    )
    .order("start_date", { ascending: false });
  const cohorts = (data ?? []) as Pick<
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

  // Per-cohort paid count.
  const counts = new Map<string, number>();
  if (cohorts.length > 0) {
    const ids = cohorts.map((c) => c.id);
    const { data: pRows } = await supabase
      .from("cohort_participants")
      .select("cohort_id, status")
      .in("cohort_id", ids)
      .in("status", ["paid", "enrolled", "completed"]);
    for (const p of (pRows ?? []) as { cohort_id: string }[]) {
      counts.set(p.cohort_id, (counts.get(p.cohort_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="type-cap text-graphite">COHORTS</p>
          <h1 className="type-h1 mt-1 text-ink">All cohorts</h1>
        </div>
        <Button asChild>
          <Link href="/admin/cohorts/new">New cohort</Link>
        </Button>
      </div>

      <div className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-chalk">
        {cohorts.length === 0 ? (
          <div className="p-5">
            <p className="type-body text-graphite">No cohorts yet.</p>
          </div>
        ) : (
          cohorts.map((c) => {
            const paid = counts.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/admin/cohorts/${c.id}`}
                className="grid gap-3 p-4 hover:bg-paper2/40 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="type-label text-ink">{c.name}</p>
                    <Badge variant="neutral" size="sm">
                      /{c.slug}
                    </Badge>
                  </div>
                  <p className="type-caption mt-1 text-graphite">
                    {formatCohortDateRange(c.start_date, c.end_date)} ·{" "}
                    {formatCohortPrice(c.price_cents)} · {paid}/{c.capacity}{" "}
                    paid
                  </p>
                </div>
                <Badge variant="neutral" size="sm">
                  {c.status}
                </Badge>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
