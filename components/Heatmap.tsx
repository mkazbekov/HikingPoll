"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import type { EventSettings } from "@/lib/types";
import { parseDateKey, timeRows, weekdayShort, monthShort, formatTimeLabel } from "@/lib/slots";
import { heatVar, heatTextVar, heatLegend } from "@/lib/heat";

interface Props {
  event: EventSettings;
  /** All weeks in the poll range (arrays of date keys). */
  weeks: string[][];
  /** slotKey -> count across ALL participants. */
  counts: Map<string, number>;
  namesBySlot: Map<string, string[]>;
  totalParticipants: number;
}

function slotLabel(key: string): string {
  const d = parseDateKey(key.slice(0, 10));
  const [h, m] = key.slice(11).split(":").map(Number);
  return `${weekdayShort(d)} ${monthShort(d.getMonth())} ${d.getDate()}, ${formatTimeLabel(h, m)}`;
}

export function Heatmap({ event, weeks, counts, namesBySlot, totalParticipants }: Props) {
  const rows = useMemo(
    () => timeRows(event.dayStartHour, event.dayEndHour, event.slotMinutes),
    [event.dayStartHour, event.dayEndHour, event.slotMinutes],
  );

  // Global top departure times (across the whole poll, not just this week).
  const topSlots = useMemo(() => {
    const entries = Array.from(counts.entries()).filter(([, c]) => c > 0);
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return entries;
  }, [counts]);

  const bestCount = topSlots.length ? topSlots[0][1] : 0;

  // Start on the week that contains the most popular time, so the first
  // thing people see is the answer they came for.
  const [weekIndex, setWeekIndex] = useState(() => {
    if (!topSlots.length) return 0;
    const bestDate = topSlots[0][0].slice(0, 10);
    const idx = weeks.findIndex((w) => w.includes(bestDate));
    return idx >= 0 ? idx : 0;
  });

  const safeIndex = Math.min(weekIndex, Math.max(0, weeks.length - 1));
  const weekDates = weeks[safeIndex] ?? [];
  const max = Math.max(totalParticipants, 1);
  const legend = useMemo(() => heatLegend(max), [max]);
  const colWidth = "minmax(52px, 1fr)";

  const weekLabel =
    weekDates.length > 0
      ? (() => {
          const first = parseDateKey(weekDates[0]);
          const last = parseDateKey(weekDates[weekDates.length - 1]);
          return `${monthShort(first.getMonth())} ${first.getDate()} – ${monthShort(last.getMonth())} ${last.getDate()}`;
        })()
      : "";

  if (totalParticipants === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      {/* Top departure times */}
      {bestCount > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
            <Flame className="size-4 text-[var(--accent)]" />
            Best times so far
          </div>
          <div className="flex flex-wrap gap-2">
            {topSlots
              .filter(([, c]) => c === bestCount)
              .slice(0, 6)
              .map(([key, c]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-[var(--on-primary)]"
                >
                  {slotLabel(key)}
                  <span className="tnum rounded-full bg-white/25 px-1.5 text-xs">
                    {c}/{totalParticipants} free
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Legend: colors always pair with the count shown inside each cell. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--fg-muted)]" aria-hidden={false}>
        {legend.map((item) => (
          <span key={item.level} className="inline-flex items-center gap-1.5">
            <span
              className="size-4 shrink-0 rounded-[4px] border border-[var(--border)]"
              style={{ backgroundColor: `var(--heat-${item.level})` }}
            />
            {item.label}
            <span className="tnum text-[var(--fg-subtle)]">({item.range})</span>
          </span>
        ))}
      </div>

      {/* Week navigation */}
      {weeks.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekIndex(Math.max(0, safeIndex - 1))}
            disabled={safeIndex === 0}
            className="flex size-11 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
            aria-label="Previous week of results"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="text-sm font-semibold text-[var(--fg)]">{weekLabel}</span>
          <button
            onClick={() => setWeekIndex(Math.min(weeks.length - 1, safeIndex + 1))}
            disabled={safeIndex >= weeks.length - 1}
            className="flex size-11 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
            aria-label="Next week of results"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}

      {/* Heat grid (one week at a time) */}
      <div className="thin-scroll overflow-x-auto" style={{ touchAction: "pan-x pan-y" }}>
        <div style={{ minWidth: weekDates.length > 4 ? `${64 + weekDates.length * 52}px` : undefined }}>
          <div
            className="sticky top-0 z-10 grid bg-[var(--surface)]"
            style={{ gridTemplateColumns: `64px repeat(${weekDates.length}, ${colWidth})` }}
          >
            <div className="border-b border-[var(--border)]" />
            {weekDates.map((d) => {
              const date = parseDateKey(d);
              return (
                <div key={d} className="border-b border-l border-[var(--border)] py-2 text-center">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
                    {weekdayShort(date)}
                  </div>
                  <div className="text-sm font-semibold text-[var(--fg)]">
                    {monthShort(date.getMonth())} {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {rows.map((row, ri) => {
            const isHourStart = row.minute === 0;
            return (
              <div
                key={row.key}
                className="grid"
                style={{ gridTemplateColumns: `64px repeat(${weekDates.length}, ${colWidth})` }}
              >
                <div
                  className={
                    ri === 0
                      ? "relative pr-2 text-right text-[11px] tabular-nums text-[var(--fg-subtle)]"
                      : "relative -translate-y-2 pr-2 text-right text-[11px] tabular-nums text-[var(--fg-subtle)]"
                  }
                >
                  {isHourStart ? row.label : ""}
                </div>
                {weekDates.map((d) => {
                  const key = `${d}T${row.key}`;
                  const c = counts.get(key) ?? 0;
                  const names = namesBySlot.get(key) ?? [];
                  return (
                    <div
                      key={key}
                      title={
                        c > 0
                          ? `${slotLabel(key)} — ${c}/${totalParticipants} free: ${names.join(", ")}`
                          : `${slotLabel(key)} — no one yet`
                      }
                      className="flex h-[30px] items-center justify-center border-l border-[var(--border)] text-[11px] font-semibold"
                      style={{
                        backgroundColor: c > 0 ? heatVar(c, max) : "var(--surface)",
                        color: c > 0 ? heatTextVar(c, max) : "transparent",
                        borderTop: isHourStart
                          ? "1px solid var(--border-strong)"
                          : ri === 0
                            ? "none"
                            : "1px solid color-mix(in srgb, var(--border) 45%, transparent)",
                      }}
                    >
                      {c > 0 ? c : ""}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
