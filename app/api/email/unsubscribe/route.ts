import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/emails/unsubscribe";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Unsubscribe endpoint for the recurring coaching emails. Sets
// profiles.emails_paused for the HMAC-verified user (see
// lib/emails/unsubscribe.ts) — no session required, since clicks come from
// email clients.
//
// GET shows a confirm page instead of acting: corporate mail scanners
// prefetch every GET link in an email, and acting on the prefetch would
// silently unsubscribe users. The actual pause happens on POST — from the
// confirm page's form, or directly from mail providers implementing
// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post).

function params(request: NextRequest): { uid: string; token: string } {
  const sp = request.nextUrl.searchParams;
  return { uid: sp.get("uid") ?? "", token: sp.get("token") ?? "" };
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "unsubscribe");
  if (limited) return limited;

  const { uid, token } = params(request);
  if (!verifyUnsubscribeToken(uid, token)) {
    return htmlResponse(invalidPage(), 400);
  }
  return htmlResponse(confirmPage(uid, token), 200);
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "unsubscribe");
  if (limited) return limited;

  const { uid, token } = params(request);
  if (!verifyUnsubscribeToken(uid, token)) {
    return htmlResponse(invalidPage(), 400);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ emails_paused: true })
    .eq("id", uid);
  if (error) {
    console.error("Unsubscribe update failed", error.message);
    return NextResponse.json({ error: "Try again" }, { status: 500 });
  }
  return htmlResponse(donePage(), 200);
}

function htmlResponse(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// Minimal branded pages, self-contained like public/offline.html.
function shell(title: string, inner: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${title} — Foreman</title>
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fefbf7;color:#362b24;font-family:'Hanken Grotesk',-apple-system,system-ui,sans-serif;text-align:center;padding:24px;">
    <main style="max-width:26rem;">
      <svg width="40" height="40" viewBox="0 0 14 14" fill="none" aria-hidden="true" style="display:block;margin:0 auto 20px;">
        <path d="M2 2h10v3H5v7H2V2z" fill="#b26a45" />
      </svg>
      ${inner}
    </main>
  </body>
</html>`;
}

function confirmPage(uid: string, token: string): string {
  const action = `/api/email/unsubscribe?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
  return shell(
    "Pause emails",
    `<h1 style="font-family:Georgia,serif;font-weight:300;font-size:28px;margin:0 0 12px;">Pause coaching emails?</h1>
      <p style="font-size:15px;line-height:1.5;margin:0 0 24px;opacity:0.75;">This stops the daily prompt, sabbath reflection, weekly retro, and inspection emails. Account and receipt emails still arrive. You can turn them back on any time in Settings.</p>
      <form method="post" action="${action}">
        <button type="submit" style="font:inherit;font-size:14px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#fefbf7;background:#b26a45;border:0;border-radius:6px;padding:12px 24px;cursor:pointer;">Pause emails</button>
      </form>`,
  );
}

function donePage(): string {
  return shell(
    "Emails paused",
    `<h1 style="font-family:Georgia,serif;font-weight:300;font-size:28px;margin:0 0 12px;">Emails paused</h1>
      <p style="font-size:15px;line-height:1.5;margin:0;opacity:0.75;">You won't get the coaching emails anymore. Changed your mind? Turn them back on in <a href="/app/settings" style="color:#b26a45;">Settings</a>.</p>`,
  );
}

function invalidPage(): string {
  return shell(
    "Link expired",
    `<h1 style="font-family:Georgia,serif;font-weight:300;font-size:28px;margin:0 0 12px;">This link isn&rsquo;t valid</h1>
      <p style="font-size:15px;line-height:1.5;margin:0;opacity:0.75;">You can pause emails any time from <a href="/app/settings" style="color:#b26a45;">Settings</a> in the app.</p>`,
  );
}
