import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[140px] w-full rounded-md border-[1.5px] border-rule bg-chalk px-4 py-3 text-[16px] leading-[1.55] text-ink placeholder:text-haze focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ruleSoft disabled:cursor-not-allowed disabled:bg-paper2 disabled:text-haze",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
