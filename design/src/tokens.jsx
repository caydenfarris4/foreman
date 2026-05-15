// Foreman design tokens — single source of truth.
// Aesthetic: "job site, not penthouse". Warm paper, blueprint blue,
// oak accent, matte black ink. Restrained construction references.

const T = {
  // Surfaces ----------------------------------------------------------------
  paper:      '#F5F1EA',  // app background, warm off-white
  paper2:     '#ECE6DA',  // sunken / panel
  chalk:      '#FAF7F2',  // raised card, lightest paper
  shell:      '#E6DFD0',  // hairline-adjacent surface
  // Ink -------------------------------------------------------------------
  ink:        '#1A1816',  // primary text, matte black
  ink2:       '#3A342C',  // body text
  graphite:   '#6B6358',  // muted / metadata
  haze:       '#9A9387',  // disabled / placeholder
  // Lines -----------------------------------------------------------------
  rule:       'rgba(26,24,22,0.10)',
  ruleSoft:   'rgba(26,24,22,0.06)',
  ruleStrong: 'rgba(26,24,22,0.18)',
  // Brand -----------------------------------------------------------------
  blueprint:  '#1E3A5F',  // primary, deep blueprint
  blueprintDim: '#2C5478',
  blueprintWash: '#E4ECF4',
  oak:        '#B8843F',  // warm wood, accent
  oakDim:     '#8E6529',
  oakWash:    '#F5EBDA',
  // Status ----------------------------------------------------------------
  rust:       '#A8442A',  // error, danger
  rustWash:   '#F4E0D9',
  moss:       '#4A6B3A',  // success
  mossWash:   '#E1E9D8',
  amber:      '#9C7416',  // warning
  amberWash:  '#F1E5C9',
  // Framework phase colors -----------------------------------------------
  foundation: '#1E3A5F',  // blueprint
  framing:    '#B8843F',  // oak
  finishing:  '#4A6B3A',  // moss
  // Type ------------------------------------------------------------------
  fSerif: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
  fSans:  '"IBM Plex Sans", -apple-system, system-ui, sans-serif',
  fMono:  '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

// Spacing scale (4pt). Used directly in px in inline styles so the design
// canvas export is faithful. Tailwind defaults map 1:1.
const S = { x0: 0, x1: 4, x2: 8, x3: 12, x4: 16, x5: 20, x6: 24, x7: 32, x8: 40, x9: 48, x10: 64 };
const R = { sm: 4, md: 8, lg: 12, xl: 16, xxl: 20, pill: 9999 };

// Type ramp (px / weight / line-height / tracking).
const TY = {
  display:  { f: T.fSerif, s: 32, w: 500, lh: 1.15, ls: -0.4 },   // hero
  h1:       { f: T.fSerif, s: 26, w: 500, lh: 1.2,  ls: -0.3 },   // screen title
  h2:       { f: T.fSerif, s: 20, w: 500, lh: 1.25, ls: -0.2 },   // section
  prompt:   { f: T.fSerif, s: 22, w: 400, lh: 1.35, ls: -0.1, italic: true }, // the daily prompt
  body:     { f: T.fSans,  s: 15, w: 400, lh: 1.5,  ls: -0.1 },
  bodyL:    { f: T.fSans,  s: 17, w: 400, lh: 1.45, ls: -0.1 },
  bodyS:    { f: T.fSans,  s: 13, w: 400, lh: 1.45, ls: 0 },
  label:    { f: T.fSans,  s: 13, w: 500, lh: 1.3,  ls: 0 },
  button:   { f: T.fSans,  s: 15, w: 500, lh: 1,    ls: 0 },
  cap:      { f: T.fMono,  s: 11, w: 500, lh: 1.2,  ls: 0.6, upper: true },  // METADATA · TAGS · 1:1
  caption:  { f: T.fMono,  s: 11, w: 400, lh: 1.4,  ls: 0.2 },
  spec:     { f: T.fMono,  s: 12, w: 400, lh: 1.3,  ls: 0 },
};

// Convert a TY entry into an inline-style object.
function ty(k, extra = {}) {
  const t = TY[k];
  return {
    fontFamily: t.f, fontSize: t.s, fontWeight: t.w,
    lineHeight: t.lh, letterSpacing: t.ls + 'px',
    textTransform: t.upper ? 'uppercase' : undefined,
    fontStyle: t.italic ? 'italic' : undefined,
    ...extra,
  };
}

Object.assign(window, { T, S, R, TY, ty });
