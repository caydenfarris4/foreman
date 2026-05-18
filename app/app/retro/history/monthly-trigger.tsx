"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";

export function MonthlyTrigger({ monthStart }: { monthStart: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/retro/monthly", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month_start: monthStart }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not generate synthesis.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="type-body-sm text-graphite">
        Four or more completed retros — ready for a monthly synthesis
        across the weeks.
      </p>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={generate}
          disabled={pending}
        >
          {pending ? (
            <>
              <Spinner /> Synthesizing
            </>
          ) : (
            "Generate synthesis"
          )}
        </Button>
        {error ? (
          <span className="type-caption text-rust">{error}</span>
        ) : null}
      </div>
    </div>
  );
}
