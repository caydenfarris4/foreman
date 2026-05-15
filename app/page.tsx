import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="container flex h-16 items-center justify-between">
        <span className="font-serif text-xl tracking-tight">Foreman</span>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Log in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">Start free</Link>
          </Button>
        </nav>
      </header>

      <section className="container max-w-3xl py-24">
        <p className="font-serif text-sm uppercase tracking-widest text-muted-foreground">
          Under Construction
        </p>
        <h1 className="mt-3 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
          Coaching for first-time managers — five minutes a day.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Foreman is a daily coaching companion built on a simple idea: leaders
          aren't born, they're framed. Foundation. Framing. Finishing.
          One question a day. Real coaching back. A library of the situations
          you've already lived through.
        </p>
        <div className="mt-10 flex items-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Start 14-day free trial</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/login">I have an account</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card. Pauses on your sabbath day. Cancel anytime.
        </p>
      </section>

      <section className="container max-w-4xl pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Foundation",
              body: "Self-leadership, principles, character. Who you are when no one's watching.",
            },
            {
              title: "Framing",
              body: "The team and the structure. Expectations, 1:1s, accountability, communication.",
            },
            {
              title: "Finishing",
              body: "Refinement, culture, legacy. The mark you leave on the people who'll be here after you.",
            },
          ].map((stage) => (
            <div
              key={stage.title}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              <h3 className="font-serif text-xl">{stage.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{stage.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="container flex h-14 items-center justify-between text-xs text-muted-foreground">
          <span>Foreman</span>
          <span>Built from the job site, not the penthouse.</span>
        </div>
      </footer>
    </main>
  );
}
