// Component-breakdown cards. One per screen group. These read like the
// engineering tickets that would go to Claude Code: a tree of shadcn /
// custom components for the surface, with file names and key props.

function BreakdownCard({ title, scope, route, tree, hooks, w = 360, h = 880 }) {
  return (
    <div style={{
      width: w, height: h, background: T.paper, padding: 28, boxSizing: 'border-box',
      fontFamily: T.fSans, color: T.ink, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={ty('cap', { color: T.graphite })}>HANDOFF · CLAUDE CODE</span>
        <span style={ty('cap', { color: T.graphite })}>{route}</span>
      </div>
      <div style={{ height: 1, background: T.rule, marginBottom: 18 }} />
      <div style={{ ...ty('h2', { color: T.ink, fontSize: 22 }), marginBottom: 4 }}>{title}</div>
      <div style={{ ...ty('body', { color: T.graphite, fontSize: 14 }), marginBottom: 20 }}>{scope}</div>

      <div style={{ ...ty('cap', { color: T.oakDim }), marginBottom: 10 }}>COMPONENT TREE</div>
      <pre style={{
        ...ty('spec', { color: T.ink2, fontSize: 12, lineHeight: 1.55 }),
        background: T.chalk, border: `1px solid ${T.rule}`, borderRadius: R.sm,
        padding: '12px 14px', margin: 0, whiteSpace: 'pre',
        overflow: 'hidden',
      }}>{tree}</pre>

      {hooks && (
        <>
          <div style={{ ...ty('cap', { color: T.oakDim }), marginTop: 18, marginBottom: 10 }}>STATE · DATA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hooks.map((h, i) => (
              <div key={i} style={{
                padding: '10px 12px', background: T.chalk, border: `1px solid ${T.rule}`, borderRadius: R.sm,
              }}>
                <div style={{ ...ty('spec', { color: T.blueprint, fontSize: 12 }), marginBottom: 2 }}>{h.name}</div>
                <div style={ty('caption', { color: T.graphite })}>{h.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ position: 'absolute', left: 28, right: 28, bottom: 18, display: 'flex', justifyContent: 'space-between', ...ty('caption', { color: T.haze }) }}>
        <span>shadcn / Tailwind</span><span>v0.1</span>
      </div>
    </div>
  );
}

function BCDesignSystem() {
  return <BreakdownCard
    title="Design system primitives"
    route="@foreman/ui"
    scope="Shared components consumed by every screen. Wrap shadcn defaults with the Foreman token theme."
    tree={`packages/ui/src/
├─ tokens.ts            // T, S, R, TY exports
├─ theme.css            // CSS vars + dark mode pass
├─ Button.tsx           // shadcn Button + variants
│   • variant: primary | secondary | ghost | danger
│   • size: sm | md | lg
│   • state: default | hover | pressed
│                       | disabled | loading
├─ Card.tsx
├─ Input.tsx            // label + hint + error
├─ Textarea.tsx         // autosize, word count
├─ Badge.tsx            // 7 variants
├─ PhaseTag.tsx         // foundation / framing / finishing
├─ Progress.tsx         // segmented | linear
├─ EmptyState.tsx
├─ Modal.tsx            // shadcn Dialog wrapper
├─ Icon/*.tsx           // 14 monoline icons
└─ Spinner.tsx`}
    hooks={[
      { name: 'useTheme()', desc: 'reads OS preference; persists override to localStorage.' },
      { name: 'useReducedMotion()', desc: 'disables transitions for users with prefers-reduced-motion.' },
    ]}
  />;
}

function BCOnboarding() {
  return <BreakdownCard
    title="Onboarding flow"
    route="/welcome"
    scope="3-step site setup. State held in URL + a Zustand slice so refresh doesn't lose progress."
    tree={`app/(onboarding)/
├─ layout.tsx           // <OBShell> · progress segments
├─ identity/page.tsx
│   ├─ <Input name role>
│   ├─ <StampGrid> · promoted-when (4)
│   └─ <StampRow>   · team-size (4)
├─ challenge/page.tsx
│   └─ <ChallengeList> · 6 stamped rows
│       · radio semantics, keyboard-nav
├─ cadence/page.tsx
│   ├─ <TimeStamps> · 3 daily slots
│   ├─ <DayStamps>  · 4 retro days
│   └─ <Reassurance> · oak callout
└─ done/route.ts        // server: writes profile`}
    hooks={[
      { name: 'useOnboardingStore()', desc: 'Zustand: { name, role, promotedAt, teamSize, challenge, dailyAt, retroDay }.' },
      { name: 'POST /api/profile', desc: 'commit on "Open the site". Idempotent by userId.' },
    ]}
  />;
}

function BCCheckin() {
  return <BreakdownCard
    title="Daily Check-in"
    route="/today"
    scope="The launch surface. One screen, three states driven by the same component."
    tree={`app/(app)/today/
├─ page.tsx             // <CheckinShell>
│   ├─ <AppBar>
│   ├─ <PromptQuote>    // serif, oak rule
│   ├─ <CheckinEditor>  // controlled textarea
│   │   • state: empty | typing | sent
│   │   • word-count + 5-min timer
│   ├─ <CoachReply>     // dark card
│   │   ├─ <CoachOpener>
│   │   ├─ <CoachActions> · 3 numbered
│   │   └─ <PhaseTags>
│   ├─ <FollowUpRow>    // suggested probes
│   └─ <CheckinFooter>  // save / done
└─ actions.ts           // server: stream coaching`}
    hooks={[
      { name: 'useDraft()', desc: 'persists textarea to indexedDB every 800ms so refresh never loses words.' },
      { name: 'streamCoaching(prompt, body)', desc: 'server action; streams tokens via React Server Components.' },
      { name: 'classifyPhase(body)', desc: 'tags situation as foundation/framing/finishing after send.' },
    ]}
  />;
}

function BCLibrary() {
  return <BreakdownCard
    title="Situation Library"
    route="/library"
    scope="List with search + filters. Detail at /library/[id]. Phase is a lens, not the taxonomy."
    tree={`app/(app)/library/
├─ page.tsx             // list
│   ├─ <SearchBar> ⌘K
│   ├─ <TagFilters>     · primary
│   ├─ <PhaseLens>      · secondary
│   └─ <SituationList>
│       └─ <SituationRow>
│           ├─ <DateStamp>
│           ├─ <PhaseTag> + <Badge> tags
│           └─ <Excerpt clamp={2}>
├─ [id]/page.tsx        // detail
│   ├─ <MetaTicket>
│   ├─ <CheckinBody>
│   ├─ <CoachReply>     // re-used
│   └─ <OutcomeNote>    // user-added later
└─ api/search/route.ts  // pg full-text`}
    hooks={[
      { name: 'useSituations(filter)', desc: 'React Query; paginated; cache by tag+phase key.' },
      { name: 'useCommandK()', desc: 'cmdk dialog; fuzzy over title + coaching text.' },
    ]}
  />;
}

function BCRetro() {
  return <BreakdownCard
    title="Weekly Retrospective"
    route="/retro/[week]"
    scope="3-step structured reflection → AI-synthesized site report. Sunday 7pm by default."
    tree={`app/(app)/retro/[week]/
├─ layout.tsx           // <RetroShell> · 3 dots
├─ wins/page.tsx
├─ struggles/page.tsx
├─ lessons/page.tsx
│   ├─ <Textarea autosize>
│   └─ <SituationsThisWeek>
└─ report/page.tsx      // <SiteReport>
    ├─ <ReportHeader>   · oak rule
    ├─ <Throughline>    · italic emphasis
    ├─ <WeekShape>      · wins/struggles counts
    ├─ <Pullquote>      · user's own line
    └─ <NextWeekCues>   · A / B / C`}
    hooks={[
      { name: 'useRetroDraft(week)', desc: 'wins/struggles/lessons saved per-step. Resumable.' },
      { name: 'synthesizeReport({week, drafts, situations})', desc: 'server action; uses week\u2019s situations + drafts.' },
      { name: 'scheduleNotification(retroDay, 19:00)', desc: 'cron in user TZ.' },
    ]}
  />;
}

function BCHome() {
  return <BreakdownCard
    title="Home dashboard"
    route="/home (tab 2)"
    scope="Returning user view. Check-in remains primary; this aggregates state."
    tree={`app/(app)/home/page.tsx
├─ <AppBar greeting={ampm}>
├─ <TodaysPromptCard>   · dark, oak CTA
│   • collapses if already done today
├─ <StatsRow>
│   ├─ <Stat name="site days" />
│   └─ <Stat name="next retro" />
├─ <StillChewing>       · last coaching
│   • links to /library/[id]
│   • surfaces re: upcoming 1:1
└─ <BuildBreakdown>     · phase counts`}
    hooks={[
      { name: 'useSiteDaysThisMonth()', desc: 'returns count + total; never "streak".' },
      { name: 'useStillChewing()', desc: 'last 7d coaching that mentions a calendar-event title.' },
      { name: 'usePhaseDistribution(timeframe)', desc: 'count check-ins by classified phase.' },
    ]}
  />;
}

Object.assign(window, { BCDesignSystem, BCOnboarding, BCCheckin, BCLibrary, BCRetro, BCHome });
