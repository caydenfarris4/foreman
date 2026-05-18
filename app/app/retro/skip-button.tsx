"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SkipWeekButton({
  weekStart,
  isSkipped,
}: {
  weekStart: string;
  isSkipped: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!isSkipped) {
      if (
        !confirm(
          "Skip this week? No retro will be written. You can change your mind from this page.",
        )
      ) {
        return;
      }
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/retro/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ week_start: weekStart, skipped: !isSkipped }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not update.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="type-label text-graphite underline-offset-2 hover:text-ink hover:underline"
      >
        {isSkipped ? "Un-skip this week" : "Skip this week"}
      </button>
      {error ? (
        <span className="type-caption text-rust">{error}</span>
      ) : null}
    </div>
  );
}
