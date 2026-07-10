"use client";

import { useState, useTransition } from "react";
import { Button, Spinner } from "@/components/ui/button";

export function CheckoutButton({ cohortId }: { cohortId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/cohorts/${cohortId}/checkout`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not open checkout.");
        return;
      }
      window.location.assign(json.url);
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={start} disabled={pending} size="lg">
        {pending ? (
          <>
            <Spinner /> Opening Stripe
          </>
        ) : (
          "Pay & enroll"
        )}
      </Button>
      {error ? (
        <p className="type-caption text-rust">{error}</p>
      ) : null}
    </div>
  );
}
