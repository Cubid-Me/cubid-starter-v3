import { NextRequest, NextResponse } from "next/server";

import {
  appendTrace,
  clearSiwcDemoSession,
  traceEntry,
  getSiwcDemoConfig,
  getSiwcRequestOrigin,
} from "@/lib/cubid/siwc-demo";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getSiwcRequestOrigin(request)) {
    return NextResponse.json(
      { error: "origin_mismatch" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const response = NextResponse.json(
    {
      cleared: true,
      status: "starter_demo_session_cleared",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearSiwcDemoSession(response, request);
  if (getSiwcDemoConfig(request).configured)
    appendTrace(request, response, [
      traceEntry("logout", "Clear starter demo session only", {
        request: {
          method: "POST",
          url: "/api/cubid/siwc/logout",
        },
        response: {
          cleared: true,
          cubidSsoSession: "preserved",
          status: "starter_demo_session_cleared",
        },
      }),
    ]);
  return response;
}
