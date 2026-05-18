// Shared input validators. Centralized so every route enforces the same
// limits and the same escape rules.
//
// Rule of thumb:
//   - At the route boundary, reject malformed or oversized input early.
//   - Treat all user input as untrusted, including URL params and form
//     fields.
//   - When a value is interpolated into a query/filter/URL string, use
//     the helper here instead of building the string inline.

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// RFC 5321 hard limit on the full email address.
export const EMAIL_MAX_LEN = 254;
// Supabase auth caps passwords at 72 bytes (bcrypt). Reject longer client-side
// so we never burn a round-trip on a doomed signup.
export const PASSWORD_MAX_LEN = 72;
export const PASSWORD_MIN_LEN = 8;

// Library search caps. q is free text; tag values are aggregated from
// stored situation tags and shouldn't be huge.
export const SEARCH_QUERY_MAX_LEN = 100;
export const TAG_MAX_LEN = 60;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_REGEX.test(value);
}

// Return true only if `path` is a safe in-app redirect target:
//   - Must start with a single "/"
//   - Must NOT start with "//" or "/\" (protocol-relative / Windows-style,
//     both of which some browsers normalize to off-site)
//   - Must not contain CR/LF (header injection if ever passed through)
//   - Reasonable length cap
//
// This is the standard guard for `?next=` / `?return_to=` parameters.
export function isSafeRedirectPath(path: unknown): path is string {
  if (typeof path !== "string") return false;
  if (path.length === 0 || path.length > 256) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  if (/[\r\n]/.test(path)) return false;
  return true;
}

// Sanitize a free-text search query for safe interpolation into a
// PostgREST `.or(...)` filter (Supabase `.or()`).
//
// Strategy: whitelist. Strip everything except letters (incl. unicode),
// digits, whitespace, hyphen, and apostrophe. Cap length. That kills
// every PostgREST filter delimiter (`,` `.` `(` `)` `:` `"` `\`) and the
// ILIKE wildcards (`%` `_`) without breaking normal English/typed
// queries.
//
// Returns an empty string if nothing safe survives, which callers should
// treat as "no search term".
export function sanitizeSearchTerm(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, SEARCH_QUERY_MAX_LEN);
  // Allow: unicode letters, numbers, whitespace, hyphen, apostrophe.
  return trimmed.replace(/[^\p{L}\p{N}\s\-']/gu, "").trim();
}

// Tags are stored as alphanumeric + hyphen + underscore by convention.
// Anything else means the caller is messing with us.
export function sanitizeTag(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, TAG_MAX_LEN);
  return trimmed.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
}
