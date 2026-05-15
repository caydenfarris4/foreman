import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border type-cap",
  {
    variants: {
      variant: {
        neutral: "bg-paper2 text-ink2 border-rule",
        blueprint: "bg-blueprint-wash text-blueprint border-transparent",
        oak: "bg-oak-wash text-oak-dim border-transparent",
        moss: "bg-moss-wash text-moss border-transparent",
        rust: "bg-rust-wash text-rust border-transparent",
        amber: "bg-amber-wash text-amber border-transparent",
        outline: "bg-transparent text-ink2 border-ruleStrong",
        inverse:
          "bg-transparent text-white/70 border-white/20",
      },
      size: {
        sm: "h-5 px-2 text-[10px]",
        md: "h-6 px-2.5 text-[11px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { badgeVariants };
