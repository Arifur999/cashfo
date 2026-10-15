import { describe, expect, it } from "vitest";
import { Banknote, Landmark, Smartphone } from "lucide-react";
import { maskAccountNumber, WALLET_PALETTES, walletIcon, walletPalette, walletType } from "./walletVisuals";

describe("walletType", () => {
  it("reads cash and mfs from the subtype", () => {
    expect(walletType({ accountSubtype: "cash" })).toBe("cash");
    expect(walletType({ accountSubtype: "mfs" })).toBe("mfs");
  });

  it("treats bank and anything unknown as a bank account", () => {
    expect(walletType({ accountSubtype: "bank" })).toBe("bank");
    expect(walletType({ accountSubtype: null })).toBe("bank");
    expect(walletType({ accountSubtype: "savings" })).toBe("bank");
  });

  it("picks the matching icon", () => {
    expect(walletIcon({ accountSubtype: "cash" })).toBe(Banknote);
    expect(walletIcon({ accountSubtype: "bank" })).toBe(Landmark);
    expect(walletIcon({ accountSubtype: "mfs" })).toBe(Smartphone);
  });
});

describe("walletPalette", () => {
  it("cycles through the design's colours in order", () => {
    expect(walletPalette(0)).toBe(WALLET_PALETTES[0]);
    expect(walletPalette(3)).toBe(WALLET_PALETTES[3]);
    expect(walletPalette(4)).toBe(WALLET_PALETTES[0]);
    expect(walletPalette(-1)).toBe(WALLET_PALETTES[3]);
  });
});

describe("maskAccountNumber", () => {
  it("keeps the last four digits", () => {
    expect(maskAccountNumber("1234 5678 7890")).toBe("•••• •••• 7890");
    expect(maskAccountNumber("01711223344")).toBe("•••• •••• 3344");
  });

  it("shows a short number whole", () => {
    expect(maskAccountNumber("42")).toBe("•••• •••• 42");
  });

  it("is null when there is no number", () => {
    expect(maskAccountNumber(null)).toBeNull();
    expect(maskAccountNumber("  ")).toBeNull();
  });
});
