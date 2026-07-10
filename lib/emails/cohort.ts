// Cohort transactional emails — the trio the funnel can't run without:
// application received, accepted + payment link, payment confirmed/welcome.
// Voice: warm, direct, foreman-on-a-job-site. No exclamation points, no emoji.
// Email-safe stacks (system sans + Georgia serif), Cornerstone palette.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(inner: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#3a352e;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f3ec;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#fdfcf8;border:1px solid rgba(58,53,46,0.12);border-radius:16px;overflow:hidden;">
          <tr><td style="padding:22px 28px 0;">
            <span style="font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;color:#3a352e;font-weight:600;">FOREMAN · COHORT</span>
          </td></tr>
          ${inner}
          <tr><td style="border-top:1px solid rgba(58,53,46,0.12);padding:18px 28px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.06em;color:#7a6a55;">Built from the job site, not the penthouse.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function cohortApplicationReceivedSubject(cohortName: string): string {
  return `Got your application — ${cohortName}`;
}

export function cohortApplicationReceivedHtml({
  name,
  cohortName,
}: {
  name: string | null;
  cohortName: string;
}): string {
  return shell(`
    <tr><td style="padding:20px 28px 26px;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${
        name ? escapeHtml(name) + "," : "Hey,"
      }</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Your application to <strong>${escapeHtml(
        cohortName,
      )}</strong> is in. I read every one personally, and you&rsquo;ll hear back from me within five business days.</p>
      <p style="margin:0;font-size:15px;line-height:1.55;">Until then, keep building.</p>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.55;">&mdash; Cayden</p>
    </td></tr>`);
}

export function cohortAcceptedSubject(cohortName: string): string {
  return `You're in — ${cohortName}`;
}

export function cohortAcceptedHtml({
  name,
  cohortName,
  payUrl,
  priceLabel,
}: {
  name: string | null;
  cohortName: string;
  payUrl: string;
  priceLabel: string;
}): string {
  return shell(`
    <tr><td style="padding:20px 28px 26px;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${
        name ? escapeHtml(name) + "," : "Hey,"
      }</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">I read your application, and I want you in <strong>${escapeHtml(
        cohortName,
      )}</strong>. Twelve seats, and one of them is being held for you.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Your seat is held for <strong>7 days</strong>. Complete payment (${escapeHtml(
        priceLabel,
      )}) to lock it in; after that the seat opens back up.</p>
      <a href="${escapeHtml(
        payUrl,
      )}" style="display:inline-block;background:#3a352e;color:#fdfcf8;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;text-decoration:none;">Claim your seat</a>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.55;">&mdash; Cayden</p>
    </td></tr>`);
}

export function cohortWelcomeSubject(cohortName: string): string {
  return `Welcome to ${cohortName} — here's what happens next`;
}

export function cohortWelcomeHtml({
  name,
  cohortName,
  startDateLabel,
}: {
  name: string | null;
  cohortName: string;
  startDateLabel: string;
}): string {
  return shell(`
    <tr><td style="padding:20px 28px 26px;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${
        name ? escapeHtml(name) + "," : "Hey,"
      }</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Payment&rsquo;s in. You&rsquo;re officially part of <strong>${escapeHtml(
        cohortName,
      )}</strong>.</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">We start <strong>${escapeHtml(
        startDateLabel,
      )}</strong> and meet Saturdays at 10:00 AM Mountain, ninety minutes, eight weeks. Your full schedule, prep materials, and session links live in the app under <strong>You &rsaquo; Cohort</strong>.</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Your Foreman access is covered through four weeks past the final session &mdash; use it. The daily check-in is where the cohort work compounds.</p>
      <p style="margin:0;font-size:15px;line-height:1.55;">Come ready to build.</p>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.55;">&mdash; Cayden</p>
    </td></tr>`);
}
