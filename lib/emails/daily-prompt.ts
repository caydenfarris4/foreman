// Plain-string email templates. We render HTML by interpolating user data
// into a string rather than rendering a React tree — keeps the route lean
// and avoids the server-only React-Email runtime overhead in the cron.

interface DailyPromptInput {
  name: string | null;
  promptText: string;
  appUrl: string;
  /** Tokenized pause link (lib/emails/unsubscribe.ts); null when CRON_SECRET is unset. */
  unsubscribeUrl?: string | null;
}

export function dailyPromptSubject(): string {
  return "Today's check-in";
}

export function dailyPromptText({
  name,
  promptText,
  appUrl,
  unsubscribeUrl,
}: DailyPromptInput): string {
  const greeting = name ? `Morning, ${name}.` : "Morning.";
  return `${greeting}

Today's question:

${promptText}

Five minutes. One question. Then coaching back.

Open the check-in: ${appUrl}/app

—
Foreman
Built from the job site, not the penthouse.

You're getting this because you set a daily prompt time in Foreman. Update
your time or pause the cadence in Settings.
${appUrl}/app/settings
${unsubscribeUrl ? `\nStop these emails: ${unsubscribeUrl}\n` : ""}`;
}

export function dailyPromptHtml({
  name,
  promptText,
  appUrl,
  unsubscribeUrl,
}: DailyPromptInput): string {
  const greeting = name ? `Morning, ${escapeHtml(name)}.` : "Morning.";
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f7f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#3a352e;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f3ec;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#fdfcf8;border:1px solid rgba(58,53,46,0.12);border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 12px;">
                <div style="display:inline-flex;align-items:center;gap:8px;">
                  <span style="display:inline-block;width:14px;height:14px;line-height:0;">
                    <span style="display:inline-block;width:10px;height:3px;background:#b26a45;"></span><br/>
                    <span style="display:inline-block;width:3px;height:7px;background:#b26a45;margin-top:-3px;"></span>
                  </span>
                  <span style="font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;color:#3a352e;">FOREMAN</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 4px;">
                <p style="margin:0;font-size:15px;color:#3A342C;line-height:1.5;">${greeting}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 4px;">
                <p style="margin:0;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#9a5a3a;">TODAY · CHECK-IN</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:2px;background:#b26a45;border-radius:1px;padding:0;">&nbsp;</td>
                    <td style="padding:0 0 0 16px;">
                      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:22px;line-height:1.35;color:#3a352e;">${escapeHtml(
                        promptText,
                      )}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;">
                <a href="${escapeHtml(appUrl)}/app" style="display:inline-block;background:#3a352e;color:#fdfcf8;font-size:15px;font-weight:500;padding:12px 20px;border-radius:8px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">Open the check-in</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px;">
                <p style="margin:0;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;color:#7a6a55;">Five minutes. One question. Then coaching back.</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid rgba(58,53,46,0.12);padding:18px 28px;">
                <p style="margin:0 0 6px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;color:#7a6a55;">Built from the job site, not the penthouse.</p>
                <p style="margin:0;font-size:12px;color:#7a6a55;line-height:1.5;">
                  You're getting this because you set a daily prompt time in Foreman.
                  <a href="${escapeHtml(appUrl)}/app/settings" style="color:#3A342C;text-decoration:underline;">Change it</a>.${
                    unsubscribeUrl
                      ? ` <a href="${escapeHtml(unsubscribeUrl)}" style="color:#7a6a55;text-decoration:underline;">Stop these emails</a>.`
                      : ""
                  }
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
