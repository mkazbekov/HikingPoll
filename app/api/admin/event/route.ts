import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { updateEvent } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    await updateEvent(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH event failed", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
