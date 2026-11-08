import {
  buildCubidAuthorizationUrl,
  createCubidAuthNonce,
  createCubidAuthState,
  createCubidPkcePair,
  fetchCubidOidcDiscoveryDocument,
} from "@cubid/auth";
import { NextRequest, NextResponse } from "next/server";

import {
  assertSiwcDiscoveryIssuer,
  getSiwcDemoConfig,
  setReturnToCookie,
  setTraceCookie,
  setTransactionCookie,
  traceEntry,
} from "@/lib/cubid/siwc-demo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getSiwcDemoConfig(request);

  if (!config.configured) {
    return NextResponse.json(
      {
        error: "missing_config",
        missing: config.missing,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const discovery = await fetchCubidOidcDiscoveryDocument({
      issuer: config.issuer,
    });
    assertSiwcDiscoveryIssuer(config.issuer, discovery.issuer);
    const pkce = await createCubidPkcePair();
    const state = createCubidAuthState();
    const nonce = createCubidAuthNonce();
    const prompt = request.nextUrl.searchParams.get("prompt") ?? undefined;
    const maxAge = request.nextUrl.searchParams.has("max_age")
      ? Number(request.nextUrl.searchParams.get("max_age"))
      : undefined;
    const authorizationUrl = buildCubidAuthorizationUrl({
      authorizationEndpoint: discovery.authorization_endpoint,
      clientId: config.clientId,
      codeChallenge: pkce.codeChallenge,
      codeChallengeMethod: pkce.codeChallengeMethod,
      maxAge: Number.isFinite(maxAge) ? maxAge : undefined,
      nonce,
      prompt,
      redirectUri: config.redirectUri,
      requirePasskey: true,
      scope: config.scope,
      state,
    });
    const response =
      request.nextUrl.searchParams.get("format") === "json"
        ? NextResponse.json(
            { authorizationUrl },
            { headers: { "Cache-Control": "no-store" } },
          )
        : NextResponse.redirect(authorizationUrl, {
            headers: { "Cache-Control": "no-store" },
          });

    setTransactionCookie(response, request, {
      codeVerifier: pkce.codeVerifier,
      issuer: config.issuer,
      nonce,
      redirectUri: config.redirectUri,
      state,
    });
    setReturnToCookie(
      response,
      request,
      request.nextUrl.searchParams.get("return_to") ?? "/",
    );
    setTraceCookie(response, request, [
      traceEntry("discovery", "Fetch issuer discovery metadata", {
        request: {
          issuer: config.issuer,
          method: "GET",
          url: `${config.issuer.replace(/\/$/u, "")}/.well-known/openid-configuration`,
        },
        response: {
          authorizationEndpoint: discovery.authorization_endpoint,
          endSessionEndpoint: discovery.end_session_endpoint ?? null,
          issuer: discovery.issuer,
          tokenEndpoint: discovery.token_endpoint,
          userInfoEndpoint: discovery.userinfo_endpoint ?? null,
        },
      }),
      traceEntry("authorization", "Redirect to Cubid authorization endpoint", {
        request: {
          method: "GET",
          url: discovery.authorization_endpoint,
          acrValues: "urn:cubid:acr:passkey",
          clientId: config.clientId,
          codeChallengeMethod: pkce.codeChallengeMethod,
          codeChallengePresent: true,
          maxAge: Number.isFinite(maxAge) ? maxAge : null,
          noncePresent: true,
          prompt: prompt ?? null,
          redirectUri: config.redirectUri,
          responseType: "code",
          scope: config.scope,
          statePresent: true,
          parameters: Object.fromEntries(
            new URL(authorizationUrl).searchParams,
          ),
        },
        response: {
          redirectTo: discovery.authorization_endpoint,
          status: response.status,
        },
      }),
    ]);

    return response;
  } catch {
    return NextResponse.json(
      {
        error: "siwc_start_failed",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
