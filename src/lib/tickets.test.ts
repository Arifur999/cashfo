import { describe, expect, it } from "vitest";
import { awaitingReply, earlierTicketsText, hoursText, isLate, openTicketCount, shortTicketId, TICKET_TABS, ticketCount } from "./tickets";

describe("ticket words", () => {
  it("shows the first part of the id with a hash", () => {
    expect(shortTicketId("3f2a1c9b-0000-4000-8000-000000000000")).toBe("#3F2A1");
  });

  it("knows when the user is waiting, and when they have waited too long", () => {
    const now = new Date("2026-10-02T06:00:00Z");
    const fresh = { status: "OPEN" as const, lastMessageFrom: "USER" as const, lastMessageAt: "2026-10-02T05:00:00Z" };
    expect(awaitingReply(fresh)).toBe(true);
    expect(isLate(fresh, now)).toBe(false);
    expect(isLate({ ...fresh, lastMessageAt: "2026-09-30T05:00:00Z" }, now)).toBe(true);
    expect(awaitingReply({ ...fresh, lastMessageFrom: "ADMIN" })).toBe(false);
    expect(awaitingReply({ ...fresh, status: "RESOLVED" })).toBe(false);
  });

  it("writes an average time the short way", () => {
    expect(hoursText(0)).toBe("—");
    expect(hoursText(0.5)).toBe("30m");
    expect(hoursText(3.33)).toBe("3h 20m");
    expect(hoursText(52)).toBe("2d 4h");
  });

  it("sums up a person's earlier tickets", () => {
    expect(earlierTicketsText({ total: 0, solved: 0 })).toBe("None before this one");
    expect(earlierTicketsText({ total: 3, solved: 3 })).toBe("3, all solved");
    expect(earlierTicketsText({ total: 2, solved: 1 })).toBe("2, 1 still open");
  });
});

describe("openTicketCount", () => {
  it("adds up the tickets still in the queue", () => {
    expect(openTicketCount({ OPEN: 4, IN_PROGRESS: 3, WAITING_ON_USER: 2, RESOLVED: 9, CLOSED: 1 })).toBe(9);
  });

  it("counts a status the stats leave out as none", () => {
    expect(openTicketCount({ OPEN: 2 })).toBe(2);
  });
});

describe("TICKET_TABS", () => {
  const counts = { OPEN: 8, IN_PROGRESS: 6, WAITING_ON_USER: 4, RESOLVED: 20, CLOSED: 3 } as const;

  it("counts each tab from the stats, all open first and resolved with closed last", () => {
    expect(TICKET_TABS.map((tab) => [tab.label, ticketCount(counts, tab.statuses)])).toEqual([
      ["All open", 18],
      ["Need a reply", 8],
      ["In progress", 6],
      ["Waiting on user", 4],
      ["Resolved", 23],
    ]);
  });
});
