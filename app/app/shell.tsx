"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import { cn } from "@/lib/utils";

interface AppShellProps {
  initials: string;
  signOut: () => Promise<void>;
  trialBanner: { daysLeft: number } | null;
  children: React.ReactNode;
}

const TABS = [
  {
    id: "today",
    label: "Today",
    href: "/app",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="M5 3h12v16l-6-3-6 3V3z" />
      </svg>
    ),
  },
  {
    id: "plan",
    label: "Plan",
    href: "/app/plan",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="M11 3l8 15H3l8-15z" />
        <path d="M7.5 11h7M9.2 7.5h3.6" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    href: "/app/library",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="16" height="4" rx="1" />
        <path d="M4 8v10h14V8M9 12h4" />
      </svg>
    ),
  },
  {
    id: "retro",
    label: "Retro",
    href: "/app/retro",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="16" height="14" rx="1.5" />
        <path d="M3 9h16M7 3v4M15 3v4" />
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
      ? "today"
      : pathname.startsWith("/app/plan")
        ? "plan"
        : pathname.startsWith("/app/library")
          ? "library"
          : pathname.startsWith("/app/retro")
            ? "retro"
            : pathname.startsWith("/app/settings")
              ? "settings"
              : "today";

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

      <main className="container max-w-2xl">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-paper to-transparent pb-6 pt-10"
      >
        <div className="container max-w-2xl">
          <div className="mx-4 grid grid-cols-4 gap-1 rounded-[14px] border border-rule bg-chalk p-1.5 shadow-[0_12px_32px_rgba(26,24,22,0.10)]">
            {TABS.map((t) => {
              const isActive = t.id === activeTab;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-[9px] py-2 transition-colors",
                    isActive ? "bg-paper2 text-ink" : "text-graphite",
                  )}
                >
                  {t.icon}
                  <span className="type-cap" style={{ fontSize: 10 }}>
                    {t.label}
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
