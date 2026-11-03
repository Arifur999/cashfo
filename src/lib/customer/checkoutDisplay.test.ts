import { describe, expect, it } from "vitest";
import { addMonths, checkoutPeriod, cleanReference, formatWalletNumber, offeredWallets, payerOk, referenceOk, referralDiscount, takaInWords } from "./checkoutDisplay";

describe("what the customer types", () => {
  it("takes a wallet number in any common form", () => {
    expect(payerOk("BKASH", "01711-482915")).toBe(true);
    expect(payerOk("BKASH", "+880 1711 482915")).toBe(true);
    expect(payerOk("BKASH", "0171148291")).toBe(false);
    expect(payerOk("NAGAD", "01211482915")).toBe(false);
    expect(payerOk("ROCKET", "017114829155")).toBe(true);
    expect(payerOk("BKASH", "017114829155")).toBe(false);
  });

  it("takes a bank account name of 3 to 80 letters", () => {
    expect(payerOk("BANK", "  Khaled  Mahmud ")).toBe(true);
    expect(payerOk("BANK", "Kh")).toBe(false);
    expect(payerOk("BANK", "K".repeat(81))).toBe(false);
  });

  it("wants a TrxID long enough and without odd characters", () => {
    expect(referenceOk("BKASH", "9kd7 h2x4lm")).toBe(true);
    expect(referenceOk("BKASH", "9KD7H2X")).toBe(false);
    expect(referenceOk("BKASH", "9KD7<H2X4LM")).toBe(false);
    expect(referenceOk("BANK", "beftn-26")).toBe(true);
    expect(referenceOk("BANK", "--A1234")).toBe(false);
    expect(cleanReference(" 9kd7 h2x4lm ")).toBe("9KD7H2X4LM");
  });

  it("prints a wallet number as the board does", () => {
    expect(formatWalletNumber("01309000555")).toBe("01309-000555");
    expect(formatWalletNumber("013090005557")).toBe("01309-0005557");
  });

  it("offers the ways an admin set up, or all of them while none is", () => {
    expect(offeredWallets({ NAGAD: "01309000556" }).map((w) => w.id)).toEqual(["NAGAD"]);
    expect(offeredWallets({}).map((w) => w.id)).toEqual(["BKASH", "NAGAD", "ROCKET", "BANK"]);
    expect(offeredWallets(undefined)).toHaveLength(4);
  });
});

describe("checkoutPeriod", () => {
  const now = new Date("2026-11-01T07:45:00.000Z");
  const yearly = { id: "yearly", billingCycle: "YEARLY" as const };

  it("starts now for a new plan", () => {
    const period = checkoutPeriod({ planId: "free", isPaid: false, currentPeriodEnd: null }, yearly, now);
    expect(period.start).toEqual(now);
    expect(period.end.toISOString()).toBe("2027-11-01T07:45:00.000Z");
  });

  it("adds to the end of the same paid plan while it runs", () => {
    const period = checkoutPeriod({ planId: "yearly", isPaid: true, currentPeriodEnd: "2026-12-15T00:00:00.000Z" }, yearly, now);
    expect(period.start.toISOString()).toBe("2026-12-15T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2027-12-15T00:00:00.000Z");
  });

  it("keeps the last day of a short month", () => {
    expect(addMonths(new Date("2026-01-31T10:00:00.000Z"), 1).toISOString()).toBe("2026-02-28T10:00:00.000Z");
  });
});

describe("referralDiscount", () => {
  it("is whole taka, rounded down", () => {
    expect(referralDiscount("1910.00", 20)).toBe(382);
    expect(referralDiscount("199.00", 15)).toBe(29);
    expect(referralDiscount("199.00", null)).toBe(0);
  });
});

describe("takaInWords", () => {
  it("says taka the way it is said here, in lakh and crore", () => {
    expect(takaInWords(1528, "en")).toBe("One thousand five hundred twenty-eight taka only");
    expect(takaInWords(125000, "en")).toBe("One lakh twenty-five thousand taka only");
    expect(takaInWords(31250000, "en")).toBe("Three crore twelve lakh fifty thousand taka only");
    expect(takaInWords(2699.1, "en")).toBe("Two thousand six hundred ninety-nine taka and ten paisa only");
  });

  it("in Bangla", () => {
    expect(takaInWords(1528, "bn")).toBe("এক হাজার পাঁচশত আটাশ টাকা মাত্র");
    expect(takaInWords(199, "bn")).toBe("একশত নিরানব্বই টাকা মাত্র");
    expect(takaInWords(0, "bn")).toBe("শূন্য টাকা মাত্র");
  });
});
