"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { PhaseTag } from "@/components/ui/phase-tag";
import { cn } from "@/lib/utils";
import type { FrameworkPhase } from "@/lib/database.types";

interface Props {
  initialQuery: string;
  activePhase: FrameworkPhase | null;
  activeTag: string | null;
  counts: Record<FrameworkPhase | "all", number>;
  topTags: [string, number][];
}

export function LibraryControls({
  initialQuery,
  activePhase,
  activeTag,
  counts,
  topTags,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query === initialQuery) return;
      const next = new URLSearchParams(searchParams.toString());
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      startTransition(() => router.replace(`/app/library?${next.toString()}`));
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`/app/library?${next.toString()}`));
  }

  const hasFilter = !!activePhase || !!activeTag || !!query.trim();
  const phases: FrameworkPhase[] = ["foundation", "framing", "finishing"];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex h-11 items-center gap-2.5 rounded-md border border-rule bg-chalk px-3.5">
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-graphite"
        >
          <circle cx="9" cy="9" r="5" />
          <path d="M13 13l4 4" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search situations, your responses, the coaching…"
          className="type-body w-full flex-1 bg-transparent text-ink placeholder:text-haze focus:outline-none"
        />
      </div>

      {/* Type/tag filters (primary) */}
      {topTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="All"
            count={counts.all}
            active={!activeTag}
            onClick={() => setParam("tag", null)}
          />
          {topTags.map(([t, n]) => (
            <FilterChip
              key={t}
              label={t}
              count={n}
              active={activeTag === t}
              onClick={() => setParam("tag", activeTag === t ? null : t)}
            />
          ))}
        </div>
      ) : null}

      {/* Phase as secondary lens */}
      <div className="flex items-center gap-3 border-t border-rule pt-3">
        <span className="type-cap text-graphite">PHASE</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <PhaseFilter
            phase={null}
            label="all"
            count={counts.all}
            active={activePhase === null}
            onClick={() => setParam("phase", null)}
          />
          {phases.map((p) => (
            <PhaseFilter
              key={p}
              phase={p}
              count={counts[p]}
              active={activePhase === p}
              onClick={() => setParam("phase", activePhase === p ? null : p)}
            />
          ))}
        </div>
      </div>

      {hasFilter ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            startTransition(() => router.replace("/app/library"));
          }}
          className="type-caption text-graphite underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "type-label inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[12px] transition-colors",
        active
          ? "border-ink bg-ink text-chalk"
          : "border-rule bg-transparent text-ink2 hover:border-ruleStrong",
      )}
    >
      {label}
      <span
        className={cn(
          "type-spec text-[11px]",
          active ? "text-chalk/60" : "text-graphite",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function PhaseFilter({
  phase,
  label,
  count,
  active,
  onClick,
}: {
  phase: FrameworkPhase | null;
  label?: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 transition-colors",
        active ? "bg-paper2" : "",
      )}
    >
      {phase ? (
        <PhaseTag phase={phase} />
      ) : (
        <span className="type-cap text-ink2">{label}</span>
      )}
      <span className="type-spec text-[11px] text-graphite">{count}</span>
    </button>
  );
}
