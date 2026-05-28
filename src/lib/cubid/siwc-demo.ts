import "server-only";

import type {
  CubidIdTokenClaims,
  CubidUserInfo,
} from "@cubid/auth";
import { CubidAuthError } from "@cubid/auth";
import type { NextRequest, NextResponse } from "next/server";

export const siwcDemoCookies = {
  returnTo: "cubid_siwc_return_to",
  session: "cubid_siwc_demo_session",
  transaction: "cubid_siwc_txn",
} as const;

const transactionMaxAgeSeconds = 10 * 60;
const sessionMaxAgeSeconds = 30 * 60;

export type SiwcDemoTransaction = {
  codeVerifier: string;
  issuer: string;
  nonce: string;
  redirectUri: string;
  state: string;
};

export type SiwcDemoSession = {
  authenticatedAt: string;
  claims: CubidIdTokenClaims | null;
  clientId: string;
  expiresAt: number | null;
  issuer: string;
  scope: string[];
  subject: string | null;
  userInfo: CubidUserInfo | null;
};

export type SiwcDemoConfig =
  | {
      configured: false;
      missing: string[];
    }
  | {
      clientId: string;
      configured: true;
      issuer: string;
      redirectUri: string;
      scope: string[];
    };

type CookieOptions = {
  maxAge: number;
  secure: boolean;
};

export function getSiwcDemoConfig(request: NextRequest): SiwcDemoConfig {
  const issuer = process.env.CUBID_SIWC_ISSUER_URL ?? process.env.NEXT_PUBLIC_CUBID_ISSUER_URL;
  const clientId =
    process.env.CUBID_SIWC_CLIENT_ID ?? process.env.NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID;
  const redirectUri =
    process.env.CUBID_SIWC_REDIRECT_URI ??
    `${request.nextUrl.origin}/api/cubid/siwc/callback`;
  const scope = (
    process.env.CUBID_SIWC_SCOPE ?? "openid profile email"
  )
    .split(/\s+/u)
    .filter(Boolean);
  const requiredConfigFields = [
    ["CUBID_SIWC_ISSUER_URL or NEXT_PUBLIC_CUBID_ISSUER_URL", issuer],
    ["CUBID_SIWC_CLIENT_ID or NEXT_PUBLIC_CUBID_OIDC_CLIENT_ID", clientId],
    ["CUBID_SIWC_REDIRECT_URI", redirectUri],
  ] satisfies Array<[string, string | undefined]>;
  const missing = requiredConfigFields
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([key]) => key);

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  const configuredIssuer = issuer!;
  const configuredClientId = clientId!;

  return {
    clientId: configuredClientId,
    configured: true,
    issuer: configuredIssuer,
    redirectUri,
    scope,
  };
}

export function getCookieOptions(request: NextRequest): CookieOptions {
  return {
    maxAge: sessionMaxAgeSeconds,
    secure: request.nextUrl.protocol === "https:",
  };
}

export function setTransactionCookie(
  response: NextResponse,
  request: NextRequest,
  transaction: SiwcDemoTransaction
) {
  response.cookies.set(
    siwcDemoCookies.transaction,
    encodeCookiePayload(transaction),
    {
      httpOnly: true,
      maxAge: transactionMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    }
  );
}

export function setReturnToCookie(
  response: NextResponse,
  request: NextRequest,
  returnTo: string
) {
  response.cookies.set(
    siwcDemoCookies.returnTo,
    normalizeReturnTo(returnTo),
    {
      httpOnly: true,
      maxAge: transactionMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    }
  );
}

export function setSessionCookie(
  response: NextResponse,
  request: NextRequest,
  session: SiwcDemoSession
) {
  response.cookies.set(
    siwcDemoCookies.session,
    encodeCookiePayload(session),
    {
      httpOnly: true,
      maxAge: sessionMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    }
  );
}

export function readTransactionCookie(
  request: NextRequest
): SiwcDemoTransaction | null {
  return readCookiePayload<SiwcDemoTransaction>(
    request.cookies.get(siwcDemoCookies.transaction)?.value
  );
}

export function readSessionCookie(request: NextRequest): SiwcDemoSession | null {
  return readCookiePayload<SiwcDemoSession>(
    request.cookies.get(siwcDemoCookies.session)?.value
  );
}

export function readReturnToCookie(request: NextRequest): string {
  return normalizeReturnTo(
    request.cookies.get(siwcDemoCookies.returnTo)?.value ?? "/"
  );
}

export function clearSiwcDemoTransaction(response: NextResponse) {
  response.cookies.delete(siwcDemoCookies.transaction);
  response.cookies.delete(siwcDemoCookies.returnTo);
}

export function clearSiwcDemoSession(response: NextResponse) {
  response.cookies.delete(siwcDemoCookies.session);
}

export function buildSessionSummary(session: SiwcDemoSession | null) {
  if (!session) {
    return {
      authenticated: false,
      status: "not_signed_in",
    };
  }

  return {
    authenticated: true,
    session: {
      authenticatedAt: session.authenticatedAt,
      claims: session.claims,
      clientId: session.clientId,
      expiresAt: session.expiresAt,
      issuer: session.issuer,
      scope: session.scope,
      subject: session.subject,
      userInfo: session.userInfo,
    },
    status: "signed_in",
  };
}

export function buildErrorPayload(error: unknown) {
  if (error instanceof CubidAuthError) {
    return {
      code: error.code,
      message: error.message,
      name: error.name,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return {
    message: "The SIWC demo request failed.",
    name: "Error",
  };
}

export function normalizeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function encodeCookiePayload(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function readCookiePayload<T>(value: string | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
