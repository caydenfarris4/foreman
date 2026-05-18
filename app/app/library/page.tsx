import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PhaseTag } from "@/components/ui/phase-tag";
import { createClient } from "@/lib/supabase/server";
import type { FrameworkPhase, Situation } from "@/lib/database.types";
import { sanitizeSearchTerm, sanitizeTag } from "@/lib/validation";
import { LibraryControls } from "./controls";

type SearchParams = {
  q?: string;
  phase?: string;
  tag?: string;
};

const PHASES: FrameworkPhase[] = ["foundation", "framing", "finishing"];

function isPhase(value: string | undefined): value is FrameworkPhase {
  return value === "foundation" || value === "framing" || value === "finishing";
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const q = sanitizeSearchTerm(params.q);
  const phase = isPhase(params.phase) ? params.phase : null;
  const tag = sanitizeTag(params.tag);

  // Phase counts.
  const countQueries = await Promise.all(
    PHASES.map((p) =>
      supabase
        .from("situations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("framework_phase", p),
    ),
  );
  const totalCount = await supabase
    .from("situations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const counts: Record<FrameworkPhase | "all", number> = {
    all: totalCount.count ?? 0,
    foundation: countQueries[0].count ?? 0,
    framing: countQueries[1].count ?? 0,
    finishing: countQueries[2].count ?? 0,
  };

  // Tag list — aggregate from recent window.
  const { data: tagSource } = await supabase
    .from("situations")
    .select("tags")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);
  const tagFrequency = new Map<string, number>();
  for (const row of (tagSource ?? []) as { tags: string[] | null }[]) {
    for (const t of row.tags ?? []) {
      tagFrequency.set(t, (tagFrequency.get(t) ?? 0) + 1);
    }
  }
  const topTags = [...tagFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Actual filtered results.
  let query = supabase
    .from("situations")
    .select("id, title, situation, framework_phase, tags, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (phase) query = query.eq("framework_phase", phase);
  if (tag) query = query.contains("tags", [tag]);
  if (q) {
    // q has already been whitelist-sanitized via sanitizeSearchTerm —
    // no PostgREST delimiters or ILIKE wildcards survive — so direct
    // interpolation here is safe.
    query = query.or(
      `title.ilike.%${q}%,situation.ilike.%${q}%,coaching.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  const situations = (data ?? []) as Pick<
    Situation,
    "id" | "title" | "situation" | "framework_phase" | "tags" | "created_at"
  >[];

  // Compute the eyebrow stats.
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 14 * 7);
  const totalWeeks = Math.max(
    1,
    Math.ceil(
      (Date.now() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
    ),
  );
  // Better: use the date of the oldest situation if we have one.
  const oldest = situations[situations.length - 1];
  const weeks = oldest
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() - new Date(oldest.created_at).getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        ),
      )
    : totalWeeks;

  return (
    <div className="px-3 pb-8 pt-4">
      <div className="px-1">
        <p className="type-cap text-graphite">
          {counts.all} SITUATION{counts.all === 1 ? "" : "S"} · {weeks} WEEK
          {weeks === 1 ? "" : "S"}
        </p>
        <h1 className="type-h1 mt-2 text-ink">Library</h1>
      </div>

      <div className="mt-4">
        <LibraryControls
          initialQuery={q}
          activePhase={phase}
          activeTag={tag || null}
          counts={counts}
          topTags={topTags}
        />
      </div>

      {error ? (
        <div className="mt-6 rounded-md border border-rust bg-rust-wash p-4">
          <p className="type-label text-rust">Something broke while searching.</p>
          <p className="type-caption mt-1 text-ink2">{error.message}</p>
        </div>
      ) : situations.length > 0 ? (
        <div className="mt-4">
          {situations.map((s, i) => (
            <SituationRow
              key={s.id}
              s={s}
              isFirst={i === 0}
            />
          ))}
        </div>
      ) : (
        <div className="mt-12 px-1 text-center">
          <p className="type-h2 text-ink">
            {q || phase || tag
              ? "Nothing matches that filter."
              : "Nothing here yet."}
          </p>
          <p className="type-body mt-2 text-graphite">
            {q || phase || tag
              ? "Try a different search, or clear the filters above."
              : "Finish a check-in and it'll show up here automatically."}
          </p>
        </div>
      )}
    </div>
  );
}

function SituationRow({
  s,
  isFirst,
}: {
  s: Pick<
    Situation,
    "id" | "title" | "situation" | "framework_phase" | "tags" | "created_at"
  >;
  isFirst: boolean;
}) {
  const date = new Date(s.created_at);
  const month = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const day = date.getDate();
  return (
    <Link
      href={`/app/library/${s.id}`}
      className={`flex gap-4 border-b border-rule py-4 transition-colors hover:bg-paper2/40 ${
        isFirst ? "border-t" : ""
      }`}
    >
      <div className="w-10 shrink-0 pt-0.5">
        <p className="type-cap text-graphite">{month}</p>
        <p className="type-h2 mt-0.5 leading-none text-ink">{day}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <PhaseTag phase={s.framework_phase} />
          {(s.tags ?? []).slice(0, 3).map((t) => (
            <Badge key={t} variant="neutral" size="sm">
              {t}
            </Badge>
          ))}
        </div>
        <p className="type-label text-ink">{s.title}</p>
        <p className="type-body-sm mt-1 line-clamp-2 text-graphite">
          {s.situation}
        </p>
      </div>
    </Link>
  );
}
