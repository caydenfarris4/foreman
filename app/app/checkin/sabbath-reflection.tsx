import Link from "next/link";

const DAY_LABEL: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

interface Props {
  dayLabel: string;
  prompt: string;
  name: string | null;
}

// The sabbath is a day set apart for reflection, faith, and growth — not a
// pause and not a managerial check-in. There is nothing to submit; the page is
// contemplative by design.
export function SabbathReflection({ dayLabel, prompt, name }: Props) {
  const day = DAY_LABEL[dayLabel] ?? dayLabel;
  return (
    <div className="space-y-5 px-3 pb-8 pt-6">
      <div className="px-1">
        <p className="type-cap text-oak-dim">SABBATH · {day.toUpperCase()}</p>
        <h1 className="type-h1 mt-2 text-ink">
          {name ? `${name}, a day set apart.` : "A day set apart."}
        </h1>
        <p className="type-body mt-3 text-graphite">
          No check-in today. This day is for reflection, faith, and growth. Step
          back from the build and sit with something larger than the work, the
          people you lead, and the purpose you are part of.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-rule bg-chalk p-6">
        <p className="type-cap text-graphite">SIT WITH THIS</p>
        <p className="type-prompt mt-3 text-[20px] leading-[1.4] text-ink">
          {prompt}
        </p>
      </div>

      <p className="type-body text-graphite">
        There is nothing to submit and nothing to finish. Let it breathe. Carry
        what it surfaces into the week, and into the people and purpose you are
        part of.
      </p>

      <div className="border-t border-rule pt-4">
        <Link
          href="/app"
          className="type-label text-graphite underline-offset-2 hover:text-ink hover:underline"
        >
          Back to today
        </Link>
      </div>
    </div>
  );
}
