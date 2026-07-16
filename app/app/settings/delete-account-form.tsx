"use client";

// Danger zone: permanent account deletion. Collapsed by default; expanding
// reveals what gets destroyed and requires typing DELETE (also enforced
// server-side in deleteAccount) before the button arms.
import { useState, useTransition } from "react";
import { Button, Spinner } from "@/components/ui/button";
import { deleteAccount } from "./actions";

export function DeleteAccountForm({
  hasActiveSubscription,
}: {
  hasActiveSubscription: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function destroy() {
    start(async () => {
      const res = await deleteAccount({ confirm });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Full navigation, not router.push: the session is gone and every
      // cached, personalized screen needs to go with it.
      window.location.assign("/");
    });
  }

  return (
    <div className="rounded-lg border border-rust/40 bg-chalk p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="type-cap text-rust">DANGER ZONE</p>
          <p className="type-body mt-2 text-graphite">
            Delete your account and everything in it, permanently.
          </p>
        </div>
        {!open ? (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-rule pt-4">
          <div className="type-body space-y-2 text-ink">
            <p>This erases your account immediately and forever:</p>
            <ul className="list-disc space-y-1 pl-5 text-graphite">
              <li>Profile and onboarding answers</li>
              <li>Every daily check-in and coaching response</li>
              <li>Situation library, notes, and journal</li>
              <li>Weekly retros and monthly syntheses</li>
              <li>Growth plans, goals, and inspections</li>
              <li>Cohort membership and session bookings</li>
            </ul>
            <p>
              {hasActiveSubscription
                ? "Your subscription is canceled immediately. Time already paid for is not refunded."
                : "Any past billing is closed out with our payment processor."}{" "}
              There is no undo and no grace period — export anything you want
              to keep from the Library first.
            </p>
          </div>

          <label className="block">
            <span className="type-cap text-graphite">
              Type DELETE to confirm
            </span>
            <input
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              autoComplete="off"
              spellCheck={false}
              className="type-body mt-1.5 w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-ink outline-none focus:border-rust"
            />
          </label>

          {error ? <p className="type-body text-rust">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="danger"
              size="md"
              disabled={confirm !== "DELETE" || pending}
              onClick={destroy}
            >
              {pending ? <Spinner /> : null}
              {pending ? "Deleting…" : "Permanently delete my account"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setConfirm("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
