// Daily Check-in — three states.
// (a) empty prompt, (b) typing, (c) coaching delivered.
// The prompt is the *only* friction. No date pickers, no mood sliders.

function CheckinShell({ children, keyboard }) {
  return (
    <Phone keyboard={keyboard}>
      <div style={{ background: T.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          leading={<Wordmark />}
          trailing={
            <>
              <span style={ty('cap', { color: T.graphite, fontSize: 10 })}>WED · MAY 14</span>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: T.paper2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink2 }}>
                <Ico.more width={16} height={16} />
              </div>
            </>
          }
        />
        {children}
      </div>
    </Phone>
  );
}

// State A — empty prompt.
function CheckinEmpty() {
  return (
    <CheckinShell>
      <div style={{ padding: '4px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...ty('cap', { color: T.oakDim }), marginBottom: 14 }}>TODAY · CHECK-IN</div>

        {/* The prompt sits like a quote in a craftsman's notebook */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
          <div style={{ width: 2, background: T.oak, flexShrink: 0, borderRadius: 1 }} />
          <div style={ty('prompt', { color: T.ink, fontSize: 24, lineHeight: 1.3 })}>
            What’s on your job site today?
          </div>
        </div>

        {/* Tap-to-write affordance */}
        <div style={{
          background: T.chalk, borderRadius: R.lg, border: `1px dashed ${T.ruleStrong}`,
          padding: '20px 18px', minHeight: 180,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={ty('body', { color: T.haze, lineHeight: 1.55 })}>
            The thing you can’t stop turning over. The conversation you’re dreading. The decision waiting on you.
            <br /><br />
            One to three paragraphs. Plain words.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...ty('caption', { color: T.graphite }) }}>
            <Ico.clock width={13} height={13} />
            <span>under 5 minutes</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Anchor stats — additive, not a streak */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 4px', borderTop: `1px solid ${T.rule}`, marginBottom: 8 }}>
          <div>
            <div style={ty('cap', { color: T.graphite })}>SITE DAYS · MAY</div>
            <div style={ty('h2', { color: T.ink, fontSize: 22, marginTop: 2 })}>11<span style={{ color: T.graphite, ...ty('spec', { fontSize: 13 }) }}> / 14</span></div>
          </div>
          <Button variant="primary" size="lg" iconRight={<Ico.arrow />}>Start writing</Button>
        </div>
      </div>
      <TabBar active="today" />
    </CheckinShell>
  );
}

// State B — actively typing. Keyboard up.
function CheckinTyping() {
  const text = `My senior eng, Maya, told me in our 1:1 that she wants more autonomy on the migration project. I’ve been reviewing every PR and pulling her into every architecture call. I thought I was helping. She used the word ‘bottleneck.’\n\nI don’t know how to step back without losing the thread. The migration is high-stakes and I’m`;
  return (
    <CheckinShell keyboard>
      <div style={{ padding: '4px 24px 16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ ...ty('cap', { color: T.oakDim }), marginBottom: 12 }}>TODAY · CHECK-IN</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 2, background: T.oak, flexShrink: 0, borderRadius: 1 }} />
          <div style={ty('prompt', { color: T.ink, fontSize: 20, lineHeight: 1.3 })}>
            What’s on your job site today?
          </div>
        </div>

        <div style={{
          flex: 1, minHeight: 0,
          background: T.chalk, borderRadius: R.lg, border: `1.5px solid ${T.ink}`,
          boxShadow: `0 0 0 3px ${T.ruleSoft}`,
          padding: '16px 16px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ ...ty('body', { color: T.ink, fontSize: 15, lineHeight: 1.6 }), whiteSpace: 'pre-wrap', flex: 1 }}>
            {text}<Caret />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.rule}` }}>
            <span style={ty('caption', { color: T.graphite })}>62 words · 2 paragraphs</span>
            <Button variant="primary" size="sm" iconRight={<Ico.arrow />}>Send</Button>
          </div>
        </div>
      </div>
    </CheckinShell>
  );
}

// Coaching response card — used in state C.
function CoachReply({ children }) {
  return (
    <div style={{
      background: T.ink, color: T.chalk, borderRadius: R.lg,
      padding: '18px 18px 16px',
      border: `1px solid ${T.ink}`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 18, height: 18, borderRadius: 3, background: T.oak, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1h6v2H3v6H1V1z" fill={T.ink}/></svg>
        </div>
        <span style={ty('cap', { color: T.oak, fontSize: 10 })}>FOREMAN</span>
        <span style={ty('caption', { color: 'rgba(250,247,242,0.5)', fontSize: 11 })}>· 06:48</span>
      </div>
      {children}
    </div>
  );
}

// State C — coaching delivered.
function CheckinCoaching() {
  return (
    <CheckinShell>
      <div style={{ padding: '4px 20px 100px', flex: 1, overflow: 'auto' }}>
        <div style={{ ...ty('cap', { color: T.oakDim }), marginBottom: 12 }}>TODAY · CHECK-IN · 06:42</div>

        {/* User's own check-in, collapsed */}
        <div style={{
          background: T.chalk, borderRadius: R.lg, border: `1px solid ${T.rule}`,
          padding: '14px 14px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={ty('cap', { color: T.graphite })}>YOU</span>
            <span style={ty('caption', { color: T.graphite })}>3 paragraphs · 92 words</span>
          </div>
          <div style={{ ...ty('body', { color: T.ink2, lineHeight: 1.55, fontSize: 14 }) }}>
            Maya told me she wants more autonomy on the migration. I’ve been reviewing every PR. She called me a bottleneck. <span style={{ color: T.haze }}>Show full…</span>
          </div>
        </div>

        {/* Coaching response */}
        <CoachReply>
          <div style={{ ...ty('bodyL', { color: T.chalk, fontSize: 15.5, lineHeight: 1.55 }), marginBottom: 14 }}>
            Maya named the thing. That’s a gift — most senior engineers just go quiet and start interviewing.
          </div>
          <div style={{ ...ty('body', { color: 'rgba(250,247,242,0.82)', fontSize: 14.5, lineHeight: 1.6 }), marginBottom: 16 }}>
            You’re reviewing every PR because the migration is real and the downside is real. Both true. But your job isn’t to be the smartest person on the diff — it’s to make sure the diff is right when it lands. Different work.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...ty('cap', { color: T.oak, fontSize: 10 }) }}>BEFORE YOUR NEXT 1:1</div>
            {[
              'Name the trade-off out loud: “I’ve been gatekeeping because the cost of a bad migration is real. I don’t want to be the bottleneck either.”',
              'Pick one decision class you’ll stop reviewing — schema changes? infra config? — and tell her which.',
              'Ask what signal she’ll send you when she wants you back in.',
            ].map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{ ...ty('spec', { color: T.oak, fontSize: 12 }), marginTop: 1 }}>0{i+1}</span>
                <span style={ty('body', { color: T.chalk, fontSize: 14.5, lineHeight: 1.5 })}>{line}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(250,247,242,0.12)' }}>
            <Badge variant="oak" size="sm">framing</Badge>
            <Badge variant="outline" size="sm" style={{ color: 'rgba(250,247,242,0.7)', borderColor: 'rgba(250,247,242,0.2)' }}>1:1</Badge>
            <Badge variant="outline" size="sm" style={{ color: 'rgba(250,247,242,0.7)', borderColor: 'rgba(250,247,242,0.2)' }}>delegation</Badge>
          </div>
        </CoachReply>

        {/* Follow-up affordance */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 2 }}>FOLLOW UP</div>
          {['What if she pushes back?', 'Help me draft what to say.', 'What’s the framing principle here?'].map((q) => (
            <div key={q} style={{
              padding: '12px 14px', background: T.chalk, border: `1px solid ${T.rule}`,
              borderRadius: R.md,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              ...ty('body', { color: T.ink2 }),
            }}>
              <span>{q}</span>
              <Ico.arrow width={16} height={16} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Button variant="secondary" size="md" full>Save to library</Button>
          <Button variant="ghost" size="md">Done</Button>
        </div>
      </div>
      <TabBar active="today" />
    </CheckinShell>
  );
}

Object.assign(window, { CheckinEmpty, CheckinTyping, CheckinCoaching });
