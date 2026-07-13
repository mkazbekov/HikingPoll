import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deletePickup, updatePickup } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    await updatePickup(Number(id), body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH pickup failed", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  try {
    await deletePickup(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE pickup failed", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
