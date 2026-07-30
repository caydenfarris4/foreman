"use client";

// "Add Foreman to your home screen" card. Shows the one-tap Chrome install
// when we hold a captured beforeinstallprompt, manual Share-sheet steps on
// iOS Safari, and nothing anywhere else (installed, dismissed, or browsers
// with no install path). Dismissal is remembered per device.
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button, Spinner } from "@/components/ui/button";
import { useInstallPrompt } from "./use-install-prompt";

const DISMISS_KEY = "foreman:install-card-dismissed";

export function InstallCard({ className }: { className?: string }) {
  const { mounted, canPrompt, ios, installed, promptInstall } =
    useInstallPrompt();
  const [dismissed, setDismissed] = useState(true); // assume hidden until read
  const [working, setWorking] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode — the card just reappears next visit.
    }
  }

  if (!mounted || dismissed) return null;

  if (installed) {
    return (
      <div className={cn("rounded-lg border border-moss bg-moss-wash p-4", className)}>
        <p className="type-cap text-moss">ON YOUR HOME SCREEN</p>
        <p className="type-body-sm mt-1 text-ink2">
          Foreman is installed — look for the icon and open it from there.
        </p>
      </div>
    );
  }

  if (!canPrompt && !ios) return null;

  return (
    <div className={cn("rounded-lg border border-rule bg-chalk p-5", className)}>
      <p className="type-cap text-graphite">TAKE FOREMAN WITH YOU</p>
      <p className="type-body-sm mt-2 text-ink2">
        Put Foreman on your home screen and it opens full-screen like an app —
        no store, no download, always the latest version.
      </p>

      {canPrompt ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="oak"
            size="md"
            disabled={working}
            onClick={async () => {
              setWorking(true);
              try {
                const accepted = await promptInstall();
                if (!accepted) setWorking(false);
              } catch {
                setWorking(false);
              }
            }}
          >
            {working ? <Spinner /> : null}
            Add to home screen
          </Button>
          <Button variant="ghost" size="md" onClick={dismiss}>
            Not now
          </Button>
        </div>
      ) : (
        <>
          <ol className="type-body-sm mt-3 list-decimal space-y-1.5 pl-5 text-ink">
            <li>
              Tap the <ShareIcon /> <strong>Share</strong> button in Safari.
            </li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </li>
          </ol>
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      className="inline -mt-0.5"
      aria-hidden="true"
    >
      <path
        d="M8 1v9M5 3.5 8 1l3 2.5M3 7v6.5h10V7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
