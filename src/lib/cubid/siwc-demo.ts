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
  trace: "cubid_siwc_trace",
  transaction: "cubid_siwc_txn",
} as const;

const transactionMaxAgeSeconds = 10 * 60;
const sessionMaxAgeSeconds = 30 * 60;
const redactedValue = "[redacted]";
const sensitiveBrowserKeys = new Set([
  "access_token",
  "accessToken",
  "address",
  "birthdate",
  "code",
  "code_verifier",
  "codeVerifier",
  "cookie",
  "cookies",
  "email",
  "family_name",
  "given_name",
  "id_token",
  "idToken",
  "name",
  "nonce",
  "phone_number",
  "picture",
  "preferred_username",
  "refresh_token",
  "refreshToken",
  "state",
]);

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

export type SiwcDemoTraceEntry = {
  at: string;
  label: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  step: string;
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
    encodeCookiePayload(sanitizeSiwcDemoSession(session)),
    {
      httpOnly: true,
      maxAge: sessionMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    }
  );
}

export function sanitizeSiwcDemoSession(
  session: SiwcDemoSession
): SiwcDemoSession {
  return redactSiwcDemoValue(session) as SiwcDemoSession;
}

export function setTraceCookie(
  response: NextResponse,
  request: NextRequest,
  trace: SiwcDemoTraceEntry[]
) {
  response.cookies.set(
    siwcDemoCookies.trace,
    encodeCookiePayload(trace.slice(-12)),
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

export function readTraceCookie(request: NextRequest): SiwcDemoTraceEntry[] {
  return (
    readCookiePayload<SiwcDemoTraceEntry[]>(
      request.cookies.get(siwcDemoCookies.trace)?.value
    ) ?? []
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

export function appendTrace(
  request: NextRequest,
  response: NextResponse,
  entries: SiwcDemoTraceEntry[]
) {
  setTraceCookie(response, request, [...readTraceCookie(request), ...entries]);
}

export function traceEntry(
  step: string,
  label: string,
  details: Omit<SiwcDemoTraceEntry, "at" | "label" | "step"> = {}
): SiwcDemoTraceEntry {
  return {
    at: new Date().toISOString(),
    label,
    step,
    ...(redactSiwcDemoValue(details) as Omit<
      SiwcDemoTraceEntry,
      "at" | "label" | "step"
    >),
  };
}

export function buildSessionSummary(
  session: SiwcDemoSession | null,
  trace: SiwcDemoTraceEntry[] = []
) {
  if (!session) {
    return {
      authenticated: false,
      status: "not_signed_in",
      trace,
    };
  }

  return {
    authenticated: true,
    session: {
      authenticatedAt: session.authenticatedAt,
      claims: redactSiwcDemoValue(session.claims),
      clientId: session.clientId,
      expiresAt: session.expiresAt,
      issuer: session.issuer,
      scope: session.scope,
      subject: session.subject,
      userInfo: redactSiwcDemoValue(session.userInfo),
    },
    status: "signed_in",
    trace,
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
  const resolved = resolveLocalReturnTo(value, "https://starter.invalid");
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function resolveLocalReturnTo(value: string, requestOrigin: string): URL {
  const origin = new URL(requestOrigin).origin;

  if (!hasSafeLocalPathPrefix(value)) {
    return new URL("/", origin);
  }

  try {
    const resolved = new URL(value, origin);

    if (
      resolved.origin !== origin ||
      resolved.username.length > 0 ||
      resolved.password.length > 0
    ) {
      return new URL("/", origin);
    }

    return resolved;
  } catch {
    return new URL("/", origin);
  }
}

export function assertSiwcDiscoveryIssuer(
  configuredIssuer: string,
  discoveryIssuer: string
): void {
  if (normalizeIssuer(configuredIssuer) !== normalizeIssuer(discoveryIssuer)) {
    throw new CubidAuthError(
      "Cubid discovery metadata did not match the configured issuer.",
      {
        category: "validation",
        code: "discovery_issuer_mismatch",
      }
    );
  }
}

export function redactSiwcDemoValue(value: unknown): unknown {
  return redactValue(value);
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

function normalizeIssuer(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
  return url.toString().replace(/\/$/u, "");
}

function hasSafeLocalPathPrefix(value: string): boolean {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  const pathEnd = Math.min(
    queryIndex === -1 ? value.length : queryIndex,
    hashIndex === -1 ? value.length : hashIndex
  );
  let path = value.slice(0, pathEnd);

  for (let depth = 0; depth < 4; depth += 1) {
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("\\") ||
      /[\u0000-\u001f\u007f]/u.test(path)
    ) {
      return false;
    }

    try {
      const decoded = decodeURIComponent(path);

      if (decoded === path) {
        return true;
      }

      path = decoded;
    } catch {
      return false;
    }
  }

  return false;
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && sensitiveBrowserKeys.has(key)) {
    return value === null || typeof value === "undefined" ? value : redactedValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, entryKey),
      ])
    );
  }

  return value;
}
