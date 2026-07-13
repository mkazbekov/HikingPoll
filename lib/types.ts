export type TransportMode = "CAR" | "TRANSIT" | "NEEDS_RIDE";

export interface EventSettings {
  id: number;
  title: string;
  description: string;
  dateStart: string; // "YYYY-MM-DD"
  dateEnd: string; // "YYYY-MM-DD"
  dayStartHour: number; // 0-23
  dayEndHour: number; // 1-24, exclusive end
  slotMinutes: number; // e.g. 15
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
}

export interface Participant {
  id: number;
  name: string;
  transportMode: TransportMode;
  passengerSeats: number | null;
  destinationId: number | null;
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
  transportMode: TransportMode;
  passengerSeats: number | null;
  destinationId: number | null;
  pickupPointId: number | null;
  slots: string[];
}
