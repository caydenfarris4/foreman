import type { Config } from "tailwindcss";

// Design tokens straight from design/src/tokens.jsx.
// "Warm paper, blueprint blue, oak accent, matte black ink. Restrained
// construction references."
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
        // Surfaces
        paper: "#F5F1EA",
        paper2: "#ECE6DA",
        chalk: "#FAF7F2",
        shell: "#E6DFD0",
        // Ink
        ink: "#1A1816",
        ink2: "#3A342C",
        graphite: "#6B6358",
        haze: "#9A9387",
        // Lines
        rule: "rgba(26,24,22,0.10)",
        ruleSoft: "rgba(26,24,22,0.06)",
        ruleStrong: "rgba(26,24,22,0.18)",
        // Brand
        blueprint: { DEFAULT: "#1E3A5F", dim: "#2C5478", wash: "#E4ECF4" },
        oak: { DEFAULT: "#B8843F", dim: "#8E6529", wash: "#F5EBDA" },
        // Status
        rust: { DEFAULT: "#A8442A", wash: "#F4E0D9" },
        moss: { DEFAULT: "#4A6B3A", wash: "#E1E9D8" },
        amber: { DEFAULT: "#9C7416", wash: "#F1E5C9" },
        // Phase aliases — same hexes as brand/status, surfaced under their
        // semantic names so phase components don't have to translate.
        foundation: "#1E3A5F",
        framing: "#B8843F",
        finishing: "#4A6B3A",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Source Serif Pro", "Georgia", "serif"],
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        cap: "0.06em",
      },
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } },
        blink: {
          "0%, 50%": { opacity: "1" },
          "50.01%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "spin-slow": "spin 0.8s linear infinite",
        caret: "blink 1s steps(2) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
