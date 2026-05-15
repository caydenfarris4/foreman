import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-md border-[1.5px] border-rule bg-chalk px-4 text-[16px] text-ink placeholder:text-haze focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ruleSoft disabled:cursor-not-allowed disabled:bg-paper2 disabled:text-haze",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
