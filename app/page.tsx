import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { PhaseTag } from "@/components/ui/phase-tag";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-rule">
        <div className="container flex h-16 items-center justify-between">
          <Wordmark />
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="type-label text-graphite hover:text-ink"
            >
              Log in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="container max-w-3xl pb-12 pt-24">
        <p className="type-cap text-graphite">UNDER CONSTRUCTION</p>
        <h1 className="type-display mt-4 text-ink md:text-[44px] md:leading-[1.1]">
          Coaching for first-time managers — five minutes a day.
        </h1>
        <p className="type-body-lg mt-6 max-w-2xl text-ink2">
          Foreman is a daily coaching companion built on a simple idea:
          leaders aren&apos;t born, they&apos;re framed. One question a day. Real
          coaching back. A library of the situations you&apos;ve already lived
          through.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Start 14-day free trial
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/login">I have an account</Link>
          </Button>
        </div>
        <p className="type-caption mt-4 text-graphite">
          No credit card. Pauses on your sabbath day. Cancel anytime.
        </p>
      </section>

      <section className="container max-w-4xl pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              phase: "foundation" as const,
              body: "Self-leadership, principles, character. Who you are when no one's watching.",
            },
            {
              phase: "framing" as const,
              body: "The team and the structure. Expectations, 1:1s, accountability, communication.",
            },
            {
              phase: "finishing" as const,
              body: "Refinement, culture, legacy. The mark you leave on the people who'll be here after you.",
            },
          ].map((stage) => (
            <div
              key={stage.phase}
              className="rounded-lg border border-rule bg-chalk p-5"
            >
              <PhaseTag phase={stage.phase} />
              <p className="type-body mt-3 text-ink2">{stage.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="container flex h-14 items-center justify-between">
          <Wordmark />
          <span className="type-caption text-graphite">
            Built from the job site, not the penthouse.
          </span>
        </div>
      </footer>
    </main>
  );
}

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10h11M11 5l5 5-5 5" />
    </svg>
  );
}
