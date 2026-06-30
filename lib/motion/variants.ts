// Reusable Motion variants, named for the construction metaphor.
//
// Each one has a reason tied to building: content "rises" into place like a
// board lifted onto the frame; lists raise board-by-board; blueprint strokes
// draw themselves. Components import these so the motion language stays
// consistent across the app.
import type { Variants } from "motion/react";
import { settle, settleHeavy, calm, draw, STAGGER_STEP } from "./transitions";

// A board lifted onto the frame: rises from slightly below + fades in.
export const boardUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: settle },
};

// Heavier panel / hero rising into place.
export const panelRise: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: settleHeavy },
};

// Plain measured fade (captions, helper text).
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: calm },
};

// Container that raises its children one board at a time.
export const wall: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER_STEP, delayChildren: 0.04 },
  },
};

// A blueprint stroke drawing itself along its length. Pair with
// strokeDasharray/strokeDashoffset or SVG pathLength.
export const blueprintStroke: Variants = {
  hidden: { pathLength: 0, opacity: 0.4 },
  show: { pathLength: 1, opacity: 1, transition: draw },
};
