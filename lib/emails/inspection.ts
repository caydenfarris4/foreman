// Growth Inspection emails: the six-month invite, the report-ready notify
// (the report itself is read in the app), and the daily pending-review nudge
// to Cayden. House voice; email-safe Cornerstone styling.

function shell(inner: string, unsubscribeUrl?: string | null): string {
  const unsubscribe = unsubscribeUrl
    ? ` <a href="${esc(unsubscribeUrl)}" style="color:#7a6a55;text-decoration:underline;">Stop these emails</a>.`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#3a352e;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f3ec;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#fdfcf8;border:1px solid rgba(58,53,46,0.12);border-radius:16px;overflow:hidden;">
          <tr><td style="padding:22px 28px 0;">
            <span style="font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;color:#3a352e;font-weight:600;">FOREMAN · GROWTH INSPECTION</span>
          </td></tr>
          ${inner}
          <tr><td style="border-top:1px solid rgba(58,53,46,0.12);padding:18px 28px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.06em;color:#7a6a55;">Built from the job site, not the penthouse.${unsubscribe}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function inspectionDueSubject(): string {
  return "Time to walk the site";
}

export function inspectionDueHtml({
  name,
  appUrl,
  unsubscribeUrl,
}: {
  name: string | null;
  appUrl: string;
  /** Tokenized pause link (lib/emails/unsubscribe.ts); null when CRON_SECRET is unset. */
  unsubscribeUrl?: string | null;
}): string {
  return shell(
    `
    <tr><td style="padding:20px 28px 26px;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${name ? esc(name) + "," : "Hey,"}</p>
      <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:21px;line-height:1.3;">Six months of building. Time to walk the site.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Every house built to code gets inspected. Twenty-some questions, one sitting, honest answers. The report reads your actual six months back to you: what moved, what held, and where you&rsquo;re pointed.</p>
      <a href="${esc(appUrl)}/app/inspection" style="display:inline-block;background:#3a352e;color:#fdfcf8;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;text-decoration:none;">Walk the site</a>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.55;">&mdash; Cayden</p>
    </td></tr>`,
    unsubscribeUrl,
  );
}

export function reportReadySubject(): string {
  return "Your site report is in";
}

export function reportReadyHtml({
  name,
  appUrl,
  hasNote,
}: {
  name: string | null;
  appUrl: string;
  /** True when Cayden reviewed and added a personal note. */
  hasNote: boolean;
}): string {
  return shell(`
    <tr><td style="padding:20px 28px 26px;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${name ? esc(name) + "," : "Hey,"}</p>
      <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:21px;line-height:1.3;">The walk-through is written.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Your inspection report is ready in the app${hasNote ? " &mdash; with a personal note from Cayden inside" : ""}. It reads best next to your house and your plan, so it lives there.</p>
      <a href="${esc(appUrl)}/app/inspection" style="display:inline-block;background:#3a352e;color:#fdfcf8;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;text-decoration:none;">Read your report</a>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.55;">&mdash; Cayden</p>
    </td></tr>`);
}

export function reviewNudgeSubject(count: number): string {
  return `${count} inspection report${count === 1 ? "" : "s"} waiting on your review`;
}

export function reviewNudgeHtml({
  count,
  appUrl,
}: {
  count: number;
  appUrl: string;
}): string {
  return shell(`
    <tr><td style="padding:20px 28px 26px;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Cayden,</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${count} routed report${count === 1 ? " is" : "s are"} sitting in the review queue. Routed reports never auto-release, so each one waits on you. A few minutes clears it.</p>
      <a href="${esc(appUrl)}/app/admin/review" style="display:inline-block;background:#3a352e;color:#fdfcf8;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;text-decoration:none;">Open the review queue</a>
    </td></tr>`);
}
