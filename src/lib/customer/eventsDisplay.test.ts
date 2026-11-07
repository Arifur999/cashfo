import { describe, expect, it } from "vitest";
import { inEnglish as t } from "@/lib/i18n/message";
import { autoTitle, avatarTint, daysFrom, eventStats, historyOf, latestEventOf, ledgerOf, matchesPerson, mineSummary, monthGrid, nextEventOf, shiftMonth, standingOf, suggestedOf, tipFor, upcomingEvents, whenText } from "./eventsDisplay";
import type { EventGift, EventPerson, SocialEvent } from "./eventsTypes";

const gift = (over: Partial<EventGift> & Pick<EventGift, "personId" | "direction" | "amount">): EventGift => ({
  id: `g-${Math.random()}`,
  eventId: "",
  kind: "CASH",
  item: null,
  note: null,
  inTransactions: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});
const event = (over: Partial<SocialEvent> & Pick<SocialEvent, "id" | "date">): SocialEvent => ({
  type: "WEDDING",
  title: over.id,
  time: null,
  place: null,
  hostId: null,
  mine: over.hostId === undefined || over.hostId === null,
  remind: true,
  gifts: [],
  ...over,
});

const people: EventPerson[] = [
  { id: "sumaiya", name: "Sumaiya Apu", relation: "Cousin" },
  { id: "tanvir", name: "Tanvir Bhai", relation: "Colleague" },
  { id: "sabbir", name: "Sabbir", relation: "Friend" },
];

const aqiqah = event({
  id: "aqiqah",
  type: "AQIQAH",
  date: "2025-03-15",
  gifts: [
    gift({ personId: "sumaiya", direction: "GOT", kind: "ITEM", item: "Gold ring", amount: "8000.00" }),
    gift({ personId: "tanvir", direction: "GOT", amount: "1500.00" }),
  ],
});
const sabbirWedding = event({ id: "sabbir-wedding", date: "2026-01-16", hostId: "sabbir", gifts: [gift({ personId: "sabbir", direction: "GAVE", amount: "2000.00" })] });
const tanvirAqiqah = event({ id: "tanvir-aqiqah", type: "AQIQAH", date: "2026-11-14", hostId: "tanvir", gifts: [gift({ personId: "tanvir", direction: "GAVE", amount: "1500.00" })] });
const sumaiyaHolud = event({ id: "sumaiya-holud", type: "HOLUD", date: "2026-11-06", time: "18:00", hostId: "sumaiya" });
const sumaiyaWedding = event({ id: "sumaiya-wedding", date: "2026-11-07", time: "13:00", hostId: "sumaiya" });
const events = [aqiqah, sabbirWedding, tanvirAqiqah, sumaiyaHolud, sumaiyaWedding];
const ledger = ledgerOf(events);

describe("eventsDisplay", () => {
  it("adds up both ways per person in paisa, and says where each stands", () => {
    expect(ledger.get("sumaiya")).toEqual({ gave: 0, got: 800_000 });
    expect(standingOf(ledger.get("sumaiya"))).toEqual({ kind: "they", more: 800_000 });
    expect(standingOf(ledger.get("tanvir"))).toEqual({ kind: "even", each: 150_000 });
    expect(standingOf(ledger.get("sabbir"))).toEqual({ kind: "you", more: 200_000 });
    expect(standingOf(undefined)).toEqual({ kind: "none" });
  });

  it("tips an invitation: no gift at a Gaye Holud, their last gift and what evens it, or a first entry", () => {
    expect(tipFor(sumaiyaHolud, events, people, ledger)).toEqual({ kind: "noGift", type: "HOLUD" });
    const tip = tipFor(sumaiyaWedding, events, people, ledger);
    expect(tip).toMatchObject({ kind: "last", name: "Sumaiya Apu", gift: { item: "Gold ring" }, at: { id: "aqiqah" } });
    expect(suggestedOf(tip)).toBe(800_000);
    expect(suggestedOf(tipFor(tanvirAqiqah, events, people, ledger))).toBe(0);
    const stranger = event({ id: "x", date: "2026-12-01", hostId: "new" });
    expect(tipFor(stranger, events, [...people, { id: "new", name: "Rahim Chacha", relation: null }], ledger)).toEqual({ kind: "first", name: "Rahim Chacha" });
    expect(tipFor(event({ id: "y", date: "2026-12-01", hostId: "sabbir" }), events, people, ledger)).toEqual({ kind: "gaveOnly", name: "Sabbir", gave: 200_000 });
    expect(tipFor(aqiqah, events, people, ledger)).toBeNull();
  });

  it("titles an event from what is picked until one is typed", () => {
    expect(autoTitle(t, { mine: false, type: "WEDDING", host: " Rafi " })).toBe("Rafi's wedding");
    expect(autoTitle(t, { mine: false, type: "AQIQAH", host: "" })).toBe("");
    expect(autoTitle(t, { mine: true, type: "AQIQAH", host: "" })).toBe("My Aqiqah");
    expect(autoTitle(t, { mine: true, type: "EID", host: "" })).toBe("Eid salami");
  });

  it("lays out a month in whole weeks from the reader's first weekday", () => {
    const sunday = monthGrid(2026, 11, 0);
    expect(sunday).toHaveLength(35);
    expect(sunday[0]).toBe("2026-11-01");
    const saturday = monthGrid(2026, 11, 6);
    expect(saturday[0]).toBe("2026-10-31");
    expect(saturday.at(-1)).toBe("2026-12-04");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("counts the cards from today: this month's to come, given this year, received at your own", () => {
    const stats = eventStats(events, "2026-11-01");
    expect(stats.comingUp.map((e) => e.id)).toEqual(["sumaiya-holud", "sumaiya-wedding", "tanvir-aqiqah"]);
    expect(stats).toMatchObject({ gave: 350_000, gaveEvents: 2, received: 950_000, receivedCount: 2 });
    expect(upcomingEvents(events, "2026-11-07").map((e) => e.id)).toEqual(["sumaiya-wedding", "tanvir-aqiqah"]);
  });

  it("finds a person's latest and next event and their history, newest first", () => {
    expect(latestEventOf("tanvir", events)?.id).toBe("tanvir-aqiqah");
    expect(nextEventOf("sumaiya", events, "2026-11-01")?.id).toBe("sumaiya-holud");
    expect(nextEventOf("sabbir", events, "2026-11-01")).toBeNull();
    expect(historyOf("tanvir", events).map((row) => row.event.id)).toEqual(["tanvir-aqiqah", "aqiqah"]);
  });

  it("sums one of your events and filters people by name, relation and standing", () => {
    expect(mineSummary(aqiqah)).toEqual({ cash: 150_000, items: 800_000, people: 2, received: true, total: 950_000 });
    expect(matchesPerson(people[0], "cous", standingOf(ledger.get("sumaiya")), "all")).toBe(true);
    expect(matchesPerson(people[0], "", standingOf(ledger.get("sumaiya")), "you")).toBe(false);
    expect(matchesPerson(people[2], "", standingOf(ledger.get("sabbir")), "you")).toBe(true);
  });

  it("words days and keeps a person's avatar tint", () => {
    const count = (n: number) => String(n);
    expect([0, 1, -1, 5, -3].map((n) => whenText(t, n, count))).toEqual(["Today", "Tomorrow", "Yesterday", "In 5 days", "3 days ago"]);
    expect(daysFrom("2026-11-01", "2026-11-07")).toBe(6);
    expect(avatarTint("sumaiya")).toBe(avatarTint("sumaiya"));
  });
});
