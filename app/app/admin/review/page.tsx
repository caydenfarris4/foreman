import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FLAG_REASON_LABEL, type FlagReason } from "@/lib/inspection/router";
import { principleByKey } from "@/lib/inspection/principles";
import type {
  GrowthPlan,
  Inspection,
  PrincipleSelection,
  Profile,
} from "@/lib/database.types";
import { ReviewItem } from "./review-item";

export default async function AdminReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!(me as { is_admin: boolean } | null)?.is_admin) redirect("/app");

  const admin = createAdminClient();
  const { data: queueRows } = await admin
    .from("review_queue_items")
    .select("inspection_id, flag_reasons, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  const queue = (queueRows ?? []) as {
    inspection_id: string;
    flag_reasons: string[];
    created_at: string;
  }[];

  // Hydrate each queued inspection with the draft + the user's context.
  const items = await Promise.all(
    queue.map(async (q) => {
      const { data: insRow } = await admin
        .from("inspections")
        .select(
          "id, user_id, cycle_number, is_baseline, generated_report, flag_reasons",
        )
        .eq("id", q.inspection_id)
        .single();
      const ins = insRow as Pick<
        Inspection,
        | "id"
        | "user_id"
        | "cycle_number"
        | "is_baseline"
        | "generated_report"
        | "flag_reasons"
      > | null;
      if (!ins) return null;

      const { data: prof } = await admin
        .from("profiles")
        .select("name, email, role_title")
        .eq("id", ins.user_id)
        .single();
      const profile = prof as Pick<
        Profile,
        "name" | "email" | "role_title"
      > | null;

      const { data: plan } = await admin
        .from("growth_plans")
        .select("id, six_month_milestone")
        .eq("user_id", ins.user_id)
        .eq("is_current", true)
        .maybeSingle();
      const planRow = plan as Pick<
        GrowthPlan,
        "id" | "six_month_milestone"
      > | null;

      const { data: sel } = planRow
        ? await admin
            .from("principle_selections")
            .select("principle")
            .eq("plan_id", planRow.id)
        : { data: [] };
      const principles = ((sel ?? []) as Pick<
        PrincipleSelection,
        "principle"
      >[]).map((s) => principleByKey(s.principle).name);

      return {
        inspection: ins,
        flagReasons: (q.flag_reasons ?? []) as FlagReason[],
        profile,
        milestone: planRow?.six_month_milestone ?? null,
        principles,
      };
    }),
  );

  const live = items.filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="space-y-5 px-3 pb-8 pt-6">
      <header className="px-1">
        <p className="type-cap text-oak-dim">REVIEW QUEUE</p>
        <h1 className="type-h1 mt-2 text-ink">Reports waiting on you.</h1>
        <p className="type-body mt-2 text-graphite">
          {live.length === 0
            ? "Nothing in the queue. Every report is clearing on its own."
            : `${live.length} report${live.length === 1 ? "" : "s"} to read. Approve, edit, or add a personal note.`}
        </p>
      </header>

      {live.map((item) => (
        <section
          key={item.inspection.id}
          className="overflow-hidden rounded-lg border border-rule bg-chalk"
        >
          <div className="border-b border-rule p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-label text-ink">
                {item.profile?.name ?? item.profile?.email ?? "A builder"}
              </span>
              <span className="type-caption text-graphite">
                {item.profile?.role_title ?? ""}
              </span>
              <span className="type-cap text-graphite">
                · {item.inspection.is_baseline ? "BASELINE" : `CYCLE ${item.inspection.cycle_number}`}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.flagReasons.map((r) => (
                <span
                  key={r}
                  className="type-cap rounded-full border border-oak/40 bg-oak-wash px-2 py-0.5 text-oak-dim"
                >
                  {FLAG_REASON_LABEL[r] ?? r}
                </span>
              ))}
            </div>
            {item.milestone ? (
              <p className="type-caption mt-2 text-graphite">
                <span className="text-ink2">Six-month milestone:</span>{" "}
                {item.milestone}
              </p>
            ) : null}
            {item.principles.length ? (
              <p className="type-caption mt-1 text-graphite">
                <span className="text-ink2">Principles:</span>{" "}
                {item.principles.join(", ")}
              </p>
            ) : null}
          </div>
          <ReviewItem
            inspectionId={item.inspection.id}
            draft={item.inspection.generated_report ?? ""}
          />
        </section>
      ))}
    </div>
  );
}
