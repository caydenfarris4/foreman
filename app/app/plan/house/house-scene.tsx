"use client";

// Picks the renderer: the 2D SVG house is always drawn; if the device clears
// the perf gate (useHouse3D) the R3F house lazy-loads and fades in over it. The
// 2D house stays mounted underneath as the instant fallback while the 3D chunk
// loads — never an empty frame. Both read the same `progress` motion value, so
// the build animation is identical whichever renders.
import dynamic from "next/dynamic";
import { motion, type MotionValue } from "motion/react";
import { useState } from "react";
import { buildPhaseLabel } from "./progress";
import { House2D } from "./house-2d";
import { useHouse3D } from "./use-house-3d";

const House3D = dynamic(() => import("./house-3d"), { ssr: false });

export function HouseScene({
  progress,
  realOverall,
  className,
}: {
  progress: MotionValue<number>;
  realOverall: number;
  className?: string;
}) {
  const use3D = useHouse3D();
  const [ready3D, setReady3D] = useState(false);
  const phase = buildPhaseLabel(realOverall);

  return (
    <div className={className} style={{ position: "relative", width: "100%" }}>
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-xl border border-rule bg-blueprint-wash shadow-lift">
        <House2D progress={progress} className="absolute inset-0 h-full w-full" />

        {use3D ? (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: ready3D ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <Mounted onReady={() => setReady3D(true)}>
              <House3D progress={progress} />
            </Mounted>
          </motion.div>
        ) : null}

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-blueprint/20 bg-chalk/85 px-3 py-1 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-blueprint" />
          <span className="type-cap text-blueprint">{phase.toUpperCase()}</span>
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-ink/10 bg-chalk/85 px-2.5 py-1 backdrop-blur">
          <span className="type-cap text-graphite">
            {Math.round(realOverall * 100)}% BUILT
          </span>
        </div>
        {use3D ? (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink/70 px-2 py-0.5">
            <span className="type-cap text-chalk/80" style={{ fontSize: 9 }}>
              3D · DRAG TO TURN
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Detect first paint of the lazy child to trigger the crossfade.
function Mounted({
  children,
  onReady,
}: {
  children: React.ReactNode;
  onReady: () => void;
}) {
  return (
    <div
      ref={(el) => {
        if (el) requestAnimationFrame(() => onReady());
      }}
      className="h-full w-full"
    >
      {children}
    </div>
  );
}
