import { NextResponse } from "next/server";
import { getPollData } from "@/lib/data";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [data, admin] = await Promise.all([getPollData(), isAdmin()]);
    return NextResponse.json({ ...data, isAdmin: admin });
  } catch (err) {
    console.error("GET /api/event failed", err);
    return NextResponse.json({ error: "Failed to load poll" }, { status: 500 });
  }
}
