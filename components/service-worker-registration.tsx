"use client";

import { useEffect } from "react";

// Registers /sw.js (offline fallback + PWA installability — see
// docs/PLAY_STORE.md). Production only: a service worker in dev would keep
// serving stale responses across code changes.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (private mode, unsupported) just means no
      // offline page — the app itself is unaffected.
    });
  }, []);
  return null;
}
