"use client";

// Decides whether the 3D house may render. Mobile performance is
// non-negotiable, so the gate is conservative and the 2D SVG is always the
// baseline: we only *upgrade* to 3D after mount, when the device clearly has
// the headroom and the user hasn't asked for reduced motion.
//
// Override order:
//   1. ?house3d=on / ?house3d=off in the URL  (manual testing / opt-out)
//   2. NEXT_PUBLIC_HOUSE_3D = "off"            (kill switch, build-time)
//   3. capability detection                    (default)
import { useEffect, useState } from "react";

const KILL_SWITCH = process.env.NEXT_PUBLIC_HOUSE_3D === "off";

function detectCapability(): boolean {
  if (typeof window === "undefined") return false;

  // Respect reduced motion — a moving 3D model is exactly what that opts out of.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  // Respect data-saver.
  const conn = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  if (conn?.saveData) return false;

  // Memory / CPU headroom. deviceMemory is Chromium-only; when absent we fall
  // back to core count, and when both are absent we stay conservative.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem < 4) return false;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores < 4) return false;

  // WebGL must actually be available.
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return false;
  } catch {
    return false;
  }

  return true;
}

function urlOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("house3d");
  if (v === "on") return true;
  if (v === "off") return false;
  return null;
}

export function useHouse3D(): boolean {
  // Always start false so SSR and first paint render the 2D baseline; upgrade
  // after mount if the device qualifies. Avoids hydration mismatch entirely.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const override = urlOverride();
    if (override !== null) {
      setEnabled(override);
      return;
    }
    if (KILL_SWITCH) return;
    setEnabled(detectCapability());
  }, []);

  return enabled;
}
