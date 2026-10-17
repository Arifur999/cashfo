import { describe, expect, it } from "vitest";
import { audienceText, scheduleText } from "./announcements";

// Dhaka is UTC+6: 18:00Z the day before is local midnight.
describe("scheduleText", () => {
  it("writes whole days as a date range", () => {
    expect(scheduleText({ startAt: "2026-09-24T18:00:00.000Z", endAt: "2026-10-09T17:59:00.000Z" })).toBe("25 Sep – 9 Oct");
  });

  it("writes one day with times, or as all day", () => {
    expect(scheduleText({ startAt: "2026-10-03T20:00:00.000Z", endAt: "2026-10-03T21:00:00.000Z" })).toBe("4 Oct, 2:00 – 3:00 am");
    expect(scheduleText({ startAt: "2026-09-27T18:00:00.000Z", endAt: "2026-09-28T17:59:00.000Z" })).toBe("28 Sep, all day");
  });

  it("keeps the times when the schedule has them, and the year when it crosses one", () => {
    expect(scheduleText({ startAt: "2026-10-10T03:00:00.000Z", endAt: "2026-10-31T17:59:00.000Z" })).toBe("10 Oct, 9:00 am – 31 Oct, 11:59 pm");
    expect(scheduleText({ startAt: "2026-12-19T18:00:00.000Z", endAt: "2027-01-05T17:59:00.000Z" })).toBe("20 Dec – 5 Jan 2027");
    expect(scheduleText({ startAt: "2026-10-09T18:00:00.000Z", endAt: null })).toBe("From 10 Oct");
  });
});

describe("audienceText", () => {
  const names = new Map([["free", "Free"]]);
  it("names the plan or everyone", () => {
    expect(audienceText(null, names)).toBe("Everyone");
    expect(audienceText("free", names)).toBe("Free");
    expect(audienceText("gone", names)).toBe("One plan");
  });
});
