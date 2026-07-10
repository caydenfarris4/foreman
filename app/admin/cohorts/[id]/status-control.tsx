"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CohortStatus } from "@/lib/database.types";

const NEXT: Record<CohortStatus, CohortStatus[]> = {
  draft: ["open"],
  open: ["draft", "full", "in_progress"],
  full: ["open", "in_progress"],
  in_progress: ["completed"],
  completed: ["archived"],
  archived: [],
};

const LABELS: Record<CohortStatus, string> = {
  draft: "Draft",
  open: "Open for applications",
  full: "Full",
  in_progress: "In progress",
  completed: "Completed",
  archived: "Archived",
};

export function CohortStatusControl({
  cohortId,
  status,
}: {
  cohortId: string;
  status: CohortStatus;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const transitions = NEXT[status];

  async function change(next: CohortStatus) {
    if (
      !confirm(
        `Move cohort to "${LABELS[next]}"? This affects public visibility and participant access.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/cohorts/${cohortId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not change status.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <p className="type-cap text-graphite">CURRENT</p>
      <p className="type-h2 text-ink">{LABELS[status]}</p>
      {transitions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {transitions.map((t) => (
            <Button
              key={t}
              variant={t === "open" ? "primary" : "secondary"}
              size="sm"
              onClick={() => change(t)}
              disabled={pending}
            >
              → {LABELS[t]}
            </Button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="type-caption text-rust">{error}</p>
      ) : null}
    </div>
  );
}
