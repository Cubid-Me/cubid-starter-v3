import { NextRequest, NextResponse } from "next/server";

import {
  appendTrace,
  clearSiwcDemoSession,
  traceEntry,
} from "@/lib/cubid/siwc-demo";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    cleared: true,
    status: "starter_demo_session_cleared",
  });
  clearSiwcDemoSession(response);
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
