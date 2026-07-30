// One-time launch announcement to the book-QR waitlist (waitlist_signups).
//
// Foreman ships as the web app itself, so this email sends readers to
// foreman.coach/start → signup. Safe to re-run: rows with launch_notified_at
// set are skipped (migration 0014 adds the column — apply it first).
//
// DRY RUN (default — sends nothing, prints who would get it):
//   node scripts/send-launch-email.mjs
// SEND FOR REAL:
//   node scripts/send-launch-email.mjs --send
//
// Required env (same place as scripts/seed-demo.mjs reads them):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   RESEND_API_KEY, RESEND_FROM_EMAIL
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local the same lightweight way seed-demo does.
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const START_URL = "https://foreman.coach/start";
const SEND = process.argv.includes("--send");

const SUBJECT = "Foreman is live — your early access is ready";

const TEXT = `You asked for early access to Foreman. It's ready.

Foreman is daily direction for leaders who are building before they feel
ready — a five-minute check-in each morning, coaching back, and a record
of how you're building.

Start your 14-day free trial (no card needed):
${START_URL}

It runs right from your phone's browser — and once you're in, add it to
your home screen and it opens full-screen like an app.

— Cayden

Foreman
Built from the job site, not the penthouse.

You're getting this one email because you joined the waitlist from the
book. This is the email we promised — there's no list to manage.
`;

const HTML = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#3a352e;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f3ec;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#fdfcf8;border:1px solid rgba(58,53,46,0.12);border-radius:16px;overflow:hidden;">
          <tr><td style="padding:22px 28px 0;">
            <span style="font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;color:#3a352e;font-weight:600;">FOREMAN</span>
          </td></tr>
          <tr><td style="padding:20px 28px 26px;">
            <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#3a352e;">It&rsquo;s live. You&rsquo;re first.</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">You asked for early access to Foreman. It&rsquo;s ready &mdash; daily direction for leaders who are building before they feel ready. Five minutes each morning, coaching back, and a record of how you&rsquo;re building.</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">It runs right from your phone &mdash; no download. Once you&rsquo;re in, add it to your home screen and it opens full-screen like an app.</p>
            <a href="${START_URL}" style="display:inline-block;background:#3a352e;color:#fdfcf8;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;text-decoration:none;">Start your 14-day free trial</a>
            <p style="margin:12px 0 0;font-size:12px;color:#7a6a55;">No card needed for the trial.</p>
            <p style="margin:16px 0 0;font-size:15px;line-height:1.55;">&mdash; Cayden</p>
          </td></tr>
          <tr><td style="border-top:1px solid rgba(58,53,46,0.12);padding:18px 28px;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.06em;color:#7a6a55;">Built from the job site, not the penthouse.</p>
            <p style="margin:0;font-size:11px;color:#7a6a55;line-height:1.5;">You&rsquo;re getting this one email because you joined the waitlist from the book. This is the email we promised &mdash; there&rsquo;s no list to manage.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (SEND && (!resendKey || !from)) {
  console.error("Missing RESEND_API_KEY / RESEND_FROM_EMAIL");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from("waitlist_signups")
  .select("id, email, created_at")
  .is("launch_notified_at", null)
  .order("created_at", { ascending: true });
if (error) {
  if (error.message.includes("launch_notified_at")) {
    console.error(
      "Column launch_notified_at is missing — apply supabase/migrations/0014_waitlist_launch_notify.sql first.",
    );
  } else {
    console.error("Waitlist fetch failed:", error.message);
  }
  process.exit(1);
}

const rows = data ?? [];
console.log(`${rows.length} waitlist signup(s) not yet notified.`);
if (!rows.length) process.exit(0);

if (!SEND) {
  for (const r of rows.slice(0, 10)) console.log(`  would send → ${r.email}`);
  if (rows.length > 10) console.log(`  … and ${rows.length - 10} more`);
  console.log('\nDry run only. Re-run with "--send" to actually send.');
  process.exit(0);
}

const resend = new Resend(resendKey);
let sent = 0;
let failed = 0;
for (const r of rows) {
  try {
    const result = await resend.emails.send({
      from,
      to: r.email,
      subject: SUBJECT,
      text: TEXT,
      html: HTML,
    });
    if (result.error) throw new Error(result.error.message);
    const { error: markError } = await supabase
      .from("waitlist_signups")
      .update({ launch_notified_at: new Date().toISOString() })
      .eq("id", r.id);
    if (markError) {
      // Sent but not marked — surface loudly so a re-run doesn't double-send.
      console.error(`SENT BUT NOT MARKED (fix manually): ${r.email} — ${markError.message}`);
    }
    sent++;
    console.log(`sent → ${r.email}`);
  } catch (err) {
    failed++;
    console.error(`FAILED → ${r.email}: ${err instanceof Error ? err.message : err}`);
  }
  await sleep(600); // stay under Resend's request rate
}
console.log(`\nDone. sent=${sent} failed=${failed}`);
