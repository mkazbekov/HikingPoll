// Postgres data access with two interchangeable backends that speak identical SQL:
//   • Production (Vercel): Neon serverless Postgres, used when DATABASE_URL is set.
//   • Local dev: PGlite, an embedded Postgres saved to ./.pglite — no install needed.
//
// Everything downstream just calls `query(sql, params)` and gets back typed rows.

import path from "node:path";

type Params = unknown[];
type Row = Record<string, unknown>;

interface Backend {
  query<T = Row>(text: string, params?: Params): Promise<T[]>;
}

const useNeon = !!process.env.DATABASE_URL;

let backendPromise: Promise<Backend> | null = null;

async function createBackend(): Promise<Backend> {
  if (useNeon) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL as string);
    // `.query(text, params)` (unsafe/parameterized form) exists at runtime but is
    // not surfaced on the tagged-template type, so we reach it through a cast.
    const runner = sql as unknown as {
      query: (text: string, params: unknown[]) => Promise<Row[]>;
    };
    return {
      async query<T = Row>(text: string, params: Params = []): Promise<T[]> {
        const rows = (await runner.query(text, params)) as unknown as T[];
        return rows;
      },
    };
  }

  // PGlite: embedded Postgres persisted to a local folder.
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(process.cwd(), ".pglite");
  const pg = new PGlite(dataDir);
  await pg.waitReady;
  return {
    async query<T = Row>(text: string, params: Params = []): Promise<T[]> {
      const res = await pg.query<T>(text, params as unknown[]);
      return res.rows as T[];
    },
  };
}

let initPromise: Promise<Backend> | null = null;

async function getBackend(): Promise<Backend> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!backendPromise) backendPromise = createBackend();
    const backend = await backendPromise;
    await ensureSchema(backend);
    await ensureSeed(backend);
    return backend;
  })();
  return initPromise;
}

/** Run a parameterized query. Placeholders are Postgres-style ($1, $2, ...). */
export async function query<T = Row>(text: string, params: Params = []): Promise<T[]> {
  const backend = await getBackend();
  return backend.query<T>(text, params);
}

/** Convenience: first row or null. */
export async function queryOne<T = Row>(text: string, params: Params = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  date_start     TEXT NOT NULL,
  date_end       TEXT NOT NULL,
  day_start_hour INTEGER NOT NULL DEFAULT 6,
  day_end_hour   INTEGER NOT NULL DEFAULT 20,
  slot_minutes   INTEGER NOT NULL DEFAULT 15,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS destinations (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  is_suggested  BOOLEAN NOT NULL DEFAULT false,
  suggested_by  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pickup_points (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  name_key        TEXT NOT NULL UNIQUE,
  transport_mode  TEXT NOT NULL DEFAULT 'CAR',
  passenger_seats INTEGER,
  destination_id  INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
  pickup_point_id INTEGER REFERENCES pickup_points(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id             SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  slot_start     TEXT NOT NULL,
  UNIQUE (participant_id, slot_start)
);

CREATE INDEX IF NOT EXISTS idx_slots_participant ON availability_slots(participant_id);
CREATE INDEX IF NOT EXISTS idx_slots_start ON availability_slots(slot_start);
`;

async function ensureSchema(backend: Backend): Promise<void> {
  // Split on ';' so PGlite (which runs one statement per query) is happy too.
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await backend.query(stmt);
  }
}

// ── Seed (idempotent) ───────────────────────────────────────────────────────────

function defaultDates(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 7 * 8); // ~8 weeks out
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { start: fmt(start), end: fmt(end) };
}

async function ensureSeed(backend: Backend): Promise<void> {
  const events = await backend.query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM events",
  );
  const eventCount = Number(events[0]?.count ?? 0);
  if (eventCount > 0) return;

  const { start, end } = defaultDates();
  await backend.query(
    `INSERT INTO events (title, description, date_start, date_end, day_start_hour, day_end_hour, slot_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      "Group Hike Planning",
      "Let's find a day and departure time that works for everyone. Mark when you're free, pick where we go, and sort out rides.",
      start,
      end,
      6,
      20,
      15,
    ],
  );

  await backend.query(
    `INSERT INTO destinations (name, description, is_suggested, suggested_by)
     VALUES ($1, $2, true, NULL)`,
    [
      "Mont Saint-Hilaire",
      "Suggested trip — a scenic Monteregian hill ~40 min from Montreal with lake views and well-marked trails.",
    ],
  );

  const pickups: [string, string, number][] = [
    ["Downtown — Metro Guy-Concordia", "Central, easy transit access.", 0],
    ["Metro Longueuil", "Handy for the South Shore, closer to the trailhead.", 1],
  ];
  for (const [name, description, order] of pickups) {
    await backend.query(
      `INSERT INTO pickup_points (name, description, sort_order) VALUES ($1, $2, $3)`,
      [name, description, order],
    );
  }
}
