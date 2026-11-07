import { describe, expect, it } from "vitest";
import { autoMap, importAmount, importDate, importType, missingFields, parseCsv, reviewImport, sampleFile } from "./dataImport";

describe("parseCsv", () => {
  it("reads quotes, doubled quotes and line breaks inside them", () => {
    expect(parseCsv('﻿Date,Note\r\n2026-11-05,"Bazar, fish"\r\n2026-11-06,"Said ""hi""\nthen left"\r\n')).toEqual([
      ["Date", "Note"],
      ["2026-11-05", "Bazar, fish"],
      ["2026-11-06", 'Said "hi"\nthen left'],
    ]);
  });

  it("keeps blank records so row numbers match the file, and reads semicolons", () => {
    expect(parseCsv("Date;Amount\n\n05/11/2026;1.250")).toEqual([["Date", "Amount"], [""], ["05/11/2026", "1.250"]]);
  });
});

describe("autoMap", () => {
  it("matches columns named like a field, in English or Bangla", () => {
    expect(autoMap(["Date", "Type", "Amount (BDT)", "Category", "Wallet", "Details"])).toEqual({ date: "0", type: "1", amount: "2", category: "3", wallet: "4", note: "5" });
    expect(autoMap(["তারিখ", "ধরন", "টাকা", "বিবরণ"])).toEqual({ date: "0", type: "1", amount: "2", category: "", wallet: "", note: "3" });
    expect(missingFields(autoMap(["Day", "Particulars"])).map((field) => field.key)).toEqual(["type", "amount"]);
  });
});

describe("a row's values", () => {
  it("reads dates the ways they are written here", () => {
    expect(["2026-11-05", "5/11/2026", "05-11-2026", "5.11.2026", "২০২৬-১১-০৫", "2026-11-05 00:00:00", "46331"].map(importDate)).toEqual(Array(7).fill("2026-11-05"));
    expect(["31/02/2026", "11/2026", "yesterday", "2026-13-01"].map(importDate)).toEqual(["", "", "", ""]);
  });

  it("reads amounts with taka signs and separators, never more than two decimals", () => {
    expect(["৳ 2,350.50", "Tk 85000", "-1840.75", "(500)", "১২০০"].map(importAmount)).toEqual([2350.5, 85000, 1840.75, 500, 1200]);
    expect(["", "0", "12.345", "abc"].map(importAmount)).toEqual([null, null, null, null]);
  });

  it("reads the type from the words banks and people use", () => {
    expect(["Income", "CR", "deposit", "আয়", "Expense", "Dr.", "খরচ", "transfer"].map(importType)).toEqual(["INCOME", "INCOME", "INCOME", "INCOME", "EXPENSE", "EXPENSE", "EXPENSE", null]);
  });
});

describe("reviewImport", () => {
  const map = autoMap(["Date", "Type", "Amount", "Category", "Account", "Note"]);
  const context = { wallets: ["Cash", "bKash"], today: "2026-11-07" };

  it("passes good rows and says what is wrong with the others, by the file's row number", () => {
    const { good, bad } = reviewImport(
      {
        rows: [
          ["2026-11-01", "Income", "85000", "Salary", "BKASH", "Salary"],
          ["", "", "", "", "", ""],
          ["31/02/2026", "Expense", "10", "", "", ""],
          ["2026-11-02", "Expense", "", "", "", ""],
          ["2026-11-03", "Gift", "10", "", "", ""],
          ["2026-11-04", "Expense", "10", "", "Nagad", ""],
          ["2026-12-01", "Expense", "10", "", "", ""],
        ],
      },
      map,
      context,
    );
    expect(good).toEqual([{ row: 2, date: "2026-11-01", type: "INCOME", amount: 85000, category: "Salary", wallet: "BKASH", note: "Salary" }]);
    expect(bad).toEqual([
      { row: 4, reason: "“{value}” is not a real date.", value: "31/02/2026" },
      { row: 5, reason: "The amount is empty.", value: undefined },
      { row: 6, reason: "Type must be Income or Expense.", value: undefined },
      { row: 7, reason: "No wallet named “{value}”.", value: "Nagad" },
      { row: 8, reason: "The date is in the future.", value: undefined },
    ]);
  });

  it("has a sample file with two rows to fix", () => {
    const sample = sampleFile("2026-11-07", ["Cash"]);
    const { good, bad } = reviewImport(sample, autoMap(sample.head), { wallets: ["Cash"], today: "2026-11-07" });
    expect(good).toHaveLength(23);
    expect(bad.map((problem) => problem.row)).toEqual([11, 20]);
  });
});
