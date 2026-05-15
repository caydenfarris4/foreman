// Weekly Retrospective — two surfaces.
// 1. The structured reflection (wins / struggles / lessons).
// 2. The AI-synthesized "site report" — one page, foreman's voice.

function RetroReflection() {
  return (
    <Phone>
      <div style={{ background: T.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingTop: 56, padding: '56px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: T.ink2 }}>
            <Ico.x width={18} height={18} />
            <Wordmark />
          </div>
          <span style={ty('cap', { color: T.graphite, fontSize: 10 })}>SUN · MAY 18 · 19:14</span>
        </div>

        <div style={{ flex: 1, padding: '24px 20px 100px', overflow: 'auto' }}>
          <div style={{ ...ty('cap', { color: T.oakDim }), marginBottom: 6 }}>WEEK 20 RETRO · 3 OF 3</div>
          <div style={{ ...ty('h1', { color: T.ink, fontSize: 26, lineHeight: 1.2 }), marginBottom: 6 }}>
            What did you learn this week?
          </div>
          <div style={{ ...ty('body', { color: T.graphite }), marginBottom: 22 }}>
            One sentence is fine. The honest one is better than the polished one.
          </div>

          {/* Progress through retro */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 22 }}>
            {[
              { label: 'Wins · what landed', done: true, n: '01' },
              { label: 'Struggles · what hurt', done: true, n: '02' },
              { label: 'Lessons · what changed', done: false, n: '03', active: true },
            ].map((s) => (
              <div key={s.n} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: R.sm,
                background: s.active ? T.ink : 'transparent',
                color: s.active ? T.chalk : T.ink2,
                border: `1px solid ${s.active ? T.ink : T.rule}`,
              }}>
                <span style={ty('spec', { color: s.active ? T.oak : T.graphite, fontSize: 12 })}>{s.n}</span>
                <span style={ty('label', { color: s.active ? T.chalk : T.ink2, fontSize: 13, flex: 1 })}>{s.label}</span>
                {s.done && <Ico.check width={14} height={14} color={T.moss} style={{ color: T.moss }} />}
              </div>
            ))}
          </div>

          <Textarea
            label="One real lesson — five words or fifty"
            value={`I keep thinking my job is to be useful in every meeting. The Maya conversation taught me the opposite — sometimes my job is to be absent on purpose.\n\nDelegation isn’t a gift to her. It’s the work.`}
            state="focus"
            minHeight={140}
          />

          <div style={{ marginTop: 22 }}>
            <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>THIS WEEK · 5 SITUATIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { d: 'M', t: 'Vance scope conversation', phase: 'framing' },
                { d: 'T', t: 'Maya / bottleneck', phase: 'framing' },
                { d: 'W', t: 'Lost temper at standup', phase: 'foundation' },
                { d: 'T', t: 'Tomás Friday feedback prep', phase: 'foundation' },
                { d: 'F', t: 'Migration shipped clean', phase: 'framing' },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', background: T.chalk, border: `1px solid ${T.rule}`, borderRadius: R.sm,
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 2, background: T.paper2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...ty('spec', { fontSize: 10, color: T.graphite }),
                  }}>{s.d}</span>
                  <span style={{ ...ty('body', { color: T.ink2, fontSize: 14 }), flex: 1 }}>{s.t}</span>
                  <PhaseTag phase={s.phase} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 20px 40px',
          background: 'linear-gradient(180deg, rgba(245,241,234,0) 0%, rgba(245,241,234,1) 30%)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <Button variant="ghost" size="lg" icon={<Ico.back width={14} height={14} />}>Back</Button>
          <div style={{ flex: 1 }} />
          <Button variant="primary" size="lg" iconRight={<Ico.arrow />}>Build the report</Button>
        </div>
      </div>
    </Phone>
  );
}

// Site Report — the one-page synthesis.
function RetroReport() {
  return (
    <Phone>
      <div style={{ background: T.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingTop: 56, padding: '56px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: T.ink2 }}>
            <Ico.back width={18} height={18} />
            <span style={ty('cap', { color: T.graphite })}>WEEK 20 · SITE REPORT</span>
          </div>
          <Ico.more width={20} height={20} />
        </div>

        <div style={{ flex: 1, padding: '20px 20px 100px', overflow: 'auto' }}>
          {/* Document-style header — feels like a printed worksheet */}
          <div style={{
            background: T.chalk, border: `1px solid ${T.rule}`, borderRadius: R.lg,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${T.rule}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span style={ty('cap', { color: T.graphite, fontSize: 10 })}>FOREMAN · SITE REPORT</span>
                <span style={ty('cap', { color: T.graphite, fontSize: 10 })}>WK 20 · 2026</span>
              </div>
              <div style={{ height: 2, background: T.oak, width: 28, marginBottom: 14 }} />
              <div style={ty('h1', { color: T.ink, fontSize: 24, lineHeight: 1.2 })}>
                The week you finally stepped back.
              </div>
              <div style={{ ...ty('caption', { color: T.graphite, marginTop: 8 }) }}>
                May 12 – 18 · 5 check-ins · 1 hard 1:1 · 0 fires
              </div>
            </div>

            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.rule}` }}>
              <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>THE THROUGH-LINE</div>
              <div style={{ ...ty('bodyL', { color: T.ink, fontSize: 15.5, lineHeight: 1.6 }) }}>
                Three of your five check-ins were about the same muscle: <span style={{ borderBottom: `1px solid ${T.oak}`, paddingBottom: 1 }}>knowing when to be in the work and when to be on it</span>. You called yourself a bottleneck on Tuesday. By Friday the migration shipped clean without your review.
              </div>
            </div>

            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.rule}` }}>
              <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 12 }}>THIS WEEK’S SHAPE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span style={ty('h2', { color: T.moss, fontSize: 20 })}>3</span>
                    <span style={ty('cap', { color: T.graphite, fontSize: 10 })}>WINS</span>
                  </div>
                  <div style={ty('body', { color: T.ink2, fontSize: 13.5, lineHeight: 1.5 })}>Migration shipped. Boundary with Vance held. Maya 1:1 honest.</div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span style={ty('h2', { color: T.rust, fontSize: 20 })}>2</span>
                    <span style={ty('cap', { color: T.graphite, fontSize: 10 })}>STRUGGLES</span>
                  </div>
                  <div style={ty('body', { color: T.ink2, fontSize: 13.5, lineHeight: 1.5 })}>Snapped at Priya in standup. Avoided Tomás conversation twice.</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.rule}` }}>
              <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>WHAT YOU SAID</div>
              <div style={{ ...ty('prompt', { color: T.ink, fontSize: 17, lineHeight: 1.45 }) }}>
                “Sometimes my job is to be absent on purpose.”
              </div>
            </div>

            <div style={{ padding: '18px 20px' }}>
              <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>FOR NEXT WEEK</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { n: 'A', t: 'Have the Tomás conversation by Wednesday. You’ve deferred it twice.' },
                  { n: 'B', t: 'Repair with Priya. One sentence. Privately, today.' },
                  { n: 'C', t: 'The Vance scope boundary needs writing down — in Slack, where you can both see it.' },
                ].map((c) => (
                  <div key={c.n} style={{ display: 'flex', gap: 12 }}>
                    <span style={{ ...ty('spec', { color: T.oak, fontSize: 13 }) }}>{c.n}</span>
                    <span style={ty('body', { color: T.ink2, fontSize: 14.5, lineHeight: 1.5 })}>{c.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button variant="secondary" size="md" full>Save week</Button>
            <Button variant="ghost" size="md">Share</Button>
          </div>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, { RetroReflection, RetroReport });
