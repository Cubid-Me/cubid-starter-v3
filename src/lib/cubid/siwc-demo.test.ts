import { describe, expect, it } from "vitest";

import {
  assertSiwcDiscoveryIssuer,
  buildSessionSummary,
  normalizeReturnTo,
  redactSiwcDemoValue,
  traceEntry,
} from "./siwc-demo";

describe("SIWC demo safety helpers", () => {
  it("accepts the configured discovery issuer and rejects a mismatch", () => {
    expect(() =>
      assertSiwcDiscoveryIssuer("https://id.cubid.me", "https://id.cubid.me/")
    ).not.toThrow();
    expect(() =>
      assertSiwcDiscoveryIssuer(
        "https://id.cubid.me",
        "https://staging-id.cubid.me"
      )
    ).toThrowError(/did not match/u);
  });

  it("keeps return paths local to the starter", () => {
    expect(normalizeReturnTo("/docs?tab=siwc")).toBe("/docs?tab=siwc");
    expect(normalizeReturnTo("https://attacker.example/path")).toBe("/");
    expect(normalizeReturnTo("//attacker.example/path")).toBe("/");
  });

  it("redacts secrets and PII recursively without hiding protocol facts", () => {
    const safe = redactSiwcDemoValue({
      accessToken: "access-secret",
      claims: {
        email: "person@example.com",
        nonce: "nonce-secret",
        sub: "pairwise-subject",
      },
      codePresent: true,
      nested: [{ refresh_token: "refresh-secret" }],
    });

    expect(safe).toEqual({
      accessToken: "[redacted]",
      claims: {
        email: "[redacted]",
        nonce: "[redacted]",
        sub: "pairwise-subject",
      },
      codePresent: true,
      nested: [{ refresh_token: "[redacted]" }],
    });
    expect(JSON.stringify(safe)).not.toContain("secret");
    expect(JSON.stringify(safe)).not.toContain("person@example.com");
  });

  it("redacts trace entries and browser session summaries", () => {
    const trace = traceEntry("token", "Token exchange", {
      request: { code: "raw-code", codeVerifier: "raw-verifier" },
      response: { accessToken: "raw-token", tokenType: "Bearer" },
    });
    const summary = buildSessionSummary(
      {
        authenticatedAt: "2026-07-20T00:00:00.000Z",
        claims: {
          email: "person@example.com",
          nonce: "raw-nonce",
          sub: "pairwise-subject",
        },
        clientId: "starter",
        expiresAt: 1_800_000_000,
        issuer: "https://id.cubid.me",
        scope: ["openid", "email"],
        subject: "pairwise-subject",
        userInfo: {
          email: "person@example.com",
          sub: "pairwise-subject",
        },
      },
      [trace]
    );
    const serialized = JSON.stringify(summary);

    expect(serialized).not.toContain("raw-code");
    expect(serialized).not.toContain("raw-verifier");
    expect(serialized).not.toContain("raw-token");
    expect(serialized).not.toContain("raw-nonce");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).toContain("pairwise-subject");
  });
});
