"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { Wordmark } from "@/components/ui/wordmark";
import { cn } from "@/lib/utils";
import { settle } from "@/lib/motion";

interface AppShellProps {
  initials: string;
  signOut: () => Promise<void>;
  trialBanner: { daysLeft: number } | null;
  children: React.ReactNode;
}

// Cornerstone nav: Home · Journal · Coach · Plan · You. Simple 1.5px line
// icons, quiet until active (clay).
const ICON = {
  width: 22,
  height: 22,
  viewBox: "0 0 22 22",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

const TABS = [
  {
    id: "home",
    label: "Home",
    href: "/app",
    icon: (
      <svg {...ICON}>
        <path d="M4 10.5L11 4l7 6.5" />
        <path d="M6 9.5V18h10V9.5" />
      </svg>
    ),
  },
  {
    id: "journal",
    label: "Journal",
    href: "/app/journal",
    icon: (
      <svg {...ICON}>
        <rect x="5" y="4" width="12" height="14" rx="2" />
        <path d="M8.5 9h5M8.5 12.5h5" />
      </svg>
    ),
  },
  {
    id: "coach",
    label: "Coach",
    href: "/app/checkin",
    icon: (
      <svg {...ICON}>
        <circle cx="11" cy="11" r="7.5" />
        <path d="M8 11.2l2 2 4-4.2" />
      </svg>
    ),
  },
  {
    id: "plan",
    label: "Plan",
    href: "/app/plan",
    icon: (
      <svg {...ICON}>
        <rect x="4" y="4" width="14" height="14" rx="2" />
        <path d="M4 9h14M9 9v9" />
      </svg>
    ),
  },
  {
    id: "you",
    label: "You",
    href: "/app/you",
    icon: (
      <svg {...ICON}>
        <circle cx="11" cy="8" r="3.5" />
        <path d="M4.5 18.5c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
      </svg>
    ),
  },
];

export function AppShell({
  initials,
  signOut,
  trialBanner,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTab =
    pathname === "/app"
      ? "home"
      : pathname.startsWith("/app/journal")
        ? "journal"
        : pathname.startsWith("/app/checkin")
          ? "coach"
          : pathname.startsWith("/app/plan") ||
              pathname.startsWith("/app/inspection")
            ? "plan"
            : pathname.startsWith("/app/you") ||
                pathname.startsWith("/app/settings") ||
                pathname.startsWith("/app/library") ||
                pathname.startsWith("/app/retro")
              ? "you"
              : "home";

  return (
    <div className="min-h-screen bg-paper pb-28">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur">
        <div className="container flex h-14 max-w-2xl items-center justify-between">
          <Link href="/app" aria-label="Foreman home">
            <Wordmark />
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="type-cap flex h-8 w-8 items-center justify-center rounded-full bg-ink text-chalk"
              aria-label="Account menu"
            >
              {initials}
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-md border border-rule bg-chalk shadow-lg"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <Link
                  href="/app/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-[14px] text-ink2 hover:bg-paper2"
                >
                  Settings
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="block w-full px-4 py-2.5 text-left text-[14px] text-ink2 hover:bg-paper2"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {trialBanner ? (
        <div className="border-b border-rule bg-oak-wash">
          <div className="container flex max-w-2xl items-center justify-between gap-3 py-2.5">
            <p className="type-caption text-ink2">
              <span className="type-cap mr-2 text-oak-dim">
                TRIAL · {trialBanner.daysLeft} DAY
                {trialBanner.daysLeft === 1 ? "" : "S"} LEFT
              </span>
              Lock in your plan before the site goes dark.
            </p>
            <Link
              href="/app/upgrade"
              className="type-label whitespace-nowrap text-oak-dim underline underline-offset-2 hover:text-ink"
            >
              Pick a plan
            </Link>
          </div>
        </div>
      ) : null}

      <main className="container max-w-2xl">
        {/* Subtle rise-in on each navigation — a board set into place. */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-paper to-transparent pb-6 pt-10"
      >
        <div className="container max-w-2xl">
          <div className="mx-4 grid grid-cols-5 gap-0.5 rounded-[18px] border border-rule bg-chalk p-1.5 shadow-liftStrong">
            {TABS.map((t) => {
              const isActive = t.id === activeTab;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 rounded-[12px] py-2 transition-colors",
                    isActive ? "text-blueprint" : "text-graphite hover:text-ink2",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="tab-pill"
                      transition={settle}
                      className="absolute inset-0 rounded-[12px] bg-blueprint-wash"
                    />
                  ) : null}
                  <span className="relative z-10 flex flex-col items-center gap-0.5">
                    {t.icon}
                    <span
                      className="text-[10px] font-semibold tracking-wide"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {t.label}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
