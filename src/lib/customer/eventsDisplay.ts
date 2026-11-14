import type { Translate } from "@/lib/i18n/message";
import type { EventGift, EventPerson, SocialEvent, SocialEventType } from "./eventsTypes";

// Calendar & Events' arithmetic, kept apart from the pages so it can be
// tested: who gave what to whom (in paisa, so sums never drift), where each
// person stands, the "Last time" tip, the month grid and the stat cards.

export type Tint = "pink" | "yellow" | "teal" | "violet" | "orange" | "blue" | "green" | "grey";

export interface EventTypeMeta {
  type: SocialEventType;
  // The tile and chip label (a dictionary key).
  label: string;
  // The word in a title made for it ("Rafi's wedding", "My Aqiqah").
  titleWord: string;
  tint: Tint;
}

// The board's eight, in its order.
export const EVENT_TYPES: readonly EventTypeMeta[] = [
  { type: "WEDDING", label: "Wedding", titleWord: "wedding@@event", tint: "pink" },
  { type: "HOLUD", label: "Gaye Holud", titleWord: "Gaye Holud", tint: "yellow" },
  { type: "AQIQAH", label: "Aqiqah", titleWord: "Aqiqah", tint: "teal" },
  { type: "KHATNA", label: "Khatna", titleWord: "Khatna", tint: "violet" },
  { type: "BIRTHDAY", label: "Birthday", titleWord: "birthday@@event", tint: "orange" },
  { type: "MILAD", label: "Milad", titleWord: "Milad", tint: "blue" },
  { type: "EID", label: "Eid salami", titleWord: "Eid salami", tint: "green" },
  { type: "OTHER", label: "Other", titleWord: "event@@title", tint: "grey" },
];

export const eventTypeMeta = (type: SocialEventType): EventTypeMeta => EVENT_TYPES.find((meta) => meta.type === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];

// A gift isn't usually expected at these; most people give at the main event.
export const NO_GIFT_TYPES: ReadonlySet<SocialEventType> = new Set(["HOLUD", "MILAD"]);

// The six avatar tints, picked by the person's id so a person keeps theirs.
const AVATAR_TINTS: readonly Tint[] = ["green", "pink", "blue", "yellow", "violet", "orange"];
export function avatarTint(id: string): Tint {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return AVATAR_TINTS[sum % AVATAR_TINTS.length];
}

// A title for the event from what is picked so far, until one is typed:
// "Rafi's wedding", "My Aqiqah", "Eid salami"; empty while an invitation
// has no host yet.
export function autoTitle(t: Translate, { mine, type, host }: { mine: boolean; type: SocialEventType; host: string }): string {
  const word = t(eventTypeMeta(type).titleWord);
  if (mine) return type === "EID" ? t("Eid salami") : t("My {event}", { event: word });
  const name = host.trim();
  return name ? t("{name}'s {event}", { name, event: word }) : "";
}

export const paisa = (amount: string | number): number => Math.round(Number(amount) * 100);

export interface Ledger {
  // What the customer gave this person, and what the person gave them, in paisa.
  gave: number;
  got: number;
}

const allGifts = (events: readonly SocialEvent[]): EventGift[] => events.flatMap((event) => event.gifts);

export function ledgerOf(events: readonly SocialEvent[]): Map<string, Ledger> {
  const ledger = new Map<string, Ledger>();
  for (const gift of allGifts(events)) {
    const row = ledger.get(gift.personId) ?? { gave: 0, got: 0 };
    if (gift.direction === "GAVE") row.gave += paisa(gift.amount);
    else row.got += paisa(gift.amount);
    ledger.set(gift.personId, row);
  }
  return ledger;
}

export type Standing = { kind: "none" } | { kind: "even"; each: number } | { kind: "they"; more: number } | { kind: "you"; more: number };

export function standingOf(row: Ledger | undefined): Standing {
  if (!row || (!row.gave && !row.got)) return { kind: "none" };
  if (row.gave === row.got) return { kind: "even", each: row.gave };
  return row.got > row.gave ? { kind: "they", more: row.got - row.gave } : { kind: "you", more: row.gave - row.got };
}

export const STANDING_TINT: Record<Standing["kind"], { bg: string; fg: string }> = {
  none: { bg: "bg-page", fg: "text-ink-2" },
  even: { bg: "bg-mint-50", fg: "text-brand-ink" },
  they: { bg: "bg-warning-soft", fg: "text-warning" },
  you: { bg: "bg-tint-blue", fg: "text-tint-blue-ink" },
};

// Whole days from `today` to `day` (both "YYYY-MM-DD"): 0 today, 1
// tomorrow, -1 yesterday.
export function daysFrom(today: string, day: string): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

// Oldest first; on one day, by the time (no time last), then the title.
export function byWhen(a: SocialEvent, b: SocialEvent): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.time !== b.time) return a.time === null ? 1 : b.time === null ? -1 : a.time < b.time ? -1 : 1;
  return a.title.localeCompare(b.title);
}

// Today's events and those after it, soonest first.
export const upcomingEvents = (events: readonly SocialEvent[], today: string): SocialEvent[] => events.filter((event) => event.date >= today).sort(byWhen);

// The "Last time" note on an invitation: a gift isn't usual here; nothing
// between you yet; what they gave last and what keeps things even; or that
// only you have given so far. `suggested` (paisa) is what evens it up, or 0.
export type Tip =
  | { kind: "noGift"; type: SocialEventType }
  | { kind: "first"; name: string }
  | { kind: "last"; name: string; gift: EventGift; at: SocialEvent | null; standing: Standing }
  | { kind: "gaveOnly"; name: string; gave: number };

export function tipFor(event: SocialEvent, events: readonly SocialEvent[], people: readonly EventPerson[], ledger: Map<string, Ledger>): Tip | null {
  const host = people.find((person) => person.id === event.hostId);
  if (!host) return null;
  if (NO_GIFT_TYPES.has(event.type)) return { kind: "noGift", type: event.type };
  const row = ledger.get(host.id);
  const standing = standingOf(row);
  if (standing.kind === "none") return { kind: "first", name: host.name };
  // Their newest gift to you: the latest event's, the later written on a tie.
  let last: { gift: EventGift; at: SocialEvent } | null = null;
  for (const at of events) {
    for (const gift of at.gifts) {
      if (gift.personId !== host.id || gift.direction !== "GOT") continue;
      if (!last || at.date > last.at.date || (at.date === last.at.date && gift.createdAt > last.gift.createdAt)) last = { gift, at };
    }
  }
  if (last) return { kind: "last", name: host.name, gift: last.gift, at: last.at, standing };
  return { kind: "gaveOnly", name: host.name, gave: row?.gave ?? 0 };
}

export const suggestedOf = (tip: Tip | null): number => (tip?.kind === "last" && tip.standing.kind === "they" ? tip.standing.more : 0);

// The month's grid, whole weeks from the reader's first weekday: every
// day as "YYYY-MM-DD", the days of the months around it included.
export function monthGrid(year: number, month: number, weekStart: number): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() - weekStart + 7) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => new Date(Date.UTC(year, month - 1, 1 - lead + index)).toISOString().slice(0, 10));
}

// The month after or before "YYYY-MM".
export function shiftMonth(key: string, by: number): string {
  const [year, month] = key.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1 + by, 1));
  return moved.toISOString().slice(0, 7);
}

// The latest event a person is part of: theirs, or one with a gift between you.
export function latestEventOf(personId: string, events: readonly SocialEvent[]): SocialEvent | null {
  let latest: SocialEvent | null = null;
  for (const event of events) {
    const part = event.hostId === personId || event.gifts.some((gift) => gift.personId === personId);
    if (part && (!latest || byWhen(latest, event) < 0)) latest = event;
  }
  return latest;
}

// Their next event from today on.
export const nextEventOf = (personId: string, events: readonly SocialEvent[], today: string): SocialEvent | null =>
  upcomingEvents(events, today).find((event) => event.hostId === personId) ?? null;

// Every gift between you and them, with its event, newest event first.
export function historyOf(personId: string, events: readonly SocialEvent[]): { gift: EventGift; event: SocialEvent }[] {
  const rows = events.flatMap((event) => event.gifts.filter((gift) => gift.personId === personId).map((gift) => ({ gift, event })));
  return rows.sort((a, b) => byWhen(b.event, a.event) || (a.gift.createdAt < b.gift.createdAt ? 1 : -1));
}

export type PeopleFilter = "all" | "they" | "you";

export function matchesPerson(person: EventPerson, query: string, standing: Standing, filter: PeopleFilter): boolean {
  const q = query.trim().toLowerCase();
  if (q && !person.name.toLowerCase().includes(q) && !(person.relation ?? "").toLowerCase().includes(q)) return false;
  if (filter === "they") return standing.kind === "they";
  if (filter === "you") return standing.kind === "you";
  return true;
}

// The Calendar page's three cards: this month's events still to come (and
// the next), what you gave at this year's events, and what came in at your
// own.
export function eventStats(events: readonly SocialEvent[], today: string) {
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const comingUp = upcomingEvents(events, today).filter((event) => event.date.slice(0, 7) === month);
  let gave = 0;
  const gaveAt = new Set<string>();
  let received = 0;
  let receivedCount = 0;
  for (const event of events) {
    for (const gift of event.gifts) {
      if (gift.direction === "GAVE" && event.date.slice(0, 4) === year) {
        gave += paisa(gift.amount);
        gaveAt.add(event.id);
      }
      if (gift.direction === "GOT" && event.mine) {
        received += paisa(gift.amount);
        receivedCount += 1;
      }
    }
  }
  return { comingUp, gave, gaveEvents: gaveAt.size, received, receivedCount };
}

// One of your own events: cash in, items at their value, how many people,
// and whether the list is of who gave (From) or who you gave to (To).
export function mineSummary(event: SocialEvent) {
  let cash = 0;
  let items = 0;
  for (const gift of event.gifts) {
    if (gift.kind === "CASH") cash += paisa(gift.amount);
    else items += paisa(gift.amount);
  }
  const people = new Set(event.gifts.map((gift) => gift.personId)).size;
  const received = event.gifts.length === 0 || event.gifts.some((gift) => gift.direction === "GOT");
  const total = cash + items;
  return { cash, items, people, received, total };
}

// "In 5 days", "Today", "Yesterday", "3 days ago".
export function whenText(t: Translate, days: number, count: (value: number) => string): string {
  if (days === 0) return t("Today");
  if (days === 1) return t("Tomorrow");
  if (days === -1) return t("Yesterday");
  return days > 1 ? t("In {count} days", { count: count(days) }) : t("{count} days ago", { count: count(-days) });
}

// "1:00 PM", in the reader's digits.
export function clockText(time: string, t: Translate, digits: (text: string) => string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${digits(`${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`)} ${t(hours < 12 ? "AM" : "PM")}`;
}
