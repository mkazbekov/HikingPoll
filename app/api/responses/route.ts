import { NextRequest, NextResponse } from "next/server";
import { getParticipantByName, upsertResponse } from "@/lib/data";
import type { ResponseInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Load an existing response so the user can edit it (looked up by name).
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name || !name.trim()) {
    return NextResponse.json({ participant: null });
  }
  try {
    const participant = await getParticipantByName(name);
    return NextResponse.json({ participant });
  } catch (err) {
    console.error("GET /api/responses failed", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Partial<ResponseInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name || !String(body.name).trim()) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  try {
    const participant = await upsertResponse({
      name: String(body.name),
      transportModes: Array.isArray(body.transportModes)
        ? (body.transportModes as ResponseInput["transportModes"])
        : ["CAR"],
      transportOther:
        body.transportOther === null || body.transportOther === undefined
          ? null
          : String(body.transportOther),
      passengerSeats:
        body.passengerSeats === null || body.passengerSeats === undefined
          ? null
          : Number(body.passengerSeats),
      destinationId:
        body.destinationId === null || body.destinationId === undefined
          ? null
          : Number(body.destinationId),
      pickupPointId:
        body.pickupPointId === null || body.pickupPointId === undefined
          ? null
          : Number(body.pickupPointId),
      slots: Array.isArray(body.slots) ? body.slots.map(String) : [],
    });
    return NextResponse.json({ participant });
  } catch (err) {
    console.error("POST /api/responses failed", err);
    return NextResponse.json({ error: "Could not save your response." }, { status: 500 });
  }
}
