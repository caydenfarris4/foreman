"use client";

// The 2D house — the mobile-safe baseline, always rendered (the 3D version,
// when it qualifies, fades in over this). A front elevation on a blueprint
// grid: every part begins as a dashed blueprint ghost and materializes as the
// `progress` motion value (0..1) climbs. We read a MotionValue (not a number
// prop) so the build can be driven per-frame — by the on-open construction
// animation and by scroll — without re-rendering this whole SVG each frame.
// "A task completing = a board going up."
import { motion, useTransform, type MotionValue } from "motion/react";

const INK = "#1A1816";
const BLUEPRINT = "#1E3A5F";
const OAK = "#B8843F";
const OAK_DIM = "#8E6529";
const PAPER2 = "#ECE6DA";
const AMBER = "#E8B04B";

export function House2D({
  progress,
  className,
}: {
  progress: MotionValue<number>;
  className?: string;
}) {
  // Each part's build fraction, derived from where overall sits in its window.
  const foundation = useTransform(progress, [0.12, 0.3], [0, 1], { clamp: true });
  const framing = useTransform(progress, [0.28, 0.52], [0, 1], { clamp: true });
  const walls = useTransform(progress, [0.45, 0.7], [0, 1], { clamp: true });
  const roof = useTransform(progress, [0.58, 0.8], [0, 1], { clamp: true });
  const openings = useTransform(progress, [0.74, 0.92], [0, 1], { clamp: true });
  const finish = useTransform(progress, [0.9, 1], [0, 1], { clamp: true });

  const ghost = useTransform(progress, [0, 0.7], [0.5, 0.1], { clamp: true });

  // Foundation slab spreads. Opacity snaps in fast so a half-poured slab reads
  // as wet concrete, not a translucent ghost.
  const foundW = useTransform(foundation, [0, 1], [120, 192]);
  const foundX = useTransform(foundation, [0, 1], [100, 64]);
  const foundOpacity = useTransform(foundation, [0, 0.35], [0, 1]);

  // Frame fades behind finished walls.
  const frameOpacity = useTransform([framing, walls], ([f, w]: number[]) =>
    f * (1 - 0.7 * w),
  );

  // Walls grow up from the foundation (height + y, no transform-origin needed).
  const wallH = useTransform(walls, [0, 1], [14, 96]);
  const wallY = useTransform(walls, [0, 1], [192, 110]);
  const wallOpacity = useTransform(walls, [0, 0.3], [0, 1]);

  // Roof drops onto the frame — and SEATS early (within 45% of its window) so
  // a resting mid-build state never shows a roof floating in mid-air. The drop
  // is an entrance, not a persistent pose.
  const roofY = useTransform(roof, [0, 0.45], [-24, 0]);
  const roofOpacity = useTransform(roof, [0, 0.3], [0, 1]);
  const chimneyY = useTransform(finish, [0, 0.5], [-10, 0]);

  // Windows go warm at finishing.
  const winFill = useTransform(finish, [0, 0.5, 1], ["#2C5478", "#2C5478", AMBER]);
  const winFillOpacity = useTransform(finish, [0, 1], [0.35, 0.85]);

  return (
    <svg
      viewBox="0 0 320 260"
      className={className}
      role="img"
      aria-label="Your house, building as your plan comes together"
    >
      <defs>
        <pattern id="h2d-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke={BLUEPRINT} strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
        <linearGradient id="h2d-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EEF3F8" />
          <stop offset="100%" stopColor="#E4ECF4" />
        </linearGradient>
        <radialGradient id="h2d-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.85" />
          <stop offset="100%" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="320" height="260" fill="url(#h2d-sky)" />
      <rect x="0" y="0" width="320" height="260" fill="url(#h2d-grid)" />

      {/* Lot line — always present. */}
      <line x1="22" y1="210" x2="298" y2="210" stroke={INK} strokeOpacity="0.45" strokeWidth="1.5" />
      <g stroke={BLUEPRINT} strokeOpacity="0.2" strokeWidth="1">
        <line x1="60" y1="214" x2="60" y2="220" />
        <line x1="260" y1="214" x2="260" y2="220" />
        <line x1="60" y1="217" x2="260" y2="217" strokeDasharray="3 4" />
      </g>

      {/* Blueprint ghost of the whole house — the plan, always faintly there. */}
      <motion.g
        stroke={BLUEPRINT}
        strokeWidth="1.4"
        strokeDasharray="4 5"
        fill="none"
        style={{ opacity: ghost }}
      >
        <path d="M70 110 H250 V206 H70 Z" />
        <path d="M60 112 L160 52 L260 112" />
        <rect x="150" y="158" width="28" height="48" />
        <rect x="92" y="132" width="34" height="30" />
        <rect x="196" y="132" width="34" height="30" />
      </motion.g>

      {/* Foundation slab */}
      <motion.rect y="204" height="12" rx="1" fill={INK} x={foundX} width={foundW} style={{ opacity: foundOpacity }} />

      {/* Framing — posts + top plate, recede behind the walls. */}
      <motion.g stroke={OAK_DIM} strokeWidth="3" strokeLinecap="round" style={{ opacity: frameOpacity }}>
        <line x1="74" y1="206" x2="74" y2="112" />
        <line x1="116" y1="206" x2="116" y2="112" />
        <line x1="160" y1="206" x2="160" y2="112" />
        <line x1="204" y1="206" x2="204" y2="112" />
        <line x1="246" y1="206" x2="246" y2="112" />
        <line x1="70" y1="112" x2="250" y2="112" />
      </motion.g>

      {/* Walls rise from the foundation. */}
      <motion.rect x="70" width="180" fill={PAPER2} stroke={INK} strokeWidth="2" y={wallY} height={wallH} style={{ opacity: wallOpacity }} />
      {/* Lap-siding lines */}
      <motion.g stroke={INK} strokeOpacity="0.1" strokeWidth="1" style={{ opacity: wallOpacity }}>
        <line x1="71" y1="130" x2="249" y2="130" />
        <line x1="71" y1="148" x2="249" y2="148" />
        <line x1="71" y1="166" x2="249" y2="166" />
        <line x1="71" y1="184" x2="249" y2="184" />
        <line x1="71" y1="202" x2="249" y2="202" />
      </motion.g>

      {/* Roof drops on. */}
      <motion.path d="M58 114 L160 50 L262 114 Z" fill={OAK} stroke={INK} strokeWidth="2" strokeLinejoin="round" style={{ opacity: roofOpacity, y: roofY }} />
      {/* Shingle courses */}
      <motion.g stroke={OAK_DIM} strokeWidth="1.2" strokeLinecap="round" style={{ opacity: roofOpacity, y: roofY }}>
        <line x1="112" y1="80" x2="208" y2="80" />
        <line x1="84" y1="98" x2="236" y2="98" />
      </motion.g>
      <motion.line x1="58" y1="114" x2="262" y2="114" stroke={INK} strokeWidth="2" style={{ opacity: roofOpacity }} />

      {/* Chimney */}
      <motion.rect x="206" y="62" width="16" height="34" fill={OAK_DIM} stroke={INK} strokeWidth="1.5" style={{ opacity: finish, y: chimneyY }} />

      {/* Door — frame, slab, raised panels, knob, stoop */}
      <motion.g style={{ opacity: openings }}>
        <rect x="147" y="155" width="34" height="51" fill={PAPER2} stroke={INK} strokeWidth="1.5" />
        <rect x="150" y="158" width="28" height="48" fill={OAK_DIM} stroke={INK} strokeWidth="1.5" />
        <rect x="154" y="162" width="20" height="17" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="1" />
        <rect x="154" y="183" width="20" height="19" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="1" />
        <circle cx="173" cy="183" r="1.8" fill={AMBER} />
        <rect x="144" y="206" width="40" height="5" fill={INK} opacity="0.85" />
      </motion.g>

      {/* Shrubs by the entry — appear at finishing. */}
      <motion.g style={{ opacity: finish }}>
        <circle cx="130" cy="203" r="7" fill="#4A6B3A" />
        <circle cx="137" cy="205" r="5" fill="#5A7B47" />
        <circle cx="196" cy="204" r="6" fill="#4A6B3A" />
      </motion.g>

      {/* Windows — warm "lights on" at finishing. */}
      {[
        { x: 92, y: 132 },
        { x: 196, y: 132 },
      ].map((w) => (
        <motion.g key={w.x} style={{ opacity: openings }}>
          <motion.ellipse cx={w.x + 17} cy={w.y + 15} rx="26" ry="22" fill="url(#h2d-glow)" style={{ opacity: finish }} />
          <motion.rect x={w.x} y={w.y} width="34" height="30" stroke={INK} strokeWidth="1.5" style={{ fill: winFill, fillOpacity: winFillOpacity }} />
          <line x1={w.x + 17} y1={w.y} x2={w.x + 17} y2={w.y + 30} stroke={INK} strokeWidth="1.2" />
          <line x1={w.x} y1={w.y + 15} x2={w.x + 34} y2={w.y + 15} stroke={INK} strokeWidth="1.2" />
        </motion.g>
      ))}
    </svg>
  );
}
