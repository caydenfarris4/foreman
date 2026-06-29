// Motion language for Foreman.
//
// Every transition here is tuned to feel like construction: deliberate,
// weighted, settling into place — never bouncy or playful. A board going up,
// a wall filling in. Springs are slightly over-damped so things *arrive*
// rather than wobble. Durations stay calm (this is a moral / focus tool).
import type { Transition } from "motion/react";

// A board settling onto the frame: a touch of weight, no overshoot ring-out.
export const settle: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 30,
  mass: 0.9,
};

// Heavier element coming to rest (panels, the house lifting in).
export const settleHeavy: Transition = {
  type: "spring",
  stiffness: 160,
  damping: 28,
  mass: 1.1,
};

// A quick, crisp acknowledgement (a checkbox, a tap).
export const tap: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 32,
  mass: 0.6,
};

// Calm tween for opacity / color / measured reveals.
export const calm: Transition = {
  duration: 0.45,
  ease: [0.22, 0.61, 0.36, 1], // gentle ease-out, architectural
};

export const calmFast: Transition = {
  duration: 0.28,
  ease: [0.22, 0.61, 0.36, 1],
};

// A drawn line (blueprint stroke) revealing along its length.
export const draw: Transition = {
  duration: 0.9,
  ease: [0.65, 0, 0.35, 1],
};

// Stagger step between children in a list / wall of boards.
export const STAGGER_STEP = 0.06;
