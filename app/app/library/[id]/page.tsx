import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PhaseTag } from "@/components/ui/phase-tag";
import { createClient } from "@/lib/supabase/server";
import type { Situation } from "@/lib/database.types";

function BackIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 10H4M9 5L4 10l5 5" />
    </svg>
  );
}

function ForemanBadge() {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-[3px] bg-oak"
        aria-hidden
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1h6v2H3v6H1V1z" fill="#1A1816" />
        </svg>
      </span>
      <span className="type-cap text-oak">FOREMAN</span>
    </div>
  );
}

export default async function SituationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("situations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const situation = data as Situation | null;
  if (!situation) notFound();

  // Originating prompt.
  let promptText: string | null = null;
  if (situation.source_checkin_id) {
    const { data: checkin } = await supabase
      .from("daily_checkins")
      .select("prompt_text")
      .eq("id", situation.source_checkin_id)
      .maybeSingle();
    promptText = (checkin as { prompt_text: string } | null)?.prompt_text ?? null;
  }

  // Related.
  let related: Pick<Situation, "id" | "title" | "framework_phase" | "created_at">[] = [];
  if (situation.tags && situation.tags.length > 0) {
    const { data: r } = await supabase
      .from("situations")
      .select("id, title, framework_phase, created_at")
      .eq("user_id", user.id)
      .neq("id", situation.id)
      .overlaps("tags", situation.tags)
      .order("created_at", { ascending: false })
      .limit(4);
    related = (r ?? []) as typeof related;
  }
  if (related.length === 0 && situation.framework_phase) {
    const { data: r } = await supabase
      .from("situations")
      .select("id, title, framework_phase, created_at")
      .eq("user_id", user.id)
      .neq("id", situation.id)
      .eq("framework_phase", situation.framework_phase)
      .order("created_at", { ascending: false })
      .limit(4);
    related = (r ?? []) as typeof related;
  }

  const filed = new Date(situation.created_at);
  const filedLabel = filed
    .toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return (
    <div className="px-3 pb-8 pt-2">
      <Link
        href="/app/library"
        className="type-cap inline-flex items-center gap-2 px-1 py-3 text-graphite hover:text-ink"
      >
        <BackIcon /> LIBRARY
      </Link>

      {/* Metadata strip — like a job ticket */}
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-rule bg-chalk p-4">
        <span className="type-cap text-graphite">FILED</span>
        <span className="type-spec text-ink2">{filedLabel}</span>
        <span className="type-cap text-graphite">PHASE</span>
        <span>
          {situation.framework_phase ? (
            <Link
              href={`/app/library?phase=${situation.framework_phase}`}
              className="inline-block hover:opacity-80"
            >
              <PhaseTag phase={situation.framework_phase} />
            </Link>
          ) : (
            <PhaseTag phase={null} />
          )}
        </span>
        {situation.tags && situation.tags.length > 0 ? (
          <>
            <span className="type-cap text-graphite">TAGS</span>
            <span className="flex flex-wrap gap-1.5">
              {situation.tags.map((t) => (
                <Link
                  key={t}
                  href={`/app/library?tag=${encodeURIComponent(t)}`}
                  className="inline-block"
                >
                  <Badge variant="neutral" size="sm">
                    {t}
                  </Badge>
                </Link>
              ))}
            </span>
          </>
        ) : null}
      </div>

      <h1 className="type-h1 mt-5 px-1 text-ink">{situation.title}</h1>

      {promptText ? (
        <div className="mt-5 flex gap-3 px-1">
          <div className="w-[2px] shrink-0 rounded-[1px] bg-oak" />
          <p className="type-prompt text-[20px] text-ink2">{promptText}</p>
        </div>
      ) : null}

      <div className="mt-6 px-1">
        <p className="type-cap mb-2 text-graphite">YOU WROTE</p>
        <div className="type-body whitespace-pre-wrap text-ink2">
          {situation.situation}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-ink bg-ink p-5 text-chalk">
        <div className="mb-3">
          <ForemanBadge />
        </div>
        <div className="space-y-3">
          {situation.coaching.split(/\n\s*\n/).map((p, i) => (
            <p
              key={i}
              className="type-body-lg text-[15px] leading-[1.6] text-chalk"
            >
              {p}
            </p>
          ))}
        </div>
      </div>

      {related.length > 0 ? (
        <div className="mt-8 space-y-2 px-1">
          <p className="type-cap text-graphite">RELATED · {related.length}</p>
          <div className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/app/library/${r.id}`}
                className="block rounded-md border border-rule bg-chalk p-3 transition-colors hover:bg-paper2/40"
              >
                <div className="flex items-center gap-2">
                  <PhaseTag phase={r.framework_phase} />
                  <span className="type-spec text-graphite">·</span>
                  <span className="type-caption text-graphite">
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="type-label mt-1 text-ink">{r.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
