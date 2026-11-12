import { describe, expect, it } from "vitest";
import { allZero, axisTicks, backupIsDue, compactAmount, compactMoney, openRequests, queueOrder, reportCsv, revenueBarLabel, waitingSince } from "./dashboardFigures";

const ticket = (id: string, priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT", createdAt: string, lastMessageAt: string | null = null) => ({ id, priority, createdAt, lastMessageAt });

describe("the support queue", () => {
  it("waits from the last message, or from the opening", () => {
    expect(waitingSince(ticket("a", "LOW", "2026-10-01T08:00:00Z", "2026-10-02T09:00:00Z"))).toBe("2026-10-02T09:00:00Z");
    expect(waitingSince(ticket("b", "LOW", "2026-10-01T08:00:00Z"))).toBe("2026-10-01T08:00:00Z");
  });

  it("puts the most urgent first, then whoever has waited longest", () => {
    const queue = queueOrder([
      ticket("new-low", "LOW", "2026-10-05T08:00:00Z"),
      ticket("old-low", "LOW", "2026-09-30T08:00:00Z"),
      ticket("urgent", "URGENT", "2026-10-05T10:00:00Z"),
      // Opened long ago, but the user wrote again this morning.
      ticket("high-recent", "HIGH", "2026-09-01T08:00:00Z", "2026-10-05T07:00:00Z"),
      ticket("high-old", "HIGH", "2026-10-03T08:00:00Z"),
    ]);
    expect(queue.map((row) => row.id)).toEqual(["urgent", "high-old", "high-recent", "old-low", "new-low"]);
  });

  it("leaves the list it was given alone", () => {
    const list = [ticket("b", "LOW", "2026-10-05T08:00:00Z"), ticket("a", "URGENT", "2026-10-05T08:00:00Z")];
    queueOrder(list);
    expect(list.map((row) => row.id)).toEqual(["b", "a"]);
  });
});

describe("feature requests", () => {
  it("ranks only the ones still open", () => {
    const requests = [
      { id: "shipped", status: "SHIPPED" as const, voteCount: 90 },
      { id: "planned", status: "PLANNED" as const, voteCount: 40 },
      { id: "declined", status: "DECLINED" as const, voteCount: 80 },
      { id: "new", status: "SUBMITTED" as const, voteCount: 12 },
      { id: "review", status: "UNDER_REVIEW" as const, voteCount: 25 },
      { id: "building", status: "IN_PROGRESS" as const, voteCount: 3 },
    ];
    expect(openRequests(requests).map((request) => request.id)).toEqual(["planned", "review", "new"]);
    expect(openRequests(requests.slice(0, 1))).toEqual([]);
  });
});

describe("a bar's short amount", () => {
  it("keeps small amounts whole", () => {
    expect(compactAmount(0)).toBe("0");
    expect(compactAmount(850)).toBe("850");
    expect(compactAmount(299.5)).toBe("300");
  });

  it("counts thousands, lakhs and crores", () => {
    expect(compactAmount(2_900)).toBe("2.9k");
    expect(compactAmount(3_000)).toBe("3k");
    expect(compactAmount(12_500)).toBe("13k");
    expect(compactAmount(125_000)).toBe("1.3L");
    expect(compactAmount(1_250_000)).toBe("13L");
    expect(compactAmount(12_000_000)).toBe("1.2Cr");
    expect(compactAmount(250_000_000)).toBe("25Cr");
  });

  it("moves up a unit rather than print 1000 or 100k", () => {
    expect(compactAmount(999.6)).toBe("1k");
    expect(compactAmount(99_950)).toBe("1L");
    expect(compactAmount(9_999_999)).toBe("1Cr");
  });

  it("keeps the sign of a month refunds took below zero", () => {
    expect(compactAmount(-2_900)).toBe("-2.9k");
  });

  it("marks a money bar with the taka sign, as the board writes it", () => {
    expect(compactMoney(4_396, "en")).toBe("Tk4.4k");
    expect(compactMoney(41_300, "en")).toBe("Tk41k");
    expect(compactMoney(0, "en")).toBe("Tk0");
    expect(compactMoney(1_250_000, "en")).toBe("Tk13L");
    expect(compactMoney(4_396, "bn")).toBe("৳4.4k");
    // The minus before the sign, and none on a refund that rounds to nothing.
    expect(compactMoney(-2_900, "en")).toBe("-Tk2.9k");
    expect(compactMoney(-0.4, "en")).toBe("Tk0");
  });
});

describe("backups and empty charts", () => {
  it("calls a backup due after two days, or when there is none", () => {
    expect(backupIsDue(0)).toBe(false);
    expect(backupIsDue(2)).toBe(false);
    expect(backupIsDue(3)).toBe(true);
    expect(backupIsDue(null)).toBe(true);
  });

  it("knows a chart with nothing in it", () => {
    expect(allZero([0, 0, 0])).toBe(true);
    expect(allZero([0, 12, 0])).toBe(false);
    expect(allZero([])).toBe(true);
  });
});

describe("the dashboard's charts and report", () => {
  it("labels a revenue bar as the board does", () => {
    expect(revenueBarLabel(41280, "en")).toBe("Tk 41.3k");
    expect(revenueBarLabel(724853, "en")).toBe("Tk 7.2L");
    expect(revenueBarLabel(850, "en")).toBe("Tk 850");
    expect(revenueBarLabel(0, "en")).toBe("Tk 0");
    expect(revenueBarLabel(-850, "bn")).toBe("-৳ 850");
  });

  it("puts five dates under a month of days, the last one today", () => {
    expect(axisTicks(30)).toEqual([0, 7, 15, 22, 29]);
    expect(axisTicks(3)).toEqual([0, 1, 2]);
    expect(axisTicks(0)).toEqual([]);
  });

  it("writes the report as a spreadsheet reads it", () => {
    expect(reportCsv([{ section: "Users", item: "Total users", value: 1284 }, { section: "Plans", item: 'Monthly Pro, "old"', value: "132" }])).toBe(
      ["Section,Item,Value", "Users,Total users,1284", 'Plans,"Monthly Pro, ""old""",132'].join("\n"),
    );
  });
});
