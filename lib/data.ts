// Higher-level data access built on the raw `query` helper. All shapes here match
// the interfaces in lib/types.ts so API routes can return them directly.

import { query, queryOne } from "./db";
import type {
  Destination,
  EventSettings,
  Participant,
  PickupPoint,
  PollData,
  ResponseInput,
  TransportMode,
} from "./types";

const VALID_MODES: TransportMode[] = ["CAR", "TRANSIT", "NEEDS_RIDE"];

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function nameKey(name: string): string {
  return normalizeName(name).toLowerCase();
}

export async function getEvent(): Promise<EventSettings> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, title, description, date_start, date_end, day_start_hour, day_end_hour, slot_minutes
     FROM events ORDER BY id ASC LIMIT 1`,
  );
  if (!row) throw new Error("Event not initialized");
  return {
    id: Number(row.id),
    title: String(row.title),
    description: String(row.description),
    dateStart: String(row.date_start),
    dateEnd: String(row.date_end),
    dayStartHour: Number(row.day_start_hour),
    dayEndHour: Number(row.day_end_hour),
    slotMinutes: Number(row.slot_minutes),
  };
}

export async function getDestinations(): Promise<Destination[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT d.id, d.name, d.description, d.is_suggested, d.suggested_by,
            COUNT(p.id)::int AS vote_count
     FROM destinations d
     LEFT JOIN participants p ON p.destination_id = d.id
     GROUP BY d.id
     ORDER BY d.is_suggested DESC, d.created_at ASC, d.id ASC`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    description: String(r.description ?? ""),
    isSuggested: Boolean(r.is_suggested),
    suggestedBy: r.suggested_by ? String(r.suggested_by) : null,
    voteCount: Number(r.vote_count ?? 0),
  }));
}

export async function getPickups(): Promise<PickupPoint[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, name, description, sort_order FROM pickup_points
     ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    description: String(r.description ?? ""),
    sortOrder: Number(r.sort_order ?? 0),
  }));
}

export async function getParticipants(): Promise<Participant[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, name, transport_mode, passenger_seats, destination_id, pickup_point_id
     FROM participants ORDER BY created_at ASC, id ASC`,
  );
  const slotRows = await query<Record<string, unknown>>(
    `SELECT participant_id, slot_start FROM availability_slots ORDER BY slot_start ASC`,
  );
  const slotsByParticipant = new Map<number, string[]>();
  for (const s of slotRows) {
    const pid = Number(s.participant_id);
    if (!slotsByParticipant.has(pid)) slotsByParticipant.set(pid, []);
    slotsByParticipant.get(pid)!.push(String(s.slot_start));
  }
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    transportMode: String(r.transport_mode) as TransportMode,
    passengerSeats: r.passenger_seats === null ? null : Number(r.passenger_seats),
    destinationId: r.destination_id === null ? null : Number(r.destination_id),
    pickupPointId: r.pickup_point_id === null ? null : Number(r.pickup_point_id),
    slots: slotsByParticipant.get(Number(r.id)) ?? [],
  }));
}

export async function getPollData(): Promise<PollData> {
  const [event, destinations, pickups, participants] = await Promise.all([
    getEvent(),
    getDestinations(),
    getPickups(),
    getParticipants(),
  ]);
  return { event, destinations, pickups, participants };
}

export async function getParticipantByName(
  name: string,
): Promise<Participant | null> {
  const key = nameKey(name);
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, name, transport_mode, passenger_seats, destination_id, pickup_point_id
     FROM participants WHERE name_key = $1`,
    [key],
  );
  if (!row) return null;
  const id = Number(row.id);
  const slotRows = await query<Record<string, unknown>>(
    `SELECT slot_start FROM availability_slots WHERE participant_id = $1 ORDER BY slot_start ASC`,
    [id],
  );
  return {
    id,
    name: String(row.name),
    transportMode: String(row.transport_mode) as TransportMode,
    passengerSeats: row.passenger_seats === null ? null : Number(row.passenger_seats),
    destinationId: row.destination_id === null ? null : Number(row.destination_id),
    pickupPointId: row.pickup_point_id === null ? null : Number(row.pickup_point_id),
    slots: slotRows.map((s) => String(s.slot_start)),
  };
}

/** Create or overwrite a participant's response, keyed by (case-insensitive) name. */
export async function upsertResponse(input: ResponseInput): Promise<Participant> {
  const name = normalizeName(input.name);
  if (!name) throw new Error("Name is required");
  const key = nameKey(name);
  const mode: TransportMode = VALID_MODES.includes(input.transportMode)
    ? input.transportMode
    : "CAR";
  const seats =
    mode === "CAR" && input.passengerSeats != null && input.passengerSeats >= 0
      ? Math.min(20, Math.floor(input.passengerSeats))
      : null;

  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM participants WHERE name_key = $1`,
    [key],
  );

  let participantId: number;
  if (existing) {
    participantId = Number(existing.id);
    await query(
      `UPDATE participants
       SET name = $1, transport_mode = $2, passenger_seats = $3,
           destination_id = $4, pickup_point_id = $5, updated_at = now()
       WHERE id = $6`,
      [name, mode, seats, input.destinationId, input.pickupPointId, participantId],
    );
    await query(`DELETE FROM availability_slots WHERE participant_id = $1`, [
      participantId,
    ]);
  } else {
    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO participants
         (name, name_key, transport_mode, passenger_seats, destination_id, pickup_point_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, key, mode, seats, input.destinationId, input.pickupPointId],
    );
    participantId = Number(inserted!.id);
  }

  // Insert the (validated, de-duplicated) slots.
  const uniqueSlots = Array.from(
    new Set(input.slots.filter((s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))),
  );
  for (const slot of uniqueSlots) {
    await query(
      `INSERT INTO availability_slots (participant_id, slot_start)
       VALUES ($1, $2) ON CONFLICT (participant_id, slot_start) DO NOTHING`,
      [participantId, slot],
    );
  }

  const saved = await getParticipantByName(name);
  if (!saved) throw new Error("Failed to save response");
  return saved;
}

export async function suggestDestination(
  name: string,
  description: string,
  suggestedBy: string | null,
): Promise<Destination> {
  const clean = name.trim();
  if (!clean) throw new Error("Destination name is required");
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO destinations (name, description, is_suggested, suggested_by)
     VALUES ($1, $2, false, $3) RETURNING id`,
    [clean, description.trim(), suggestedBy ? normalizeName(suggestedBy) : null],
  );
  const all = await getDestinations();
  const found = all.find((d) => d.id === Number(inserted!.id));
  if (!found) throw new Error("Failed to add destination");
  return found;
}

// ── Admin mutations ─────────────────────────────────────────────────────────────

export async function deleteParticipant(id: number): Promise<void> {
  await query(`DELETE FROM participants WHERE id = $1`, [id]);
}

export async function updateParticipantMeta(
  id: number,
  fields: Partial<Pick<Participant, "name" | "transportMode" | "passengerSeats" | "destinationId" | "pickupPointId">>,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (fields.name !== undefined) {
    const n = normalizeName(fields.name);
    sets.push(`name = $${i++}`, `name_key = $${i++}`);
    params.push(n, n.toLowerCase());
  }
  if (fields.transportMode !== undefined) {
    sets.push(`transport_mode = $${i++}`);
    params.push(fields.transportMode);
  }
  if (fields.passengerSeats !== undefined) {
    sets.push(`passenger_seats = $${i++}`);
    params.push(fields.passengerSeats);
  }
  if (fields.destinationId !== undefined) {
    sets.push(`destination_id = $${i++}`);
    params.push(fields.destinationId);
  }
  if (fields.pickupPointId !== undefined) {
    sets.push(`pickup_point_id = $${i++}`);
    params.push(fields.pickupPointId);
  }
  if (!sets.length) return;
  sets.push(`updated_at = now()`);
  params.push(id);
  await query(`UPDATE participants SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

export async function createDestination(
  name: string,
  description: string,
  isSuggested: boolean,
): Promise<void> {
  await query(
    `INSERT INTO destinations (name, description, is_suggested) VALUES ($1, $2, $3)`,
    [name.trim(), description.trim(), isSuggested],
  );
}

export async function updateDestination(
  id: number,
  fields: { name?: string; description?: string; isSuggested?: boolean },
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (fields.name !== undefined) { sets.push(`name = $${i++}`); params.push(fields.name.trim()); }
  if (fields.description !== undefined) { sets.push(`description = $${i++}`); params.push(fields.description.trim()); }
  if (fields.isSuggested !== undefined) { sets.push(`is_suggested = $${i++}`); params.push(fields.isSuggested); }
  if (!sets.length) return;
  params.push(id);
  await query(`UPDATE destinations SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

export async function deleteDestination(id: number): Promise<void> {
  await query(`DELETE FROM destinations WHERE id = $1`, [id]);
}

export async function createPickup(
  name: string,
  description: string,
  sortOrder: number,
): Promise<void> {
  await query(
    `INSERT INTO pickup_points (name, description, sort_order) VALUES ($1, $2, $3)`,
    [name.trim(), description.trim(), sortOrder],
  );
}

export async function updatePickup(
  id: number,
  fields: { name?: string; description?: string; sortOrder?: number },
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (fields.name !== undefined) { sets.push(`name = $${i++}`); params.push(fields.name.trim()); }
  if (fields.description !== undefined) { sets.push(`description = $${i++}`); params.push(fields.description.trim()); }
  if (fields.sortOrder !== undefined) { sets.push(`sort_order = $${i++}`); params.push(fields.sortOrder); }
  if (!sets.length) return;
  params.push(id);
  await query(`UPDATE pickup_points SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

export async function deletePickup(id: number): Promise<void> {
  await query(`DELETE FROM pickup_points WHERE id = $1`, [id]);
}

export async function updateEvent(
  fields: Partial<Omit<EventSettings, "id">>,
): Promise<void> {
  const event = await getEvent();
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  const map: [keyof typeof fields, string][] = [
    ["title", "title"],
    ["description", "description"],
    ["dateStart", "date_start"],
    ["dateEnd", "date_end"],
    ["dayStartHour", "day_start_hour"],
    ["dayEndHour", "day_end_hour"],
    ["slotMinutes", "slot_minutes"],
  ];
  for (const [key, col] of map) {
    if (fields[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      params.push(fields[key]);
    }
  }
  if (!sets.length) return;
  sets.push(`updated_at = now()`);
  params.push(event.id);
  await query(`UPDATE events SET ${sets.join(", ")} WHERE id = $${i}`, params);
}
