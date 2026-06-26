// Pure, testable helpers for the login flow. Extracted from the login server
// action so the security-critical decisions (credential shape, error
// classification, reflected-value safety) can be unit tested and reasoned
// about in one place. These mirror the prior inline logic exactly — behavior
// is unchanged.

import { EMAIL_MAX_LEN, PASSWORD_MAX_LEN } from "@/lib/validation";

/**
 * True when the submitted credentials are the right SHAPE to attempt a login.
 * A cheap pre-check before we hit the auth provider. It intentionally does NOT
 * judge whether the password is correct — only that the inputs are present and
 * within bounds, so oversized payloads never reach the provider.
 */
export function credentialsWellFormed(
  email: string,
  password: string,
): boolean {
  return (
    email.length > 0 &&
    email.length <= EMAIL_MAX_LEN &&
    password.length > 0 &&
    password.length <= PASSWORD_MAX_LEN
  );
}

/**
 * Distinguish the single auth error that warrants a specific response (the
 * account exists but the email is unconfirmed) from everything else. Every
 * other failure is reported generically so the login screen cannot be used to
 * enumerate which emails have accounts.
 */
export function isEmailNotConfirmedError(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return code === "email_not_confirmed" || message.includes("not confirmed");
}

/**
 * The email is reflected back to the login page as a hint after an
 * "unconfirmed" redirect. Only echo a value that looks like an email, and cap
 * its length, so a crafted `?email=` query cannot stuff oversized or
 * non-email content into the page. (React already escapes it against XSS; this
 * is the content/length guard on top.)
 */
export function safeEmailHint(value: unknown): string | null {
  return typeof value === "string" && value.includes("@")
    ? value.slice(0, EMAIL_MAX_LEN)
    : null;
}
