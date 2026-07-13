"use client";

import { Car, Bus, Hand, Users, MapPin } from "lucide-react";
import type { Destination, Participant, TransportMode } from "@/lib/types";
import { Badge } from "./ui";

export const TRANSPORT_META: Record<
  TransportMode,
  { label: string; short: string; icon: typeof Car; tone: "primary" | "secondary" | "accent" }
> = {
  CAR: { label: "Driving (has car)", short: "Car", icon: Car, tone: "primary" },
  TRANSIT: { label: "Public transit", short: "Transit", icon: Bus, tone: "secondary" },
  NEEDS_RIDE: { label: "Needs a ride", short: "Needs ride", icon: Hand, tone: "accent" },
};

export function RideSummary({ participants }: { participants: Participant[] }) {
  const seatsOffered = participants
    .filter((p) => p.transportMode === "CAR")
    .reduce((sum, p) => sum + (p.passengerSeats ?? 0), 0);
  const needRide = participants.filter((p) => p.transportMode === "NEEDS_RIDE").length;
  const drivers = participants.filter((p) => p.transportMode === "CAR").length;

  const enough = seatsOffered >= needRide;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat icon={<Car className="size-4" />} label="Drivers" value={drivers} tone="primary" />
      <Stat icon={<Users className="size-4" />} label="Seats offered" value={seatsOffered} tone="secondary" />
      <Stat
        icon={<Hand className="size-4" />}
        label="Need a ride"
        value={needRide}
        tone={needRide === 0 ? "primary" : enough ? "primary" : "accent"}
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "secondary" | "accent";
}) {
  const tones = {
    primary: "text-[var(--primary)] bg-[var(--primary-soft)]",
    secondary: "text-[var(--secondary)] bg-[var(--secondary-soft)]",
    accent: "text-[var(--accent)] bg-[var(--accent-soft)]",
  };
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
      <div className={`mx-auto mb-1.5 flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}>
        {icon}
      </div>
      <div className="tnum text-2xl font-bold text-[var(--fg)]">{value}</div>
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
    </div>
  );
}

export function ParticipantList({
  participants,
  destinations,
  currentName,
}: {
  participants: Participant[];
  destinations: Destination[];
  currentName: string | null;
}) {
  const destName = (id: number | null) =>
    destinations.find((d) => d.id === id)?.name ?? null;

  return (
    <ul className="divide-y divide-[var(--border)]">
      {participants.map((p) => {
        const meta = TRANSPORT_META[p.transportMode];
        const Icon = meta.icon;
        const isYou =
          currentName != null &&
          p.name.toLowerCase() === currentName.trim().toLowerCase();
        const dest = destName(p.destinationId);
        return (
          <li key={p.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-[var(--fg)]">{p.name}</span>
                {isYou && <Badge tone="primary">You</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Icon className="size-3.5" />
                  {meta.short}
                  {p.transportMode === "CAR" && p.passengerSeats != null && p.passengerSeats > 0 && (
                    <span className="text-[var(--primary)]"> · {p.passengerSeats} seats</span>
                  )}
                </span>
                {dest && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {dest}
                  </span>
                )}
                <span className="tnum">{p.slots.length} slots free</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
