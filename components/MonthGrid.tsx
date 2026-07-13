"use client";

import { useMemo } from "react";
import type { EventSettings } from "@/lib/types";
import { dateKey, monthName, parseDateKey } from "@/lib/slots";
import { heatVar } from "@/lib/heat";

interface Props {
  event: EventSettings;
  /** dateKey -> how many participants are free at some point that day. */
  dayAvailability: Map<string, number>;
  maxParticipants: number;
  onSelectDay: (dateKey: string) => void;
  activeDates: Set<string>;
}

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

interface MonthCell {
  date: Date;
  key: string;
  inMonth: boolean;
  inRange: boolean;
}

function buildMonths(startKey: string, endKey: string): { year: number; month: number; cells: MonthCell[] }[] {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const months: { year: number; month: number; cells: MonthCell[] }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  let guard = 0;
  while (
    (cursor.getFullYear() < end.getFullYear() ||
      (cursor.getFullYear() === end.getFullYear() && cursor.getMonth() <= end.getMonth())) &&
    guard < 24
  ) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(1 - firstDay.getDay()); // back up to Sunday
    const cells: MonthCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const k = dateKey(d);
      cells.push({
        date: d,
        key: k,
        inMonth: d.getMonth() === month,
        inRange: k >= startKey && k <= endKey,
      });
    }
    months.push({ year, month, cells });
    cursor.setMonth(cursor.getMonth() + 1);
    guard++;
  }
  return months;
}

export function MonthGrid({
  event,
  dayAvailability,
  maxParticipants,
  onSelectDay,
  activeDates,
}: Props) {
  const months = useMemo(
    () => buildMonths(event.dateStart, event.dateEnd),
    [event.dateStart, event.dateEnd],
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {months.map((m) => (
        <div key={`${m.year}-${m.month}`}>
          <h3 className="mb-2 px-1 text-sm font-semibold text-[var(--fg)]">
            {monthName(m.month)} {m.year}
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_HEADERS.map((h, i) => (
              <div
                key={i}
                className="pb-1 text-center text-[10px] font-medium uppercase text-[var(--fg-subtle)]"
              >
                {h}
              </div>
            ))}
            {m.cells.map((cell) => {
              if (!cell.inMonth) return <div key={cell.key} />;
              const count = dayAvailability.get(cell.key) ?? 0;
              const clickable = cell.inRange;
              const active = activeDates.has(cell.key);
              const bg =
                clickable && count > 0
                  ? heatVar(count, maxParticipants)
                  : "transparent";
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => onSelectDay(cell.key)}
                  aria-label={`${cell.key}, ${count} available${active ? ", current week" : ""}`}
                  title={clickable ? `${count} available` : undefined}
                  className={[
                    "relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-all",
                    clickable
                      ? "text-[var(--fg)] hover:ring-2 hover:ring-[var(--primary)]"
                      : "cursor-default text-[var(--fg-subtle)] opacity-40",
                    active ? "ring-2 ring-[var(--secondary)]" : "",
                  ].join(" ")}
                  style={{ backgroundColor: bg }}
                >
                  <span
                    className="tnum relative z-10"
                    style={{
                      color:
                        count > 0 && count / maxParticipants > 0.55
                          ? "var(--on-primary)"
                          : undefined,
                    }}
                  >
                    {cell.date.getDate()}
                  </span>
                  {count > 0 && (
                    <span className="absolute bottom-1 right-1 z-10 text-[9px] font-semibold text-[var(--primary)]"
                      style={{ color: count / maxParticipants > 0.55 ? "var(--on-primary)" : "var(--primary)" }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
