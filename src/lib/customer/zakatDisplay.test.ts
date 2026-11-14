import { describe, expect, it } from "vitest";
import { fillText } from "@/lib/i18n/fill";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import { formatCurrency } from "./currency";
import {
  checkedCount,
  cleanPrice,
  cleanVori,
  earliestGivenOn,
  HOW_STEPS,
  hijriName,
  lineNote,
  METAL_LABEL,
  metalValue,
  nextUnchecked,
  nisabFor,
  parseVori,
  partsLine,
  paymentMeta,
  pricePerVori,
  pricesOk,
  quickAmounts,
  STEP_META,
  WHO_CAN_RECEIVE,
} from "./zakatDisplay";
import type { ZakatLine, ZakatMetal, ZakatStep, ZakatSummary } from "./zakatTypes";

const money = (value: number | string) => formatCurrency(value, "BDT", "en");
const inBangla: Translate = (key, values) => fillText(translate("bn", key), values ?? {});
const PER_VORI: Record<ZakatMetal, number> = { GOLD_22: 217592, GOLD_21: 207794, GOLD_18: 178459, GOLD_TRADITIONAL: 145800, SILVER_22: 3499 };

const step = (id: ZakatStep["step"], checked = false): ZakatStep => ({ step: id, total: "0.00", checked, lines: [] });
const summaryWith = (patch: Partial<ZakatSummary> = {}): ZakatSummary => ({
  today: "2026-11-02",
  dueDate: "2027-02-08",
  hijriYear: 1448,
  daysLeft: 98,
  dateChoices: { RAMADAN: { date: "2027-02-08", hijriYear: 1448 }, MUHARRAM: { date: "2027-06-06", hijriYear: 1449 } },
  settings: { basis: "SILVER", dateMode: "RAMADAN", customDate: null, goldPrice: null, silverPrice: null },
  prices: { gold22: 217592, silver22: 3499, perVori: PER_VORI, own: false, platform: { gold22: 217592, silver22: 3499, on: "2026-10-31" } },
  nisab: "183697.50",
  aboveNisab: true,
  steps: [step("CASH"), step("SAVINGS"), step("GOLD"), step("INVESTMENTS"), step("OWED_TO_YOU"), step("YOU_OWE"), step("NOT_COUNTED")],
  totals: { have: "0.00", givenBack: "0.00", owed: "0.00", owe: "0.00", net: "0.00", zakat: "28548.00", paid: "0.00", left: "28548.00", parts: 4, perPart: "7137.00" },
  payments: [],
  ...patch,
});
const line = (patch: Partial<ZakatLine>): ZakatLine => ({ key: "account:a", source: "ACCOUNT", id: "a", name: "Cash", detail: "cash", amount: "9650.00", counted: true, ...patch });

describe("weights and prices as typed", () => {
  it("keeps digits and one point, three decimals, Bangla digits too", () => {
    expect(cleanVori("1.5")).toBe("1.5");
    expect(cleanVori("১.২৫")).toBe("1.25");
    expect(cleanVori("2.12345")).toBe("2.123");
    expect(cleanVori("1.2.3")).toBe("1.23");
    expect(cleanVori("ab3")).toBe("3");
  });

  it("reads a weight the backend takes", () => {
    expect(parseVori("1.5")).toBe(1.5);
    expect(parseVori("0.001")).toBe(0.001);
    expect(parseVori("0")).toBeNull();
    expect(parseVori("")).toBeNull();
    expect(parseVori("10001")).toBeNull();
  });

  it("keeps a price to whole taka", () => {
    expect(cleanPrice("2,17,592")).toBe("217592");
    expect(cleanPrice("৩৪৯৯")).toBe("3499");
    expect(cleanPrice("0042")).toBe("42");
  });

  it("catches a price with a missing digit", () => {
    expect(pricesOk(217592, 3499)).toBe(true);
    expect(pricesOk(999, 3499)).toBe(false);
    expect(pricesOk(217592, 99)).toBe(false);
    expect(pricesOk(10_000_001, 3499)).toBe(false);
  });

  it("scales the karats with 22 karat as the backend does", () => {
    expect(pricePerVori("GOLD_22", 220000, 3600)).toBe(220000);
    expect(pricePerVori("SILVER_22", 220000, 3600)).toBe(3600);
    expect(pricePerVori("GOLD_21", 217592, 3499)).toBe(207794);
    expect(pricePerVori("GOLD_18", 435184, 3499)).toBe(356918);
  });

  it("values a weight and works out nisab", () => {
    expect(metalValue(2, 217592)).toBe(435184);
    expect(metalValue(1.234, 3499)).toBe(4317.77);
    expect(nisabFor("SILVER", 217592, 3499)).toBe(183697.5);
    expect(nisabFor("GOLD", 217592, 3499)).toBe(1631940);
  });
});

describe("the steps", () => {
  it("counts the checked ones, never Not counted", () => {
    const summary = summaryWith({ steps: [step("CASH", true), step("SAVINGS", true), step("GOLD"), step("INVESTMENTS"), step("OWED_TO_YOU"), step("YOU_OWE"), step("NOT_COUNTED", true)] });
    expect(checkedCount(summary)).toBe(2);
  });

  it("opens the next step not checked, wrapping to the top", () => {
    const summary = summaryWith({ steps: [step("CASH"), step("SAVINGS", true), step("GOLD"), step("INVESTMENTS", true), step("OWED_TO_YOU", true), step("YOU_OWE", true), step("NOT_COUNTED")] });
    expect(nextUnchecked(summary, "CASH")).toBe("GOLD");
    expect(nextUnchecked(summary, "GOLD")).toBe("CASH");
    expect(nextUnchecked(summary, null)).toBe("CASH");
    const allButOne = summaryWith({ steps: [step("CASH", true), step("SAVINGS", true), step("GOLD", true), step("INVESTMENTS", true), step("OWED_TO_YOU", true), step("YOU_OWE"), step("NOT_COUNTED")] });
    expect(nextUnchecked(allButOne, "YOU_OWE")).toBeNull();
  });

  it("has every step's words in Bangla", () => {
    for (const meta of Object.values(STEP_META)) {
      for (const key of [meta.title, meta.question, meta.tip, meta.from, meta.addLabel, ...meta.suggestions].filter(Boolean)) expect(translate("bn", key), key).not.toBe(key);
    }
    for (const key of [...Object.values(METAL_LABEL), ...WHO_CAN_RECEIVE, ...HOW_STEPS.flatMap((how) => [how.title, how.body])]) expect(translate("bn", key), key).not.toBe(key);
  });
});

describe("amounts to give", () => {
  it("offers all left, this month's part and half, once each", () => {
    expect(quickAmounts(28548, 4, 7137)).toEqual([
      { amount: 28548, label: "All left" },
      { amount: 7137, label: "This month's part" },
      { amount: 14274, label: "Half" },
    ]);
    expect(quickAmounts(28548, 1, 28548)).toEqual([
      { amount: 28548, label: "All left" },
      { amount: 14274, label: "Half" },
    ]);
    expect(quickAmounts(1, 2, 1)).toEqual([{ amount: 1, label: "All left" }]);
    expect(quickAmounts(0, 4, 0)).toEqual([]);
  });

  it("goes back a year at most", () => {
    expect(earliestGivenOn("2027-02-08")).toBe("2026-02-07");
  });
});

describe("words", () => {
  it("names the Hijri day", () => {
    expect(hijriName("RAMADAN", 1448, inEnglish, "en")).toBe("1 Ramadan 1448");
    expect(hijriName("MUHARRAM", 1449, inBangla, "bn")).toBe("১ মুহাররম ১৪৪৯");
    expect(hijriName("CUSTOM", null, inEnglish, "en")).toBe("");
  });

  it("says where the date comes from, and the monthly parts", () => {
    expect(partsLine(summaryWith(), money, inEnglish, "en")).toBe(`About 1 Ramadan 1448. Or give about ${money(7137)} a month, 4 times.`);
    expect(partsLine(summaryWith({ totals: { ...summaryWith().totals, left: "0.00" } }), money, inEnglish, "en")).toBe("About 1 Ramadan 1448.");
    const custom = summaryWith({ settings: { ...summaryWith().settings, dateMode: "CUSTOM", customDate: "2027-01-15" }, hijriYear: null, totals: { ...summaryWith().totals, parts: 1 } });
    expect(partsLine(custom, money, inEnglish, "en")).toBe("Your own date.");
  });

  it("describes each line", () => {
    const note = (patch: Partial<ZakatLine>, id: ZakatStep["step"] = "CASH") => lineNote(line(patch), id, PER_VORI, money, inEnglish, "en");
    expect(note({})).toBe("Cash in hand");
    expect(note({ detail: "•••• 7890" })).toBe("Account •••• 7890");
    expect(note({ detail: "bank", number: "•••• 7890" })).toBe("Bank account •••• 7890");
    expect(note({ source: "INVESTMENT", detail: "SANCHAYAPATRA", maturesOn: "2030-02-15" }, "INVESTMENTS")).toBe("Matures Feb 2030");
    expect(note({ source: "INVESTMENT", detail: "SHARES", maturesOn: null }, "INVESTMENTS")).toBe("Shares");
    expect(note({ counted: false })).toBe("Not counted");
    expect(note({ source: "EXTRA", detail: null })).toBe("You added this");
    expect(note({ source: "EXTRA", detail: null, metal: "GOLD_22", weightVori: "3", byWeight: true }, "GOLD")).toBe("3 vori · Gold, 22 karat");
    expect(note({ source: "ASSET", detail: "Jewellery", metal: "GOLD_22", weightVori: "2", byWeight: true, amount: "435184.00" }, "GOLD")).toBe(`2 vori × ${money(217592)} (today's price)`);
    expect(note({ source: "ASSET", detail: "Jewellery", byWeight: false }, "GOLD")).toBe("Value in Assets. Add its weight for today's price.");
    expect(note({ source: "ASSET", detail: "Land", forSale: true }, "INVESTMENTS")).toBe("Bought to sell · value today");
    expect(note({ source: "ASSET", detail: "Vehicle", counted: false }, "NOT_COUNTED")).toBe("Vehicle");
    expect(note({ source: "CONTACT", detail: "LOAN" }, "OWED_TO_YOU")).toBe("Loan you gave");
    expect(note({ source: "CONTACT", detail: "BUSINESS" }, "OWED_TO_YOU")).toBe("Customer or supplier");
    expect(note({ source: "CONTACT", fullAmount: "500000.00", yearAmount: "60000.00", debtMode: "YEAR" }, "YOU_OWE")).toBe(`Due in the next 12 months, of ${money(500000)}`);
    expect(note({ source: "CONTACT", fullAmount: "500000.00", yearAmount: "60000.00", debtMode: "FULL" }, "YOU_OWE")).toBe(`Whole loan left: ${money(500000)}`);
    expect(note({ source: "CONTACT", fullAmount: "100000.00", yearAmount: "100000.00", debtMode: "FULL" }, "YOU_OWE")).toBe("Due within the year");
  });

  it("dates a zakat given", () => {
    expect(paymentMeta("2026-11-02", "Cash", inEnglish, "en")).toBe("2 Nov 2026 · Cash · Expense");
  });
});
