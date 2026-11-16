import { describe, expect, it } from "vitest";
import { billingEmailProblem, billingHistoryCsv, billingNameProblem, billingPhoneProblem, phoneBoxText, phoneDigits, phoneShown } from "./billingDetails";
import type { BillingPayment } from "./billingDisplay";

describe("billingNameProblem", () => {
  it("takes names in English or Bangla", () => {
    for (const name of ["Shirin Akter", "O'Neil-Rahman Jr.", "শিরিন আক্তার"]) expect(billingNameProblem(name)).toBeNull();
  });

  it("asks for a name, two letters and no digits or symbols", () => {
    expect(billingNameProblem("  ")).toBe("Type the name for receipts.");
    expect(billingNameProblem("A")).toBe("Use at least 2 letters.");
    expect(billingNameProblem("Shop 2")).toBe("Use letters only, no numbers or symbols.");
    expect(billingNameProblem("a@b")).toBe("Use letters only, no numbers or symbols.");
  });
});

describe("billing phone", () => {
  it("reads the 10 digits after +880 however they were typed", () => {
    for (const typed of ["1811-000000", "01811000000", "+880 1811 000000", "8801811000000"]) expect(phoneDigits(typed)).toBe("1811000000");
  });

  it("allows an empty phone and refuses a short or non-mobile one", () => {
    expect(billingPhoneProblem("")).toBeNull();
    expect(billingPhoneProblem("1811-000000")).toBeNull();
    expect(billingPhoneProblem("1811-0000")).toBe("Type all 10 digits after +880, like 1711-482915.");
    expect(billingPhoneProblem("1211-000000")).toBe("Type all 10 digits after +880, like 1711-482915.");
  });

  it("shows a saved number the board's way", () => {
    expect(phoneBoxText("+8801811000000")).toBe("1811-000000");
    expect(phoneShown("+8801811000000")).toBe("+880 1811-000000");
    expect(phoneShown(null)).toBeNull();
  });
});

describe("billingEmailProblem", () => {
  it("allows an empty email (the account's) and checks a typed one", () => {
    expect(billingEmailProblem("")).toBeNull();
    expect(billingEmailProblem("accounts@akter.example")).toBeNull();
    expect(billingEmailProblem("nope")).toBe("Type an email like name@example.com.");
  });
});

describe("billingHistoryCsv", () => {
  it("writes one quoted row a payment, under the column names", () => {
    const row = { id: "p1", planName: 'Monthly "Pro"', gateway: "BKASH", amount: "199.00", status: "SUCCESS", createdAt: "2026-11-01T04:00:00Z", paidAt: "2026-11-01T05:00:00Z", invoice: { id: "i1", invoiceNumber: "INV-2026-000413" } } as BillingPayment;
    const lines = billingHistoryCsv([row], (iso) => iso.slice(0, 10)).split("\r\n");
    expect(lines[0]).toBe('"Date","Invoice","Plan","Paid with","Amount (BDT)","Status"');
    expect(lines[1]).toBe('"2026-11-01","INV-2026-000413","Monthly ""Pro""","bKash","199.00","success"');
  });

  it("keeps a plan name that looks like a formula as text", () => {
    const row = { id: "p1", planName: "=1+1", gateway: "BKASH", amount: "199.00", status: "SUCCESS", createdAt: "2026-11-01T04:00:00Z", paidAt: null, invoice: null } as BillingPayment;
    expect(billingHistoryCsv([row], (iso) => iso.slice(0, 10)).split("\r\n")[1]).toContain(`"'=1+1"`);
  });
});
