import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getServiceRoleKey,
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

// Regression: a trailing newline/space pasted into a build/CI variable made the
// Supabase URL "https://x.supabase.co\n", which fails sign-in with "Invalid
// path specified in request URL" while pages still load. Trimming fixes it.
describe("supabase env (paste-robustness)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("trims a trailing newline from the URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co\n");
    expect(getSupabaseUrl()).toBe("https://abc.supabase.co");
  });

  it("trims surrounding whitespace from the anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "  ey.token.value  ");
    expect(getSupabaseAnonKey()).toBe("ey.token.value");
  });

  it("trims the service-role key", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service.key\r\n");
    expect(getServiceRoleKey()).toBe("service.key");
  });

  it("returns empty string when unset (caller throws / errors as before)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(getSupabaseUrl()).toBe("");
  });
});
