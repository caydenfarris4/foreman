// Situation Library — list + detail.
// Primary taxonomy: situation type. Phase is a secondary lens (per pushback).

const SITUATIONS = [
  { id: 's1', date: 'May 13', title: 'Maya called me a bottleneck',
    excerpt: 'I’ve been reviewing every PR. She used the word ‘bottleneck.’ I don’t know how to step back without losing the thread.',
    phase: 'framing', tags: ['1:1', 'delegation'] },
  { id: 's2', date: 'May 11', title: 'Saying no to the Vance project',
    excerpt: 'Director keeps asking us to take on the migration *and* the new mobile spike. Either we drop the migration or we hire two people.',
    phase: 'framing', tags: ['scope', 'managing-up'] },
  { id: 's3', date: 'May 09', title: 'Telling Tomás the work isn’t there yet',
    excerpt: 'Three months in and he’s still missing the bar on system design. Friday is review week. I keep softening the message.',
    phase: 'foundation', tags: ['feedback', 'underperformer'] },
  { id: 's4', date: 'May 07', title: 'I lost my temper in standup',
    excerpt: 'I snapped at Priya for the third missed deploy. She went quiet for the rest of standup. Everyone saw it.',
    phase: 'foundation', tags: ['self', 'repair'] },
  { id: 's5', date: 'May 05', title: 'Hiring: senior or two mids?',
    excerpt: 'Got headcount for one senior. We could do two mids if I lose the title. Pat would take the senior; the mids would lift the median.',
    phase: 'framing', tags: ['hiring'] },
  { id: 's6', date: 'May 02', title: 'The team’s ritual I keep forgetting',
    excerpt: 'We used to do a five-minute retro at end of standup on Fridays. Stopped during the crunch. Should I bring it back, or let it die?',
    phase: 'finishing', tags: ['rituals', 'culture'] },
];

function FilterChip({ label, active, count, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: R.sm,
      background: active ? T.ink : 'transparent',
      color: active ? T.chalk : T.ink2,
      border: `1px solid ${active ? T.ink : T.rule}`,
      ...ty('label', { fontSize: 12, color: active ? T.chalk : T.ink2 }),
      ...style,
    }}>
      {label}
      {count !== undefined && <span style={ty('spec', { color: active ? 'rgba(250,247,242,0.6)' : T.graphite, fontSize: 11 })}>{count}</span>}
    </span>
  );
}

function LibraryList() {
  return (
    <Phone>
      <div style={{ background: T.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          leading={<Wordmark />}
          trailing={<Ico.plus width={20} height={20} />}
          eyebrow="62 SITUATIONS · 14 WEEKS"
          title="Library"
        />

        <div style={{ padding: '4px 20px 8px' }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: T.chalk, border: `1px solid ${T.rule}`,
            padding: '0 14px', height: 44, borderRadius: R.md,
          }}>
            <Ico.search width={18} height={18} color={T.graphite} style={{ color: T.graphite }} />
            <span style={ty('body', { color: T.haze, flex: 1 })}>Search situations, coaching…</span>
            <span style={{ ...ty('spec', { color: T.graphite, fontSize: 11 }) }}>⌘K</span>
          </div>

          {/* Type filters (primary) */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14, overflowX: 'auto', flexWrap: 'wrap' }}>
            <FilterChip label="All" count={62} active />
            <FilterChip label="1:1" count={18} />
            <FilterChip label="feedback" count={11} />
            <FilterChip label="scope" count={9} />
            <FilterChip label="hiring" count={7} />
            <FilterChip label="conflict" count={5} />
          </div>

          {/* Phase as secondary lens */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.rule}` }}>
            <span style={ty('cap', { color: T.graphite, fontSize: 10 })}>PHASE</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <PhaseTag phase="foundation" /><span style={ty('spec', { color: T.graphite, fontSize: 11 })}>18</span>
              <PhaseTag phase="framing"    style={{ marginLeft: 8 }} /><span style={ty('spec', { color: T.graphite, fontSize: 11 })}>32</span>
              <PhaseTag phase="finishing"  style={{ marginLeft: 8 }} /><span style={ty('spec', { color: T.graphite, fontSize: 11 })}>12</span>
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 110px' }}>
          {SITUATIONS.map((s, i) => (
            <div key={s.id} style={{
              padding: '14px 0',
              borderTop: i === 0 ? `1px solid ${T.rule}` : 'none',
              borderBottom: `1px solid ${T.rule}`,
              display: 'flex', gap: 14,
            }}>
              <div style={{ width: 38, flexShrink: 0, paddingTop: 2 }}>
                <div style={ty('cap', { color: T.graphite, fontSize: 10 })}>{s.date.split(' ')[0].toUpperCase()}</div>
                <div style={ty('h2', { color: T.ink, fontSize: 20, lineHeight: 1 })}>{s.date.split(' ')[1]}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <PhaseTag phase={s.phase} />
                  {s.tags.map((t) => <Badge key={t} variant="neutral" size="sm">{t}</Badge>)}
                </div>
                <div style={{ ...ty('label', { color: T.ink, fontSize: 15 }), marginBottom: 4 }}>{s.title}</div>
                <div style={{ ...ty('body', { color: T.graphite, fontSize: 13.5, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
                  {s.excerpt}
                </div>
              </div>
            </div>
          ))}
          <div style={{ ...ty('caption', { color: T.graphite, textAlign: 'center', marginTop: 16 }) }}>
            56 more · pull to see April
          </div>
        </div>
        <TabBar active="library" />
      </div>
    </Phone>
  );
}

// Detail view — single situation + coaching + follow-ups
function LibraryDetail() {
  return (
    <Phone>
      <div style={{ background: T.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingTop: 56, padding: '56px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: T.ink2 }}>
            <Ico.back />
            <span style={ty('cap', { color: T.graphite })}>LIBRARY</span>
          </div>
          <Ico.more width={20} height={20} />
        </div>

        <div style={{ flex: 1, padding: '12px 20px 100px', overflow: 'auto' }}>
          {/* Metadata strip — feels like a job ticket */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 14, rowGap: 4,
            padding: '12px 14px', background: T.chalk, border: `1px solid ${T.rule}`, borderRadius: R.md,
            marginBottom: 18,
          }}>
            <span style={ty('cap', { color: T.graphite })}>FILED</span>
            <span style={ty('spec', { color: T.ink2 })}>Tue, May 13 · 06:42</span>
            <span style={ty('cap', { color: T.graphite })}>PHASE</span>
            <span><PhaseTag phase="framing" /></span>
            <span style={ty('cap', { color: T.graphite })}>TAGS</span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge variant="neutral" size="sm">1:1</Badge>
              <Badge variant="neutral" size="sm">delegation</Badge>
              <Badge variant="neutral" size="sm">Maya</Badge>
            </span>
          </div>

          <div style={{ ...ty('h1', { color: T.ink, fontSize: 24, lineHeight: 1.2 }), marginBottom: 18 }}>
            Maya called me a bottleneck
          </div>

          {/* Your check-in */}
          <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 8 }}>YOU WROTE</div>
          <div style={{ ...ty('body', { color: T.ink2, lineHeight: 1.6, fontSize: 14.5 }), marginBottom: 8 }}>
            My senior eng, Maya, told me in our 1:1 that she wants more autonomy on the migration project. I’ve been reviewing every PR and pulling her into every architecture call. I thought I was helping. She used the word ‘bottleneck.’
          </div>
          <div style={{ ...ty('body', { color: T.ink2, lineHeight: 1.6, fontSize: 14.5 }), marginBottom: 22 }}>
            I don’t know how to step back without losing the thread. The migration is high-stakes and I’m the one who scoped it.
          </div>

          {/* Coaching */}
          <CoachReply>
            <div style={{ ...ty('bodyL', { color: T.chalk, fontSize: 15, lineHeight: 1.55 }), marginBottom: 12 }}>
              Maya named the thing. That’s a gift — most senior engineers just go quiet and start interviewing.
            </div>
            <div style={{ ...ty('body', { color: 'rgba(250,247,242,0.82)', fontSize: 14, lineHeight: 1.6 }) }}>
              Different work. You’re reviewing every PR because the cost of a bad migration is real. Your job isn’t to be the smartest person on the diff — it’s to make sure the diff is right when it lands.
            </div>
          </CoachReply>

          {/* Outcome — written by the user later */}
          <div style={{ marginTop: 18 }}>
            <div style={{ ...ty('cap', { color: T.graphite }), marginBottom: 8 }}>WHAT HAPPENED · ADDED FRI</div>
            <div style={{
              padding: '14px 14px', background: T.oakWash, borderLeft: `2px solid ${T.oak}`,
              borderRadius: '0 6px 6px 0',
              ...ty('body', { color: T.ink2, lineHeight: 1.6, fontSize: 14.5 }),
            }}>
              Told her I’ll stop reviewing infra PRs. We agreed she pings me only for schema. Felt like giving up the keys to my own car. Migration shipped on Thursday.
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
            <Button variant="secondary" size="md" full icon={<Ico.note width={14} height={14} />}>Add outcome</Button>
            <Button variant="ghost" size="md" icon={<Ico.tag width={14} height={14} />}>Retag</Button>
          </div>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, { LibraryList, LibraryDetail });
