import {
  assertCubidAuthorizationState,
  createCubidAuthSession,
  exchangeCubidAuthorizationCode,
  fetchCubidOidcDiscoveryDocument,
  fetchCubidUserInfo,
  parseCubidAuthorizationCallback,
  validateCubidIdToken,
} from "@cubid/auth";
import { NextRequest, NextResponse } from "next/server";

import {
  buildErrorPayload,
  appendTrace,
  assertSiwcDiscoveryIssuer,
  clearSiwcDemoTransaction,
  getSiwcDemoConfig,
  readReturnToCookie,
  readTransactionCookie,
  resolveLocalReturnTo,
  setSessionCookie,
  traceEntry,
} from "@/lib/cubid/siwc-demo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
    const response = NextResponse.redirect(
      resolveLocalReturnTo(returnTo, request.nextUrl.origin)
    );

    setSessionCookie(response, request, {
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
          codePresent: true,
          issuer: callback.iss,
          sessionStatePresent: Boolean(callback.sessionState),
          stateMatched: true,
        },
      }),
      traceEntry("token", "Exchange authorization code server-side", {
        request: {
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
      traceEntry("userinfo", "Fetch userinfo with server-side access token", {
        request: {
          accessToken: tokenResponse.accessToken ? "[redacted]" : null,
          userInfoEndpoint: discovery.userinfo_endpoint ?? null,
        },
        response: {
          enabled: Boolean(discovery.userinfo_endpoint),
          subject: userInfo?.sub ?? null,
          userInfo,
        },
      }),
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
    clearSiwcDemoTransaction(response);

    return response;
  } catch (error) {
    const errorPayload = buildErrorPayload(error);
    const response = redirectWithError(
      request,
      returnTo,
      "code" in errorPayload && typeof errorPayload.code === "string"
        ? errorPayload.code
        : "callback_failed"
    );
    response.cookies.set("cubid_siwc_last_error", JSON.stringify(errorPayload), {
      httpOnly: true,
      maxAge: 60,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });

    return response;
  }
}

function redirectWithError(request: NextRequest, returnTo: string, error: string) {
  const url = resolveLocalReturnTo(returnTo, request.nextUrl.origin);
  url.searchParams.set("siwc_error", error);
  const response = NextResponse.redirect(url);
  clearSiwcDemoTransaction(response);
  return response;
}
