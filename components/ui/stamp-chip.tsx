"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StampChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  sub?: string;
  selected?: boolean;
  centered?: boolean;
}

export const StampChip = React.forwardRef<HTMLButtonElement, StampChipProps>(
  ({ label, sub, selected, centered, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex flex-col gap-0.5 rounded-md border-[1.5px] px-3.5 py-3 text-left transition-colors",
        selected
          ? "border-ink bg-ink text-chalk"
          : "border-rule bg-chalk text-ink hover:border-ruleStrong",
        centered && "items-center text-center",
        className,
      )}
      {...props}
    >
      <span className="type-label">{label}</span>
      {sub ? (
        <span
          className={cn(
            "type-caption",
            selected ? "text-chalk/60" : "text-graphite",
          )}
        >
          {sub}
        </span>
      ) : null}
    </button>
  ),
);
StampChip.displayName = "StampChip";
