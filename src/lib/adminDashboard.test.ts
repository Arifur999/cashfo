import { describe, expect, it } from "vitest";
import { changePercent, dayPart, firstName, hourIn, hoursSince, liveAnnouncements, missingBangla, monthKeyLabel, planShares, topRequests, translationCoverage } from "./adminDashboard";

describe("the greeting", () => {
  it("reads the hour in the platform's time zone", () => {
    // 03:30 UTC is 09:30 in Dhaka and 23:30 the day before in New York.
    const now = new Date("2026-10-02T03:30:00Z");
    expect(hourIn("Asia/Dhaka", now)).toBe(9);
    expect(hourIn("America/New_York", now)).toBe(23);
    expect(hourIn("UTC", new Date("2026-10-02T00:10:00Z"))).toBe(0);
  });

  it("picks the part of the day and the first name", () => {
    expect(dayPart(9)).toBe("morning");
    expect(dayPart(12)).toBe("afternoon");
    expect(dayPart(17)).toBe("evening");
    expect(firstName("Nadia Rahman")).toBe("Nadia");
    expect(firstName("  Admin ")).toBe("Admin");
  });
});

describe("the figures", () => {
  it("gives a change in percent, or nothing when there was nothing before", () => {
    expect(changePercent(60404, 57970)).toBe(4.2);
    expect(changePercent(50, 100)).toBe(-50);
    expect(changePercent(10, 0)).toBeNull();
  });

  it("names a month key and splits accounts by plan", () => {
    expect(monthKeyLabel("2026-10")).toBe("Oct");
    const shares = planShares([
      { planName: "Monthly Pro", totalUsers: 132 },
      { planName: "Free", totalUsers: 1076 },
      { planName: "Business", totalUsers: 0 },
    ]);
    expect(shares.map((share) => `${share.name}:${share.pct}`)).toEqual(["Free:89.1", "Monthly Pro:10.9", "Business:0"]);
    expect(shares[0].color).not.toBe(shares[1].color);
    expect(planShares([])).toEqual([]);
  });

  it("counts hours waiting", () => {
    expect(hoursSince("2026-10-02T06:00:00Z", new Date("2026-10-02T12:30:00Z"))).toBe(6);
    expect(hoursSince("2026-10-02T13:00:00Z", new Date("2026-10-02T12:30:00Z"))).toBe(0);
  });
});

describe("content", () => {
  it("measures Bangla coverage and finds the pages without it", () => {
    expect(translationCoverage([{ bn: "হ্যাঁ" }, { bn: " " }, { bn: "" }, { bn: "না" }])).toEqual({ total: 4, missing: 2, pct: 50 });
    expect(translationCoverage([])).toEqual({ total: 0, missing: 0, pct: 100 });
    expect(missingBangla([{ type: "TERMS", contentBn: "x" }, { type: "REFUND", contentBn: null }, { type: "FAQ", contentBn: "  " }]).map((d) => d.type)).toEqual(["REFUND", "FAQ"]);
  });

  it("keeps the most voted requests and the announcements live now", () => {
    expect(topRequests([{ voteCount: 2 }, { voteCount: 9 }, { voteCount: 5 }], 2).map((r) => r.voteCount)).toEqual([9, 5]);
    const now = new Date("2026-10-02T12:00:00Z");
    const live = liveAnnouncements(
      [
        { id: "a", isActive: true, startAt: "2026-10-01T00:00:00Z", endAt: null },
        { id: "b", isActive: true, startAt: "2026-10-03T00:00:00Z", endAt: null },
        { id: "c", isActive: true, startAt: "2026-09-01T00:00:00Z", endAt: "2026-10-01T00:00:00Z" },
        { id: "d", isActive: false, startAt: "2026-09-01T00:00:00Z", endAt: null },
      ],
      now,
    );
    expect(live.map((a) => a.id)).toEqual(["a"]);
  });
});
