import type { NextRequest } from "next/server";
import { handleSiwcCallback } from "@/lib/cubid/siwc-callback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return handleSiwcCallback(request);
}
