import { NextRequest, NextResponse } from "next/server";
import { suggestPickup } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: a participant suggests an alternative pickup / meeting point.
export async function POST(req: NextRequest) {
  let body: { name?: string; description?: string; suggestedBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Please name the meeting point." }, { status: 400 });
  }
  try {
    const pickup = await suggestPickup(
      body.name,
      body.description ?? "",
      body.suggestedBy ?? null,
    );
    return NextResponse.json({ pickup });
  } catch (err) {
    console.error("POST /api/pickups failed", err);
    return NextResponse.json({ error: "Could not add meeting point." }, { status: 500 });
  }
}
