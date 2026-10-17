import { describe, expect, it } from "vitest";
import {
  billingPeriod,
  codesLine,
  discountedPrice,
  discountText,
  limitText,
  planAccentClass,
  randomCouponCode,
  trialLine,
  trialsLine,
  usesCap,
  validityText,
  worksOn,
} from "./subscriptions";

const NBSP = " ";

describe("plan lines", () => {
  it("colours the paid plans and greys anything else", () => {
    expect(planAccentClass("Yearly Pro")).toBe("bg-forest");
    expect(planAccentClass("Free")).toBe("bg-ink-muted");
  });

  it("says what a price is per", () => {
    expect(billingPeriod("MONTHLY")).toBe("a month");
    expect(billingPeriod("FREE")).toBe("");
  });

  it("describes the trial, with a yearly plan's monthly share", () => {
    expect(trialLine({ billingCycle: "FREE", trialDays: 0, price: "0.00", currency: "BDT" })).toBe("No trial needed");
    expect(trialLine({ billingCycle: "MONTHLY", trialDays: 7, price: "299.00", currency: "BDT" })).toBe("7-day free trial");
    expect(trialLine({ billingCycle: "YEARLY", trialDays: 14, price: "2999.00", currency: "BDT" })).toBe(`14-day free trial · about ৳${NBSP}250 a month`);
  });

  it("counts who is on a trial", () => {
    expect(trialsLine("MONTHLY", 6)).toBe("6 of them are on a trial now");
    expect(trialsLine("MONTHLY", 1)).toBe("1 of them is on a trial now");
    expect(trialsLine("FREE", 0)).toBe("Everyone starts here");
    expect(trialsLine("BUSINESS" as never, 0)).toBe("No trials running");
  });

  it("reads -1 as no limit", () => {
    expect(limitText(-1)).toBe("No limit");
    expect(limitText(1500)).toBe("1,500");
  });
});

describe("coupon lines", () => {
  const names = new Map([
    ["m", "Monthly Pro"],
    ["y", "Yearly Pro"],
    ["b", "Business"],
  ]);

  it("lists the plans a coupon works on", () => {
    expect(worksOn([], names)).toBe("All plans");
    expect(worksOn(["y"], names)).toBe("Yearly Pro only");
    expect(worksOn(["m", "y"], names)).toBe("Monthly Pro and Yearly Pro");
    expect(worksOn(["m", "y", "b"], names)).toBe("Monthly Pro, Yearly Pro and Business");
    expect(worksOn(["gone"], names)).toBe("Unknown plan only");
  });

  it("words the discount and applies it", () => {
    expect(discountText({ discountType: "PERCENTAGE", discountValue: "20.00" })).toBe("20% off");
    expect(discountText({ discountType: "FIXED_AMOUNT", discountValue: "100.00" })).toBe(`৳${NBSP}100 off`);
    expect(discountedPrice(299, { discountType: "PERCENTAGE", discountValue: "15" })).toBe(254.15);
    expect(discountedPrice(50, { discountType: "FIXED_AMOUNT", discountValue: "100" })).toBe(0);
  });

  it("writes the validity window as short as the dates allow", () => {
    expect(validityText("2026-09-04T00:00:00.000Z", "2026-12-31T17:59:59.000Z")).toBe("4 Sep – 31 Dec 2026");
    expect(validityText("2026-01-01T00:00:00.000Z", "2026-01-15T17:59:59.000Z")).toBe("1 – 15 Jan 2026");
    expect(validityText("2025-12-20T00:00:00.000Z", "2026-01-05T17:59:59.000Z")).toBe("20 Dec 2025 – 5 Jan 2026");
  });

  it("caps the uses or says there is no limit", () => {
    expect(usesCap(500)).toBe("of 500");
    expect(usesCap(null)).toBe("no limit");
  });

  it("names the live codes without running on", () => {
    expect(codesLine([])).toBe("None live right now");
    expect(codesLine(["WELCOME20", "PRO100"])).toBe("WELCOME20 and PRO100");
    expect(codesLine(["A", "B", "C", "D", "E"])).toBe("A, B and 3 more");
  });

  it("makes up a code of four letters and two digits", () => {
    expect(randomCouponCode(() => 0)).toBe("AAAA10");
    expect(randomCouponCode()).toMatch(/^[A-Z]{4}\d{2}$/);
  });
});
