"use client";

import { useCallback, useEffect, useState } from "react";

// Chrome's install event — not yet in the TS DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    // Stashed by the inline capture script in app/layout.tsx.
    __foremanInstallEvent?: BeforeInstallPromptEvent | null;
  }
}

// Install-state hook for the home-screen prompt.
// - canPrompt: Chrome/Edge on Android or desktop — we hold a captured
//   beforeinstallprompt and can open the native install dialog.
// - ios: iOS Safari — no prompt API exists; caller shows manual steps.
// - standalone: already running as the installed app; show nothing.
export function useInstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari's non-standard flag for home-screen launches.
        ("standalone" in navigator &&
          (navigator as { standalone?: boolean }).standalone === true),
    );
    const ua = navigator.userAgent;
    setIos(
      /iPhone|iPad|iPod/.test(ua) ||
        // iPadOS 13+ reports as Mac; touch support tells it apart.
        (ua.includes("Mac") && "ontouchend" in document),
    );
    setReady(Boolean(window.__foremanInstallEvent));

    const onReady = () => setReady(true);
    const onDone = () => {
      setInstalled(true);
      setReady(false);
    };
    window.addEventListener("foreman:install-ready", onReady);
    window.addEventListener("foreman:install-done", onDone);
    return () => {
      window.removeEventListener("foreman:install-ready", onReady);
      window.removeEventListener("foreman:install-done", onDone);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const event = window.__foremanInstallEvent;
    if (!event) return false;
    await event.prompt();
    const choice = await event.userChoice;
    // The event is single-use either way.
    window.__foremanInstallEvent = null;
    setReady(false);
    if (choice.outcome === "accepted") setInstalled(true);
    return choice.outcome === "accepted";
  }, []);

  return {
    mounted,
    canPrompt: mounted && ready && !standalone,
    ios: mounted && ios && !standalone,
    standalone,
    installed,
    promptInstall,
  };
}
