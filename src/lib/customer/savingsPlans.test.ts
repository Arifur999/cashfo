import { describe, expect, it } from "vitest";
import type { SavingsPlan } from "./api";
import { addMonths, linkHref, planMonthly, planMonths, planNeedBy, planWhen, plansSummary, shortLink, sortPlans } from "./savingsPlans";

const plan = (over: Partial<SavingsPlan>): SavingsPlan => ({
  id: "p",
  name: "Plan",
  category: "others",
  color: "#235347",
  amount: "1000.00",
  horizon: "SIX_MONTHS",
  needBy: null,
  priority: "MEDIUM",
  note: null,
  link: null,
  plannedOn: "2026-10-01",
  neededBy: "2027-04-30",
  monthly: "170.00",
  ...over,
});

describe("saving plan arithmetic", () => {
  it("matches the board's figures", () => {
    expect(planMonthly(35000, "THREE_MONTHS", null, "2026-10-31")).toBe(11670);
    expect(planMonths("BY_DATE", "2029-05-31", "2026-10-31")).toBe(31);
    expect(planMonthly(750000, "BY_DATE", "2029-05-31", "2026-10-31")).toBe(24200);
    expect(planMonthly(250000, "ONE_YEAR", null, "2026-10-31")).toBe(20840);
    expect(planMonthly(500000, "SOMEDAY", null, "2026-10-31")).toBe(0);
  });

  it("counts a length of time from today and keeps a month's last day", () => {
    expect(planNeedBy("THREE_MONTHS", null, "2026-10-31")).toBe("2027-01-31");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(planNeedBy("SOMEDAY", null, "2026-10-31")).toBeNull();
  });

  it("words when it is needed", () => {
    expect(planWhen({ horizon: "TWO_YEARS", needBy: null }, "2026-10-31")).toEqual({ key: "Within 2 years" });
    expect(planWhen({ horizon: "BY_DATE", needBy: "2029-05-31" }, "2026-10-31")).toEqual({ key: "In about {count} months", count: 31 });
    expect(planWhen({ horizon: "SOMEDAY", needBy: null }, "2026-10-31")).toEqual({ key: "Someday" });
  });
});

describe("sortPlans", () => {
  const plans = [
    plan({ id: "low", priority: "LOW", amount: "250000.00", neededBy: "2027-10-31" }),
    plan({ id: "high-late", priority: "HIGH", amount: "750000.00", neededBy: "2029-05-31" }),
    plan({ id: "high-soon", priority: "HIGH", amount: "35000.00", neededBy: "2027-01-31" }),
    plan({ id: "later", horizon: "SOMEDAY", neededBy: null, priority: "LOW" }),
  ];
  it("puts High first, then the sooner date, and keeps Someday apart", () => {
    const { dated, someday } = sortPlans(plans, "PRIORITY");
    expect(dated.map((p) => p.id)).toEqual(["high-soon", "high-late", "low"]);
    expect(someday.map((p) => p.id)).toEqual(["later"]);
  });
  it("sorts by date and by amount", () => {
    expect(sortPlans(plans, "NEED_BY").dated.map((p) => p.id)).toEqual(["high-soon", "low", "high-late"]);
    expect(sortPlans(plans, "AMOUNT").dated.map((p) => p.id)).toEqual(["high-late", "low", "high-soon"]);
  });
  it("sums the KPI row", () => {
    expect(plansSummary(plans)).toEqual({ count: 4, high: 2, total: 1036000, monthly: 680 });
  });
});

describe("links", () => {
  it("shows a link without its scheme and opens it with one", () => {
    expect(shortLink("https://daraz.com.bd/products/phone")).toBe("daraz.com.bd/products/phone");
    expect(linkHref("daraz.com.bd/p")).toBe("https://daraz.com.bd/p");
    expect(linkHref("http://x.com")).toBe("http://x.com");
  });
});
