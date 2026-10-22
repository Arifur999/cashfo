import { describe, expect, it } from "vitest";
import { currencySymbol, formatCompactAmount, formatCurrency, formatGrouped, formatSignedCurrency } from "./currency";

// The symbol and the digits are joined by a no-break space.
const NBSP = " ";

describe("formatCompactAmount", () => {
  it("shortens the way an axis label does", () => {
    expect(formatCompactAmount(0)).toBe("0");
    expect(formatCompactAmount(850)).toBe("850");
    expect(formatCompactAmount(50000)).toBe("50K");
    expect(formatCompactAmount(100000)).toBe("1L");
    expect(formatCompactAmount(150000)).toBe("1.5L");
    expect(formatCompactAmount(12000000)).toBe("1.2Cr");
    expect(formatCompactAmount(-2500)).toBe("-2.5K");
    expect(formatCompactAmount(2500)).toBe("2.5K");
  });
});

describe("formatSignedCurrency", () => {
  it("writes the sign in words the design uses", () => {
    expect(formatSignedCurrency(85000, "BDT")).toBe(`+ ৳${NBSP}85,000`);
    expect(formatSignedCurrency("-52300", "BDT")).toBe(`− ৳${NBSP}52,300`);
    expect(formatSignedCurrency(0, "BDT")).toBe(`৳${NBSP}0`);
    expect(formatSignedCurrency(-0.004, "BDT")).toBe(`৳${NBSP}0`);
  });
});

describe("formatCurrency", () => {
  it("groups taka in lakhs and crores", () => {
    expect(formatCurrency(1250000, "BDT")).toBe(`৳${NBSP}12,50,000`);
    expect(formatCurrency("123456789.5", "BDT")).toBe(`৳${NBSP}12,34,56,789.50`);
    expect(formatCurrency(999, "BDT")).toBe(`৳${NBSP}999`);
  });

  it("groups dollars the international way", () => {
    expect(formatCurrency(1250000, "USD")).toBe(`$${NBSP}1,250,000`);
  });

  it("puts the sign first", () => {
    expect(formatCurrency(-1500, "BDT")).toBe(`-৳${NBSP}1,500`);
  });

  it("never signs a sum that rounds to zero", () => {
    expect(formatCurrency(0.3 + -0.1 + -0.2, "BDT")).toBe(`৳${NBSP}0`);
    expect(formatCurrency(-0.004, "BDT")).toBe(`৳${NBSP}0`);
  });

  it("names an unknown currency by its code", () => {
    expect(formatCurrency(10, "EUR")).toBe(`EUR${NBSP}10`);
  });

  it("reads a broken amount as zero", () => {
    expect(formatCurrency("not a number", "BDT")).toBe(`৳${NBSP}0`);
  });

  it("never breaks between the symbol and the digits", () => {
    expect(formatCurrency(1500, "BDT")).not.toContain(" ");
  });
});

describe("currencySymbol", () => {
  it("is just the symbol, for an amount input's prefix", () => {
    expect(currencySymbol("BDT")).toBe("৳");
    expect(currencySymbol("USD")).toBe("$");
  });
});

describe("formatGrouped", () => {
  it("groups the figure without the symbol", () => {
    expect(formatGrouped(82000, "BDT")).toBe("82,000");
    expect(formatGrouped(1250000, "BDT")).toBe("12,50,000");
    expect(formatGrouped("2699.1", "BDT")).toBe("2,699.10");
    expect(formatGrouped(-500, "BDT")).toBe("-500");
  });
});

describe("money in Bangla", () => {
  it("prints Bangla digits, grouped the same way", () => {
    expect(formatCurrency(1250000, "BDT", "bn")).toBe("৳\u00A0১২,৫০,০০০");
    expect(formatCurrency(2699.1, "BDT", "bn")).toBe("৳\u00A0২,৬৯৯.১০");
    expect(formatSignedCurrency(-52300, "BDT", "bn")).toBe("− ৳\u00A0৫২,৩০০");
    expect(formatGrouped(82000, "BDT", "bn")).toBe("৮২,০০০");
  });

  it("keeps Latin digits when no language is given", () => {
    expect(formatCurrency(1500, "BDT")).toBe("৳\u00A01,500");
  });

  it("writes chart units in Bangla", () => {
    expect(formatCompactAmount(150000, "bn")).toBe("১.৫ লা");
    expect(formatCompactAmount(50000, "bn")).toBe("৫০ হা");
    expect(formatCompactAmount(50000)).toBe("50K");
  });
});
