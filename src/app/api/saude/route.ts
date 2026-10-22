import { NextResponse } from "next/server";
import { APP_VERSION } from "@/server/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ ok: true, versao: APP_VERSION });
}
