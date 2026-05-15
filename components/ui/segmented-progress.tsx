import { cn } from "@/lib/utils";

export function SegmentedProgress({
  current,
  total,
  label,
  className,
}: {
  current: number;
  total: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => {
          const state =
            i < current - 1 ? "done" : i === current - 1 ? "active" : "pending";
          return (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-[2px]",
                state === "done" && "bg-ink",
                state === "active" && "bg-blueprint",
                state === "pending" && "bg-shell",
              )}
            />
          );
        })}
      </div>
      {label ? (
        <div className="type-cap mt-2 text-graphite">{label}</div>
      ) : null}
    </div>
  );
}
