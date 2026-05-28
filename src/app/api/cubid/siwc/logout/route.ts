import { NextResponse } from "next/server";

import { clearSiwcDemoSession } from "@/lib/cubid/siwc-demo";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({
    cleared: true,
    status: "starter_demo_session_cleared",
  });
  clearSiwcDemoSession(response);
  return response;
}
