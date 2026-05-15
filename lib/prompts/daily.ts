import type { FrameworkPhase } from "@/lib/database.types";

// 30 prompts per phase, written in the Under Construction voice (direct,
// jobsite, no flattery). Pulled from the book's chapter themes so the
// prompt and the coaching that follows share a vocabulary.

const FOUNDATION_PROMPTS: readonly string[] = [
  "What did you avoid doing today because you didn't want to be uncomfortable?",
  "Where in the last 24 hours did your behavior contradict a value you say you hold?",
  "If your team is quietly copying you, what habit are they picking up that you'd take back?",
  "What are you carrying right now that nobody assigned to you?",
  "Where today did you choose to look qualified instead of be honest?",
  "What's the question you're most afraid someone on your team will ask you?",
  "When were you most reactive this week, and what was actually being threatened?",
  "What did you say yes to this week that you shouldn't have, and why didn't you say no?",
  "Whose approval did you chase today that you don't actually respect?",
  "What's one thing about your identity as a leader that's still borrowed from someone else?",
  "Where are you mistaking busyness for being needed?",
  "When did you last bring your real motivations into honest examination — not the polished version?",
  "What's a failure from this month that you've started using as information instead of carrying as a verdict?",
  "Where is the gap widest right now between who you are in public and who you are in the quiet moments?",
  "What's the principle you'd want your team to remember about how you led, even if they forget every decision you made?",
  "Who do you owe an account to that you've been avoiding giving one?",
  "What did pressure reveal about you this week that you haven't admitted yet?",
  "Where today did you show up reacting instead of building?",
  "What's the call you're hearing right now that you're pretending not to hear?",
  "When did you last feel like you were part of something bigger than yourself at work, and what made that real?",
  "What's one piece of feedback you received recently that you dismissed too quickly?",
  "Where is your performance trying to tell you who you are?",
  "If today you removed the title from your name, what would still be true about how you lead?",
  "What part of your story are you hiding because it doesn't fit the version of yourself you're presenting?",
  "When was the last time you made a decision because it was right, knowing it would cost you something?",
  "What's the thing you're hoping no one notices about your leadership right now?",
  "Where today did you grow more by what you didn't say than by what you did?",
  "What standard do you hold for your team that you've quietly stopped holding for yourself?",
  "What's an early commitment you made to yourself as a leader that you've slowly walked away from?",
  "When did you last sit somewhere quiet long enough to hear what your motivations are actually saying?",
];

const FRAMING_PROMPTS: readonly string[] = [
  "Where on your team is there ambiguity about who owns what?",
  "What's one expectation you've never explicitly said out loud to someone who is being measured against it?",
  "Where is your effort outrunning your structure right now?",
  "Who on your team most needs you to slow your pace to theirs this week?",
  "What 1:1 are you dreading, and what is it about?",
  "Where did you charge ahead this week without giving someone room to find their own yes?",
  "What system on your team feels like it works only because you're personally holding it up?",
  "Whose growth are you blocking by doing it yourself?",
  "Where on your team is the same problem coming back, and what part of the structure keeps producing it?",
  "What feedback have you been softening because you're afraid of the relationship?",
  "Where are you applying the same training to people with very different histories?",
  "Whose potential are you treating as a problem instead of as information?",
  "What blueprint did you skip writing before you started building this initiative?",
  "Where did you swing harder this week when you should have stopped to sharpen the axe?",
  "What is one piece of context one of your reports needs from you to do their job that you haven't shared?",
  "Who on your team is acting like an alternate when they could be in the lane?",
  "Where is your communication clear in your head but unclear in their inbox?",
  "What conversation needs to happen this week that's not on anyone's calendar yet?",
  "Where are you using urgency as a substitute for clarity?",
  "Who taught you something this week that you haven't yet thanked or told?",
  "What sediment are you laying in someone right now that you may never see them stand on?",
  "What's the standard you're holding constant, and what's the means you need to change for one person?",
  "Where did you confuse your pace for the team's progress this week?",
  "What's one decision you've been avoiding because the right answer will disappoint someone?",
  "Who is the silent voice on your team — the one whose absence in the room you need to ask about?",
  "Where on your team is trust running thin, and what specific deposit could you make this week?",
  "What's a process you inherited and have never questioned out loud?",
  "What did you assume someone knew this week that they didn't?",
  "Where today did you treat someone like who they already are instead of who they're becoming?",
  "What's one structural change you could make this week that would matter more than working harder?",
];

const FINISHING_PROMPTS: readonly string[] = [
  "What's one thing your team does well that you've never told them you noticed?",
  "Where on your team is the floor showing wear that you've been walking past?",
  "What one percent improvement is available to you this week that nobody is asking for?",
  "If you left your role tomorrow, what would your team be unable to do without you — and is that a strength or a failure?",
  "What's a quiet habit you've kept this year that has changed what kind of leader you are?",
  "Who on your team is ready for the assignment that requires the version of them that doesn't fully exist yet?",
  "What story about your team's culture is true in the meetings, but not in the hallway?",
  "Where did you correct without crushing this week — and where did you crush?",
  "What's one thing you accomplished this year that you've been minimizing instead of owning?",
  "Who built something into you that the people on your team are now standing on, and have you told them?",
  "What ritual on your team has lost its meaning and is now just being performed?",
  "Where is your team's culture exactly as grounded as you are, and where has it outgrown you?",
  "What's one piece of recognition you owe someone that's been overdue more than a week?",
  "What does your team think the real measure of success is here — and is it the one you'd want?",
  "Where on your team is repetition starting to feel like ritual instead of refinement?",
  "Who on your team is doing the right thing one more time when they could have stopped, and have you noticed out loud?",
  "What's a tradition or pattern on your team you'd want to outlive you?",
  "Where today did you treat a result as more important than the person who produced it?",
  "What's one decision you made this week that you'd be proud to be remembered by?",
  "Who is your succession plan for the role you're currently in, and what are you doing to make them ready?",
  "Where on your team is the quality of small things slipping, and what is that telling you?",
  "What's one thing about your leadership that has refined since last year that nobody on your team has commented on?",
  "Who do you serve downstream that you've never met, and how does that change what you ship?",
  "What's the version of your team you're building toward that wouldn't make sense to a stranger in the meeting?",
  "Where is your team built around your strengths in a way that will break the moment you're not there?",
  "What is the inspection you sense is coming, and what part of the structure are you least sure will hold?",
  "Where did you hand off something this week that you used to insist on holding?",
  "What's a piece of culture you're tolerating that you wouldn't have tolerated on day one?",
  "Who walked through your door this week and felt the floor — what did it actually tell them?",
  "What's one thing you've built this year that was never for you, and have you fully given it away yet?",
];

const PROMPTS_BY_PHASE: Record<FrameworkPhase, readonly string[]> = {
  foundation: FOUNDATION_PROMPTS,
  framing: FRAMING_PROMPTS,
  finishing: FINISHING_PROMPTS,
};

// Stable rotation: index a user's checkin_date into their phase's prompt list.
// Use a fixed epoch so the same date always maps to the same prompt for the
// same phase. We salt by user id so two users on the same day don't get the
// same prompt.
function hashUserId(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function promptForDay(
  phase: FrameworkPhase,
  checkinDateISO: string,
  userId: string,
): string {
  const list = PROMPTS_BY_PHASE[phase];
  const epoch = new Date("2025-01-01T00:00:00Z").getTime();
  const day = Math.floor(
    (new Date(`${checkinDateISO}T00:00:00Z`).getTime() - epoch) / 86_400_000,
  );
  const index = (day + hashUserId(userId)) % list.length;
  return list[(index + list.length) % list.length];
}

export function promptCountForPhase(phase: FrameworkPhase): number {
  return PROMPTS_BY_PHASE[phase].length;
}
