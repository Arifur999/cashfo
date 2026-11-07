// Calendar & Events as the API sends it (GET /api/businesses/:id/events):
// the workspace's people, and every event with its gifts. Amounts arrive as
// decimal strings ("2000.00"); days as "YYYY-MM-DD", times as "HH:MM".

export type SocialEventType = "WEDDING" | "HOLUD" | "AQIQAH" | "KHATNA" | "BIRTHDAY" | "MILAD" | "EID" | "OTHER";
export type GiftDirection = "GAVE" | "GOT";
export type GiftKind = "CASH" | "ITEM";

export interface EventPerson {
  id: string;
  name: string;
  // "Cousin", "Neighbour"; null when none was written.
  relation: string | null;
}

export interface EventGift {
  id: string;
  eventId: string;
  personId: string;
  direction: GiftDirection;
  kind: GiftKind;
  // What an ITEM gift was ("Gold ring").
  item: string | null;
  // Cash given, or about what an item is worth.
  amount: string;
  note: string | null;
  // Cash given that also went into Transactions as a Gifts expense.
  inTransactions: boolean;
  createdAt: string;
}

export interface SocialEvent {
  id: string;
  type: SocialEventType;
  title: string;
  date: string;
  time: string | null;
  place: string | null;
  // The person whose event it is; null for the customer's own.
  hostId: string | null;
  mine: boolean;
  // A reminder the day before, from 9 in the morning.
  remind: boolean;
  gifts: EventGift[];
}

export interface EventsOverview {
  people: EventPerson[];
  events: SocialEvent[];
}

export interface NewEventInput {
  type: SocialEventType;
  title: string;
  date: string;
  time?: string;
  place?: string;
  mine: boolean;
  // Someone else's event: a known person, or a new one by name.
  hostId?: string;
  hostName?: string;
  remind: boolean;
}

export interface NewGiftInput {
  direction: GiftDirection;
  // Someone known, or a new person by name.
  personId?: string;
  personName?: string;
  kind: GiftKind;
  item?: string;
  amount: number;
  // Cash given, also added to Transactions out of this wallet.
  fromAccountId?: string;
}
