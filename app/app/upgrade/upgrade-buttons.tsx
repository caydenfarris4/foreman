"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/ui/button";

export function UpgradeButtons() {
  const [pending, setPending] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(plan: "monthly" | "yearly") {
    setPending(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not start checkout.");
        setPending(null);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Network problem — try again.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          full
          size="lg"
          variant="secondary"
          onClick={() => start("monthly")}
          disabled={pending !== null}
        >
          {pending === "monthly" ? (
            <>
              <Spinner /> Opening…
            </>
          ) : (
            "Choose monthly"
          )}
        </Button>
        <Button
          full
          size="lg"
          onClick={() => start("yearly")}
          disabled={pending !== null}
        >
          {pending === "yearly" ? (
            <>
              <Spinner /> Opening…
            </>
          ) : (
            "Choose yearly"
          )}
        </Button>
      </div>
      {error ? <p className="type-caption text-rust">{error}</p> : null}
      <p className="type-caption text-center text-graphite">
        Secure checkout via Stripe. Cancel any time.
      </p>
    </div>
  );
}
