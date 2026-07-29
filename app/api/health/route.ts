import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    ok: true,
    model: process.env.HY3_MODEL || "hy3",
    serverKeyConfigured: Boolean(process.env.HY3_API_KEY),
  });
}
