"use client";

// App-wide motion config. `reducedMotion="user"` makes Motion automatically
// strip transforms/opacity animations for anyone with prefers-reduced-motion
// set at the OS level — our accessibility contract. Components don't have to
// branch; Motion honors it for them.
import { MotionConfig } from "motion/react";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.4 }}>
      {children}
    </MotionConfig>
  );
}
