import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as cubidAuth from "@cubid/auth";

import { GET as callback } from "./callback/route";
import { GET as start } from "./start/route";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.CUBID_SIWC_ISSUER_URL = "https://id.cubid.me";
  process.env.CUBID_SIWC_CLIENT_ID = "starter-client";
  process.env.CUBID_SIWC_REDIRECT_URI =
    "http://localhost:3000/api/cubid/siwc/callback";
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("SIWC route guards", () => {
  it("fails safely when required start configuration is missing", async () => {
    delete process.env.CUBID_SIWC_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID;

    const response = await start(
      new NextRequest("http://localhost:3000/api/cubid/siwc/start")
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "missing_config",
    });
  });

  it("rejects a callback with mismatched state before token exchange", async () => {
    const transaction = Buffer.from(
      JSON.stringify({
        codeVerifier: "private-verifier",
        issuer: "https://id.cubid.me",
        nonce: "private-nonce",
        redirectUri: "http://localhost:3000/api/cubid/siwc/callback",
        state: "expected-state",
      })
    ).toString("base64url");
    const request = new NextRequest(
      "http://localhost:3000/api/cubid/siwc/callback?code=private-code&state=wrong-state",
      {
        headers: {
          cookie: `cubid_siwc_txn=${transaction}`,
        },
      }
    );

    const response = await callback(request);
    const location = new URL(response.headers.get("location")!);
    const serializedHeaders = JSON.stringify([...response.headers]);

    expect(location.searchParams.get("siwc_error")).toBe("state_mismatch");
    expect(serializedHeaders).not.toContain("private-code");
    expect(serializedHeaders).not.toContain("private-verifier");
    expect(serializedHeaders).not.toContain("private-nonce");
    expect(serializedHeaders).not.toContain("expected-state");
    expect(response.headers.get("set-cookie")).toContain("cubid_siwc_txn=");
    expect(response.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
  });

  it("rejects a callback whose validated ID token nonce does not match", async () => {
    vi.spyOn(cubidAuth, "fetchCubidOidcDiscoveryDocument").mockResolvedValue({
      authorization_endpoint: "https://id.cubid.me/authorize",
      issuer: "https://id.cubid.me",
      jwks_uri: "https://id.cubid.me/.well-known/jwks.json",
      token_endpoint: "https://id.cubid.me/token",
    });
    vi.spyOn(cubidAuth, "exchangeCubidAuthorizationCode").mockResolvedValue({
      accessToken: "private-access-token",
      expiresAt: 1_800_000_000,
      expiresIn: 600,
      idToken: "private-id-token",
      issuedAt: 1_799_999_400,
      raw: {},
      refreshToken: null,
      scope: ["openid"],
      tokenType: "Bearer",
    });
    vi.spyOn(cubidAuth, "validateCubidIdToken").mockResolvedValue({
      aud: "starter-client",
      exp: 1_800_000_000,
      iss: "https://id.cubid.me",
      nonce: "wrong-nonce",
      sub: "pairwise-subject",
    });
    const transaction = Buffer.from(
      JSON.stringify({
        codeVerifier: "private-verifier",
        issuer: "https://id.cubid.me",
        nonce: "expected-nonce",
        redirectUri: "http://localhost:3000/api/cubid/siwc/callback",
        state: "expected-state",
      })
    ).toString("base64url");
    const request = new NextRequest(
      "http://localhost:3000/api/cubid/siwc/callback?code=private-code&state=expected-state",
      {
        headers: {
          cookie: `cubid_siwc_txn=${transaction}`,
        },
      }
    );

    const response = await callback(request);
    const location = new URL(response.headers.get("location")!);
    const serializedHeaders = JSON.stringify([...response.headers]);

    expect(location.searchParams.get("siwc_error")).toBe("nonce_mismatch");
    expect(serializedHeaders).not.toContain("private-access-token");
    expect(serializedHeaders).not.toContain("private-id-token");
    expect(serializedHeaders).not.toContain("private-verifier");
    expect(serializedHeaders).not.toContain("expected-nonce");
  });
});
