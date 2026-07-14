"use client";

import { Car, Bus, Hand, Users, MapPin, MessageCircle } from "lucide-react";
import type { Destination, Participant, PickupPoint, TransportMode } from "@/lib/types";
import { Badge } from "./ui";

export const TRANSPORT_META: Record<
  TransportMode,
  { label: string; short: string; icon: typeof Car }
> = {
  CAR: { label: "Driving (I have a car)", short: "Driving", icon: Car },
  TRANSIT: { label: "Public transit", short: "Transit", icon: Bus },
  NEEDS_RIDE: { label: "Needs a ride", short: "Needs a ride", icon: Hand },
  OTHER: { label: "Other", short: "Other", icon: MessageCircle },
};

/** Order modes are displayed in, regardless of selection order. */
export const TRANSPORT_ORDER: TransportMode[] = ["CAR", "TRANSIT", "NEEDS_RIDE", "OTHER"];

export function sortModes(modes: TransportMode[]): TransportMode[] {
  return TRANSPORT_ORDER.filter((m) => modes.includes(m));
}

export function RideSummary({ participants }: { participants: Participant[] }) {
  const drivers = participants.filter((p) => p.transportModes.includes("CAR"));
  const seatsOffered = drivers.reduce((sum, p) => sum + (p.passengerSeats ?? 0), 0);
  const needRide = participants.filter((p) => p.transportModes.includes("NEEDS_RIDE")).length;

  const enough = seatsOffered >= needRide;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Car className="size-4" />} label="Drivers" value={drivers.length} tone="primary" />
        <Stat icon={<Users className="size-4" />} label="Seats offered" value={seatsOffered} tone="secondary" />
        <Stat
          icon={<Hand className="size-4" />}
          label="Need a ride"
          value={needRide}
          tone={needRide === 0 || enough ? "primary" : "accent"}
        />
      </div>
      {needRide > 0 && (
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          {enough
            ? "There are enough seats for everyone who needs a ride."
            : `Short ${needRide - seatsOffered} ${needRide - seatsOffered === 1 ? "seat" : "seats"} — another driver would help.`}
        </p>
      )}
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
  pickups,
  currentName,
}: {
  participants: Participant[];
  destinations: Destination[];
  pickups: PickupPoint[];
  currentName: string | null;
}) {
  const destName = (id: number | null) =>
    destinations.find((d) => d.id === id)?.name ?? null;
  const pickupName = (id: number | null) =>
    pickups.find((p) => p.id === id)?.name ?? null;

  return (
    <ul className="divide-y divide-[var(--border)]">
      {participants.map((p) => {
        const isYou =
          currentName != null &&
          p.name.toLowerCase() === currentName.trim().toLowerCase();
        const dest = destName(p.destinationId);
        const pickup = pickupName(p.pickupPointId);
        return (
          <li key={p.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-[var(--fg)]">{p.name}</span>
                {isYou && <Badge tone="primary">You</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)]">
                {sortModes(p.transportModes).map((m) => {
                  const meta = TRANSPORT_META[m];
                  const Icon = meta.icon;
                  return (
                    <span key={m} className="inline-flex items-center gap-1">
                      <Icon className="size-3.5" />
                      {m === "OTHER" && p.transportOther ? p.transportOther : meta.short}
                      {m === "CAR" && p.passengerSeats != null && p.passengerSeats > 0 && (
                        <span className="text-[var(--primary)]"> · {p.passengerSeats} seats</span>
                      )}
                    </span>
                  );
                })}
                {dest && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {dest}
                  </span>
                )}
                {pickup && (
                  <span className="inline-flex items-center gap-1 text-[var(--fg-subtle)]">
                    from {pickup}
                  </span>
                )}
                <span className="tnum">{p.slots.length} time{p.slots.length === 1 ? "" : "s"} free</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
