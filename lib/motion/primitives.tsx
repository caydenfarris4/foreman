"use client";

// Small, reusable motion components so screens stay declarative and the
// metaphor stays consistent. All of these no-op gracefully under
// prefers-reduced-motion (handled by MotionConfig in the provider).
import { motion, type HTMLMotionProps } from "motion/react";
import { boardUp, panelRise, fade, wall } from "./variants";
import { cn } from "@/lib/utils";

type DivProps = HTMLMotionProps<"div"> & { className?: string };

const VARIANT = { boardUp, panelRise, fade } as const;
type RevealKind = keyof typeof VARIANT;

/**
 * Reveal — rises its content into place once, when scrolled into view.
 * `as` picks the construction-flavored variant (a board going up vs. a heavier
 * panel settling). `once` keeps it from re-triggering on scroll-back.
 */
export function Reveal({
  children,
  as = "boardUp",
  className,
  amount = 0.3,
  ...rest
}: DivProps & { as?: RevealKind; amount?: number }) {
  return (
    <motion.div
      variants={VARIANT[as]}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger — a container that raises its children one board at a time. Wrap each
 * child in <StaggerItem>.
 */
export function Stagger({ children, className, amount = 0.2, ...rest }: DivProps & { amount?: number }) {
  return (
    <motion.div
      variants={wall}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: DivProps) {
  return (
    <motion.div variants={boardUp} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

/**
 * Pressable — a calm tactile press for tappable surfaces. Subtle on purpose.
 */
export function Pressable({ children, className, ...rest }: DivProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 520, damping: 32 }}
      className={cn("touch-manipulation", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
