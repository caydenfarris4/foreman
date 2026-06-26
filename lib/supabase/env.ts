// Supabase connection values, read defensively.
//
// Build/CI variable panels frequently capture a trailing newline or space when
// a value is pasted. An untrimmed Supabase URL fails at request time with
// "Invalid path specified in request URL" — and confusingly, pages still load,
// because the no-session path makes no request, so only sign-in/network calls
// break. Trimming here makes the app robust to that whole class of paste error.
//
// NEXT_PUBLIC_* are referenced as static `process.env` members so Next.js still
// inlines them at build time (both server and client bundles).

export function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
}

export function getSupabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
}

export function getServiceRoleKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
}
