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

const VALID_MODES: TransportMode[] = ["CAR", "TRANSIT", "NEEDS_RIDE", "OTHER"];

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Parse the transport_modes JSON column, falling back to the legacy single column. */
function parseModes(raw: unknown, legacy: unknown): TransportMode[] {
  if (typeof raw === "string" && raw.trim()) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const modes = arr.filter((m): m is TransportMode =>
          VALID_MODES.includes(m as TransportMode),
        );
        if (modes.length) return modes;
      }
    } catch {}
  }
  const single = String(legacy ?? "");
  return VALID_MODES.includes(single as TransportMode)
    ? [single as TransportMode]
    : ["CAR"];
}

/** Sanitize a client-supplied mode list: valid, unique, car/needs-ride not combined. */
function cleanModes(input: unknown): TransportMode[] {
  const arr = Array.isArray(input) ? input : [];
  const modes = Array.from(
    new Set(arr.filter((m): m is TransportMode => VALID_MODES.includes(m as TransportMode))),
  );
  // Driving your own car and needing a ride contradict each other; keep the car.
  if (modes.includes("CAR") && modes.includes("NEEDS_RIDE")) {
    return modes.filter((m) => m !== "NEEDS_RIDE");
  }
  return modes.length ? modes : ["CAR"];
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
            COUNT(v.participant_id)::int AS vote_count
     FROM destinations d
     LEFT JOIN destination_votes v ON v.destination_id = d.id
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
    `SELECT id, name, description, sort_order, suggested_by FROM pickup_points
     ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    description: String(r.description ?? ""),
    sortOrder: Number(r.sort_order ?? 0),
    suggestedBy: r.suggested_by ? String(r.suggested_by) : null,
  }));
}

export async function getParticipants(): Promise<Participant[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, name, transport_mode, transport_modes, transport_other,
            passenger_seats, pickup_point_id
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
  const voteRows = await query<Record<string, unknown>>(
    `SELECT participant_id, destination_id FROM destination_votes ORDER BY destination_id ASC`,
  );
  const votesByParticipant = new Map<number, number[]>();
  for (const v of voteRows) {
    const pid = Number(v.participant_id);
    if (!votesByParticipant.has(pid)) votesByParticipant.set(pid, []);
    votesByParticipant.get(pid)!.push(Number(v.destination_id));
  }
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    transportModes: parseModes(r.transport_modes, r.transport_mode),
    transportOther: r.transport_other ? String(r.transport_other) : null,
    passengerSeats: r.passenger_seats === null ? null : Number(r.passenger_seats),
    destinationIds: votesByParticipant.get(Number(r.id)) ?? [],
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
    `SELECT id, name, transport_mode, transport_modes, transport_other,
            passenger_seats, pickup_point_id
     FROM participants WHERE name_key = $1`,
    [key],
  );
  if (!row) return null;
  const id = Number(row.id);
  const slotRows = await query<Record<string, unknown>>(
    `SELECT slot_start FROM availability_slots WHERE participant_id = $1 ORDER BY slot_start ASC`,
    [id],
  );
  const voteRows = await query<Record<string, unknown>>(
    `SELECT destination_id FROM destination_votes WHERE participant_id = $1 ORDER BY destination_id ASC`,
    [id],
  );
  return {
    id,
    name: String(row.name),
    transportModes: parseModes(row.transport_modes, row.transport_mode),
    transportOther: row.transport_other ? String(row.transport_other) : null,
    passengerSeats: row.passenger_seats === null ? null : Number(row.passenger_seats),
    destinationIds: voteRows.map((v) => Number(v.destination_id)),
    pickupPointId: row.pickup_point_id === null ? null : Number(row.pickup_point_id),
    slots: slotRows.map((s) => String(s.slot_start)),
  };
}

/** Create or overwrite a participant's response, keyed by (case-insensitive) name. */
export async function upsertResponse(input: ResponseInput): Promise<Participant> {
  const name = normalizeName(input.name);
  if (!name) throw new Error("Name is required");
  const key = nameKey(name);
  const modes = cleanModes(input.transportModes);
  const other =
    modes.includes("OTHER") && input.transportOther
      ? String(input.transportOther).trim().slice(0, 120) || null
      : null;
  const seats =
    modes.includes("CAR") && input.passengerSeats != null && input.passengerSeats >= 0
      ? Math.min(20, Math.floor(input.passengerSeats))
      : null;
  const modesJson = JSON.stringify(modes);
  const legacyMode = modes[0]; // keep the old single-value column coherent
  const destinationIds = cleanDestinationIds(input.destinationIds);
  const legacyDest = destinationIds[0] ?? null; // mirror of the first vote

  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM participants WHERE name_key = $1`,
    [key],
  );

  let participantId: number;
  if (existing) {
    participantId = Number(existing.id);
    await query(
      `UPDATE participants
       SET name = $1, transport_mode = $2, transport_modes = $3, transport_other = $4,
           passenger_seats = $5, destination_id = $6, pickup_point_id = $7, updated_at = now()
       WHERE id = $8`,
      [name, legacyMode, modesJson, other, seats, legacyDest, input.pickupPointId, participantId],
    );
    await query(`DELETE FROM availability_slots WHERE participant_id = $1`, [
      participantId,
    ]);
  } else {
    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO participants
         (name, name_key, transport_mode, transport_modes, transport_other,
          passenger_seats, destination_id, pickup_point_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, key, legacyMode, modesJson, other, seats, legacyDest, input.pickupPointId],
    );
    participantId = Number(inserted!.id);
  }

  await writeDestinationVotes(participantId, destinationIds);

  // Insert the (validated, de-duplicated) slots. Minutes must land on the
  // event's slot boundaries (e.g. :00/:30 for 30-minute slots).
  const event = await getEvent();
  const uniqueSlots = Array.from(
    new Set(
      input.slots.filter(
        (s) =>
          typeof s === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) &&
          Number(s.slice(14)) % event.slotMinutes === 0,
      ),
    ),
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
  // Same name already listed? Select it rather than creating a duplicate.
  const dup = await queryOne<{ id: number }>(
    `SELECT id FROM destinations WHERE lower(name) = lower($1)`,
    [clean],
  );
  if (dup) {
    const all = await getDestinations();
    const found = all.find((d) => d.id === Number(dup.id));
    if (found) return found;
  }
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

/** Sanitize a client-supplied destination vote list: numeric, unique. */
function cleanDestinationIds(input: unknown): number[] {
  const arr = Array.isArray(input) ? input : [];
  return Array.from(
    new Set(arr.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
  );
}

/** Replace a participant's destination votes. Unknown destination ids are skipped. */
async function writeDestinationVotes(
  participantId: number,
  destinationIds: number[],
): Promise<void> {
  await query(`DELETE FROM destination_votes WHERE participant_id = $1`, [participantId]);
  for (const destId of destinationIds) {
    await query(
      `INSERT INTO destination_votes (participant_id, destination_id)
       SELECT $1, id FROM destinations WHERE id = $2
       ON CONFLICT (participant_id, destination_id) DO NOTHING`,
      [participantId, destId],
    );
  }
}

/** A participant proposes a new pickup / meeting point everyone can then select. */
export async function suggestPickup(
  name: string,
  description: string,
  suggestedBy: string | null,
): Promise<PickupPoint> {
  const clean = name.trim();
  if (!clean) throw new Error("Pickup point name is required");
  // Same name already listed? Select it rather than creating a duplicate.
  const dup = await queryOne<{ id: number }>(
    `SELECT id FROM pickup_points WHERE lower(name) = lower($1)`,
    [clean],
  );
  if (dup) {
    const all = await getPickups();
    const found = all.find((p) => p.id === Number(dup.id));
    if (found) return found;
  }
  const maxRow = await queryOne<{ max: number }>(
    `SELECT COALESCE(MAX(sort_order), 0)::int AS max FROM pickup_points`,
  );
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO pickup_points (name, description, sort_order, suggested_by)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      clean,
      description.trim(),
      Number(maxRow?.max ?? 0) + 1,
      suggestedBy ? normalizeName(suggestedBy) : null,
    ],
  );
  const all = await getPickups();
  const found = all.find((p) => p.id === Number(inserted!.id));
  if (!found) throw new Error("Failed to add pickup point");
  return found;
}

// ── Admin mutations ─────────────────────────────────────────────────────────────

export async function deleteParticipant(id: number): Promise<void> {
  await query(`DELETE FROM participants WHERE id = $1`, [id]);
}

export async function updateParticipantMeta(
  id: number,
  fields: Partial<Pick<Participant, "name" | "transportModes" | "transportOther" | "passengerSeats" | "destinationIds" | "pickupPointId">>,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (fields.name !== undefined) {
    const n = normalizeName(fields.name);
    sets.push(`name = $${i++}`, `name_key = $${i++}`);
    params.push(n, n.toLowerCase());
  }
  if (fields.transportModes !== undefined) {
    const modes = cleanModes(fields.transportModes);
    sets.push(`transport_modes = $${i++}`, `transport_mode = $${i++}`);
    params.push(JSON.stringify(modes), modes[0]);
  }
  if (fields.transportOther !== undefined) {
    sets.push(`transport_other = $${i++}`);
    params.push(fields.transportOther ? String(fields.transportOther).trim().slice(0, 120) : null);
  }
  if (fields.passengerSeats !== undefined) {
    sets.push(`passenger_seats = $${i++}`);
    params.push(fields.passengerSeats);
  }
  let votes: number[] | null = null;
  if (fields.destinationIds !== undefined) {
    votes = cleanDestinationIds(fields.destinationIds);
    sets.push(`destination_id = $${i++}`);
    params.push(votes[0] ?? null);
  }
  if (fields.pickupPointId !== undefined) {
    sets.push(`pickup_point_id = $${i++}`);
    params.push(fields.pickupPointId);
  }
  if (sets.length) {
    sets.push(`updated_at = now()`);
    params.push(id);
    await query(`UPDATE participants SET ${sets.join(", ")} WHERE id = $${i}`, params);
  }
  if (votes !== null) await writeDestinationVotes(id, votes);
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
