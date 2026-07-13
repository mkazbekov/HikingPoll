"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import type { EventSettings } from "@/lib/types";
import { parseDateKey, timeRows, weekdayShort, monthShort, formatTimeLabel } from "@/lib/slots";
import { heatVar, heatTextVar } from "@/lib/heat";

interface Props {
  event: EventSettings;
  weekDates: string[];
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

export function Heatmap({
  event,
  weekDates,
  counts,
  namesBySlot,
  totalParticipants,
}: Props) {
  const rows = useMemo(
    () => timeRows(event.dayStartHour, event.dayEndHour, event.slotMinutes),
    [event.dayStartHour, event.dayEndHour, event.slotMinutes],
  );

  // Global top departure times (across the whole poll, not just this week).
  const topSlots = useMemo(() => {
    const entries = Array.from(counts.entries()).filter(([, c]) => c > 0);
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const best = entries.length ? entries[0][1] : 0;
    return entries.filter((e) => e[1] === best).slice(0, 4).length
      ? entries.slice(0, 4)
      : [];
  }, [counts]);

  const bestCount = topSlots.length ? topSlots[0][1] : 0;
  const max = Math.max(totalParticipants, 1);
  const colWidth = "minmax(46px, 1fr)";

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
            Most popular departure times
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
                  <span className="tnum rounded-full bg-white/20 px-1.5 text-xs">
                    {c}/{totalParticipants}
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
        <span>Fewer free</span>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="size-4 rounded-[4px] border border-[var(--border)]"
            style={{ backgroundColor: `var(--heat-${i})` }}
          />
        ))}
        <span>More free</span>
      </div>

      {/* Heat grid (current week) */}
      <div className="overflow-x-auto thin-scroll" style={{ touchAction: "pan-x pan-y" }}>
        <div style={{ minWidth: weekDates.length > 4 ? `${64 + weekDates.length * 46}px` : undefined }}>
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
                  <div className="text-sm font-semibold text-[var(--fg)]">{date.getDate()}</div>
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
                <div className="relative -translate-y-2 pr-2 text-right text-[11px] tabular-nums text-[var(--fg-subtle)]">
                  {isHourStart ? row.label : ""}
                </div>
                {weekDates.map((d) => {
                  const key = `${d}T${row.key}`;
                  const c = counts.get(key) ?? 0;
                  const names = namesBySlot.get(key) ?? [];
                  return (
                    <div
                      key={key}
                      title={c > 0 ? `${row.label} — ${names.join(", ")}` : `${row.label} — no one yet`}
                      className="flex h-[22px] items-center justify-center border-l border-[var(--border)] text-[10px] font-semibold"
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
