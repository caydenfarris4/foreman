"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ApplicationActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function decide(decision: "accept" | "reject") {
    const verb = decision === "accept" ? "Accept" : "Reject";
    if (!confirm(`${verb} this application?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save decision.");
        return;
      }
      router.refresh();
    });
  }

  if (status !== "applied") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => decide("accept")} disabled={pending}>
        Accept
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-rust hover:text-rust"
        onClick={() => decide("reject")}
        disabled={pending}
      >
        Reject
      </Button>
      {error ? (
        <span className="type-caption text-rust">{error}</span>
      ) : null}
    </div>
  );
}
