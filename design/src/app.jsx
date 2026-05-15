// Foreman — design canvas entry. One DesignCanvas, multiple sections.

function App() {
  return (
    <DesignCanvas>
      <DCSection id="intro" title="Foreman" subtitle="Daily coaching for first-time managers · companion to ‘Under Construction’">
        <DCArtboard id="readme" label="0.0 · README" width={720} height={880}>
          <ReadmeCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="system" title="01 · Design System" subtitle="Palette, type, spacing, components — the kit every screen leans on.">
        <DCArtboard id="palette"    label="01.A · Palette"    width={520} height={880}><DSPalette /></DCArtboard>
        <DCArtboard id="type"       label="01.B · Type"       width={520} height={880}><DSType /></DCArtboard>
        <DCArtboard id="spacing"    label="01.C · Space & form" width={520} height={880}><DSSpacing /></DCArtboard>
        <DCArtboard id="components" label="01.D · Components" width={520} height={1080}><DSComponents /></DCArtboard>
        <DCArtboard id="ds-handoff" label="01.E · Handoff"    width={360} height={880}><BCDesignSystem /></DCArtboard>
      </DCSection>

      <DCSection id="onboarding" title="02 · Onboarding" subtitle="Three screens — collapsed from the brief’s five. ‘Setting up a job site.’">
        <DCArtboard id="ob-1" label="02.A · Identity"  width={410} height={880}><OBIdentity /></DCArtboard>
        <DCArtboard id="ob-2" label="02.B · Challenge" width={410} height={880}><OBChallenge /></DCArtboard>
        <DCArtboard id="ob-3" label="02.C · Cadence"   width={410} height={880}><OBCadence /></DCArtboard>
        <DCArtboard id="ob-handoff" label="02.D · Handoff" width={360} height={880}><BCOnboarding /></DCArtboard>
      </DCSection>

      <DCSection id="checkin" title="03 · Daily Check-in" subtitle="The core ritual. Open app → write → coaching back. Three states of the same surface.">
        <DCArtboard id="ci-empty"    label="03.A · Empty prompt"     width={410} height={880}><CheckinEmpty /></DCArtboard>
        <DCArtboard id="ci-typing"   label="03.B · User typing"      width={410} height={880}><CheckinTyping /></DCArtboard>
        <DCArtboard id="ci-coaching" label="03.C · Coaching reply"   width={410} height={880}><CheckinCoaching /></DCArtboard>
        <DCArtboard id="ci-handoff"  label="03.D · Handoff"          width={360} height={880}><BCCheckin /></DCArtboard>
      </DCSection>

      <DCSection id="home" title="04 · Home" subtitle="Tab two, not tab one (per pushback). The site’s status board.">
        <DCArtboard id="home"         label="04.A · Dashboard" width={410} height={880}><HomeDashboard /></DCArtboard>
        <DCArtboard id="home-handoff" label="04.B · Handoff"   width={360} height={880}><BCHome /></DCArtboard>
      </DCSection>

      <DCSection id="library" title="05 · Situation Library" subtitle="List of past situations + single-situation detail.">
        <DCArtboard id="lib-list"    label="05.A · List view"      width={410} height={880}><LibraryList /></DCArtboard>
        <DCArtboard id="lib-detail"  label="05.B · Situation detail" width={410} height={880}><LibraryDetail /></DCArtboard>
        <DCArtboard id="lib-handoff" label="05.C · Handoff"        width={360} height={880}><BCLibrary /></DCArtboard>
      </DCSection>

      <DCSection id="retro" title="06 · Weekly Retrospective" subtitle="Sunday evening. Three prompts → AI-synthesized one-page site report.">
        <DCArtboard id="retro-form"    label="06.A · Reflection"   width={410} height={880}><RetroReflection /></DCArtboard>
        <DCArtboard id="retro-report"  label="06.B · Site report"  width={410} height={880}><RetroReport /></DCArtboard>
        <DCArtboard id="retro-handoff" label="06.C · Handoff"      width={360} height={880}><BCRetro /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

function ReadmeCard() {
  return (
    <div style={{
      width: '100%', height: '100%', background: T.paper,
      padding: '36px 36px 32px', boxSizing: 'border-box',
      fontFamily: T.fSans, color: T.ink, position: 'relative',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={ty('cap', { color: T.graphite })}>FOREMAN · DESIGN HANDOFF · v0.1</span>
          <span style={ty('cap', { color: T.graphite })}>MAY 2026</span>
        </div>
        <div style={{ height: 1, background: T.rule }} />
      </div>

      {/* Two-column hero: cover + intro */}
      <div style={{ display: 'flex', gap: 28 }}>
        {/* Book cover */}
        <div style={{ flexShrink: 0, width: 220 }}>
          <div style={{
            position: 'relative',
            boxShadow: '0 1px 0 rgba(26,24,22,0.04), 0 18px 40px rgba(26,24,22,0.18), 0 4px 10px rgba(26,24,22,0.08)',
            borderRadius: 2, overflow: 'hidden',
          }}>
            <img
              src="assets/under-construction-cover.jpg"
              alt="Under Construction — front cover"
              style={{ width: '100%', display: 'block' }}
            />
            {/* Subtle spine illusion */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 6,
              background: 'linear-gradient(90deg, rgba(0,0,0,0.18), rgba(0,0,0,0) 80%)' }} />
          </div>
          <div style={{ ...ty('cap', { color: T.graphite, marginTop: 14 }) }}>THE PARENT BOOK</div>
          <div style={ty('label', { color: T.ink, fontSize: 13, marginTop: 4 })}>Under Construction</div>
          <div style={ty('caption', { color: T.graphite, marginTop: 2 })}>by Cayden Farris · 2026</div>
        </div>

        {/* Intro */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Wordmark />
          <div style={{ ...ty('display', { color: T.ink, fontSize: 34, lineHeight: 1.1 }), marginTop: 16, marginBottom: 10 }}>
            A daily coach<br/>for people in their<br/>first year managing.
          </div>
          <div style={{ ...ty('bodyL', { color: T.graphite, fontSize: 15.5, lineHeight: 1.55 }), marginBottom: 18 }}>
            The software companion. Foundation → Framing → Finishing. Job site, not penthouse.
          </div>
          <div style={{ height: 2, background: T.oak, width: 28, marginBottom: 14 }} />
          <div style={{ ...ty('cap', { color: T.oakDim }), marginBottom: 10 }}>WHAT YOU’LL FIND, IN ORDER</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['01', 'Design system', 'palette · type · spacing · components'],
              ['02', 'Onboarding', '3 screens, condensed from 5'],
              ['03', 'Daily Check-in', 'empty · typing · coaching delivered'],
              ['04', 'Home dashboard', 'returning-user view'],
              ['05', 'Situation Library', 'list + detail'],
              ['06', 'Weekly Retro', 'reflection + site report'],
            ].map(([n, t, sub]) => (
              <div key={n} style={{ display: 'flex', gap: 14, paddingBottom: 6, borderBottom: `1px dashed ${T.rule}` }}>
                <span style={{ ...ty('spec', { color: T.oak, fontSize: 12 }), width: 22 }}>{n}</span>
                <div style={{ flex: 1 }}>
                  <div style={ty('label', { color: T.ink, fontSize: 13.5 })}>{t}</div>
                  <div style={ty('caption', { color: T.graphite, marginTop: 1 })}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pushbacks band */}
      <div style={{ borderTop: `1px solid ${T.rule}`, paddingTop: 18 }}>
        <div style={{ ...ty('cap', { color: T.oakDim }), marginBottom: 12 }}>FIVE PUSHBACKS, BEFORE WE BUILT</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 22, rowGap: 10 }}>
          {[
            ['Aesthetic, reframed.', '"Rigorous and grounded" does the work without coding the audience masculine.'],
            ['5 onboarding screens → 3.', 'Sabbath moved to Settings. Time-starved users won’t finish 5 screens.'],
            ['Library: situation type first, phase second.', 'New managers don’t know the framework on day 3.'],
            ['Check-in is the launch surface, not Home.', 'Open app → ritual, not dashboard about the ritual.'],
            ['No streaks. "Site days this month."', 'Additive, not breakable. Streaks weaponize anxiety.'],
            ['Cover stays cobalt + cone. App stays cream.', 'Marketing energy vs. workspace calm. Different jobs.'],
          ].map(([t, sub]) => (
            <div key={t}>
              <div style={ty('body', { color: T.ink, fontSize: 13.5, lineHeight: 1.35 })}>{t}</div>
              <div style={ty('caption', { color: T.graphite, marginTop: 2 })}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ ...ty('caption', { color: T.haze, paddingTop: 12, borderTop: `1px solid ${T.rule}` }) }}>
        Pan + scroll. Click any artboard label to focus. ←/→ steps through a section, ↑/↓ across sections.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
