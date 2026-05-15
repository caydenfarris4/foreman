// Onboarding — 3 screens, condensed from the brief's 5.
// Frame: "setting up a job site, not filling out a form".
// Screen 1: identity + when you got promoted + team
// Screen 2: what's actually hard right now
// Screen 3: when you check in (cadence). Sabbath day → Settings later.

// Common chrome — a "site set-up" header with segmented progress.
function OBShell({ step, total, children, primary, secondary, primaryDisabled }) {
  const segs = Array.from({ length: total }, (_, i) => ({
    state: i < step - 1 ? 'done' : i === step - 1 ? 'active' : 'pending',
  }));
  const labels = ['IDENTITY', 'CHALLENGE', 'CADENCE'];
  return (
    <Phone>
      <div style={{ background: T.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingTop: 56, padding: '56px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Wordmark />
            <span style={ty('cap', { color: T.graphite, fontSize: 10 })}>SETTING UP YOUR SITE</span>
          </div>
          <Progress
            variant="segmented"
            segments={segs}
            label={`STEP ${String(step).padStart(2,'0')} OF ${String(total).padStart(2,'0')} · ${labels[step-1]}`}
          />
        </div>
        <div style={{ flex: 1, padding: '28px 24px 100px', overflow: 'auto' }}>
          {children}
        </div>
        {/* Sticky footer */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 20px 40px',
          background: 'linear-gradient(180deg, rgba(245,241,234,0) 0%, rgba(245,241,234,1) 30%)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          {secondary && <Button variant="ghost" size="lg">{secondary}</Button>}
          <div style={{ flex: 1 }} />
          <Button variant="primary" size="lg" state={primaryDisabled ? 'disabled' : 'default'} iconRight={<Ico.arrow />}>
            {primary || 'Continue'}
          </Button>
        </div>
      </div>
    </Phone>
  );
}

// Stamped selector chip — feels like a punch card / job site tag.
function StampChip({ label, sub, selected, style }) {
  return (
    <div style={{
      padding: '12px 14px', background: selected ? T.ink : T.chalk,
      color: selected ? T.chalk : T.ink,
      border: `1.5px solid ${selected ? T.ink : T.rule}`,
      borderRadius: R.md,
      display: 'flex', flexDirection: 'column', gap: 2,
      ...style,
    }}>
      <span style={ty('label', { color: selected ? T.chalk : T.ink })}>{label}</span>
      {sub && <span style={ty('caption', { color: selected ? 'rgba(250,247,242,0.6)' : T.graphite })}>{sub}</span>}
    </div>
  );
}

// Screen 1 — Identity + context.
function OBIdentity() {
  return (
    <OBShell step={1} total={3} primary="Continue">
      <div style={{ ...ty('h1', { color: T.ink, fontSize: 28 }), marginBottom: 8 }}>
        Who’s running this site?
      </div>
      <div style={{ ...ty('body', { color: T.graphite }), marginBottom: 22 }}>
        We use your name and a couple of facts to sharpen the coaching. Nothing more.
      </div>

      <Input label="Name" value="Alex Park" state="filled" style={{ marginBottom: 14 }} />
      <Input label="Role title" value="Engineering Manager" state="filled" style={{ marginBottom: 18 }} />

      <div style={{ ...ty('label', { color: T.ink2 }), marginBottom: 8 }}>When did you start managing?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        <StampChip label="0–3 months" sub="Brand new" />
        <StampChip label="4–6 months" sub="Past the honeymoon" selected />
        <StampChip label="7–9 months" />
        <StampChip label="10–12 months" />
      </div>

      <div style={{ ...ty('label', { color: T.ink2 }), marginBottom: 8 }}>Team size</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {['1–3', '4–6', '7–10', '11+'].map((n, i) => (
          <StampChip key={n} label={n} selected={i === 1} style={{ flex: 1, alignItems: 'center', textAlign: 'center' }} />
        ))}
      </div>
      <div style={ty('caption', { color: T.graphite })}>Direct reports only. Skip-level folks don’t count.</div>
    </OBShell>
  );
}

// Screen 2 — Challenge.
function OBChallenge() {
  const options = [
    { id: 'feedback', label: 'Giving hard feedback', sub: 'Telling the truth when it costs you' },
    { id: 'delegation', label: 'Letting go of the work', sub: 'You’re still doing IC work after hours' },
    { id: 'conflict', label: 'Conflict on the team', sub: 'Two people, one stuck thing' },
    { id: 'underperformer', label: 'A struggling report', sub: 'You know who. You’ve known for weeks.' },
    { id: 'scope', label: 'Saying no to scope', sub: 'Your team is doing the work of 1.5 teams' },
    { id: 'manager', label: 'Managing up', sub: 'Your boss is the bottleneck' },
  ];
  return (
    <OBShell step={2} total={3} primary="Continue" secondary="Back">
      <div style={{ ...ty('h1', { color: T.ink, fontSize: 28 }), marginBottom: 8 }}>
        What’s the heaviest thing on your site right now?
      </div>
      <div style={{ ...ty('body', { color: T.graphite }), marginBottom: 20 }}>
        We’ll bias your early coaching toward this. You can change it any time.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((o, i) => {
          const selected = o.id === 'underperformer';
          return (
            <div key={o.id} style={{
              padding: '14px 14px', background: selected ? T.ink : T.chalk,
              color: selected ? T.chalk : T.ink,
              border: `1.5px solid ${selected ? T.ink : T.rule}`,
              borderRadius: R.md,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{
                ...ty('spec', { fontSize: 12, color: selected ? T.oak : T.graphite }),
                width: 18, marginTop: 2,
              }}>{String(i+1).padStart(2,'0')}</span>
              <div style={{ flex: 1 }}>
                <div style={ty('label', { color: selected ? T.chalk : T.ink, fontSize: 14 })}>{o.label}</div>
                <div style={ty('caption', { color: selected ? 'rgba(250,247,242,0.6)' : T.graphite, marginTop: 2 })}>{o.sub}</div>
              </div>
              {selected && <div style={{ width: 18, height: 18, borderRadius: 9, background: T.oak, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink }}><Ico.check width={12} height={12} /></div>}
            </div>
          );
        })}
      </div>
    </OBShell>
  );
}

// Screen 3 — Cadence.
function OBCadence() {
  return (
    <OBShell step={3} total={3} primary="Open the site" secondary="Back">
      <div style={{ ...ty('h1', { color: T.ink, fontSize: 28 }), marginBottom: 8 }}>
        When do you want the prompt?
      </div>
      <div style={{ ...ty('body', { color: T.graphite }), marginBottom: 22 }}>
        One reminder a day. We’ll send it to your phone at this time. No streaks, no shame.
      </div>

      <div style={{ ...ty('label', { color: T.ink2 }), marginBottom: 8 }}>Daily check-in</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[
          { t: '06:30', sub: 'before stand-up' },
          { t: '07:15', sub: 'over coffee', sel: true },
          { t: '21:00', sub: 'after the day' },
        ].map((o) => (
          <div key={o.t} style={{
            flex: 1, padding: '14px 12px', borderRadius: R.md,
            background: o.sel ? T.ink : T.chalk,
            color: o.sel ? T.chalk : T.ink,
            border: `1.5px solid ${o.sel ? T.ink : T.rule}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={ty('h2', { fontSize: 22, color: o.sel ? T.chalk : T.ink })}>{o.t}</span>
            <span style={ty('caption', { color: o.sel ? 'rgba(250,247,242,0.6)' : T.graphite })}>{o.sub}</span>
          </div>
        ))}
      </div>

      <div style={{ ...ty('label', { color: T.ink2 }), marginBottom: 8 }}>Weekly retrospective</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {['Fri', 'Sat', 'Sun', 'Mon'].map((d, i) => (
          <StampChip key={d} label={d} selected={i === 2} style={{ flex: 1, alignItems: 'center', textAlign: 'center' }} />
        ))}
      </div>

      <div style={{
        background: T.oakWash, border: `1px solid ${T.oak}`, borderRadius: R.md,
        padding: '14px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: T.oak, color: T.chalk, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <Ico.check width={11} height={11} />
          </div>
          <div>
            <div style={ty('label', { color: T.oakDim, fontSize: 13 })}>One ritual. That’s the whole app.</div>
            <div style={{ ...ty('caption', { color: T.ink2, marginTop: 4, lineHeight: 1.5 }) }}>
              Five minutes in the morning, twenty on Sunday. If we ever ask for more, push back.
            </div>
          </div>
        </div>
      </div>
    </OBShell>
  );
}

Object.assign(window, { OBIdentity, OBChallenge, OBCadence });
