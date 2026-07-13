import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight diagnostics for deployment troubleshooting. Reports only whether
// env vars are PRESENT (never their values) and the DB error text if any.
export async function GET() {
  const present = (name: string) => !!process.env[name];
  // Names only (never values) of any env var that looks database-related, so we can
  // see exactly what Vercel injected — including unexpected names.
  const dbRelatedEnvNames = Object.keys(process.env)
    .filter((n) => /(DATABASE|POSTGRES|NEON|PG|SQL|DB_)/i.test(n))
    .sort();
  const info = {
    connectionVarPresent: {
      DATABASE_URL: present("DATABASE_URL"),
      POSTGRES_URL: present("POSTGRES_URL"),
      DATABASE_URL_UNPOOLED: present("DATABASE_URL_UNPOOLED"),
      POSTGRES_URL_NON_POOLING: present("POSTGRES_URL_NON_POOLING"),
      POSTGRES_PRISMA_URL: present("POSTGRES_PRISMA_URL"),
    },
    dbRelatedEnvNames,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    adminPasswordSet: present("ADMIN_PASSWORD"),
    db: "unknown" as string,
  };

  try {
    const rows = await query<{ ok: number }>("SELECT 1 AS ok");
    info.db = rows[0]?.ok === 1 ? "ok" : `unexpected: ${JSON.stringify(rows[0])}`;
    return NextResponse.json({ status: "ok", ...info });
  } catch (err) {
    info.db =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return NextResponse.json({ status: "db-error", ...info }, { status: 500 });
  }
}
