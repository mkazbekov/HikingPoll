"use client";

import { useState } from "react";
import { Car, Bus, Hand, MapPin, Plus, Sparkles, Check } from "lucide-react";
import type { Destination, PickupPoint, TransportMode } from "@/lib/types";
import { Button, Field, inputClass, Stepper, cn } from "./ui";
import { TRANSPORT_META } from "./ParticipantList";

interface Props {
  destinations: Destination[];
  pickups: PickupPoint[];
  destinationId: number | null;
  setDestinationId: (id: number | null) => void;
  pickupId: number | null;
  setPickupId: (id: number | null) => void;
  transportMode: TransportMode;
  setTransportMode: (m: TransportMode) => void;
  seats: number;
  setSeats: (n: number) => void;
  onSuggestDestination: (name: string, description: string) => Promise<void>;
}

const MODES: TransportMode[] = ["CAR", "TRANSIT", "NEEDS_RIDE"];

export function LogisticsForm({
  destinations,
  pickups,
  destinationId,
  setDestinationId,
  pickupId,
  setPickupId,
  transportMode,
  setTransportMode,
  seats,
  setSeats,
  onSuggestDestination,
}: Props) {
  const [showSuggest, setShowSuggest] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitSuggestion = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await onSuggestDestination(newName.trim(), newDesc.trim());
      setNewName("");
      setNewDesc("");
      setShowSuggest(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Destination */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
          <MapPin className="size-4 text-[var(--primary)]" /> Where should we hike?
        </h3>
        <div className="space-y-2">
          {destinations.map((d) => {
            const active = destinationId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDestinationId(active ? null : d.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border-strong)]",
                  )}
                >
                  {active && <Check className="size-3 text-[var(--on-primary)]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--fg)]">{d.name}</span>
                    {d.isSuggested && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                        <Sparkles className="size-3" /> Suggested
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

        {showSuggest ? (
          <div className="mt-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <Field label="Destination name" htmlFor="new-dest" required>
              <input
                id="new-dest"
                className={inputClass}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Mont Tremblant"
              />
            </Field>
            <Field label="A quick note (optional)" htmlFor="new-desc">
              <input
                id="new-desc"
                className={inputClass}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Why this spot?"
              />
            </Field>
            <div className="flex gap-2">
              <Button size="sm" onClick={submitSuggestion} loading={submitting} disabled={!newName.trim()}>
                Add destination
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSuggest(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSuggest(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            <Plus className="size-4" /> Suggest another location
          </button>
        )}
      </div>

      {/* Pickup */}
      {pickups.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[var(--fg)]">Preferred pickup / meeting point</h3>
          <div className="flex flex-wrap gap-2">
            {pickups.map((p) => {
              const active = pickupId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPickupId(active ? null : p.id)}
                  title={p.description || undefined}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Transport */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--fg)]">How will you get there?</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MODES.map((m) => {
            const meta = TRANSPORT_META[m];
            const Icon = meta.icon;
            const active = transportMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setTransportMode(m)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                )}
              >
                <Icon className={cn("size-5", active ? "text-[var(--primary)]" : "text-[var(--fg-muted)]")} />
                <span className={cn("text-sm font-medium", active ? "text-[var(--fg)]" : "text-[var(--fg-muted)]")}>
                  {meta.short === "Car" ? "Driving" : meta.short}
                </span>
              </button>
            );
          })}
        </div>

        {transportMode === "CAR" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 animate-in">
            <Car className="size-5 text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--fg)]">Passenger seats you can offer</span>
            <Stepper value={seats} onChange={setSeats} min={0} max={8} label="passenger seats" />
          </div>
        )}
      </div>
    </div>
  );
}
