import "server-only";

import {
  assertCubidAuthorizationState,
  createCubidAuthSession,
  exchangeCubidAuthorizationCode,
  fetchCubidOidcDiscoveryDocument,
  fetchCubidUserInfo,
  parseCubidAuthorizationCallback,
  validateCubidIdToken,
  type CubidIdTokenClaims,
  type CubidUserInfo,
} from "@cubid/auth";
import { NextRequest, NextResponse } from "next/server";

import {
  buildErrorPayload,
  appendTrace,
  assertSiwcDiscoveryIssuer,
  clearSiwcDemoTransaction,
  getSiwcDemoConfig,
  getSiwcRequestOrigin,
  readReturnToCookie,
  readTransactionCookie,
  resolveLocalReturnTo,
  setSessionCookie,
  traceEntry,
} from "@/lib/cubid/siwc-demo";

export type SiwcAppSummary = { accountId: string };

export type SiwcCallbackOptions = {
  onAuthenticated?: (identity: {
    issuer: string;
    clientId: string;
    subject: string;
    claims: CubidIdTokenClaims;
    userInfo: CubidUserInfo | null;
  }) => Promise<SiwcAppSummary | undefined>;
};

export async function handleSiwcCallback(
  request: NextRequest,
  options: SiwcCallbackOptions = {},
) {
  const config = getSiwcDemoConfig(request);
  const returnTo = readReturnToCookie(request);

  if (!config.configured) {
    return redirectWithError(request, returnTo, "missing_config");
  }

  try {
    const transaction = readTransactionCookie(request);

    if (!transaction) {
      return redirectWithError(request, returnTo, "missing_transaction");
    }

    const callback = parseCubidAuthorizationCallback(request.nextUrl);
    assertCubidAuthorizationState(transaction.state, callback);
    if (callback.kind === "error") {
      return redirectWithError(request, returnTo, callback.error);
    }
    if (callback.iss && callback.iss !== transaction.issuer) {
      return redirectWithError(request, returnTo, "callback_issuer_mismatch");
    }

    const discovery = await fetchCubidOidcDiscoveryDocument({
      issuer: transaction.issuer,
    });
    assertSiwcDiscoveryIssuer(transaction.issuer, discovery.issuer);
    const tokenResponse = await exchangeCubidAuthorizationCode({
      clientId: config.clientId,
      code: callback.code,
      codeVerifier: transaction.codeVerifier,
      redirectUri: transaction.redirectUri,
      tokenEndpoint: discovery.token_endpoint,
    });

    if (!tokenResponse.idToken) {
      return redirectWithError(request, returnTo, "missing_id_token");
    }

    const idTokenClaims = await validateCubidIdToken({
      clientId: config.clientId,
      discoveryDocument: discovery,
      idToken: tokenResponse.idToken,
    });

    if (idTokenClaims.nonce !== transaction.nonce) {
      return redirectWithError(request, returnTo, "nonce_mismatch");
    }

    const userInfo =
      discovery.userinfo_endpoint && tokenResponse.accessToken
        ? await fetchCubidUserInfo({
            accessToken: tokenResponse.accessToken,
            userInfoEndpoint: discovery.userinfo_endpoint,
          })
        : null;
    const authSession = createCubidAuthSession({
      clientId: config.clientId,
      idTokenClaims,
      issuer: discovery.issuer,
      tokenResponse,
      userInfo,
    });
    if (userInfo && userInfo.sub !== idTokenClaims.sub) {
      return redirectWithError(request, returnTo, "userinfo_subject_mismatch");
    }
    const subject = idTokenClaims.sub;
    if (typeof subject !== "string" || !subject) {
      return redirectWithError(request, returnTo, "missing_subject");
    }
    let app: SiwcAppSummary | undefined;
    if (options.onAuthenticated) {
      try {
        const mapped = await options.onAuthenticated({
          issuer: discovery.issuer,
          clientId: config.clientId,
          subject,
          claims: idTokenClaims,
          userInfo,
        });
        if (mapped !== undefined) {
          if (
            !mapped ||
            Object.keys(mapped).length !== 1 ||
            typeof mapped.accountId !== "string" ||
            !/^[a-zA-Z0-9_-]{1,128}$/u.test(mapped.accountId)
          ) {
            return redirectWithError(request, returnTo, "invalid_app_summary");
          }
          app = { accountId: mapped.accountId };
        }
      } catch {
        return redirectWithError(request, returnTo, "account_mapping_failed");
      }
    }
    const response = NextResponse.redirect(
      resolveLocalReturnTo(returnTo, getSiwcRequestOrigin(request)),
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");

    setSessionCookie(response, request, {
      app,
      authenticatedAt: new Date().toISOString(),
      claims: authSession.idTokenClaims,
      clientId: authSession.clientId,
      expiresAt: authSession.expiresAt,
      issuer: authSession.issuer,
      scope: authSession.scope,
      subject: authSession.subject,
      userInfo: authSession.userInfo,
    });
    appendTrace(request, response, [
      traceEntry("callback", "Receive Cubid callback", {
        request: {
          method: "GET",
          url: transaction.redirectUri,
          codePresent: true,
          issuer: callback.iss,
          sessionStatePresent: Boolean(callback.sessionState),
          stateMatched: true,
        },
      }),
      traceEntry("token", "Exchange authorization code server-side", {
        request: {
          method: "POST",
          contentType: "application/x-www-form-urlencoded",
          body: {
            client_id: config.clientId,
            code: "[redacted]",
            code_verifier: "[redacted]",
            grant_type: "authorization_code",
            redirect_uri: transaction.redirectUri,
          },
          clientId: config.clientId,
          codePresent: true,
          codeVerifierPresent: true,
          grantType: "authorization_code",
          redirectUri: transaction.redirectUri,
          tokenEndpoint: discovery.token_endpoint,
        },
        response: {
          accessToken: tokenResponse.accessToken ? "[redacted]" : null,
          expiresAt: tokenResponse.expiresAt,
          expiresIn: tokenResponse.expiresIn,
          idToken: tokenResponse.idToken ? "[redacted]" : null,
          refreshToken: tokenResponse.refreshToken ? "[redacted]" : null,
          scope: tokenResponse.scope,
          tokenType: tokenResponse.tokenType,
        },
      }),
      traceEntry("id_token", "Verify ID token using issuer signing keys", {
        request: { method: "GET", url: discovery.jwks_uri },
        response: {
          signatureVerified: true,
          issuerVerified: true,
          audienceVerified: true,
          nonceMatched: true,
          claims: idTokenClaims,
        },
      }),
      traceEntry(
        "userinfo",
        userInfo
          ? "Fetch userinfo with server-side access token"
          : "Skip userinfo (not available)",
        {
          request: {
            method: "GET",
            skipped: !userInfo,
            accessToken: tokenResponse.accessToken ? "[redacted]" : null,
            userInfoEndpoint: discovery.userinfo_endpoint ?? null,
          },
          response: {
            enabled: Boolean(discovery.userinfo_endpoint),
            subject: userInfo?.sub ?? null,
            userInfo,
          },
        },
      ),
      traceEntry("session", "Create starter demo session", {
        response: {
          authenticated: true,
          expiresAt: authSession.expiresAt,
          issuer: authSession.issuer,
          scope: authSession.scope,
          subject: authSession.subject,
        },
      }),
    ]);
    clearSiwcDemoTransaction(response, request);

    return response;
  } catch (error) {
    const errorPayload = buildErrorPayload(error);
    const response = redirectWithError(
      request,
      returnTo,
      "code" in errorPayload && typeof errorPayload.code === "string"
        ? errorPayload.code
        : "callback_failed",
    );
    return response;
  }
}

function redirectWithError(
  request: NextRequest,
  returnTo: string,
  error: string,
) {
  const url = resolveLocalReturnTo(returnTo, getSiwcRequestOrigin(request));
  url.searchParams.set("siwc_error", error);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  if (getSiwcDemoConfig(request).configured)
    appendTrace(request, response, [
      traceEntry("error", "Authorization callback failed", {
        request: { method: "GET", url: "/api/cubid/siwc/callback" },
        response: { error },
      }),
    ]);
  clearSiwcDemoTransaction(response, request);
  return response;
}
