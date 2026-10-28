import { describe, expect, it } from "vitest";
import { canCancel, familyName, familyPlan, featureMissing, featureValue, heroFamily, paymentStatusView, planFamilies, planState, sidebarPlan, usagePercent, usageTone, yearlySaving, type BillingPlan, type Subscription } from "./billingDisplay";

const plan = (over: Partial<BillingPlan>): BillingPlan => ({ id: "x", name: "Free", slug: "free", billingCycle: "FREE", price: "0.00", currency: "BDT", trialDays: 0, featureLimits: {}, displayOrder: 0, ...over });

const PLANS = [
  plan({ id: "free", name: "Free", featureLimits: { maxWorkspaces: 1, maxTransactionsPerMonth: 50, pdfExport: false } }),
  plan({ id: "mp", name: "Monthly Pro", slug: "monthly-pro", billingCycle: "MONTHLY", price: "299.00", trialDays: 7, displayOrder: 1 }),
  plan({ id: "yp", name: "Yearly Pro", slug: "yearly-pro", billingCycle: "YEARLY", price: "2999.00", trialDays: 14, displayOrder: 2 }),
  plan({ id: "biz", name: "Business", slug: "business", billingCycle: "MONTHLY", price: "799.00", trialDays: 7, displayOrder: 3 }),
];

const sub = (over: Partial<Subscription>): Subscription => ({ planId: "mp", planName: "Monthly Pro", planSlug: "monthly-pro", billingCycle: "MONTHLY", price: "299.00", lockedPrice: null, status: "ACTIVE", isPaid: true, trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: "2026-11-28T00:00:00Z", graceEndsAt: null, cancelAtPeriodEnd: false, ...over });

describe("plan families", () => {
  it("puts Monthly Pro and Yearly Pro on one card", () => {
    expect(familyName("Yearly Pro")).toBe("Pro");
    expect(familyName("Business")).toBe("Business");
    const families = planFamilies(PLANS);
    expect(families.map((family) => family.name)).toEqual(["Free", "Pro", "Business"]);
    expect(familyPlan(families[1], true)?.id).toBe("yp");
    expect(familyPlan(families[1], false)?.id).toBe("mp");
    // Business is monthly only: the yearly switch keeps its monthly plan.
    expect(familyPlan(families[2], true)?.id).toBe("biz");
  });

  it("works out the yearly saving and the hero card", () => {
    const families = planFamilies(PLANS);
    expect(yearlySaving(families)).toBe(589);
    expect(heroFamily(families)?.name).toBe("Pro");
  });
});

describe("features", () => {
  it("reads counts, no limit and yes/no", () => {
    expect(featureValue({ maxTransactionsPerMonth: -1 }, "maxTransactionsPerMonth")).toEqual({ kind: "unlimited" });
    expect(featureValue({ maxWorkspaces: 5 }, "maxWorkspaces")).toEqual({ kind: "count", value: 5 });
    expect(featureValue({ pdfExport: true }, "pdfExport")).toEqual({ kind: "yes" });
    expect(featureValue({}, "multiUser")).toEqual({ kind: "no" });
    expect(featureMissing({ kind: "count", value: 0 })).toBe(true);
    expect(featureMissing({ kind: "unlimited" })).toBe(false);
  });
});

describe("usage", () => {
  it("turns amber from 80% and red at the limit", () => {
    expect(usageTone(10, 50)).toBe("ok");
    expect(usageTone(41, 50)).toBe("near");
    expect(usageTone(51, 50)).toBe("over");
    expect(usageTone(500, -1)).toBe("ok");
    expect(usagePercent(41, 50)).toBe(82);
    expect(usagePercent(60, 50)).toBe(100);
  });
});

describe("subscription state", () => {
  it("names where the plan stands", () => {
    expect(planState(sub({ billingCycle: "FREE", isPaid: false }))).toBe("free");
    expect(planState(sub({ status: "TRIALING", isPaid: false }))).toBe("trial");
    expect(planState(sub({}))).toBe("active");
    expect(planState(sub({ cancelAtPeriodEnd: true }))).toBe("cancelling");
    expect(planState(sub({ status: "PAST_DUE" }))).toBe("pastDue");
    expect(planState(sub({ status: "EXPIRED" }))).toBe("ended");
    expect(canCancel(sub({}))).toBe(true);
    expect(canCancel(sub({ isPaid: false }))).toBe(false);
  });

  it("names the plan in the sidebar, a trial marked and an ended plan as free", () => {
    expect(sidebarPlan(sub({ billingCycle: "FREE", isPaid: false }))).toEqual({ name: null, trial: false });
    expect(sidebarPlan(sub({ status: "TRIALING", isPaid: false }))).toEqual({ name: "Monthly Pro", trial: true });
    expect(sidebarPlan(sub({ status: "PAST_DUE" }))).toEqual({ name: "Monthly Pro", trial: false });
    expect(sidebarPlan(sub({ status: "EXPIRED" }))).toEqual({ name: null, trial: false });
  });

  it("words a payment's status", () => {
    expect(paymentStatusView("SUCCESS")).toEqual({ label: "Paid", tone: "income" });
    expect(paymentStatusView("FAILED").label).toBe("Not paid");
  });
});
