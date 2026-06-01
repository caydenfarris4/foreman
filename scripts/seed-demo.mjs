#!/usr/bin/env node
/**
 * Foreman — demo account seeder.
 *
 * Creates (or refreshes) a single full-access demo user for manual testing and
 * fills every feature surface with realistic data so no screen is empty:
 *
 *   - a confirmed login (email + password) you can use immediately
 *   - profile: fully onboarded, ACTIVE subscription (no paywall), is_admin=true
 *   - existing spine: daily check-ins, situations (+ notes), weekly retros,
 *     a monthly synthesis
 *   - growth-inspection spine: a versioned plan, weighted principles + mapping,
 *     the full six-level goal cascade (incl. one deliberately disconnected goal),
 *     cascade check-ins with goal completions, and a SENT baseline inspection
 *   - a small global inspection question bank
 *
 * This talks to YOUR Supabase project using the service-role key, so it must be
 * run by you, locally. It is idempotent: re-running wipes the demo user's data
 * rows and reseeds them. It never touches other users.
 *
 * Run:
 *   node scripts/seed-demo.mjs            # uses .env.local for credentials
 *   npm run seed:demo
 *
 * Override the login:
 *   DEMO_EMAIL=you@example.com DEMO_PASSWORD='Sup3rSecret!' npm run seed:demo
 *
 * Requires in env (or .env.local): NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---- tiny .env.local loader (no dotenv dependency) ------------------------
function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(join(ROOT, file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2];
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
    } catch {
      // file not present — fine, rely on real env
    }
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FORCE = process.argv.includes("--force");

if (!URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set them in .env.local or the environment, then re-run.",
  );
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && !FORCE) {
  console.error(
    "Refusing to seed a full-access admin account with NODE_ENV=production.\n" +
      "This account bypasses billing and is flagged admin. If you truly mean\n" +
      "to do this, re-run with --force.",
  );
  process.exit(1);
}

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@foreman.app";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "ForemanDemo!2026";

const db = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- date helpers ----------------------------------------------------------
const DAY = 86_400_000;
const now = new Date();
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n) {
  return isoDate(new Date(now.getTime() - n * DAY));
}
function daysFromNow(n) {
  return new Date(now.getTime() + n * DAY).toISOString();
}
// Monday-anchored week start, like lib/utils weekStartFor.
function weekStart(d) {
  const x = new Date(`${isoDate(d)}T00:00:00Z`);
  const dow = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() - (dow - 1));
  return isoDate(x);
}
function monthStart(d) {
  return `${isoDate(d).slice(0, 7)}-01`;
}

// ---- 1. find or create the auth user --------------------------------------
async function ensureUser() {
  const created = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { demo: true },
  });
  if (created.data?.user) return created.data.user;

  // Already exists — find it and reset the password + confirmation.
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(
      (u) => (u.email || "").toLowerCase() === DEMO_EMAIL.toLowerCase(),
    );
    if (found) {
      await db.auth.admin.updateUserById(found.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      return found;
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  throw new Error(
    `Could not create demo user and could not find an existing one: ${
      created.error?.message ?? "unknown error"
    }`,
  );
}

// ---- 2. wipe the demo user's data rows (idempotency) ----------------------
async function wipe(userId) {
  // Order respects FKs where they are not ON DELETE CASCADE.
  const tables = [
    "cascade_checkin_goals",
    "cascade_checkins",
    "growth_goals",
    "principle_mappings",
    "principle_selections",
    "inspections",
    "growth_plans",
    "situation_notes",
    "situations",
    "daily_checkins",
    "weekly_retros",
    "monthly_syntheses",
  ];
  for (const t of tables) {
    const { error } = await db.from(t).delete().eq("user_id", userId);
    if (error) throw new Error(`wipe ${t}: ${error.message}`);
  }
}

async function insert(table, rows) {
  const { data, error } = await db.from(table).insert(rows).select();
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return data;
}

// ---- 3. seed everything ----------------------------------------------------
async function seed(userId) {
  // 3a. profile: onboarded, active subscription, admin.
  const { error: pErr } = await db
    .from("profiles")
    .update({
      email: DEMO_EMAIL,
      name: "Dana",
      role_title: "Engineering Manager",
      promoted_at: daysAgo(240),
      team_size: 6,
      team_context: "A platform team of six, two of them recently hired.",
      industry: "Software",
      current_challenge:
        "Letting go of the work. Still doing IC work after hours.",
      current_phase: "framing",
      sabbath_day: "sunday",
      retro_day: "sunday",
      notification_time: "07:15:00",
      timezone: "America/Denver",
      onboarded_at: new Date().toISOString(),
      subscription_status: "active",
      stripe_customer_id: "cus_demo_seed",
      stripe_subscription_id: "sub_demo_seed",
      stripe_price_id: "price_demo_seed",
      subscription_current_period_end: daysFromNow(30),
      is_admin: true,
    })
    .eq("id", userId);
  if (pErr) throw new Error(`profile: ${pErr.message}`);

  // 3b. existing spine — daily check-ins (AI coaching), situations, retros.
  const checkins = await insert(
    "daily_checkins",
    [3, 2, 1].map((d) => ({
      user_id: userId,
      checkin_date: daysAgo(d),
      prompt_text:
        "Where did you step in today when the better move was to let your team carry it?",
      user_response:
        "I rewrote Priya's design doc instead of giving notes. Faster for me, smaller for her.",
      ai_coaching:
        "You traded her growth for your speed, and you felt the cost the moment you hit save. The work was never the point. The builder is. Hand the next doc back with three questions instead of a rewrite, and let her swing.",
      framework_phase: "framing",
      tags: ["delegation", "trust"],
      completed_at: new Date().toISOString(),
    })),
  );

  const situations = await insert("situations", [
    {
      user_id: userId,
      title: "Rewriting a report's work instead of coaching it",
      situation:
        "I keep redoing my reports' deliverables late at night because it is faster than explaining what I want.",
      coaching:
        "Speed today is debt tomorrow. Every rewrite teaches the team that your standard is unknowable and your trust is conditional. Trade one rewrite this week for one conversation.",
      framework_phase: "framing",
      tags: ["delegation", "trust"],
      source_checkin_id: checkins[0].id,
    },
    {
      user_id: userId,
      title: "Avoiding a hard conversation with a senior engineer",
      situation:
        "A senior engineer is quietly blocking a decision and I have put off the conversation for two weeks.",
      coaching:
        "The avoidance is louder than the conversation would be. Name the block plainly, ask what they see that you do not, and decide in the room. Clarity is a kindness here.",
      framework_phase: "foundation",
      tags: ["conflict", "courage"],
      source_checkin_id: null,
    },
  ]);

  await insert("situation_notes", [
    {
      situation_id: situations[0].id,
      user_id: userId,
      body: "Tried the one-conversation swap on Thursday. It took twenty minutes and the doc came back better than mine.",
    },
  ]);

  const lastWeek = new Date(now.getTime() - 7 * DAY);
  await insert("weekly_retros", [
    {
      user_id: userId,
      week_start: weekStart(lastWeek),
      wins: "Ran a clean 1:1 with the new hire. Did not touch the on-call rotation myself.",
      struggles:
        "Snapped in standup when the deploy slipped. Took the stress out on the room.",
      lessons:
        "My calm is the team's ceiling. When I react, they brace instead of think.",
      ai_synthesis:
        "The wins and the struggle share one root. You are learning that your steadiness is infrastructure. The clean 1:1 worked because you brought calm to it. Standup broke because you brought the deploy stress instead. Next week, name your own state before you walk into the room.",
      framework_focus: "foundation",
      skipped: false,
    },
  ]);

  await insert("monthly_syntheses", [
    {
      user_id: userId,
      month_start: monthStart(lastWeek),
      ai_summary:
        "This month was about one quiet shift. You stopped measuring yourself by how much of the work you personally carried and started measuring the work the team could carry without you. The delegation struggles and the steadiness lessons are the same lesson wearing two coats. Keep handing the work back. The team rises to the standard you model, not the one you announce.",
      framework_focus: "framing",
      retro_count: 4,
    },
  ]);

  // 3c. growth-inspection spine — plan, principles, mapping, cascade.
  const [plan] = await insert("growth_plans", [
    {
      user_id: userId,
      version: 1,
      ten_year_text:
        "In ten years I want to be the kind of leader people point to when they describe what good management felt like. I want to have built teams that ship hard things calmly, mentored a handful of managers into their own confidence, and kept my character intact under real pressure. Not a bigger title for its own sake, but a wider table.",
      five_year_text:
        "Lead a multi-team org of twenty to thirty people, with two managers I have grown reporting to me, known internally for delivery without drama.",
      six_month_milestone:
        "Hand off all IC work, run a calm weekly operating rhythm, and have one report ready to lead a project end to end.",
      is_current: true,
    },
  ]);

  await insert("principle_selections", [
    { user_id: userId, plan_id: plan.id, principle: "foundation" },
    { user_id: userId, plan_id: plan.id, principle: "framing" },
    { user_id: userId, plan_id: plan.id, principle: "integrity" },
  ]);

  await insert("principle_mappings", [
    {
      user_id: userId,
      plan_id: plan.id,
      principle: "foundation",
      layer: "foundation",
      ai_rationale:
        "Your plan keeps returning to character under pressure and steadiness as infrastructure, which is the foundation layer.",
      source: "ai",
      confirmed: true,
    },
    {
      user_id: userId,
      plan_id: plan.id,
      principle: "framing",
      layer: "frame",
      ai_rationale:
        "Building a calm operating rhythm and handing off work is systems and habit work, the framing principle.",
      source: "ai",
      confirmed: true,
    },
    {
      user_id: userId,
      plan_id: plan.id,
      principle: "integrity",
      layer: "frame",
      ai_rationale:
        "Wanting your execution to match your stated standard, and a wider table over a bigger title, maps to integrity.",
      source: "ai",
      confirmed: true,
    },
  ]);

  // The six-level cascade. Insert top-down so children can point at parents.
  const [tenYear] = await insert("growth_goals", [
    {
      user_id: userId,
      plan_id: plan.id,
      level: "ten_year",
      body: "Become a leader people describe as what good management felt like.",
      status: "open",
      ladders_up: true,
    },
  ]);
  const [fiveYear] = await insert("growth_goals", [
    {
      user_id: userId,
      plan_id: plan.id,
      level: "five_year",
      parent_goal_id: tenYear.id,
      body: "Lead an org of 20-30 with two managers I have grown.",
      status: "open",
      ladders_up: true,
    },
  ]);
  const [sixMonth] = await insert("growth_goals", [
    {
      user_id: userId,
      plan_id: plan.id,
      level: "six_month",
      parent_goal_id: fiveYear.id,
      body: "Hand off IC work; one report ready to lead a project end to end.",
      status: "open",
      period_start: daysAgo(30),
      period_end: daysFromNow(150),
      ladders_up: true,
    },
  ]);
  const [monthly] = await insert("growth_goals", [
    {
      user_id: userId,
      plan_id: plan.id,
      level: "monthly",
      parent_goal_id: sixMonth.id,
      body: "Delegate the on-call rotation and the release process fully.",
      status: "open",
      period_start: monthStart(now),
      ladders_up: true,
    },
  ]);
  const [weekly] = await insert("growth_goals", [
    {
      user_id: userId,
      plan_id: plan.id,
      level: "weekly",
      parent_goal_id: monthly.id,
      body: "Pair with Priya on the release so she can run next week's alone.",
      status: "open",
      period_start: weekStart(now),
      ladders_up: true,
    },
  ]);
  const dailyGoals = await insert("growth_goals", [
    {
      user_id: userId,
      plan_id: plan.id,
      level: "daily",
      parent_goal_id: weekly.id,
      body: "Give notes on Priya's release plan instead of editing it.",
      status: "done",
      period_start: daysAgo(1),
      ladders_up: true,
    },
    {
      user_id: userId,
      plan_id: plan.id,
      level: "daily",
      parent_goal_id: weekly.id,
      body: "Name my own state out loud before standup.",
      status: "open",
      period_start: isoDate(now),
      ladders_up: true,
    },
    {
      // Deliberately disconnected, to exercise the §4.4 flag in later UI.
      user_id: userId,
      plan_id: plan.id,
      level: "daily",
      parent_goal_id: null,
      body: "Reply to every Slack message within an hour.",
      status: "open",
      period_start: isoDate(now),
      ladders_up: false,
    },
  ]);

  // Cascade check-ins with goal completions (the behavioral history).
  const [dailyCheckin] = await insert("cascade_checkins", [
    {
      user_id: userId,
      checkin_type: "daily",
      period_date: daysAgo(1),
      reflection: "Gave notes instead of editing. Hard but right.",
    },
  ]);
  await insert("cascade_checkin_goals", [
    {
      user_id: userId,
      checkin_id: dailyCheckin.id,
      goal_id: dailyGoals[0].id,
      completed: true,
    },
    {
      user_id: userId,
      checkin_id: dailyCheckin.id,
      goal_id: dailyGoals[1].id,
      completed: false,
    },
  ]);
  await insert("cascade_checkins", [
    {
      user_id: userId,
      checkin_type: "weekly",
      period_date: weekStart(now),
      reflection: "Release pairing happened. On-call handoff still pending.",
    },
    {
      user_id: userId,
      checkin_type: "monthly",
      period_date: monthStart(now),
      reflection: "Delegation is moving. Reactivity under deploy stress is not.",
    },
  ]);

  // A SENT baseline inspection. The report prose passes governance
  // (no em dashes, bullets, emoji, hashtags, or state scores).
  await insert("inspections", [
    {
      user_id: userId,
      cycle_number: 1,
      is_baseline: true,
      status: "sent",
      raw_answers: {
        foundation_settled: 3,
        frequency_unjustified_decision: "sometimes",
        scenario_hard_conversation: "name_it_directly",
        framing_systems: 4,
        integrity_alignment: 3,
      },
      layer_reads: {
        foundation: { read: "borrowed-to-settling", confidence: "medium" },
        frame: {
          weighted: ["foundation", "framing", "integrity"],
          read: "framing strongest, integrity emerging",
          confidence: "medium",
        },
        finish: { read: "early but consistent", confidence: "low" },
      },
      trajectory_read: {
        overall: "narrowing",
        notes: "Stated path and actual path agree on delegation; identity lags.",
      },
      generated_report:
        "Here is the walk. You are early in this build, and the structure already tells the truth about you. Your framing is the strongest wall standing. You are putting real systems around how the team works, and the cascade shows you actually doing it, not just planning it.\n\nYour foundation is quieter. The identity layer reads like someone moving from borrowed confidence toward settled, but not there yet. That is normal this early, and it moves slowly by design.\n\nYour finish work is young. There is not yet enough history to read it with confidence, and that is the honest state, not a problem to dress up. The fix is simple. Keep showing up in the daily check-ins, and the read sharpens on its own.\n\nWhere you are pointed looks right. The gap between what you said you want and what your week actually contains is narrow on delegation. Your first work order is to name your own state before standup, every day, until the team stops bracing and starts thinking.",
      flag_status: "cleared",
      flag_reasons: [],
      sent_at: new Date().toISOString(),
    },
  ]);
}

// ---- global question bank (not user-scoped; upsert by key) -----------------
async function seedQuestionBank() {
  const rows = [
    {
      question_key: "foundation_settled",
      body: "When something goes wrong on my team, I trust that I belong in this role.",
      qtype: "slider",
      principle: "foundation",
      layer: "foundation",
      weight_tier: "weighted",
      rotation_group: 1,
      scenario_options: null,
      active: true,
    },
    {
      question_key: "frequency_unjustified_decision",
      body: "In the last month, how often did you make a decision you could not fully justify yet?",
      qtype: "frequency",
      principle: "integrity",
      layer: "frame",
      weight_tier: "weighted",
      rotation_group: 1,
      scenario_options: null,
      active: true,
    },
    {
      question_key: "framing_systems",
      body: "My team has clear systems for how the recurring work gets done.",
      qtype: "slider",
      principle: "framing",
      layer: "frame",
      weight_tier: "weighted",
      rotation_group: 1,
      scenario_options: null,
      active: true,
    },
    {
      question_key: "scenario_hard_conversation",
      body: "A senior teammate is quietly blocking a decision you believe in. What do you actually do this week?",
      qtype: "scenario",
      principle: "reconciliation",
      layer: "frame",
      weight_tier: "light",
      rotation_group: 2,
      scenario_options: [
        { key: "name_it_directly", body: "Name the block directly and decide in the room." },
        { key: "route_around", body: "Find a way to move without them." },
        { key: "wait", body: "Wait and hope it resolves on its own." },
      ],
      active: true,
    },
    {
      question_key: "finish_completion",
      body: "Over the last month, how often did you complete the daily goals you set?",
      qtype: "frequency",
      principle: null,
      layer: "finish",
      weight_tier: "light",
      rotation_group: 1,
      scenario_options: null,
      active: true,
    },
  ];
  const { error } = await db
    .from("inspection_questions")
    .upsert(rows, { onConflict: "question_key" });
  if (error) throw new Error(`question bank: ${error.message}`);
  return rows.length;
}

// ---- run -------------------------------------------------------------------
async function main() {
  console.log(`Seeding demo account on ${URL} ...`);
  const user = await ensureUser();
  console.log(`  user: ${user.id}`);
  await wipe(user.id);
  console.log("  wiped existing demo data");
  await seed(user.id);
  console.log("  seeded profile + all feature data");
  const q = await seedQuestionBank();
  console.log(`  upserted ${q} inspection questions`);

  console.log("\nDone. Full-access demo account ready:\n");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log("\n  subscription: active (no paywall)");
  console.log("  is_admin:     true");
  console.log(
    "\nSign in at /login. Note: most growth-inspection screens do not exist\n" +
      "yet (Stages 2-8). The data is seeded so those screens have content the\n" +
      "moment they land. You can inspect the rows now in the Supabase table\n" +
      "editor under growth_plans, growth_goals, inspections, etc.",
  );
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
