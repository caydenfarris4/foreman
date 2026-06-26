import { describe, expect, it } from "vitest";
import {
  credentialsWellFormed,
  isEmailNotConfirmedError,
  safeEmailHint,
} from "@/lib/auth/login";
import { EMAIL_MAX_LEN, PASSWORD_MAX_LEN } from "@/lib/validation";

describe("credentialsWellFormed (login input shape)", () => {
  it("accepts a normal email + password", () => {
    expect(credentialsWellFormed("a@b.com", "hunter2!!")).toBe(true);
  });
  it("rejects empty email or password", () => {
    expect(credentialsWellFormed("", "password")).toBe(false);
    expect(credentialsWellFormed("a@b.com", "")).toBe(false);
  });
  it("rejects oversized inputs so they never reach the auth provider", () => {
    expect(credentialsWellFormed("a".repeat(EMAIL_MAX_LEN + 1), "pw")).toBe(false);
    expect(credentialsWellFormed("a@b.com", "p".repeat(PASSWORD_MAX_LEN + 1))).toBe(
      false,
    );
  });
  it("accepts inputs exactly at the bound", () => {
    expect(
      credentialsWellFormed("a".repeat(EMAIL_MAX_LEN), "p".repeat(PASSWORD_MAX_LEN)),
    ).toBe(true);
  });
});

describe("isEmailNotConfirmedError (enumeration-safe error routing)", () => {
  it("matches by Supabase error code", () => {
    expect(isEmailNotConfirmedError({ code: "email_not_confirmed" })).toBe(true);
  });
  it("matches by message text", () => {
    expect(
      isEmailNotConfirmedError({ message: "Email not confirmed" }),
    ).toBe(true);
  });
  it("treats a wrong password as generic (no special signal)", () => {
    expect(
      isEmailNotConfirmedError({
        code: "invalid_credentials",
        message: "Invalid login credentials",
      }),
    ).toBe(false);
  });
  it("is false for null/empty", () => {
    expect(isEmailNotConfirmedError(null)).toBe(false);
    expect(isEmailNotConfirmedError(undefined)).toBe(false);
    expect(isEmailNotConfirmedError({})).toBe(false);
  });
});

describe("safeEmailHint (reflected-value guard)", () => {
  it("echoes only email-shaped values", () => {
    expect(safeEmailHint("dana@example.com")).toBe("dana@example.com");
    expect(safeEmailHint("not-an-email")).toBeNull();
    expect(safeEmailHint(42)).toBeNull();
    expect(safeEmailHint(null)).toBeNull();
  });
  it("caps the reflected length", () => {
    const huge = "a".repeat(5000) + "@x.com";
    expect((safeEmailHint(huge) ?? "").length).toBeLessThanOrEqual(EMAIL_MAX_LEN);
  });
});
