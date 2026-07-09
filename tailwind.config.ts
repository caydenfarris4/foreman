import type { Config } from "tailwindcss";

// Cornerstone design system (from design upload 7c42ba34).
// "Warm cream, clay accent, sage growth, amber glow, warm brown ink."
// Token NAMES are kept from the previous system so every existing usage
// re-skins in place; only the values changed. `blueprint` now means CLAY —
// the schematic-blue era is over.
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        // Surfaces (warm cream family)
        paper: "oklch(0.99 0.006 80)",
        paper2: "oklch(0.965 0.006 75)",
        chalk: "oklch(0.995 0.004 85)",
        shell: "oklch(0.90 0.01 72)",
        // Ink (warm brown, never black)
        ink: "oklch(0.30 0.02 55)",
        ink2: "oklch(0.38 0.03 55)",
        graphite: "oklch(0.52 0.02 55)",
        haze: "oklch(0.62 0.02 60)",
        // Lines (warm translucent hairlines)
        rule: "oklch(0.35 0.03 55 / 0.10)",
        ruleSoft: "oklch(0.35 0.03 55 / 0.05)",
        ruleStrong: "oklch(0.35 0.03 55 / 0.22)",
        // Brand — blueprint token now carries CLAY (action & focus)
        blueprint: {
          DEFAULT: "oklch(0.60 0.11 40)",
          dim: "oklch(0.52 0.12 40)",
          wash: "oklch(0.97 0.012 50)",
        },
        // oak = clay-bright (links, highlights)
        oak: {
          DEFAULT: "oklch(0.66 0.11 42)",
          dim: "oklch(0.55 0.10 42)",
          wash: "oklch(0.96 0.02 55)",
        },
        // Status
        rust: { DEFAULT: "oklch(0.55 0.13 30)", wash: "oklch(0.95 0.03 30)" },
        moss: { DEFAULT: "oklch(0.60 0.045 150)", wash: "oklch(0.98 0.01 150)" },
        amber: { DEFAULT: "oklch(0.72 0.11 70)", wash: "oklch(0.95 0.05 80)" },
        // Phase aliases
        foundation: "oklch(0.40 0.05 45)",
        framing: "oklch(0.60 0.11 40)",
        finishing: "oklch(0.60 0.045 150)",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "26px",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Newsreader", "Georgia", "serif"],
        sans: [
          "var(--font-sans)",
          "Hanken Grotesk",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
        // No mono in Cornerstone; alias to the sans so stray font-mono
        // usages inherit the system instead of a terminal look.
        mono: ["var(--font-sans)", "Hanken Grotesk", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        cap: "0.12em",
      },
      backgroundImage: {
        // Soft warm panel gradients (the grid-paper era is over).
        "blueprint-grid":
          "linear-gradient(160deg, oklch(0.97 0.012 50), oklch(0.955 0.014 55))",
        "draft-grid":
          "linear-gradient(160deg, oklch(0.985 0.008 78), oklch(0.965 0.008 74))",
        // Dark ink gradient for prompt cards (Cornerstone signature).
        "ink-card":
          "linear-gradient(160deg, oklch(0.30 0.02 55), oklch(0.26 0.02 55))",
      },
      backgroundSize: {
        grid: "22px 22px",
        "grid-sm": "12px 12px",
      },
      boxShadow: {
        // A panel lifted just off the drafting table.
        lift: "0 1px 0 rgba(26,24,22,0.04), 0 10px 30px rgba(26,24,22,0.06)",
        liftStrong: "0 12px 32px rgba(26,24,22,0.10)",
      },
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } },
        blink: {
          "0%, 50%": { opacity: "1" },
          "50.01%, 100%": { opacity: "0" },
        },
        // A board lifted into place.
        "board-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Schematic surveying line sweeping across.
        survey: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "20%, 80%": { opacity: "0.5" },
          "100%": { transform: "translateX(220%)", opacity: "0" },
        },
      },
      animation: {
        "spin-slow": "spin 0.8s linear infinite",
        caret: "blink 1s steps(2) infinite",
        "board-up": "board-up 0.5s cubic-bezier(0.22,0.61,0.36,1) both",
        survey: "survey 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
