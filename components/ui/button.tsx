import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-sans font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:bg-shell disabled:text-haze disabled:border-shell",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-[oklch(0.97_0.01_80)] border border-ink hover:bg-[oklch(0.26_0.02_55)] hover:border-[oklch(0.26_0.02_55)] active:bg-[oklch(0.22_0.02_55)]",
        secondary:
          "bg-chalk text-ink border border-ruleStrong hover:bg-paper2 active:bg-shell",
        ghost:
          "bg-transparent text-ink2 border border-transparent hover:bg-ruleSoft hover:text-ink active:bg-rule",
        danger:
          "bg-rust text-white border border-rust hover:bg-[oklch(0.48_0.13_30)] hover:border-[oklch(0.48_0.13_30)] active:bg-[oklch(0.42_0.13_30)]",
        // Clay — the Cornerstone action accent.
        oak:
          "bg-blueprint text-[oklch(0.98_0.01_80)] border border-blueprint hover:bg-blueprint-dim hover:border-blueprint-dim",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-11 px-4 text-[15px]",
        lg: "h-[52px] px-5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  full?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          full && "w-full",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export function Spinner({
  className,
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      className={cn("animate-spin-slow", className)}
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <path
        d="M7 1.5a5.5 5.5 0 015.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { Button, buttonVariants };
