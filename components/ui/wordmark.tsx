import { cn } from "@/lib/utils";

export function Wordmark({
  dark = false,
  className,
}: {
  dark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M2 2h10v3H5v7H2V2z"
          fill={dark ? "#B8843F" : "#1E3A5F"}
        />
      </svg>
      <span
        className={cn(
          "type-cap tracking-[0.12em]",
          dark ? "text-chalk" : "text-ink",
        )}
      >
        FOREMAN
      </span>
    </span>
  );
}
