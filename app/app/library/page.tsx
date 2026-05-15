import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { FrameworkPhase, Situation } from "@/lib/database.types";
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

  const q = (params.q ?? "").trim();
  const phase = isPhase(params.phase) ? params.phase : null;
  const tag = (params.tag ?? "").trim();

  // Phase counts — independent of the active filter so the tabs always
  // show the user the shape of their library.
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

  // Tag list — surface the user's top tags as quick filters. Pull a recent
  // window of situations and aggregate client-side.
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
    .slice(0, 12)
    .map(([t]) => t);

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
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.or(
      `title.ilike.%${safe}%,situation.ilike.%${safe}%,coaching.ilike.%${safe}%`,
    );
  }

  const { data, error } = await query;
  const situations = (data ?? []) as Pick<
    Situation,
    "id" | "title" | "situation" | "framework_phase" | "tags" | "created_at"
  >[];

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Situation library</h1>
        <p className="mt-1 text-muted-foreground">
          Every check-in lives here. Pull it up when the same situation comes
          back.
        </p>
      </div>

      <LibraryControls
        initialQuery={q}
        activePhase={phase}
        activeTag={tag || null}
        counts={counts}
        topTags={topTags}
      />

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-base">
              Something broke while searching.
            </CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : situations.length > 0 ? (
        <div className="space-y-3">
          {situations.map((s) => (
            <Link key={s.id} href={`/app/library/${s.id}`}>
              <Card className="transition-colors hover:bg-secondary/40">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <span className="uppercase tracking-widest">
                      {s.framework_phase ?? "—"}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(s.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </CardDescription>
                  <CardTitle className="font-serif text-lg leading-snug">
                    {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {s.situation}
                  </p>
                  {s.tags && s.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {s.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              {q || phase || tag ? "Nothing matches that filter." : "Nothing here yet."}
            </CardTitle>
            <CardDescription>
              {q || phase || tag
                ? "Try a different search, or clear the filters above."
                : "Finish a check-in and it'll show up here automatically — title, tags, coaching, all of it."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
