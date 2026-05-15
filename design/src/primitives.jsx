// Foreman primitive components — Button, Card, Input, Textarea, Badge,
// ProgressIndicator, EmptyState, Modal. shadcn-equivalent shape with the
// Foreman aesthetic (no shadcn deps; we mirror the API so the component
// breakdown maps cleanly when handed to Claude Code).

// ─────────────────────────────────────────────────────────────
// Button — variants: primary, secondary, ghost, danger
// sizes: sm, md, lg ; states: default, hover, pressed, disabled, loading
// ─────────────────────────────────────────────────────────────
function Button({ variant = 'primary', size = 'md', state = 'default', icon, iconRight, full, children, style = {} }) {
  const sz = {
    sm: { h: 32, px: 12, fs: 13 },
    md: { h: 44, px: 16, fs: 15 },
    lg: { h: 52, px: 20, fs: 16 },
  }[size];

  const variants = {
    primary: {
      default: { bg: T.ink,       fg: T.chalk,  bd: T.ink },
      hover:   { bg: '#2A2620',   fg: T.chalk,  bd: '#2A2620' },
      pressed: { bg: '#0E0C0A',   fg: T.chalk,  bd: '#0E0C0A' },
      disabled:{ bg: T.shell,     fg: T.haze,   bd: T.shell },
    },
    secondary: {
      default: { bg: T.chalk,     fg: T.ink,    bd: T.ruleStrong },
      hover:   { bg: T.paper2,    fg: T.ink,    bd: T.ruleStrong },
      pressed: { bg: T.shell,     fg: T.ink,    bd: T.ruleStrong },
      disabled:{ bg: T.paper,     fg: T.haze,   bd: T.rule },
    },
    ghost: {
      default: { bg: 'transparent', fg: T.ink2, bd: 'transparent' },
      hover:   { bg: T.ruleSoft,    fg: T.ink,  bd: 'transparent' },
      pressed: { bg: T.rule,        fg: T.ink,  bd: 'transparent' },
      disabled:{ bg: 'transparent', fg: T.haze, bd: 'transparent' },
    },
    danger: {
      default: { bg: T.rust,      fg: '#FFF',   bd: T.rust },
      hover:   { bg: '#8E3622',   fg: '#FFF',   bd: '#8E3622' },
      pressed: { bg: '#74291A',   fg: '#FFF',   bd: '#74291A' },
      disabled:{ bg: T.rustWash,  fg: T.haze,   bd: T.rustWash },
    },
  };
  const v = variants[variant][state] || variants[variant].default;
  const isLoading = state === 'loading';

  return (
    <button style={{
      height: sz.h, padding: `0 ${sz.px}px`,
      background: v.bg, color: v.fg,
      border: `1px solid ${v.bd}`, borderRadius: R.md,
      ...ty('button', { fontSize: sz.fs }),
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, cursor: state === 'disabled' ? 'not-allowed' : 'pointer',
      width: full ? '100%' : undefined,
      transition: 'background .12s, border-color .12s',
      ...style,
    }}>
      {isLoading && <Spinner color={v.fg} />}
      {!isLoading && icon}
      <span>{children}</span>
      {!isLoading && iconRight}
    </button>
  );
}

function Spinner({ color = T.ink, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={{ animation: 'fm-spin 0.8s linear infinite' }}>
      <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="1.5"/>
      <path d="M7 1.5a5.5 5.5 0 015.5 5.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Card — flat surface with hairline. Optional eyebrow (mono cap) + title.
// ─────────────────────────────────────────────────────────────
function Card({ children, padding = 16, raised, style = {}, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        background: T.chalk, borderRadius: R.lg,
        border: `1px solid ${raised ? T.ruleSoft : T.rule}`,
        boxShadow: raised ? '0 1px 0 rgba(26,24,22,0.04), 0 8px 24px rgba(26,24,22,0.04)' : 'none',
        padding,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Input — label + field. States: default, focus, filled, error, disabled.
// ─────────────────────────────────────────────────────────────
function Input({ label, value, placeholder, state = 'default', hint, error, mono, style = {} }) {
  const focused = state === 'focus';
  const errored = state === 'error';
  const disabled = state === 'disabled';
  return (
    <div style={style}>
      {label && <div style={{ ...ty('label', { color: T.ink2 }), marginBottom: 8 }}>{label}</div>}
      <div style={{
        height: 48, padding: '0 14px',
        background: disabled ? T.paper2 : T.chalk,
        borderRadius: R.md,
        border: `1.5px solid ${errored ? T.rust : focused ? T.ink : T.rule}`,
        boxShadow: focused && !errored ? `0 0 0 3px ${T.ruleSoft}` : 'none',
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{
          ...ty(mono ? 'spec' : 'bodyL', { color: value ? T.ink : T.haze, fontSize: 16 }),
          flex: 1,
        }}>{value || placeholder}</span>
        {focused && !value && <Caret />}
      </div>
      {(hint || error) && (
        <div style={{ ...ty('caption', { color: errored ? T.rust : T.graphite, marginTop: 6 }) }}>
          {errored ? error : hint}
        </div>
      )}
    </div>
  );
}

function Caret() {
  return <span style={{
    display: 'inline-block', width: 1.5, height: 20, background: T.ink,
    marginLeft: 1, animation: 'fm-blink 1s steps(2) infinite',
  }} />;
}

// ─────────────────────────────────────────────────────────────
// Textarea — multi-line, optional charCount.
// ─────────────────────────────────────────────────────────────
function Textarea({ label, value, placeholder, state = 'default', minHeight = 140, hint, style = {} }) {
  const focused = state === 'focus';
  const filled = !!value;
  return (
    <div style={style}>
      {label && <div style={{ ...ty('label', { color: T.ink2 }), marginBottom: 8 }}>{label}</div>}
      <div style={{
        minHeight, padding: '14px 16px',
        background: T.chalk,
        borderRadius: R.md,
        border: `1.5px solid ${focused ? T.ink : T.rule}`,
        boxShadow: focused ? `0 0 0 3px ${T.ruleSoft}` : 'none',
      }}>
        <div style={{ ...ty('bodyL', { color: filled ? T.ink : T.haze, fontSize: 16, lineHeight: 1.55 }), whiteSpace: 'pre-wrap' }}>
          {value || placeholder}{focused && <Caret />}
        </div>
      </div>
      {hint && <div style={{ ...ty('caption', { color: T.graphite, marginTop: 6 }) }}>{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Badge — variants: neutral, blueprint, oak, moss, rust, amber
// ─────────────────────────────────────────────────────────────
function Badge({ variant = 'neutral', icon, children, size = 'md', style = {} }) {
  const v = {
    neutral:    { bg: T.paper2,        fg: T.ink2,    bd: T.rule },
    blueprint:  { bg: T.blueprintWash, fg: T.blueprint, bd: 'transparent' },
    oak:        { bg: T.oakWash,       fg: T.oakDim,  bd: 'transparent' },
    moss:       { bg: T.mossWash,      fg: T.moss,    bd: 'transparent' },
    rust:       { bg: T.rustWash,      fg: T.rust,    bd: 'transparent' },
    amber:      { bg: T.amberWash,     fg: T.amber,   bd: 'transparent' },
    outline:    { bg: 'transparent',   fg: T.ink2,    bd: T.ruleStrong },
  }[variant];
  const sz = size === 'sm' ? { h: 20, px: 8, fs: 10, gap: 4 } : { h: 24, px: 10, fs: 11, gap: 5 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: sz.gap,
      height: sz.h, padding: `0 ${sz.px}px`,
      background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
      borderRadius: R.sm,
      ...ty('cap', { fontSize: sz.fs }),
      ...style,
    }}>
      {icon}
      <span>{children}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// ProgressIndicator — segmented (build phases) or linear
// ─────────────────────────────────────────────────────────────
function Progress({ value = 0, max = 100, variant = 'linear', segments, label, style = {} }) {
  if (variant === 'segmented' && segments) {
    return (
      <div style={style}>
        <div style={{ display: 'flex', gap: 4 }}>
          {segments.map((s, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s.state === 'done' ? T.ink : s.state === 'active' ? T.blueprint : T.shell,
            }} />
          ))}
        </div>
        {label && <div style={{ ...ty('cap', { color: T.graphite, marginTop: 8 }) }}>{label}</div>}
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={style}>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={ty('label', { color: T.ink2 })}>{label}</span>
        <span style={ty('spec', { color: T.graphite })}>{Math.round(pct)}%</span>
      </div>}
      <div style={{ height: 6, background: T.shell, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: T.blueprint }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EmptyState — eyebrow + headline + body + CTA. Uses a stamped icon stack.
// ─────────────────────────────────────────────────────────────
function EmptyState({ eyebrow, title, body, action, icon, style = {} }) {
  return (
    <div style={{
      textAlign: 'center', padding: '32px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      ...style,
    }}>
      {icon || (
        <div style={{
          width: 48, height: 48, borderRadius: 4,
          background: T.paper2, border: `1px dashed ${T.ruleStrong}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.graphite, marginBottom: 4,
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 19l8-14 8 14H3z"/></svg>
        </div>
      )}
      {eyebrow && <div style={ty('cap', { color: T.graphite })}>{eyebrow}</div>}
      <div style={{ ...ty('h2', { color: T.ink }), maxWidth: 240 }}>{title}</div>
      {body && <div style={{ ...ty('body', { color: T.graphite }), maxWidth: 260 }}>{body}</div>}
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — paper sheet, hairline border, oak header rule
// ─────────────────────────────────────────────────────────────
function Modal({ eyebrow, title, body, primary, secondary, onClose, style = {} }) {
  return (
    <div style={{
      position: 'relative', background: T.chalk, borderRadius: R.xl,
      border: `1px solid ${T.rule}`,
      boxShadow: '0 24px 60px rgba(26,24,22,0.22), 0 6px 16px rgba(26,24,22,0.08)',
      padding: 24, width: '100%', maxWidth: 360,
      ...style,
    }}>
      <div style={{ height: 2, background: T.oak, width: 24, marginBottom: 16 }} />
      {eyebrow && <div style={{ ...ty('cap', { color: T.oakDim }), marginBottom: 8 }}>{eyebrow}</div>}
      <div style={{ ...ty('h2', { color: T.ink }), marginBottom: 8 }}>{title}</div>
      {body && <div style={{ ...ty('body', { color: T.ink2 }), marginBottom: 20 }}>{body}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {secondary && <Button variant="ghost" size="md">{secondary}</Button>}
        {primary && <Button variant="primary" size="md">{primary}</Button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tag — small phase tag with leading swatch
// ─────────────────────────────────────────────────────────────
function PhaseTag({ phase, style = {} }) {
  const c = { foundation: T.foundation, framing: T.framing, finishing: T.finishing }[phase];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      ...ty('cap', { color: T.ink2 }),
      ...style,
    }}>
      <span style={{ width: 8, height: 8, background: c, borderRadius: 1 }} />
      {phase}
    </span>
  );
}

// Generic icon stand-ins (line, 20×20, 1.5 stroke) — drawn small + restrained.
const Ico = {
  hammer: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 3l6 6-2 2-6-6 2-2zM9 5L3 11l3 3 6-6"/></svg>,
  level: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><rect x="2" y="7" width="16" height="6" rx="1"/><circle cx="10" cy="10" r="1.4"/></svg>,
  search: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></svg>,
  plus: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>,
  arrow: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 10h11M11 5l5 5-5 5"/></svg>,
  back: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10H4M9 5L4 10l5 5"/></svg>,
  check: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4 4 8-8"/></svg>,
  x: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>,
  ruler: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="8" width="16" height="4" rx="0.5"/><path d="M5 8v2M8 8v3M11 8v2M14 8v3M17 8v2"/></svg>,
  tag: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M2 8V3h5l11 11-5 5L2 8z"/><circle cx="6" cy="7" r="0.7" fill="currentColor"/></svg>,
  clock: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>,
  flag: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v14M4 4h11l-2 4 2 4H4"/></svg>,
  more: (props) => <svg {...props} width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="5" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="15" cy="10" r="1.4"/></svg>,
  home: (props) => <svg {...props} width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M3 10l8-6 8 6v8a1 1 0 01-1 1h-4v-6H8v6H4a1 1 0 01-1-1v-8z"/></svg>,
  note: (props) => <svg {...props} width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M5 3h12v16l-6-3-6 3V3z"/></svg>,
  archive: (props) => <svg {...props} width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><rect x="3" y="4" width="16" height="4" rx="1"/><path d="M4 8v10h14V8M9 12h4"/></svg>,
  calendar: (props) => <svg {...props} width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><rect x="3" y="5" width="16" height="14" rx="1.5"/><path d="M3 9h16M7 3v4M15 3v4"/></svg>,
};

Object.assign(window, { Button, Card, Input, Textarea, Badge, Progress, EmptyState, Modal, PhaseTag, Spinner, Caret, Ico });
