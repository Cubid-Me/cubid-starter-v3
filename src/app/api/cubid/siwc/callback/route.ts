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
  clearSiwcDemoTransaction,
  getSiwcDemoConfig,
  readReturnToCookie,
  readTransactionCookie,
  setSessionCookie,
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
    const tokenResponse = await exchangeCubidAuthorizationCode({
      clientId: config.clientId,
      code: callback.code,
      codeVerifier: transaction.codeVerifier,
      redirectUri: transaction.redirectUri,
      tokenEndpoint: discovery.token_endpoint,
    });
    const idTokenClaims = tokenResponse.idToken
      ? await validateCubidIdToken({
          clientId: config.clientId,
          discoveryDocument: discovery,
          idToken: tokenResponse.idToken,
        })
      : null;

    if (tokenResponse.idToken && idTokenClaims?.nonce !== transaction.nonce) {
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
    const response = NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));

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
    clearSiwcDemoTransaction(response);

    return response;
  } catch (error) {
    const response = redirectWithError(request, returnTo, "callback_failed");
    response.cookies.set("cubid_siwc_last_error", JSON.stringify(buildErrorPayload(error)), {
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
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.set("siwc_error", error);
  const response = NextResponse.redirect(url);
  clearSiwcDemoTransaction(response);
  return response;
}
