import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { inEnglish } from "@/lib/i18n/message";
import {
  ENTRY_META,
  keptIn,
  goalColor,
  goalTotals,
  LOOK_META,
  monthsAhead,
  monthsBetween,
  monthsLeft,
  neededPerMonth,
  OTHER_SAVINGS_PALETTE,
  ringPercent,
  savingsError,
  savingsPalette,
  SAVINGS_PALETTES,
  summaryPalette,
  timeLeft,
  timeLeftText,
  TREND_META,
} from "./savingsDisplay";

describe("goalColor", () => {
  it("uses the goal's own colour, else its place, and greys a withdrawn goal", () => {
    expect(goalColor({ color: "#2B3A67", status: "ACTIVE" }, 0)).toBe("#2b3a67");
    expect(goalColor({ color: null, status: "ACTIVE" }, 0)).toBe(goalColor({ color: null, status: "PAUSED" }, 13));
    expect(goalColor({ color: "#123456", status: "ACTIVE" }, 1)).toBe("#6b8f71");
    expect(goalColor({ color: "#235347", status: "WITHDRAWN" }, 0)).toBe("var(--ink-faint)");
  });
});

describe("monthsLeft", () => {
  it("counts whole months until the target", () => {
    expect(monthsLeft("2027-06-30T00:00:00.000Z", "2026-10-02")).toBe(8);
    expect(monthsLeft("2027-01-31", "2026-10-02")).toBe(3);
    expect(monthsLeft("2026-10-20", "2026-10-02")).toBe(0);
  });

  it("is never negative", () => {
    expect(monthsLeft("2026-01-01", "2026-10-02")).toBe(0);
  });
});

describe("monthsAhead", () => {
  it("moves to the same day, or the month's last day when it is shorter", () => {
    expect(monthsAhead("2026-11-03", 6)).toBe("2027-05-03");
    expect(monthsAhead("2026-11-03", 12)).toBe("2027-11-03");
    expect(monthsAhead("2026-08-31", 6)).toBe("2027-02-28");
    expect(monthsAhead("2027-08-31", 6)).toBe("2028-02-29");
    expect(monthsAhead("2026-12-15", 1)).toBe("2027-01-15");
  });
});

describe("monthsBetween", () => {
  it("counts whole months from the start day to the target", () => {
    expect(monthsBetween("2026-04-15", "2027-04-15T00:00:00.000Z")).toBe(12);
    expect(monthsBetween("2026-04-15", "2027-06-30")).toBe(14);
    expect(monthsBetween("2026-04-15", "2026-05-14")).toBe(1);
  });

  it("measures an edited goal from when it started, not from today", () => {
    // Created six months ago for a year: renaming it today keeps the year.
    const createdAt = "2026-04-21";
    const targetDate = "2027-04-21";
    expect(monthsBetween(createdAt, targetDate)).toBe(12);
    expect(monthsLeft(targetDate, "2026-10-21")).toBe(6);
  });

  it("is at least one, so a monthly figure can always be worked out", () => {
    expect(monthsBetween("2026-10-21", "2026-10-30")).toBe(1);
    expect(monthsBetween("2026-10-21", "2026-01-01")).toBe(1);
  });
});

describe("timeLeft", () => {
  it("tells whole months from less than one from a date already gone", () => {
    expect(timeLeft("2027-06-30T00:00:00.000Z", "2026-10-02")).toEqual({ kind: "months", months: 8 });
    expect(timeLeft("2026-10-20", "2026-10-02")).toEqual({ kind: "under-a-month" });
    expect(timeLeft("2026-10-02", "2026-10-02")).toEqual({ kind: "under-a-month" });
    expect(timeLeft("2026-10-01T00:00:00.000Z", "2026-10-02")).toEqual({ kind: "past" });
  });
});

describe("timeLeftText", () => {
  it("words each case, the count in the reader's digits", () => {
    expect(timeLeftText("2027-06-30", "2026-10-02", inEnglish, "en")).toBe("8 months left");
    expect(timeLeftText("2026-11-02", "2026-10-02", inEnglish, "en")).toBe("1 month left");
    expect(timeLeftText("2027-06-30", "2026-10-02", inEnglish, "bn")).toBe("৮ months left");
    expect(timeLeftText("2026-10-20", "2026-10-02", inEnglish, "en")).toBe("Less than a month left");
    expect(timeLeftText("2026-09-30", "2026-10-02", inEnglish, "en")).toBe("Past its date");
  });
});

describe("neededPerMonth", () => {
  it("spreads what is left over the months to go", () => {
    expect(neededPerMonth({ targetAmount: "120000", currentAmount: "30000", targetDate: "2027-07-02" }, "2026-10-02")).toBe(10000);
  });

  it("asks for the rest at once when the goal is due or overdue", () => {
    expect(neededPerMonth({ targetAmount: "50000", currentAmount: "20000", targetDate: "2026-10-20" }, "2026-10-02")).toBe(30000);
    expect(neededPerMonth({ targetAmount: "50000", currentAmount: "20000", targetDate: "2026-01-01" }, "2026-10-02")).toBe(30000);
  });

  it("needs nothing once the target is met", () => {
    expect(neededPerMonth({ targetAmount: "50000", currentAmount: "60000", targetDate: "2027-01-01" }, "2026-10-02")).toBe(0);
  });
});

describe("ringPercent", () => {
  it("is the progress of an open goal", () => {
    expect(ringPercent({ status: "ACTIVE", progressPercent: 53, withdrawnAmount: "0", targetAmount: "150000" })).toBe(53);
  });

  it("is what a withdrawn goal paid out against its target", () => {
    expect(ringPercent({ status: "WITHDRAWN", progressPercent: 0, withdrawnAmount: "20000", targetAmount: "50000" })).toBe(40);
    expect(ringPercent({ status: "WITHDRAWN", progressPercent: 0, withdrawnAmount: "60000", targetAmount: "50000" })).toBe(100);
    expect(ringPercent({ status: "WITHDRAWN", progressPercent: 0, withdrawnAmount: "100", targetAmount: "0" })).toBe(0);
  });
});

describe("goalTotals", () => {
  it("leaves a withdrawn goal's target out of what is still to go", () => {
    const goals = [
      { status: "WITHDRAWN" as const, targetAmount: "50000", currentAmount: "0" },
      { status: "ACTIVE" as const, targetAmount: "100000", currentAmount: "20000" },
    ];
    expect(goalTotals(goals)).toEqual({ saved: 20000, target: 100000, toGo: 80000, percent: 20, count: 1 });
  });

  it("adds each goal's own gap, so an over-funded goal hides nothing", () => {
    const goals = [
      { status: "COMPLETED" as const, targetAmount: "10000", currentAmount: "30000" },
      { status: "ACTIVE" as const, targetAmount: "50000", currentAmount: "10000" },
    ];
    expect(goalTotals(goals)).toEqual({ saved: 40000, target: 60000, toGo: 40000, percent: 67, count: 2 });
  });

  it("caps the percentage and is empty with nothing open", () => {
    expect(goalTotals([{ status: "PAUSED", targetAmount: "1000", currentAmount: "1500" }]).percent).toBe(100);
    expect(goalTotals([{ status: "WITHDRAWN", targetAmount: "1000", currentAmount: "0" }])).toEqual({ saved: 0, target: 0, toGo: 0, percent: 0, count: 0 });
    expect(goalTotals([])).toEqual({ saved: 0, target: 0, toGo: 0, percent: 0, count: 0 });
  });
});

describe("ENTRY_META", () => {
  it("names the other goal of a move only in its own sentence", () => {
    expect(inEnglish(ENTRY_META.TRANSFER_IN.withGoal ?? "", { goal: "Hajj" })).toBe("Moved in from Hajj");
    expect(inEnglish(ENTRY_META.TRANSFER_OUT.withGoal ?? "", { goal: "Bike" })).toBe("Moved out to Bike");
    expect(ENTRY_META.CONTRIBUTION.withGoal).toBeUndefined();
  });
});

describe("savingsError", () => {
  it("rewords the wallet refusal with the amounts in money", () => {
    const message = '"Islami Bank DPS" only has 2000.00 -- cannot withdraw 5000.00 from it. Pick a different Savings Wallet.';
    expect(savingsError(message, "Failed to withdraw", inEnglish, "BDT")).toBe("Islami Bank DPS only has TK 2,000, not the TK 5,000 this goal holds. Pick another savings wallet.");
  });

  it("rewords the move refusals", () => {
    expect(savingsError('"Hajj" only has 1500.50 saved -- cannot transfer 3000.00', "Failed to move", inEnglish, "BDT")).toBe("Hajj only has TK 1,500.50 saved, so TK 3,000 can't be moved.");
    expect(savingsError('"Bike" has been withdrawn -- pick another goal to move the money to.', "Failed to move", inEnglish, "BDT")).toBe("Bike has been withdrawn. Pick another goal to move the money to.");
  });

  it("translates a fixed message and falls back without one", () => {
    const t = (key: string) => `bn:${key}`;
    expect(savingsError("This goal has already been withdrawn.", "Failed to withdraw", t, "BDT")).toBe("bn:This goal has already been withdrawn.");
    expect(savingsError(undefined, "Failed to delete goal", t, "BDT")).toBe("bn:Failed to delete goal");
    expect(savingsError("", "Failed to delete goal", t, "BDT")).toBe("bn:Failed to delete goal");
  });
});

describe("Bangla for what this file hands to t()", () => {
  it("words every badge, trend, history title and time left", () => {
    const labels = [
      ...Object.values(LOOK_META).map((meta) => meta.label),
      ...Object.values(TREND_META).flatMap((meta) => [meta.label, meta.short]),
      ...Object.values(ENTRY_META).flatMap((meta) => (meta.withGoal ? [meta.title, meta.withGoal] : [meta.title])),
      "{count} month left",
      "{count} months left",
      "Less than a month left",
      "Past its date",
    ];
    for (const label of labels) expect(bnDictionary[label], label).toBeTruthy();
  });

  it("words every refusal savingsError rewords", () => {
    const asked: string[] = [];
    const record = (key: string) => {
      asked.push(key);
      return key;
    };
    savingsError('"DPS" only has 1.00 -- cannot withdraw 2.00 from it. Pick a different Savings Wallet.', "Failed to withdraw", record, "BDT");
    savingsError('"Hajj" only has 1.00 saved -- cannot transfer 2.00', "Failed to move", record, "BDT");
    savingsError('"Bike" has been withdrawn -- pick another goal to move the money to.', "Failed to move", record, "BDT");
    for (const message of ["This goal has contributions or transfers recorded against it. Pause it instead of deleting.", "This goal has already been withdrawn.", "This goal has no saved balance to withdraw.", "This goal has been withdrawn -- add funds to another goal."]) {
      savingsError(message, "Failed to withdraw", record, "BDT");
    }
    expect(asked).toHaveLength(7);
    for (const key of asked) expect(bnDictionary[key], key).toBeTruthy();
  });
});

describe("savingsPalette", () => {
  it("cycles the savings colours", () => {
    expect(savingsPalette(0)).toBe(SAVINGS_PALETTES[0]);
    expect(savingsPalette(5)).toBe(SAVINGS_PALETTES[0]);
  });
});

describe("summaryPalette", () => {
  it("gives a wallet the colour it has on Savings wallets", () => {
    const active = ["dps", "fdr"];
    expect(summaryPalette("fdr", active)).toBe(savingsPalette(1));
    expect(summaryPalette("dps", active)).toBe(savingsPalette(0));
  });

  it("greys a wallet that page doesn't list", () => {
    expect(summaryPalette("archived", ["dps"])).toBe(OTHER_SAVINGS_PALETTE);
  });
});

describe("keptIn", () => {
  const holding = (name: string | null) => ({ accountId: name, name, amount: "100.00" });
  it("names the goal's own account, else where most of its money is", () => {
    expect(keptIn({ account: { id: "a", name: "City Bank FDR", accountNumber: "1503 2245 6081" }, holdings: [holding("DPS")] })).toEqual({ name: "City Bank FDR", number: "1503 2245 6081" });
    expect(keptIn({ account: null, holdings: [holding(null), holding("Islami Bank DPS")] })).toEqual({ name: "Islami Bank DPS", number: null });
    expect(keptIn({ holdings: [] })).toBeNull();
  });
});
