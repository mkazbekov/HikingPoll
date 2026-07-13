import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createPickup } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.name || !String(body.name).trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    await createPickup(String(body.name), String(body.description ?? ""), Number(body.sortOrder ?? 0));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST admin pickup failed", err);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
