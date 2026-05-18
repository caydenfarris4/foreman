import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PhaseTag } from "@/components/ui/phase-tag";
import { createClient } from "@/lib/supabase/server";
import type { FrameworkPhase, Situation } from "@/lib/database.types";
import {
  isIsoDate,
  sanitizeFtsQuery,
  sanitizeTag,
} from "@/lib/validation";
import { LibraryControls } from "./controls";

const PAGE_SIZE = 25;

type SearchParams = {
  q?: string;
  phase?: string;
  tag?: string;
  from?: string;
  to?: string;
  page?: string;
};

const PHASES: FrameworkPhase[] = ["foundation", "framing", "finishing"];

function isPhase(value: string | undefined): value is FrameworkPhase {
  return value === "foundation" || value === "framing" || value === "finishing";
}

function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(n) || n < 1 || n > 1000) return 1;
  return n;
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

  const q = sanitizeFtsQuery(params.q);
  const phase = isPhase(params.phase) ? params.phase : null;
  const tag = sanitizeTag(params.tag);
  const from = isIsoDate(params.from) ? params.from : null;
  const to = isIsoDate(params.to) ? params.to : null;
  const page = parsePage(params.page);
  const offset = (page - 1) * PAGE_SIZE;

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

  // Filtered + paginated results. `range` is inclusive on both ends.
  let query = supabase
    .from("situations")
    .select("id, title, situation, framework_phase, tags, created_at", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (phase) query = query.eq("framework_phase", phase);
  if (tag) query = query.contains("tags", [tag]);
  if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59Z`);
  // Full-text search across title/situation/coaching (indexed via tsvector
  // in migration 0004). websearch_to_tsquery handles spaces, "phrases",
  // and -negation safely.
  if (q) query = query.textSearch("search_vector", q, { type: "websearch" });

  const { data, error, count: matchCount } = await query;
  const situations = (data ?? []) as Pick<
    Situation,
    "id" | "title" | "situation" | "framework_phase" | "tags" | "created_at"
  >[];

  const hasFilter = !!(q || phase || tag || from || to);
  const totalMatching = matchCount ?? situations.length;
  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  // Build a base query string for prev/next links so existing filters
  // ride along.
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (phase) baseParams.set("phase", phase);
  if (tag) baseParams.set("tag", tag);
  if (from) baseParams.set("from", from);
  if (to) baseParams.set("to", to);
  const pageLink = (n: number) => {
    const p = new URLSearchParams(baseParams);
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return `/app/library${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="px-3 pb-8 pt-4">
      <div className="px-1">
        <p className="type-cap text-graphite">
          {counts.all} SITUATION{counts.all === 1 ? "" : "S"} ·{" "}
          {hasFilter
            ? `${totalMatching} MATCHING`
            : `${totalSituationsWeeks(situations)} WEEK${
                totalSituationsWeeks(situations) === 1 ? "" : "S"
              }`}
        </p>
        <h1 className="type-h1 mt-2 text-ink">Library</h1>
      </div>

      <div className="mt-4">
        <LibraryControls
          initialQuery={q}
          activePhase={phase}
          activeTag={tag || null}
          activeFrom={from}
          activeTo={to}
          counts={counts}
          topTags={topTags}
        />
      </div>

      {error ? (
        <div className="mt-6 rounded-md border border-rust bg-rust-wash p-4">
          <p className="type-label text-rust">Something broke while searching.</p>
          <p className="type-caption mt-1 text-ink2">
            Try clearing the filters above and searching again.
          </p>
        </div>
      ) : situations.length > 0 ? (
        <>
          <div className="mt-4">
            {situations.map((s, i) => (
              <SituationRow
                key={s.id}
                s={s}
                isFirst={i === 0}
                highlight={q}
              />
            ))}
          </div>
          {totalPages > 1 ? (
            <nav className="mt-6 flex items-center justify-between px-1">
              {page > 1 ? (
                <Link
                  href={pageLink(page - 1)}
                  className="type-label text-graphite hover:text-ink"
                >
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              <span className="type-caption text-graphite">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageLink(page + 1)}
                  className="type-label text-graphite hover:text-ink"
                >
                  Older →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      ) : (
        <div className="mt-12 px-1 text-center">
          <p className="type-h2 text-ink">
            {hasFilter
              ? "Nothing matches that filter."
              : "Nothing here yet."}
          </p>
          <p className="type-body mt-2 text-graphite">
            {hasFilter
              ? "Try a different search, or clear the filters above."
              : "Finish a check-in and it'll show up here automatically."}
          </p>
        </div>
      )}
    </div>
  );
}

function totalSituationsWeeks(
  situations: { created_at: string }[],
): number {
  const oldest = situations[situations.length - 1];
  if (!oldest) return 1;
  return Math.max(
    1,
    Math.ceil(
      (Date.now() - new Date(oldest.created_at).getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    ),
  );
}

function SituationRow({
  s,
  isFirst,
  highlight,
}: {
  s: Pick<
    Situation,
    "id" | "title" | "situation" | "framework_phase" | "tags" | "created_at"
  >;
  isFirst: boolean;
  highlight: string;
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
        <p className="type-label text-ink">
          <Highlighted text={s.title} highlight={highlight} />
        </p>
        <p className="type-body-sm mt-1 line-clamp-2 text-graphite">
          <Highlighted text={s.situation} highlight={highlight} />
        </p>
      </div>
    </Link>
  );
}

// Wraps occurrences of each query word (whole word, case-insensitive) in
// a <mark> for cheap match-highlights. Falls back to plain text if no
// query. Defensive: the query has already been sanitized via
// sanitizeFtsQuery so it's safe to feed into a regex character class.
function Highlighted({
  text,
  highlight,
}: {
  text: string;
  highlight: string;
}) {
  if (!highlight) return <>{text}</>;
  // Pull out word-shaped tokens; ignore quotes/negation flags meant for
  // the FTS engine, not for visual matching.
  const words = highlight
    .replace(/["-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return <>{text}</>;
  const escaped = words.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  // Capturing group with /g flag: split() interleaves the captured
  // matches at odd indices, so we mark by index parity instead of
  // re.test() — which has stateful lastIndex and would give wrong
  // results after split().
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-[2px] bg-oak-wash px-0.5 text-ink"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
