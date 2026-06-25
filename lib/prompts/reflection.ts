// Sabbath reflection prompts. The sabbath is not a pause — it is a day set
// apart for reflection, faith, personal growth, and meditation, so the builder
// steps back into something larger than the work.
//
// Voice follows the Under Construction governance: faith-present without being
// preachy, every faith-adjacent line paired with a universal application,
// never assuming the user's tradition, never sermonizing. These are written to
// be true and useful whether the reader shares Cayden's faith or none at all.

const REFLECTION_PROMPTS: readonly string[] = [
  "Where did you glimpse something larger than yourself this week, and did you let it change you?",
  "What are you grateful for today that you did not build on your own?",
  "Who in your life are you accountable to, and have you honored that this week?",
  "Sit with the quiet for a moment. What is your purpose asking of you that the noise has been drowning out?",
  "What would it look like to lead from settled identity instead of borrowed confidence?",
  "Name a relationship that has carried you. Have you told them what they mean?",
  "Where have you been striving to arrive instead of choosing to keep building?",
  "What belief anchors you when the pressure comes, and is it still solid?",
  "What did this week cost you, and what did it teach you?",
  "Where do you need to extend forgiveness, including to yourself?",
  "What is one small, unseen act of integrity you can carry into the coming week?",
  "When you are quiet enough to listen, what are your motivations actually saying?",
  "What does rest reveal that the work keeps hidden?",
  "Who are you becoming, and is that the person you set out to build?",
  "What gift have you been holding only for yourself that was meant to be given?",
  "Where is your life pointed, and does your daily work agree with it?",
  "What are you carrying right now that was never yours to carry?",
  "Name a season of quiet, invisible work in your past. What did it become?",
  "What would change this week if you led from gratitude instead of fear?",
  "Where have you confused your title with your identity?",
  "What is one thing you can set down today to make room for what matters?",
  "Who needs you to show up before you feel ready?",
  "What truth have you been avoiding because facing it would cost you something?",
  "What does it mean, for you, to be part of something bigger than yourself?",
];

// FNV-1a, stable across runtimes. Same user + same day always returns the same
// prompt; two users on the same day generally see different ones.
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function reflectionForDay(dateISO: string, userId: string): string {
  const idx = hashString(`${userId}:${dateISO}`) % REFLECTION_PROMPTS.length;
  return REFLECTION_PROMPTS[idx];
}

export const REFLECTION_PROMPT_COUNT = REFLECTION_PROMPTS.length;
