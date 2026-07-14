"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Save,
  Settings,
  UserRound,
  Users,
  Mountain,
} from "lucide-react";
import type { PollData, Participant, TransportMode } from "@/lib/types";
import {
  dateRange,
  formatRangeLabel,
  groupIntoWeeks,
  parseDateKey,
  monthShort,
} from "@/lib/slots";
import {
  Button,
  Card,
  Field,
  inputClass,
  SectionHeading,
  Segmented,
  Badge,
  ThemeToggle,
  ToastProvider,
  useToast,
} from "./ui";
import { MountainMark } from "./MountainMark";
import { WeekGrid } from "./WeekGrid";
import { MonthGrid } from "./MonthGrid";
import { Heatmap } from "./Heatmap";
import { LogisticsForm } from "./LogisticsForm";
import { ParticipantList, RideSummary } from "./ParticipantList";

type View = "week" | "month";

export function PollApp() {
  return (
    <ToastProvider>
      <PollAppInner />
    </ToastProvider>
  );
}

function PollAppInner() {
  const toast = useToast();
  const [data, setData] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Identity
  const [nameInput, setNameInput] = useState("");
  const [committedName, setCommittedName] = useState<string | null>(null);
  const [editingExisting, setEditingExisting] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false);

  // Response draft
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transportModes, setTransportModes] = useState<TransportMode[]>(["CAR"]);
  const [transportOther, setTransportOther] = useState("");
  const [seats, setSeats] = useState(3);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [pickupId, setPickupId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // View
  const [view, setView] = useState<View>("week");
  const [weekIndex, setWeekIndex] = useState(0);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/event", { cache: "no-store" });
    if (!res.ok) throw new Error("load failed");
    const json = (await res.json()) as PollData;
    setData(json);
    return json;
  }, []);

  useEffect(() => {
    loadData()
      .then((json) => {
        // Default destination = the organizer-suggested one.
        const suggested = json.destinations.find((d) => d.isSuggested);
        setDestinationId((prev) => prev ?? suggested?.id ?? null);
        const savedName = (() => {
          try {
            return localStorage.getItem("hp-name");
          } catch {
            return null;
          }
        })();
        if (savedName) setNameInput(savedName);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [loadData]);

  const weeks = useMemo(() => {
    if (!data) return [] as string[][];
    return groupIntoWeeks(dateRange(data.event.dateStart, data.event.dateEnd));
  }, [data]);

  // Clamp week index whenever weeks change.
  useEffect(() => {
    if (weeks.length && weekIndex > weeks.length - 1) setWeekIndex(weeks.length - 1);
  }, [weeks, weekIndex]);

  const currentWeek = weeks[weekIndex] ?? [];

  // ── Aggregations (heatmap only — the personal editor never sees these) ────────
  const { allCounts, namesBySlot } = useMemo(() => {
    const all = new Map<string, number>();
    const names = new Map<string, string[]>();
    if (!data) return { allCounts: all, namesBySlot: names };
    for (const p of data.participants) {
      for (const slot of p.slots) {
        all.set(slot, (all.get(slot) ?? 0) + 1);
        if (!names.has(slot)) names.set(slot, []);
        names.get(slot)!.push(p.name);
      }
    }
    return { allCounts: all, namesBySlot: names };
  }, [data]);

  // Month overview of the current person's own selection.
  const myDayCounts = useMemo(() => {
    const day = new Map<string, number>();
    for (const slot of selected) {
      const dk = slot.slice(0, 10);
      day.set(dk, (day.get(dk) ?? 0) + 1);
    }
    return day;
  }, [selected]);

  const totalParticipants = data?.participants.length ?? 0;

  // ── Name gate ───────────────────────────────────────────────────────────────
  const resetDraft = useCallback(
    (poll: PollData | null) => {
      setSelected(new Set());
      setTransportModes(["CAR"]);
      setTransportOther("");
      setSeats(3);
      setPickupId(null);
      const suggested = poll?.destinations.find((d) => d.isSuggested);
      setDestinationId(suggested?.id ?? null);
    },
    [],
  );

  const commitName = useCallback(
    async (raw: string) => {
      const name = raw.trim().replace(/\s+/g, " ");
      if (!name) return;
      setCommittedName(name);
      setLoadingResponse(true);
      try {
        localStorage.setItem("hp-name", name);
      } catch {}
      // Load this person's previous response if it exists; otherwise start blank.
      try {
        const res = await fetch(`/api/responses?name=${encodeURIComponent(name)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as { participant: Participant | null };
        if (json.participant) {
          const p = json.participant;
          setSelected(new Set(p.slots));
          setTransportModes(p.transportModes.length ? p.transportModes : ["CAR"]);
          setTransportOther(p.transportOther ?? "");
          setSeats(p.passengerSeats ?? 3);
          setDestinationId(p.destinationId);
          setPickupId(p.pickupPointId);
          setEditingExisting(true);
          toast("info", "Welcome back! We loaded your previous answers so you can update them.");
        } else {
          resetDraft(data);
          setEditingExisting(false);
        }
      } catch {
        resetDraft(data);
        setEditingExisting(false);
      } finally {
        setLoadingResponse(false);
      }
    },
    [data, resetDraft, toast],
  );

  const resetName = () => {
    setCommittedName(null);
    setEditingExisting(false);
    resetDraft(data);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!committedName) return;
    if (transportModes.length === 0) {
      toast("error", "Pick at least one way you'll get there.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: committedName,
          transportModes,
          transportOther: transportModes.includes("OTHER") ? transportOther.trim() || null : null,
          passengerSeats: transportModes.includes("CAR") ? seats : null,
          destinationId,
          pickupPointId: pickupId,
          slots: Array.from(selected),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      await loadData();
      setEditingExisting(true);
      toast("success", editingExisting ? "Your response was updated." : "You're in — response saved!");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  // ── Suggestions ────────────────────────────────────────────────────────────────
  const suggestDestination = async (name: string, description: string) => {
    const res = await fetch("/api/destinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, suggestedBy: committedName }),
    });
    if (!res.ok) {
      toast("error", "Could not add destination.");
      return;
    }
    const json = await res.json();
    await loadData();
    if (json.destination?.id) setDestinationId(json.destination.id);
    toast("success", "Destination added and selected as your vote.");
  };

  const suggestPickup = async (name: string, description: string) => {
    const res = await fetch("/api/pickups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, suggestedBy: committedName }),
    });
    if (!res.ok) {
      toast("error", "Could not add meeting point.");
      return;
    }
    const json = await res.json();
    await loadData();
    if (json.pickup?.id) setPickupId(json.pickup.id);
    toast("success", "Meeting point added — everyone can pick it now.");
  };

  const goToDay = (dateKey: string) => {
    const idx = weeks.findIndex((w) => w.includes(dateKey));
    if (idx >= 0) {
      setWeekIndex(idx);
      setView("week");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (loadError || !data)
    return (
      <CenteredMessage
        title="Couldn't load the poll"
        body="Something went wrong reaching the server. Please refresh to try again."
      />
    );

  const { event } = data;
  const weekLabel =
    currentWeek.length > 0
      ? (() => {
          const first = parseDateKey(currentWeek[0]);
          const last = parseDateKey(currentWeek[currentWeek.length - 1]);
          return `${monthShort(first.getMonth())} ${first.getDate()} – ${monthShort(last.getMonth())} ${last.getDate()}`;
        })()
      : "";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 sm:px-6">
      {/* Top bar */}
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2.5">
          <MountainMark className="size-9" />
          <div>
            <div className="text-base font-bold leading-tight text-[var(--fg)]">TrailSync</div>
            <div className="text-xs text-[var(--fg-subtle)]">Group hike planner</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
          >
            <Settings className="size-4" /> <span className="hidden sm:inline">Admin</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative bg-gradient-to-br from-[var(--primary-soft)] to-[var(--surface)] p-6 sm:p-8">
          <HeroHills />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--primary)]">
              <CalendarRange className="size-4" />
              {formatRangeLabel(event.dateStart, event.dateEnd)}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--fg)] sm:text-3xl">
              {event.title}
            </h1>
            {event.description && (
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
                {event.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="primary" icon={<MapPin className="size-3.5" />}>
                {data.destinations.find((d) => d.isSuggested)?.name ?? "Destination TBD"}
              </Badge>
              <Badge tone="secondary" icon={<Users className="size-3.5" />}>
                {totalParticipants} {totalParticipants === 1 ? "person" : "people"} responded
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Name gate */}
      {!committedName ? (
        <NameGate
          value={nameInput}
          onChange={setNameInput}
          onSubmit={() => commitName(nameInput)}
        />
      ) : (
        <div className="space-y-6">
          {/* Identity strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <UserRound className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
                  {committedName}
                  {editingExisting && <Badge tone="secondary">Editing your response</Badge>}
                </div>
                <div className="text-xs text-[var(--fg-subtle)]">Responding as this name</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" icon={<Pencil className="size-4" />} onClick={resetName}>
              Change name
            </Button>
          </div>

          {/* Availability */}
          <Card className="animate-in p-5 sm:p-6">
            <SectionHeading
              icon={<CalendarDays className="size-5" />}
              eyebrow="Step 1"
              title="When are you free?"
              description="Tap or drag across the grid to paint the times you could leave. This shows only your selection — everyone's overlap appears in Group results below."
              right={
                <Segmented<View>
                  ariaLabel="Calendar view"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "week", label: "Week", icon: <CalendarDays className="size-4" /> },
                    { value: "month", label: "Month", icon: <CalendarRange className="size-4" /> },
                  ]}
                />
              }
            />

            <div className="mt-5">
              {loadingResponse ? (
                <div className="h-64 animate-pulse rounded-xl bg-[var(--surface-2)]" />
              ) : view === "week" ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                      disabled={weekIndex === 0}
                      className="flex size-11 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
                      aria-label="Previous week"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <span className="text-sm font-semibold text-[var(--fg)]">{weekLabel}</span>
                    <button
                      onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
                      disabled={weekIndex >= weeks.length - 1}
                      className="flex size-11 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
                      aria-label="Next week"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </div>
                  <WeekGrid
                    dates={currentWeek}
                    event={event}
                    selected={selected}
                    onChange={setSelected}
                  />
                  <p className="mt-3 text-xs text-[var(--fg-subtle)]">
                    Drag over green cells again to clear them. Times are in {event.slotMinutes}-minute steps.
                  </p>
                </>
              ) : (
                <MonthGrid
                  event={event}
                  myDayCounts={myDayCounts}
                  onSelectDay={goToDay}
                  activeDates={new Set(currentWeek)}
                />
              )}
            </div>
          </Card>

          {/* Logistics */}
          <Card className="p-5 sm:p-6">
            <SectionHeading
              icon={<MapPin className="size-5" />}
              eyebrow="Step 2"
              title="Destination & getting there"
              description="Vote for where we go, tell us how you'll travel, and pick your meeting point."
            />
            <div className="mt-5">
              <LogisticsForm
                destinations={data.destinations}
                pickups={data.pickups}
                destinationId={destinationId}
                setDestinationId={setDestinationId}
                pickupId={pickupId}
                setPickupId={setPickupId}
                transportModes={transportModes}
                setTransportModes={setTransportModes}
                transportOther={transportOther}
                setTransportOther={setTransportOther}
                seats={seats}
                setSeats={setSeats}
                onSuggestDestination={suggestDestination}
                onSuggestPickup={suggestPickup}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Results */}
      <div className="mt-10 space-y-6">
        <Card className="p-5 sm:p-6">
          <SectionHeading
            icon={<Mountain className="size-5" />}
            title="Group results"
            description="Everyone's availability combined. The stronger the color, the more people are free — the number in each cell shows exactly how many."
          />
          <div className="mt-5">
            {totalParticipants === 0 ? (
              <EmptyResults />
            ) : (
              <Heatmap
                event={event}
                weeks={weeks}
                counts={allCounts}
                namesBySlot={namesBySlot}
                totalParticipants={totalParticipants}
              />
            )}
          </div>
        </Card>

        {totalParticipants > 0 && (
          <>
            <Card className="p-5 sm:p-6">
              <SectionHeading icon={<Users className="size-5" />} title="Rides & seats" />
              <div className="mt-4">
                <RideSummary participants={data.participants} />
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <SectionHeading
                icon={<UserRound className="size-5" />}
                title={`Who's coming (${totalParticipants})`}
              />
              <div className="mt-2">
                <ParticipantList
                  participants={data.participants}
                  destinations={data.destinations}
                  pickups={data.pickups}
                  currentName={committedName}
                />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Sticky save bar */}
      {committedName && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 text-sm text-[var(--fg-muted)]">
              <span className="tnum font-semibold text-[var(--fg)]">{selected.size}</span> time
              {selected.size === 1 ? "" : "s"} selected
            </div>
            <Button size="lg" icon={<Save className="size-4" />} loading={saving} onClick={save}>
              {editingExisting ? "Update my response" : "Save my availability"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-views ───────────────────────────────────────────────────────────────────

/** Decorative layered hills behind the hero text. Purely visual. */
function HeroHills() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-[var(--primary)] opacity-[0.08]"
      viewBox="0 0 800 120"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M0 120 L140 38 L260 96 L400 20 L540 90 L660 46 L800 100 L800 120 Z" fill="currentColor" />
      <path d="M0 120 L90 80 L220 112 L370 62 L520 110 L640 84 L800 116 L800 120 Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function NameGate({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="animate-in p-6 sm:p-8">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <UserRound className="size-6" />
        </span>
        <h2 className="text-xl font-semibold text-[var(--fg)]">First, what&apos;s your name?</h2>
        <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
          Enter your name to add your availability and pick a destination.
        </p>
        <form
          className="mt-5 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Field
            label="Your name"
            htmlFor="name"
            required
            hint="Answered before? Enter the exact same name and we'll load your response so you can update it."
          >
            <input
              id="name"
              className={inputClass}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. Alex Tremblay"
              autoComplete="name"
              autoFocus
            />
          </Field>
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={!value.trim()}>
            Continue
          </Button>
        </form>
      </div>
    </Card>
  );
}

function EmptyResults() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] py-12 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--fg-subtle)]">
        <Mountain className="size-6" />
      </span>
      <p className="font-medium text-[var(--fg)]">No responses yet</p>
      <p className="mt-1 max-w-xs text-sm text-[var(--fg-muted)]">
        Be the first to add your availability — the heatmap fills in as people respond.
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="h-40 animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-2)]" />
      <div className="mt-6 h-64 animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-2)]" />
    </div>
  );
}

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold text-[var(--fg)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">{body}</p>
    </div>
  );
}
