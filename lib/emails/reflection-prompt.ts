// Sabbath reflection email. Sent on the user's chosen sabbath day in place of
// the daily coaching prompt. The sabbath is a day set apart for reflection,
// faith, and growth, not a pause. Voice: calm, grounded, faith-present without
// being preachy, true for any reader regardless of tradition.

interface ReflectionPromptInput {
  name: string | null;
  promptText: string;
  appUrl: string;
}

export function reflectionPromptSubject(): string {
  return "Your sabbath: a space to reflect";
}

export function reflectionPromptText({
  name,
  promptText,
  appUrl,
}: ReflectionPromptInput): string {
  const greeting = name ? `${name},` : "Today,";
  return `${greeting}

This is your sabbath. Not a pause, a day set apart for reflection, faith, and growth.

Sit with this:

${promptText}

There is nothing to submit and nothing to finish. Let it breathe, and carry what it surfaces into the people and the purpose you are part of.

Open your reflection: ${appUrl}/app

-
Foreman
Built from the job site, not the penthouse.

You're getting this because you set a sabbath day in Foreman. Change it in Settings.
${appUrl}/app/settings
`;
}

export function reflectionPromptHtml({
  name,
  promptText,
  appUrl,
}: ReflectionPromptInput): string {
  const greeting = name ? `${escapeHtml(name)},` : "Today,";
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
                <p style="margin:0;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#9a5a3a;">SABBATH · REFLECTION</p>
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
              <td style="padding:20px 28px 8px;">
                <p style="margin:0;font-size:14px;color:#3A342C;line-height:1.6;">Nothing to submit, nothing to finish. Let it breathe, and carry what it surfaces into the people and purpose you are part of.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 8px;">
                <a href="${escapeHtml(appUrl)}/app" style="display:inline-block;background:#3a352e;color:#fdfcf8;font-size:15px;font-weight:500;padding:12px 20px;border-radius:8px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">Open your reflection</a>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid rgba(58,53,46,0.12);padding:18px 28px;">
                <p style="margin:0 0 6px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;color:#7a6a55;">Built from the job site, not the penthouse.</p>
                <p style="margin:0;font-size:12px;color:#7a6a55;line-height:1.5;">
                  You're getting this because you set a sabbath day in Foreman.
                  <a href="${escapeHtml(appUrl)}/app/settings" style="color:#3A342C;text-decoration:underline;">Change it</a>.
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
