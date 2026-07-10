// Waitlist confirmation — sent once when a reader joins from the book's QR
// code. Voice: warm, direct, no exclamation points, no emoji. Email-safe
// styling in the Cornerstone palette, matching lib/emails/cohort.ts.

export function waitlistConfirmSubject(): string {
  return "You're on the Foreman waitlist";
}

export function waitlistConfirmHtml(): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#3a352e;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f3ec;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#fdfcf8;border:1px solid rgba(58,53,46,0.12);border-radius:16px;overflow:hidden;">
          <tr><td style="padding:22px 28px 0;">
            <span style="font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;color:#3a352e;font-weight:600;">FOREMAN</span>
          </td></tr>
          <tr><td style="padding:20px 28px 26px;">
            <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#3a352e;">You&rsquo;re on the list.</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Foreman is daily direction for leaders who are building before they feel ready &mdash; and it&rsquo;s still under construction, same as you.</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">When the app ships, you&rsquo;ll be the first to know. Until then, keep reading, and keep building.</p>
            <p style="margin:14px 0 0;font-size:15px;line-height:1.55;">&mdash; Cayden</p>
          </td></tr>
          <tr><td style="border-top:1px solid rgba(58,53,46,0.12);padding:18px 28px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.06em;color:#7a6a55;">Built from the job site, not the penthouse.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
