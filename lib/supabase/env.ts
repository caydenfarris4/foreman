// Supabase connection values, read defensively.
//
// Build/CI variable panels frequently mangle a pasted value: a trailing
// newline, an internal newline from a wrapped paste, surrounding quotes, a
// missing scheme, or a trailing slash. Any of these makes the Supabase URL fail
// at request time with "Invalid path specified in request URL" — and
// confusingly, pages still load, because the no-session path makes no request,
// so only sign-in/network calls break. We normalize here so the app is robust
// to the whole class of paste errors.
//
// All of these transforms are no-ops on a correct value: real Supabase URLs and
// keys contain no whitespace and no quotes.
//
// NEXT_PUBLIC_* are referenced as static `process.env` members so Next.js still
// inlines them at build time (both server and client bundles).

function clean(value: string | undefined): string {
  return (value ?? "")
    .replace(/\s+/g, "") // strip ALL whitespace (incl. internal newlines)
    .replace(/^["']+|["']+$/g, ""); // strip surrounding quotes
}

export function getSupabaseUrl(): string {
  let url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // ensure scheme
  return url.replace(/\/+$/, ""); // drop trailing slash(es)
}

export function getSupabaseAnonKey(): string {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getServiceRoleKey(): string {
  return clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
