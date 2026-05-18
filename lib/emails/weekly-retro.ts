// Plain-string email template for the weekly retro reminder.

interface WeeklyRetroInput {
  name: string | null;
  appUrl: string;
  weekRange: string;
}

export function weeklyRetroSubject(): string {
  return "Site report time — your weekly retro";
}

export function weeklyRetroText({
  name,
  appUrl,
  weekRange,
}: WeeklyRetroInput): string {
  const greeting = name ? `Hey ${name}.` : "Hey.";
  return `${greeting}

It's retro day — ${weekRange}.

Three short questions:
  - What landed this week?
  - What hurt?
  - What did you learn?

Open the retro: ${appUrl}/app/retro

—
Foreman
Built from the job site, not the penthouse.

You're getting this because your retro day is set in Foreman. Change
or pause in Settings.
${appUrl}/app/settings
`;
}

export function weeklyRetroHtml({
  name,
  appUrl,
  weekRange,
}: WeeklyRetroInput): string {
  const greeting = name ? `Hey ${escapeHtml(name)}.` : "Hey.";
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F5F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1A1816;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#FAF7F2;border:1px solid rgba(26,24,22,0.10);border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 12px;">
                <div style="display:inline-flex;align-items:center;gap:8px;">
                  <span style="display:inline-block;width:14px;height:14px;line-height:0;">
                    <span style="display:inline-block;width:10px;height:3px;background:#1E3A5F;"></span><br/>
                    <span style="display:inline-block;width:3px;height:7px;background:#1E3A5F;margin-top:-3px;"></span>
                  </span>
                  <span style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.12em;color:#1A1816;">FOREMAN · WEEK CLOSE</span>
                </div>
              </td>
            </tr>
            <tr><td style="padding:0 28px 4px;">
              <p style="margin:0;font-size:15px;color:#3A342C;line-height:1.5;">${greeting}</p>
            </td></tr>
            <tr><td style="padding:8px 28px 4px;">
              <p style="margin:0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#8E6529;">${escapeHtml(weekRange)} · SITE REPORT</p>
            </td></tr>
            <tr><td style="padding:8px 28px 0;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.35;color:#1A1816;">Three short questions. Five minutes.</p>
            </td></tr>
            <tr><td style="padding:18px 28px 8px;">
              <p style="margin:0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;color:#6B6358;line-height:1.7;">
                01 — What landed this week?<br/>
                02 — What hurt?<br/>
                03 — What did you learn?
              </p>
            </td></tr>
            <tr><td style="padding:18px 28px 8px;">
              <a href="${escapeHtml(appUrl)}/app/retro" style="display:inline-block;background:#1A1816;color:#FAF7F2;font-size:15px;font-weight:500;padding:12px 20px;border-radius:8px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">Open the retro</a>
            </td></tr>
            <tr><td style="padding:8px 28px 24px;">
              <p style="margin:0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;color:#6B6358;">Synthesis writes itself after.</p>
            </td></tr>
            <tr><td style="border-top:1px solid rgba(26,24,22,0.10);padding:18px 28px;">
              <p style="margin:0 0 6px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;color:#6B6358;">Built from the job site, not the penthouse.</p>
              <p style="margin:0;font-size:12px;color:#6B6358;line-height:1.5;">
                Retro day set in Foreman.
                <a href="${escapeHtml(appUrl)}/app/settings" style="color:#3A342C;text-decoration:underline;">Change it</a>.
              </p>
            </td></tr>
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
