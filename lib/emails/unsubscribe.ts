import { createHmac, timingSafeEqual } from "node:crypto";

// Tokenized unsubscribe links for the recurring coaching emails. The link
// must work from an email client with no session, so it authenticates with
// an HMAC of the user id instead of a cookie. Keyed off CRON_SECRET — the
// secret that already gates the email crons — so no new configuration is
// needed and a leaked token only ever pauses one user's emails.

function hmacFor(userId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`email-unsubscribe:${userId}`)
    .digest("hex");
}

export function unsubscribeToken(userId: string): string | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  return hmacFor(userId, secret);
}

export function verifyUnsubscribeToken(
  userId: string,
  token: string,
): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !userId || !token) return false;
  const expected = Buffer.from(hmacFor(userId, secret));
  const provided = Buffer.from(token);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export function unsubscribeUrl(appUrl: string, userId: string): string | null {
  const token = unsubscribeToken(userId);
  if (!token) return null;
  return `${appUrl}/api/email/unsubscribe?uid=${encodeURIComponent(userId)}&token=${token}`;
}

// RFC 8058 one-click unsubscribe headers. Gmail/Yahoo bulk-sender rules
// expect these on recurring mail; their servers POST to the URL directly.
export function listUnsubscribeHeaders(
  url: string | null,
): Record<string, string> {
  if (!url) return {};
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
