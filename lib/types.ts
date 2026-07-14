export type TransportMode = "CAR" | "TRANSIT" | "NEEDS_RIDE" | "OTHER";

export interface EventSettings {
  id: number;
  title: string;
  description: string;
  dateStart: string; // "YYYY-MM-DD"
  dateEnd: string; // "YYYY-MM-DD"
  dayStartHour: number; // 0-23
  dayEndHour: number; // 1-24, exclusive end
  slotMinutes: number; // e.g. 30
}

export interface Destination {
  id: number;
  name: string;
  description: string;
  isSuggested: boolean;
  suggestedBy: string | null;
  voteCount: number;
}

export interface PickupPoint {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  suggestedBy: string | null;
}

export interface Participant {
  id: number;
  name: string;
  /** One or more ways this person can travel (e.g. TRANSIT + NEEDS_RIDE). */
  transportModes: TransportMode[];
  /** Free-text travel answer, set when transportModes includes "OTHER". */
  transportOther: string | null;
  passengerSeats: number | null;
  /** Destinations this person voted for (multi-select). */
  destinationIds: number[];
  pickupPointId: number | null;
  /** slot keys "YYYY-MM-DDTHH:mm" */
  slots: string[];
}

export interface PollData {
  event: EventSettings;
  destinations: Destination[];
  pickups: PickupPoint[];
  participants: Participant[];
}

export interface ResponseInput {
  name: string;
  transportModes: TransportMode[];
  transportOther: string | null;
  passengerSeats: number | null;
  destinationIds: number[];
  pickupPointId: number | null;
  slots: string[];
}
