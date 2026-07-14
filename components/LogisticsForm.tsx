"use client";

import { useState } from "react";
import { Car, MapPin, MapPinned, Plus, Sparkles, Check } from "lucide-react";
import type { Destination, PickupPoint, TransportMode } from "@/lib/types";
import { Button, Field, inputClass, Stepper, cn } from "./ui";
import { TRANSPORT_META, TRANSPORT_ORDER } from "./ParticipantList";

interface Props {
  destinations: Destination[];
  pickups: PickupPoint[];
  destinationId: number | null;
  setDestinationId: (id: number | null) => void;
  pickupId: number | null;
  setPickupId: (id: number | null) => void;
  transportModes: TransportMode[];
  setTransportModes: (m: TransportMode[]) => void;
  transportOther: string;
  setTransportOther: (v: string) => void;
  seats: number;
  setSeats: (n: number) => void;
  onSuggestDestination: (name: string, description: string) => Promise<void>;
  onSuggestPickup: (name: string, description: string) => Promise<void>;
}

const MODE_HINTS: Record<TransportMode, string> = {
  CAR: "You can drive and maybe offer seats",
  TRANSIT: "Bus, metro or train",
  NEEDS_RIDE: "You'd like a seat in someone's car",
  OTHER: "Tell us in your own words",
};

export function LogisticsForm({
  destinations,
  pickups,
  destinationId,
  setDestinationId,
  pickupId,
  setPickupId,
  transportModes,
  setTransportModes,
  transportOther,
  setTransportOther,
  seats,
  setSeats,
  onSuggestDestination,
  onSuggestPickup,
}: Props) {
  const toggleMode = (m: TransportMode) => {
    if (transportModes.includes(m)) {
      setTransportModes(transportModes.filter((x) => x !== m));
      return;
    }
    let next = [...transportModes, m];
    // Driving your own car and needing a ride contradict each other.
    if (m === "CAR") next = next.filter((x) => x !== "NEEDS_RIDE");
    if (m === "NEEDS_RIDE") next = next.filter((x) => x !== "CAR");
    setTransportModes(next);
  };

  return (
    <div className="space-y-7">
      {/* Destination */}
      <div>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
          <MapPin className="size-4 text-[var(--primary)]" /> Where should we hike?
        </h3>
        <p className="mb-3 text-xs text-[var(--fg-subtle)]">Vote for one destination.</p>
        <div className="space-y-2">
          {destinations.map((d) => {
            const active = destinationId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDestinationId(active ? null : d.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-150",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    active ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border-strong)]",
                  )}
                >
                  {active && <Check className="pop-in size-3 text-[var(--on-primary)]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--fg)]">{d.name}</span>
                    {d.isSuggested && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                        <Sparkles className="size-3" /> Organizer's pick
                      </span>
                    )}
                    {d.voteCount > 0 && (
                      <span className="tnum text-xs text-[var(--fg-subtle)]">
                        {d.voteCount} {d.voteCount === 1 ? "vote" : "votes"}
                      </span>
                    )}
                  </span>
                  {d.description && (
                    <span className="mt-0.5 block text-sm text-[var(--fg-muted)]">{d.description}</span>
                  )}
                  {d.suggestedBy && (
                    <span className="mt-0.5 block text-xs text-[var(--fg-subtle)]">
                      Suggested by {d.suggestedBy}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <SuggestForm
          buttonLabel="Suggest another destination"
          nameLabel="Destination name"
          namePlaceholder="e.g. Mont Tremblant"
          notePlaceholder="Why this spot?"
          onSubmit={onSuggestDestination}
        />
      </div>

      {/* Transport */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-[var(--fg)]">How will you get there?</h3>
        <p className="mb-3 text-xs text-[var(--fg-subtle)]">Select all that apply.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TRANSPORT_ORDER.map((m) => {
            const meta = TRANSPORT_META[m];
            const Icon = meta.icon;
            const active = transportModes.includes(m);
            return (
              <button
                key={m}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleMode(m)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-150",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                    active ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border-strong)]",
                  )}
                >
                  {active && <Check className="pop-in size-3.5 text-[var(--on-primary)]" strokeWidth={3} />}
                </span>
                <Icon className={cn("size-5 shrink-0", active ? "text-[var(--primary)]" : "text-[var(--fg-muted)]")} />
                <span className="min-w-0">
                  <span className={cn("block text-sm font-medium", active ? "text-[var(--fg)]" : "text-[var(--fg-muted)]")}>
                    {meta.short}
                  </span>
                  <span className="block text-xs text-[var(--fg-subtle)]">{MODE_HINTS[m]}</span>
                </span>
              </button>
            );
          })}
        </div>

        {transportModes.includes("CAR") && (
          <div className="animate-in mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <Car className="size-5 text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--fg)]">Passenger seats you can offer</span>
            <Stepper value={seats} onChange={setSeats} min={0} max={8} label="passenger seats" />
          </div>
        )}

        {transportModes.includes("OTHER") && (
          <div className="animate-in mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <Field label="How are you getting there?" htmlFor="transport-other">
              <input
                id="transport-other"
                className={inputClass}
                value={transportOther}
                onChange={(e) => setTransportOther(e.target.value)}
                placeholder="e.g. Cycling there, joining halfway…"
                maxLength={120}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Pickup */}
      <div>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
          <MapPinned className="size-4 text-[var(--primary)]" /> Preferred pickup / meeting point
        </h3>
        <p className="mb-3 text-xs text-[var(--fg-subtle)]">Where would you join the group? Pick one, or suggest a new spot.</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pickup point">
          {pickups.map((p) => {
            const active = pickupId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPickupId(active ? null : p.id)}
                title={p.description || undefined}
                className={cn(
                  "min-h-11 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition-colors duration-150",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {active && <Check className="pop-in size-3.5" strokeWidth={3} />}
                  {p.name}
                </span>
                {p.suggestedBy && (
                  <span className="block text-[11px] font-normal text-[var(--fg-subtle)]">
                    Suggested by {p.suggestedBy}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <SuggestForm
          buttonLabel="Suggest another location"
          nameLabel="Meeting point"
          namePlaceholder="e.g. Metro Radisson park-and-ride"
          notePlaceholder="Anything useful — parking, exits…"
          onSubmit={onSuggestPickup}
        />
      </div>
    </div>
  );
}

/** Collapsible "suggest your own" form shared by destinations and pickups. */
function SuggestForm({
  buttonLabel,
  nameLabel,
  namePlaceholder,
  notePlaceholder,
  onSubmit,
}: {
  buttonLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  notePlaceholder: string;
  onSubmit: (name: string, description: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim(), note.trim());
      setName("");
      setNote("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-[var(--primary)] hover:underline"
      >
        <Plus className="size-4" /> {buttonLabel}
      </button>
    );
  }

  return (
    <div className="animate-in mt-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <Field label={nameLabel} htmlFor={`suggest-${nameLabel}`} required>
        <input
          id={`suggest-${nameLabel}`}
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          autoFocus
        />
      </Field>
      <Field label="A quick note (optional)" htmlFor={`suggest-note-${nameLabel}`}>
        <input
          id={`suggest-note-${nameLabel}`}
          className={inputClass}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={notePlaceholder}
        />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} loading={submitting} disabled={!name.trim()}>
          Add it
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
