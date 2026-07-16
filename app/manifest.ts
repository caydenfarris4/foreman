import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest (Next links it in <head> automatically).
// This is what makes Foreman installable as a PWA and what Bubblewrap reads
// when packaging the Trusted Web Activity for Google Play — see
// docs/PLAY_STORE.md. Colors are the hex equivalents of the oklch palette
// in globals.css (cream #fefbf7).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Foreman — Coaching for first-time managers",
    short_name: "Foreman",
    description:
      "A daily coaching companion built on the Under Construction framework. Foundation, framing, finishing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fefbf7",
    theme_color: "#fefbf7",
    categories: ["business", "productivity", "education"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
