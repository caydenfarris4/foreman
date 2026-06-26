import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getServiceRoleKey,
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

// Regression: a mangled build/CI variable made the Supabase URL fail sign-in
// with "Invalid path specified in request URL" while pages still loaded. The
// normalizer makes the app robust to every common paste error.
describe("getSupabaseUrl (paste-robustness)", () => {
  afterEach(() => vi.unstubAllEnvs());

  const GOOD = "https://abc.supabase.co";

  it("passes a correct URL through unchanged", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", GOOD);
    expect(getSupabaseUrl()).toBe(GOOD);
  });
  it("strips a trailing newline", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `${GOOD}\n`);
    expect(getSupabaseUrl()).toBe(GOOD);
  });
  it("strips an internal newline from a wrapped paste", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.sup\nabase.co");
    expect(getSupabaseUrl()).toBe(GOOD);
  });
  it("strips surrounding quotes", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `"${GOOD}"`);
    expect(getSupabaseUrl()).toBe(GOOD);
  });
  it("adds a missing scheme", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "abc.supabase.co");
    expect(getSupabaseUrl()).toBe(GOOD);
  });
  it("drops a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `${GOOD}/`);
    expect(getSupabaseUrl()).toBe(GOOD);
  });
  it("strips a stray path like /rest/v1 (reduces to origin)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `${GOOD}/rest/v1`);
    expect(getSupabaseUrl()).toBe(GOOD);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `${GOOD}/auth/v1/`);
    expect(getSupabaseUrl()).toBe(GOOD);
  });
  it("returns empty string when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(getSupabaseUrl()).toBe("");
  });
});

describe("keys (whitespace/quote stripping)", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("cleans the anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", '  "ey.token.value"\r\n');
    expect(getSupabaseAnonKey()).toBe("ey.token.value");
  });
  it("cleans the service-role key", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service.key\n");
    expect(getServiceRoleKey()).toBe("service.key");
  });
});
