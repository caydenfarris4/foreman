import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  isSafeRedirectPath,
  isUuid,
  sanitizeFtsQuery,
  sanitizeSearchTerm,
  sanitizeTag,
} from "@/lib/validation";

describe("isUuid", () => {
  it("accepts a valid v4 uuid", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
  });
  it("rejects non-uuids and non-strings", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("3f2504e0-4f89-41d3-9a0c")).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid(null)).toBe(false);
    // No SQL injection payload should pass as a uuid.
    expect(isUuid("' OR 1=1 --")).toBe(false);
  });
});

describe("isIsoDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(isIsoDate("2026-06-25")).toBe(true);
  });
  it("rejects malformed dates and injection", () => {
    expect(isIsoDate("2026/06/25")).toBe(false);
    expect(isIsoDate("2026-6-5")).toBe(false);
    expect(isIsoDate("2026-06-25T00:00:00Z")).toBe(false);
    expect(isIsoDate("2026-06-25'; DROP TABLE")).toBe(false);
    expect(isIsoDate(42)).toBe(false);
  });
});

describe("isSafeRedirectPath (open-redirect guard)", () => {
  it("accepts in-app absolute paths", () => {
    expect(isSafeRedirectPath("/app")).toBe(true);
    expect(isSafeRedirectPath("/app/library?q=x")).toBe(true);
    expect(isSafeRedirectPath("/onboarding")).toBe(true);
  });

  it("rejects every open-redirect trick", () => {
    // protocol-relative
    expect(isSafeRedirectPath("//evil.com")).toBe(false);
    // backslash variant some browsers normalize off-site
    expect(isSafeRedirectPath("/\\evil.com")).toBe(false);
    // absolute external URLs
    expect(isSafeRedirectPath("https://evil.com")).toBe(false);
    expect(isSafeRedirectPath("http://evil.com")).toBe(false);
    // not starting with a slash
    expect(isSafeRedirectPath("evil.com")).toBe(false);
    expect(isSafeRedirectPath("@evil.com")).toBe(false);
    // CRLF header injection
    expect(isSafeRedirectPath("/app\r\nSet-Cookie: x=y")).toBe(false);
    expect(isSafeRedirectPath("/app\nLocation: http://evil")).toBe(false);
    // empty / non-string / oversized
    expect(isSafeRedirectPath("")).toBe(false);
    expect(isSafeRedirectPath(null)).toBe(false);
    expect(isSafeRedirectPath(undefined)).toBe(false);
    expect(isSafeRedirectPath("/" + "a".repeat(300))).toBe(false);
  });
});

describe("sanitizeSearchTerm (PostgREST .or() filter)", () => {
  it("keeps normal text and unicode letters", () => {
    expect(sanitizeSearchTerm("hard feedback")).toBe("hard feedback");
    expect(sanitizeSearchTerm("café déjà")).toBe("café déjà");
  });
  it("strips every PostgREST filter delimiter and wildcard", () => {
    const out = sanitizeSearchTerm('a,b.c(d):e"f\\g%h_i');
    for (const ch of [",", ".", "(", ")", ":", '"', "\\", "%", "_"]) {
      expect(out.includes(ch)).toBe(false);
    }
  });
  it("returns empty for non-strings", () => {
    expect(sanitizeSearchTerm(null)).toBe("");
    expect(sanitizeSearchTerm(123)).toBe("");
  });
  it("caps length", () => {
    expect(sanitizeSearchTerm("a".repeat(500)).length).toBeLessThanOrEqual(100);
  });
});

describe("sanitizeTag", () => {
  it("allows alphanumerics, hyphen, underscore, space", () => {
    expect(sanitizeTag("hard-feedback_2")).toBe("hard-feedback_2");
  });
  it("strips delimiters and injection chars", () => {
    expect(sanitizeTag("a,b)c'd")).toBe("abcd");
    expect(sanitizeTag("'; DROP TABLE situations; --")).not.toContain(";");
  });
});

describe("sanitizeFtsQuery (websearch_to_tsquery)", () => {
  it("permits phrase quotes and hyphen negation", () => {
    expect(sanitizeFtsQuery('"hard feedback" -avoided')).toBe(
      '"hard feedback" -avoided',
    );
  });
  it("strips structural punctuation", () => {
    const out = sanitizeFtsQuery("a(b):c,d");
    for (const ch of ["(", ")", ":", ","]) {
      expect(out.includes(ch)).toBe(false);
    }
  });
});
