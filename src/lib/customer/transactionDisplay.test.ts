import { describe, expect, it } from "vitest";
import { transactionBackLink, transactionPageHref } from "./transactionDisplay";

describe("transactionBackLink", () => {
  it("returns to the page that opened the transaction, with its query", () => {
    expect(transactionBackLink("/balance/ledger?account=w1&period=month&page=2")).toEqual({ href: "/balance/ledger?account=w1&period=month&page=2", label: "Statement" });
    expect(transactionBackLink("/balance/transfer")).toEqual({ href: "/balance/transfer", label: "Transfer" });
    expect(transactionBackLink("/loan-management/transactions?contact=c1&page=3")).toEqual({ href: "/loan-management/transactions?contact=c1&page=3", label: "Loan payments" });
    expect(transactionBackLink("/loan-management/ledger?contact=c1")?.label).toBe("Loan statement");
    expect(transactionBackLink("/accounts/acc-1")).toEqual({ href: "/accounts/acc-1", label: "Account" });
    expect(transactionBackLink("/contacts/c-9?page=2")).toEqual({ href: "/contacts/c-9?page=2", label: "Contact" });
  });

  it("ignores anything that is not one of those pages on this site", () => {
    for (const from of [
      undefined,
      null,
      ["/balance/ledger"],
      "",
      "balance/ledger",
      "https://evil.example/balance/ledger",
      "//evil.example/balance/ledger",
      "/\\evil.example/balance/ledger",
      "/balance/ledger?x=1 2",
      "/balance/ledger\n",
      "/balance/../admin/users",
      "/admin/balance/ledger",
      "/balance/ledgerx",
      "/accounts",
      "/accounts/a/b",
      "/transactions/t1",
      "javascript:alert(1)",
      `/balance/ledger?${"x".repeat(3000)}`,
    ]) {
      expect(transactionBackLink(from)).toBeNull();
    }
  });

  it("drops a fragment", () => {
    expect(transactionBackLink("/balance/ledger?page=2#row")?.href).toBe("/balance/ledger?page=2");
  });
});

describe("transactionPageHref", () => {
  it("carries the way back to another transaction", () => {
    expect(transactionPageHref("t2", null)).toBe("/transactions/t2");
    expect(transactionPageHref("t2", { href: "/balance/ledger?page=2", label: "Statement" })).toBe("/transactions/t2?from=%2Fbalance%2Fledger%3Fpage%3D2");
  });
});
