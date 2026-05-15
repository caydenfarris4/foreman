"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { FrameworkPhase } from "@/lib/database.types";

interface Props {
  initialQuery: string;
  activePhase: FrameworkPhase | null;
  activeTag: string | null;
  counts: Record<FrameworkPhase | "all", number>;
  topTags: string[];
}

const PHASE_TABS: { value: FrameworkPhase | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "foundation", label: "Foundation" },
  { value: "framing", label: "Framing" },
  { value: "finishing", label: "Finishing" },
];

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

  // Debounce text search so each keystroke doesn't re-query.
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
    startTransition(() =>
      router.replace(`/app/library?${next.toString()}`),
    );
  }

  const hasActiveFilter = !!activePhase || !!activeTag || !!query.trim();

  return (
    <div className="space-y-3">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search situations, your responses, the coaching…"
      />

      <div className="flex flex-wrap items-center gap-2">
        {PHASE_TABS.map((tab) => {
          const isActive =
            tab.value === "all" ? activePhase === null : activePhase === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() =>
                setParam("phase", tab.value === "all" ? null : tab.value)
              }
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-secondary"
              }`}
            >
              {tab.label}{" "}
              <span className="ml-1 tabular-nums opacity-70">
                {counts[tab.value]}
              </span>
            </button>
          );
        })}
      </div>

      {topTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Tags
          </span>
          {topTags.map((t) => {
            const isActive = activeTag === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setParam("tag", isActive ? null : t)}
                className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-secondary"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      ) : null}

      {hasActiveFilter ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            startTransition(() => router.replace("/app/library"));
          }}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
