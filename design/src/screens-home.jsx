// Home dashboard. Pushed back on this in the brief: the *first* surface
// is the check-in itself. This is tab-2 — the dashboard view of the site,
// useful for returning users who want to see where they are.

function HomeDashboard() {
  return (
    <Phone>
      <div style={{ background: T.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          leading={<Wordmark />}
          trailing={
            <>
              <Ico.search width={20} height={20} />
              <div style={{ width: 28, height: 28, borderRadius: 14, background: T.ink, color: T.chalk, display: 'flex', alignItems: 'center', justifyContent: 'center', ...ty('cap', { color: T.chalk, fontSize: 10 }) }}>AP</div>
            </>
          }
          eyebrow="WEDNESDAY · MAY 14"
          title="Morning, Alex."
        />

        <div style={{ flex: 1, padding: '8px 20px 100px', overflow: 'auto' }}>
          {/* Today's check-in status (primary action even on the dashboard) */}
          <div style={{
            background: T.ink, color: T.chalk, borderRadius: R.lg,
            padding: '18px 18px', marginBottom: 14, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 16, right: 16, ...ty('cap', { color: T.oak, fontSize: 10 }) }}>NOT YET</div>
            <div style={{ ...ty('cap', { color: 'rgba(250,247,242,0.55)' }), marginBottom: 14 }}>TODAY · CHECK-IN</div>
            <div style={{ ...ty('prompt', { color: T.chalk, fontSize: 19, lineHeight: 1.3 }), marginBottom: 18 }}>
              What’s on your job site today?
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={ty('caption', { color: 'rgba(250,247,242,0.55)' })}>under 5 minutes</span>
              <Button variant="primary" size="md" iconRight={<Ico.arrow />} style={{ background: T.oak, borderColor: T.oak, color: T.ink }}>Start</Button>
            </div>
          </div>

          {/* Stats grid — additive, not punitive */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <Card padding={14}>
              <Stat label="SITE DAYS · MAY" value={<span>11<span style={{ ...ty('spec', { color: T.graphite, fontSize: 14 }) }}> / 14</span></span>} sub="Most you’ve logged in a month." />
            </Card>
            <Card padding={14}>
              <Stat label="NEXT RETRO" value={<span>Sun<span style={{ ...ty('spec', { color: T.graphite, fontSize: 14 }) }}> · 4d</span></span>} sub="May 18 · 19:00" />
            </Card>
          </div>

          {/* Yesterday's coaching, surfaced as a reminder */}
          <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>STILL CHEWING · FROM YESTERDAY</div>
          <Card padding={16} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <Badge variant="oak" size="sm">framing</Badge>
              <Badge variant="neutral" size="sm">1:1</Badge>
              <Badge variant="neutral" size="sm">delegation</Badge>
            </div>
            <div style={{ ...ty('bodyL', { color: T.ink, fontSize: 15.5, lineHeight: 1.45 }), marginBottom: 10 }}>
              “Your job isn’t to be the smartest person on the diff — it’s to make sure the diff is right when it lands.”
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={ty('caption', { color: T.graphite })}>Maya · 1:1 tomorrow at 14:00</span>
              <span style={{ ...ty('label', { color: T.ink2, fontSize: 13 }), display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <Ico.arrow width={14} height={14} />
              </span>
            </div>
          </Card>

          {/* Phase progress strip */}
          <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 10 }}>YOUR BUILD</div>
          <Card padding={16}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
              {[
                { name: 'foundation', n: 18, color: T.foundation },
                { name: 'framing',    n: 24, color: T.framing },
                { name: 'finishing',  n: 4,  color: T.finishing },
              ].map((p) => (
                <div key={p.name}>
                  <div style={{ height: 3, background: p.color, marginBottom: 8 }} />
                  <div style={{ ...ty('h2', { fontSize: 22, color: T.ink, lineHeight: 1 }) }}>{p.n}</div>
                  <div style={ty('cap', { color: T.graphite, fontSize: 10, marginTop: 4 })}>{p.name.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div style={{ ...ty('caption', { color: T.graphite, paddingTop: 10, borderTop: `1px solid ${T.rule}` }) }}>
              Most of your sessions sit in framing. That tracks — month four is when team mechanics get loud.
            </div>
          </Card>
        </div>
        <TabBar active="today" />
      </div>
    </Phone>
  );
}

Object.assign(window, { HomeDashboard });
