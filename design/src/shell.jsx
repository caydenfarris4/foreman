// Shared Foreman phone shell — IOSDevice + custom header & tab bar.
// Each app screen is composed inside <Phone>.
// Device width 393×852 (iPhone 14 Pro). Artboard around 410×880.

function Phone({ children, dark, keyboard, w = 393, h = 852 }) {
  return (
    <div style={{ width: w + 8, padding: 4, display: 'flex', justifyContent: 'center' }}>
      <IOSDevice width={w} height={h} dark={dark} keyboard={keyboard}>
        {children}
      </IOSDevice>
    </div>
  );
}

// Top app bar — minimal mono wordmark + right action.
function AppBar({ leading, trailing, title, eyebrow, sticky = true, dark }) {
  return (
    <div style={{
      paddingTop: 56, // below status bar
      padding: '56px 20px 12px',
      background: 'transparent',
      position: sticky ? 'sticky' : 'static', top: 0, zIndex: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dark ? T.chalk : T.ink2 }}>
          {leading || <Wordmark dark={dark} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: dark ? T.chalk : T.ink2 }}>
          {trailing}
        </div>
      </div>
      {(eyebrow || title) && (
        <div style={{ marginTop: 18 }}>
          {eyebrow && <div style={{ ...ty('cap', { color: dark ? 'rgba(255,255,255,0.6)' : T.graphite }), marginBottom: 6 }}>{eyebrow}</div>}
          {title && <div style={ty('h1', { color: dark ? T.chalk : T.ink })}>{title}</div>}
        </div>
      )}
    </div>
  );
}

function Wordmark({ dark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* tiny carpenter's-square mark */}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 2h10v3H5v7H2V2z" fill={dark ? T.oak : T.blueprint}/>
      </svg>
      <span style={{
        ...ty('cap', { fontSize: 11, color: dark ? T.chalk : T.ink, letterSpacing: 1.2 }),
      }}>FOREMAN</span>
    </div>
  );
}

// Bottom tab bar — three stops. Looks like a level/ruler footer.
function TabBar({ active = 'today', dark }) {
  const tabs = [
    { id: 'today',   label: 'Today',   icon: <Ico.note /> },
    { id: 'library', label: 'Library', icon: <Ico.archive /> },
    { id: 'retro',   label: 'Retro',   icon: <Ico.calendar /> },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
      paddingBottom: 28,
      background: dark
        ? 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%)'
        : 'linear-gradient(180deg, rgba(245,241,234,0) 0%, rgba(245,241,234,0.92) 60%)',
      borderTop: 'none',
    }}>
      <div style={{
        margin: '0 16px',
        padding: '6px 6px',
        background: dark ? 'rgba(28,24,20,0.92)' : T.chalk,
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : T.rule}`,
        borderRadius: 14,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
        boxShadow: '0 12px 32px rgba(26,24,22,0.10)',
      }}>
        {tabs.map((t) => {
          const isActive = t.id === active;
          const c = isActive ? (dark ? T.oak : T.ink) : (dark ? 'rgba(255,255,255,0.5)' : T.graphite);
          return (
            <div key={t.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 0 4px', borderRadius: 9,
              background: isActive ? (dark ? 'rgba(184,132,63,0.10)' : T.paper2) : 'transparent',
              color: c,
            }}>
              {React.cloneElement(t.icon, { width: 20, height: 20 })}
              <span style={ty('cap', { fontSize: 10, color: c })}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Small label utility — eyebrow + value (used on dashboards).
function Stat({ label, value, sub, accent, style = {} }) {
  return (
    <div style={style}>
      <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 8 }}>{label}</div>
      <div style={{ ...ty('h1', { color: accent || T.ink, fontSize: 30 }), lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ ...ty('caption', { color: T.graphite, marginTop: 6 }) }}>{sub}</div>}
    </div>
  );
}

// Hairline rule.
function Rule({ color, vertical, style }) {
  return <div style={{
    background: color || T.rule,
    width: vertical ? 1 : '100%',
    height: vertical ? '100%' : 1,
    ...style,
  }} />;
}

Object.assign(window, { Phone, AppBar, Wordmark, TabBar, Stat, Rule });
