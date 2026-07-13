"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventSettings } from "@/lib/types";
import { parseDateKey, timeRows, weekdayShort, monthShort, pad } from "@/lib/slots";
import { heatVar } from "@/lib/heat";

interface Props {
  dates: string[]; // date keys visible in this week
  event: EventSettings;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** slotKey -> number of OTHER participants free then (for faint context shading). */
  groupCounts: Map<string, number>;
  maxCount: number;
  disabled?: boolean;
}

export function WeekGrid({
  dates,
  event,
  selected,
  onChange,
  groupCounts,
  maxCount,
  disabled = false,
}: Props) {
  const rows = useMemo(
    () => timeRows(event.dayStartHour, event.dayEndHour, event.slotMinutes),
    [event.dayStartHour, event.dayEndHour, event.slotMinutes],
  );

  // Internal working set for smooth dragging; committed to parent on release.
  const [local, setLocal] = useState<Set<string>>(selected);
  const draggingRef = useRef(false);
  const modeRef = useRef<"add" | "erase">("add");
  const workingRef = useRef<Set<string>>(new Set(selected));

  // Sync from parent when not mid-drag (e.g. after loading an existing response).
  useEffect(() => {
    if (!draggingRef.current) {
      setLocal(selected);
      workingRef.current = new Set(selected);
    }
  }, [selected]);

  const applyTo = useCallback((key: string) => {
    const set = workingRef.current;
    if (modeRef.current === "add") set.add(key);
    else set.delete(key);
    setLocal(new Set(set));
  }, []);

  const slotFromPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const cell = el?.closest("[data-slot]") as HTMLElement | null;
    return cell?.dataset.slot ?? null;
  };

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onChange(new Set(workingRef.current));
  }, [onChange]);

  useEffect(() => {
    if (disabled) return;
    const onUp = () => endDrag();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [endDrag, disabled]);

  const onPointerDown = (e: React.PointerEvent, key: string) => {
    if (disabled) return;
    e.preventDefault();
    draggingRef.current = true;
    modeRef.current = workingRef.current.has(key) ? "erase" : "add";
    applyTo(key);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || disabled) return;
    const key = slotFromPoint(e.clientX, e.clientY);
    if (key) applyTo(key);
  };

  const colWidth = "minmax(46px, 1fr)";

  return (
    <div className="overflow-x-auto thin-scroll" style={{ touchAction: "pan-y pan-x" }}>
      <div
        className={disabled ? "no-select opacity-60" : "no-select"}
        onPointerMove={onPointerMove}
        style={{ minWidth: dates.length > 4 ? `${64 + dates.length * 46}px` : undefined }}
      >
        {/* Day header */}
        <div
          className="sticky top-0 z-10 grid bg-[var(--surface)]"
          style={{ gridTemplateColumns: `64px repeat(${dates.length}, ${colWidth})` }}
        >
          <div className="border-b border-[var(--border)]" />
          {dates.map((d) => {
            const date = parseDateKey(d);
            return (
              <div
                key={d}
                className="border-b border-l border-[var(--border)] py-2 text-center"
              >
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

        {/* Time rows */}
        {rows.map((row, ri) => {
          const isHourStart = row.minute === 0;
          return (
            <div
              key={row.key}
              className="grid"
              style={{ gridTemplateColumns: `64px repeat(${dates.length}, ${colWidth})` }}
            >
              <div
                className="relative -translate-y-2 pr-2 text-right text-[11px] tabular-nums text-[var(--fg-subtle)]"
                style={{ touchAction: "pan-y" }}
              >
                {isHourStart ? row.label : ""}
              </div>
              {dates.map((d) => {
                const key = `${d}T${row.key}`;
                const mine = local.has(key);
                const others = groupCounts.get(key) ?? 0;
                const bg = mine
                  ? "var(--primary)"
                  : others > 0
                    ? heatVar(others, maxCount)
                    : "var(--surface)";
                return (
                  <button
                    key={key}
                    type="button"
                    data-slot={key}
                    aria-pressed={mine}
                    aria-label={`${weekdayShort(parseDateKey(d))} ${d} ${row.label}${mine ? " — selected" : ""}`}
                    onPointerDown={(e) => onPointerDown(e, key)}
                    tabIndex={-1}
                    className="h-[22px] border-l border-[var(--border)] transition-colors"
                    style={{
                      backgroundColor: bg,
                      borderTop: isHourStart
                        ? "1px solid var(--border-strong)"
                        : ri === 0
                          ? "none"
                          : "1px solid color-mix(in srgb, var(--border) 45%, transparent)",
                      touchAction: "none",
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function monthDayLabel(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return `${monthShort(d.getMonth())} ${pad(d.getDate())}`;
}
