"use client";

import { useMemo } from "react";
import type { EventSettings } from "@/lib/types";
import { dateKey, monthName, parseDateKey } from "@/lib/slots";
import { cn } from "./ui";

interface Props {
  event: EventSettings;
  /** dateKey -> how many slots YOU have selected that day (own response only). */
  myDayCounts: Map<string, number>;
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

/**
 * Month overview of YOUR OWN selection. Days you've marked get a green tint
 * and a dot; tap any day to jump to that week and edit the exact times.
 */
export function MonthGrid({ event, myDayCounts, onSelectDay, activeDates }: Props) {
  const months = useMemo(
    () => buildMonths(event.dateStart, event.dateEnd),
    [event.dateStart, event.dateEnd],
  );

  return (
    <div>
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
                const count = myDayCounts.get(cell.key) ?? 0;
                const clickable = cell.inRange;
                const active = activeDates.has(cell.key);
                const marked = clickable && count > 0;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!clickable}
                    onClick={() => onSelectDay(cell.key)}
                    aria-label={`${cell.key}${marked ? `, you marked ${count} time${count === 1 ? "" : "s"}` : ""}${active ? ", current week" : ""}`}
                    title={marked ? `You marked ${count} time${count === 1 ? "" : "s"} — tap to edit` : clickable ? "Tap to pick times this day" : undefined}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-all duration-150",
                      clickable
                        ? "text-[var(--fg)] hover:ring-2 hover:ring-[var(--primary)]"
                        : "cursor-default text-[var(--fg-subtle)] opacity-40",
                      marked && "bg-[var(--primary-soft)] font-semibold text-[var(--primary)]",
                      active && "ring-1 ring-[var(--border-strong)]",
                    )}
                  >
                    <span className="tnum relative z-10">{cell.date.getDate()}</span>
                    {marked && (
                      <span
                        className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--primary)]"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-[var(--fg-subtle)]">
        Days with a green dot are ones you&apos;ve marked. Tap any day to jump to that
        week and fine-tune your times.
      </p>
    </div>
  );
}
