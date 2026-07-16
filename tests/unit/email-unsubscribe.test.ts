import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listUnsubscribeHeaders,
  unsubscribeToken,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from "@/lib/emails/unsubscribe";

const UID = "11111111-2222-3333-4444-555555555555";

describe("unsubscribe tokens", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("round-trips: a generated token verifies for its user", () => {
    const token = unsubscribeToken(UID);
    expect(token).toBeTruthy();
    expect(verifyUnsubscribeToken(UID, token!)).toBe(true);
  });

  it("rejects another user's token", () => {
    const token = unsubscribeToken(UID)!;
    expect(
      verifyUnsubscribeToken("99999999-8888-7777-6666-555555555555", token),
    ).toBe(false);
  });

  it("rejects a tampered or truncated token", () => {
    const token = unsubscribeToken(UID)!;
    const flipped = (token[0] === "a" ? "b" : "a") + token.slice(1);
    expect(verifyUnsubscribeToken(UID, flipped)).toBe(false);
    expect(verifyUnsubscribeToken(UID, token.slice(0, -2))).toBe(false);
    expect(verifyUnsubscribeToken(UID, "")).toBe(false);
  });

  it("changes with the secret", () => {
    const token = unsubscribeToken(UID)!;
    process.env.CRON_SECRET = "different-secret";
    expect(verifyUnsubscribeToken(UID, token)).toBe(false);
  });

  it("fails closed when CRON_SECRET is unset", () => {
    const token = unsubscribeToken(UID)!;
    delete process.env.CRON_SECRET;
    expect(unsubscribeToken(UID)).toBeNull();
    expect(verifyUnsubscribeToken(UID, token)).toBe(false);
    expect(unsubscribeUrl("https://foreman.coach", UID)).toBeNull();
  });

  it("builds the link and RFC 8058 headers together", () => {
    const url = unsubscribeUrl("https://foreman.coach", UID);
    expect(url).toContain("/api/email/unsubscribe?uid=");
    expect(url).toContain(UID);
    const headers = listUnsubscribeHeaders(url);
    expect(headers["List-Unsubscribe"]).toBe(`<${url}>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(listUnsubscribeHeaders(null)).toEqual({});
  });
});
