import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { PhaseTag } from "@/components/ui/phase-tag";
import { PRICING } from "@/lib/stripe";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-rule">
        <div className="container flex h-16 items-center justify-between">
          <Wordmark />
          <nav className="flex items-center gap-4">
            <Link
              href="#how"
              className="type-label hidden text-graphite hover:text-ink md:inline"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              className="type-label hidden text-graphite hover:text-ink md:inline"
            >
              Pricing
            </Link>
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

      <section className="container pb-16 pt-20 md:pb-24 md:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="type-cap text-graphite">UNDER CONSTRUCTION</p>
            <h1 className="type-display mt-4 text-ink md:text-[52px] md:leading-[1.05]">
              Coaching for first-time managers —{" "}
              <span className="text-blueprint">five minutes a day</span>.
            </h1>
            <p className="type-body-lg mt-6 max-w-xl text-ink2">
              Foreman is a daily coaching companion built on a simple idea:
              leaders aren&apos;t born, they&apos;re framed. One question a
              day. Real coaching back. A library of the situations
              you&apos;ve already lived through.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start 14-day free trial
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
            <p className="type-caption mt-4 text-graphite">
              No credit card. Pauses on your sabbath day. Cancel anytime.
            </p>
          </div>
          <CheckInPreview />
        </div>
      </section>

      <section className="container pb-20">
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

      <section id="how" className="border-y border-rule bg-paper2">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="type-cap text-graphite">HOW IT WORKS</p>
            <h2 className="type-h1 mt-3 text-ink md:text-[36px]">
              A daily habit, not another tool to manage.
            </h2>
            <p className="type-body-lg mt-4 text-ink2">
              Open the email. Answer the prompt. Get coaching back in the
              foreman&apos;s voice. The library and the weekly report
              build themselves.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="rounded-lg border border-rule bg-chalk p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="type-cap flex h-8 w-8 items-center justify-center rounded-full border border-ruleStrong text-graphite">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="type-h2 text-ink">{step.title}</h3>
                </div>
                <p className="type-body-sm mt-4 text-ink2">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="container py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="type-cap text-graphite">PRICING</p>
          <h2 className="type-h1 mt-3 text-ink md:text-[36px]">
            One product. Pick the price that fits your year.
          </h2>
          <p className="type-body-lg mt-4 text-ink2">
            Fourteen days free. No card required to start. Cancel anytime
            from your billing portal.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          <PlanCard
            eyebrow="MONTHLY"
            price={PRICING.monthly.display}
            suffix={PRICING.monthly.suffix}
            body="Pay as you go. Cancel any time."
          />
          <PlanCard
            eyebrow="YEARLY"
            price={PRICING.yearly.display}
            suffix={PRICING.yearly.suffix}
            body="Two months free. The price of finishing what you started."
            savings={PRICING.yearly.savings}
            highlighted
          />
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Start 14-day free trial
              <ArrowRight />
            </Link>
          </Button>
          <p className="type-caption text-graphite">
            You won&apos;t be charged until the trial ends. Pick a plan
            anytime during the trial.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-lg border border-rule bg-chalk p-6">
          <p className="type-cap text-graphite">WHAT YOU&apos;RE PAYING FOR</p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {INCLUDED.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckIcon />
                <span className="type-body-sm text-ink2">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-rule bg-paper2">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <Wordmark />
          <span className="type-caption text-graphite">
            Built from the job site, not the penthouse.
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="type-label text-graphite hover:text-ink"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="type-label text-graphite hover:text-ink"
            >
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

const STEPS = [
  {
    title: "Frame your blueprint",
    body: "Two-minute onboarding. Tell us your phase, your role, and the day you take off. Your sabbath pauses the whole thing.",
  },
  {
    title: "Answer one prompt",
    body: "Each morning, one short prompt grounded in foundation, framing, or finishing. Answer in your own words. Five minutes, tops.",
  },
  {
    title: "Get real coaching back",
    body: "Claude responds in the foreman's voice — under 250 words, specific to what you wrote, no fluff. Saved to your library.",
  },
  {
    title: "Read your weekly site report",
    body: "Sundays, a synthesis across the week. The pattern you didn't see. The thing worth carrying into Monday.",
  },
];

const INCLUDED = [
  "A daily prompt grounded in the Under Construction framework",
  "Real coaching back, under 250 words, in the foreman's voice",
  "A searchable library of every situation you've worked through",
  "A weekly site report that names the pattern across the week",
  "A sabbath day that pauses the whole thing — no streaks, no shame",
  "Email delivery and a quiet web app. No notifications.",
];

function CheckInPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-3 -z-10 rounded-2xl bg-blueprint-wash/60 md:-inset-5" />
      <div className="rounded-xl border border-rule bg-chalk p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between">
          <PhaseTag phase="framing" />
          <span className="type-cap text-graphite">TUE · WK 6</span>
        </div>
        <p className="type-cap mt-6 text-graphite">TODAY&apos;S PROMPT</p>
        <p className="type-prompt mt-2 text-ink">
          One person on your team has been quietly checked-out for two
          weeks. What do you actually know — and what are you assuming?
        </p>
        <div className="mt-5 h-px bg-rule" />
        <p className="type-cap mt-5 text-graphite">THE FOREMAN SAYS</p>
        <p className="type-body mt-2 text-ink2">
          Two weeks is long enough to stop calling it a blip. Before the
          1:1, write down the three behaviors you&apos;ve actually
          watched — not the story you&apos;ve built around them. Bring
          curiosity, not a verdict.{" "}
          <span className="text-haze">A foreman asks before they
          frame.</span>
        </p>
        <div className="mt-5 flex items-center justify-between">
          <span className="type-cap text-oak-dim">SAVED TO LIBRARY</span>
          <span className="type-caption text-graphite">
            Day 38 · 12 situations
          </span>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  eyebrow,
  price,
  suffix,
  body,
  savings,
  highlighted,
}: {
  eyebrow: string;
  price: string;
  suffix: string;
  body: string;
  savings?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "rounded-lg border-[1.5px] border-oak bg-oak-wash p-6"
          : "rounded-lg border border-rule bg-chalk p-6"
      }
    >
      <div className="flex items-baseline justify-between">
        <p className="type-cap text-graphite">{eyebrow}</p>
        {savings ? (
          <span className="type-cap text-oak-dim">{savings}</span>
        ) : null}
      </div>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="type-h1 text-ink">{price}</span>
        <span className="type-body text-graphite">{suffix}</span>
      </p>
      <p className="type-body-sm mt-3 text-ink2">{body}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-oak-dim"
    >
      <path d="M4 10l4 4 8-8" />
    </svg>
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
