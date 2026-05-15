// Design-system artboards. Each is a single tall card so it reads like a
// page from a specimen book. Width 520 (wider than phone) so swatches and
// type specimens have room to breathe.

// Common page shell — paper background, oak rule, monospace folio.
function SpecPage({ folio, title, subtitle, children, w = 520, h = 880 }) {
  return (
    <div style={{
      width: w, height: h, background: T.paper,
      padding: '32px 32px 40px', boxSizing: 'border-box',
      fontFamily: T.fSans, color: T.ink, position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={ty('cap', { color: T.graphite })}>FOREMAN · DESIGN SYSTEM</span>
        <span style={ty('cap', { color: T.graphite })}>{folio}</span>
      </div>
      <div style={{ height: 1, background: T.rule, marginBottom: 22 }} />
      <div style={{ ...ty('h1', { color: T.ink }), marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ ...ty('body', { color: T.graphite }), marginBottom: 24 }}>{subtitle}</div>}
      {children}
      <div style={{ position: 'absolute', left: 32, right: 32, bottom: 18, display: 'flex', justifyContent: 'space-between', ...ty('caption', { color: T.haze }) }}>
        <span>under construction</span><span>v0.1</span>
      </div>
    </div>
  );
}

function Swatch({ name, hex, role, contrast, dark }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ width: '100%', aspectRatio: '1.6', background: hex, borderRadius: 4, border: `1px solid ${T.rule}` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={ty('label', { color: T.ink })}>{name}</span>
        <span style={ty('spec', { color: T.graphite })}>{hex}</span>
      </div>
      {role && <span style={ty('caption', { color: T.graphite })}>{role}</span>}
    </div>
  );
}

function DSPalette() {
  const rows = [
    { head: 'Surfaces', items: [
      { name: 'paper',   hex: T.paper,   role: 'app bg' },
      { name: 'chalk',   hex: T.chalk,   role: 'raised' },
      { name: 'paper-2', hex: T.paper2,  role: 'sunken' },
      { name: 'shell',   hex: T.shell,   role: 'hairline' },
    ]},
    { head: 'Ink', items: [
      { name: 'ink',      hex: T.ink,      role: 'primary text' },
      { name: 'ink-2',    hex: T.ink2,     role: 'body' },
      { name: 'graphite', hex: T.graphite, role: 'muted' },
      { name: 'haze',     hex: T.haze,     role: 'placeholder' },
    ]},
    { head: 'Brand', items: [
      { name: 'blueprint',  hex: T.blueprint, role: 'primary' },
      { name: 'oak',        hex: T.oak,       role: 'accent' },
      { name: 'moss',       hex: T.moss,      role: 'finishing' },
      { name: 'rust',       hex: T.rust,      role: 'danger' },
    ]},
  ];
  return (
    <SpecPage folio="01 · COLOR" title="Palette" subtitle="Warm paper, blueprint blue, oak accent. Matte ink, never pure black.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {rows.map((r) => (
          <div key={r.head}>
            <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>{r.head}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {r.items.map((s) => <Swatch key={s.name} {...s} />)}
            </div>
          </div>
        ))}
        <div>
          <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>Framework phases</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { name: 'foundation', hex: T.foundation, role: 'self-leadership' },
              { name: 'framing',    hex: T.framing,    role: 'team & structure' },
              { name: 'finishing',  hex: T.finishing,  role: 'culture & legacy' },
            ].map((s) => <Swatch key={s.name} {...s} />)}
          </div>
        </div>
        <div style={{ marginTop: 6, padding: 14, border: `1px solid ${T.rule}`, background: T.chalk, borderRadius: R.md }}>
          <div style={ty('caption', { color: T.graphite })}>
            <span style={{ color: T.ink2, fontWeight: 500 }}>Contrast.</span>{' '}
            ink on paper = 14.8:1 · ink-2 on chalk = 11.1:1 · blueprint on paper = 8.4:1 · oak on chalk = 4.6:1.
            All body pairings ≥ WCAG AA.
          </div>
        </div>
      </div>
    </SpecPage>
  );
}

function DSType() {
  const samples = [
    { k: 'display', label: 'Display · 32 / 500', text: 'Built one day at a time.' },
    { k: 'h1',      label: 'H1 · 26 / 500',      text: 'What\u2019s on your job site today?' },
    { k: 'h2',      label: 'H2 · 20 / 500',      text: 'This week\u2019s site report' },
    { k: 'prompt',  label: 'Prompt · 22 / 400 italic (serif)', text: 'The thing I can\u2019t stop turning over.' },
    { k: 'bodyL',   label: 'Body L · 17 / 400',  text: 'You\u2019ve been managing for four months. That\u2019s long enough to know what hurts, short enough to fix it.' },
    { k: 'body',    label: 'Body · 15 / 400',    text: 'Coaching back you can use before your next 1:1. Not a TED talk.' },
    { k: 'bodyS',   label: 'Body S · 13 / 400',  text: 'Saved to your library. Tagged: 1:1, feedback, framing.' },
    { k: 'label',   label: 'Label · 13 / 500',   text: 'Team size' },
    { k: 'cap',     label: 'Caption · 11 mono uppercase', text: 'WED · MAY 14 · 06:42' },
  ];
  return (
    <SpecPage folio="02 · TYPE" title="Typography" subtitle="Source Serif 4 (display & prompt). IBM Plex Sans (UI). IBM Plex Mono (metadata).">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {samples.map((s) => (
          <div key={s.k}>
            <div style={{ ...ty('spec', { color: T.graphite }), marginBottom: 4 }}>{s.label}</div>
            <div style={ty(s.k, { color: T.ink })}>{s.text}</div>
          </div>
        ))}
      </div>
    </SpecPage>
  );
}

function DSSpacing() {
  const steps = [
    { name: 'x1', px: 4 }, { name: 'x2', px: 8 }, { name: 'x3', px: 12 },
    { name: 'x4', px: 16 }, { name: 'x5', px: 20 }, { name: 'x6', px: 24 },
    { name: 'x7', px: 32 }, { name: 'x8', px: 40 }, { name: 'x9', px: 48 }, { name: 'x10', px: 64 },
  ];
  const radii = [
    { name: 'sm', v: 4 }, { name: 'md', v: 8 }, { name: 'lg', v: 12 }, { name: 'xl', v: 16 }, { name: 'xxl', v: 20 },
  ];
  return (
    <SpecPage folio="03 · SPACE & FORM" title="Spacing, radii, elevation" subtitle="4pt grid. Soft hairlines, almost no shadow.">
      <div>
        <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>Spacing (4pt)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {steps.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ ...ty('spec', { color: T.graphite }), width: 36 }}>{s.name}</span>
              <span style={{ ...ty('spec', { color: T.ink2 }), width: 36 }}>{s.px}px</span>
              <div style={{ height: 10, width: s.px * 2.4, background: T.blueprint, borderRadius: 1 }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>Radii</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
          {radii.map((r) => (
            <div key={r.name} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, background: T.chalk, border: `1px solid ${T.rule}`, borderRadius: r.v }} />
              <div style={ty('spec', { color: T.ink2 })}>{r.name} · {r.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>Elevation</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { name: 'flat', sh: 'none', desc: 'most surfaces' },
            { name: 'lift', sh: '0 1px 0 rgba(26,24,22,0.04), 0 8px 24px rgba(26,24,22,0.04)', desc: 'sticky bars, sheets' },
            { name: 'modal', sh: '0 24px 60px rgba(26,24,22,0.22), 0 6px 16px rgba(26,24,22,0.08)', desc: 'dialogs only' },
          ].map((e) => (
            <div key={e.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 64, background: T.chalk, border: `1px solid ${T.rule}`, borderRadius: R.md, boxShadow: e.sh }} />
              <div style={ty('spec', { color: T.ink2 })}>{e.name}</div>
              <div style={ty('caption', { color: T.graphite })}>{e.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </SpecPage>
  );
}

function DSComponents() {
  return (
    <SpecPage folio="04 · COMPONENTS" title="Components" subtitle="Button · Input · Textarea · Card · Badge · Progress · EmptyState · Modal" h={1080}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Buttons */}
        <div>
          <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>Button — variants × states</div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr', gap: 8, alignItems: 'center' }}>
            <span></span>
            <span style={ty('spec', { color: T.graphite })}>default</span>
            <span style={ty('spec', { color: T.graphite })}>hover</span>
            <span style={ty('spec', { color: T.graphite })}>pressed</span>
            <span style={ty('spec', { color: T.graphite })}>disabled</span>
            {['primary', 'secondary', 'ghost', 'danger'].map((v) => (
              <React.Fragment key={v}>
                <span style={ty('label', { color: T.ink2 })}>{v}</span>
                <Button variant={v} state="default" size="sm">Log it</Button>
                <Button variant={v} state="hover"   size="sm">Log it</Button>
                <Button variant={v} state="pressed" size="sm">Log it</Button>
                <Button variant={v} state="disabled" size="sm">Log it</Button>
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" size="md" state="loading">Saving</Button>
            <Button variant="secondary" size="md" iconRight={<Ico.arrow/>}>With icon</Button>
          </div>
        </div>

        {/* Inputs */}
        <div>
          <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>Input · Textarea</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Default" placeholder="e.g. Alex Park" />
            <Input label="Focus" value="Alex Park" state="focus" />
            <Input label="Filled" value="alex@team.dev" mono />
            <Input label="Error" value="alex@" state="error" error="That doesn’t look like a full email." />
          </div>
          <div style={{ marginTop: 14 }}>
            <Textarea label="Check-in" placeholder="Type the situation in your own words. 1–3 paragraphs is plenty." minHeight={88}/>
          </div>
        </div>

        {/* Badges & progress */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>Badge</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Badge variant="neutral">1:1</Badge>
              <Badge variant="blueprint">foundation</Badge>
              <Badge variant="oak">framing</Badge>
              <Badge variant="moss">finishing</Badge>
              <Badge variant="rust">conflict</Badge>
              <Badge variant="amber">scope</Badge>
              <Badge variant="outline">hiring</Badge>
            </div>
          </div>
          <div>
            <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>Progress</div>
            <Progress variant="segmented" segments={[{state:'done'},{state:'done'},{state:'active'},{state:'pending'}]} label="STEP 3 OF 4 · TEAM" />
            <div style={{ height: 12 }} />
            <Progress value={62} label="Site days this month" />
          </div>
        </div>

        {/* Empty state & Modal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 14 }}>
          <Card padding={0}>
            <EmptyState
              eyebrow="LIBRARY"
              title="No situations yet"
              body="Your first check-in lands here, tagged and searchable."
              action={<Button variant="secondary" size="sm" iconRight={<Ico.arrow/>}>Start a check-in</Button>}
            />
          </Card>
          <Modal
            eyebrow="WEEK 16 · SITE REPORT"
            title="Mark this week complete?"
            body="You’ll get a one-page summary, and Sunday’s prompt will arrive at 7pm."
            primary="Wrap the week"
            secondary="Not yet"
            style={{ position: 'relative' }}
          />
        </div>
      </div>
    </SpecPage>
  );
}

Object.assign(window, { DSPalette, DSType, DSSpacing, DSComponents });
