import { NextRequest, NextResponse } from "next/server";
import { suggestDestination } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: a participant suggests an alternative hiking location.
export async function POST(req: NextRequest) {
  let body: { name?: string; description?: string; suggestedBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Please name the destination." }, { status: 400 });
  }
  try {
    const destination = await suggestDestination(
      body.name,
      body.description ?? "",
      body.suggestedBy ?? null,
    );
    return NextResponse.json({ destination });
  } catch (err) {
    console.error("POST /api/destinations failed", err);
    return NextResponse.json({ error: "Could not add destination." }, { status: 500 });
  }
}
