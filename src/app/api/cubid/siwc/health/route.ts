import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin =
    process.env.CUBID_SIWC_LOGIN_BASE_URL ?? "https://login.cubid.me";
  try {
    const url = new URL("/api/health", origin);
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    const payload = await response.json();
    // Only expose the public deployment fields useful to a relying-party developer.
    return NextResponse.json(
      {
        request: { method: "GET", url: url.href },
        response: {
          httpStatus: response.status,
          service: payload.service,
          status: payload.status,
          build: payload.build,
          oidc: { publicOrigin: payload.oidc?.publicOrigin },
          passkeys: payload.passkeys,
          expectedPublicOrigin: payload.expectedPublicOrigin,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        request: { method: "GET", origin },
        response: {
          error: "login_health_unavailable",
          message:
            "Could not read Login health within 5 seconds. This diagnostic does not block sign-in.",
        },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
