import { cn } from "@/lib/utils";
import type { FrameworkPhase } from "@/lib/database.types";

const PHASE_COLOR: Record<FrameworkPhase, string> = {
  foundation: "bg-foundation",
  framing: "bg-framing",
  finishing: "bg-finishing",
};

export function PhaseTag({
  phase,
  className,
}: {
  phase: FrameworkPhase | null;
  className?: string;
}) {
  if (!phase) {
    return (
      <span
        className={cn(
          "type-cap inline-flex items-center gap-1.5 text-graphite",
          className,
        )}
      >
        <span className="h-2 w-2 rounded-[1px] bg-shell" />
        unknown
      </span>
    );
  }
  return (
    <span
      className={cn(
        "type-cap inline-flex items-center gap-1.5 text-ink2",
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-[1px]", PHASE_COLOR[phase])} />
      {phase}
    </span>
  );
}
