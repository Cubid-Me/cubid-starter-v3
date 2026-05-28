import { NextRequest, NextResponse } from "next/server";

import {
  buildSessionSummary,
  readSessionCookie,
} from "@/lib/cubid/siwc-demo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return NextResponse.json(buildSessionSummary(readSessionCookie(request)));
}
