import { describe, expect, it } from "vitest";
import type { IAccountTemplate } from "@/types/accountTemplate.types";
import { NO_LINKED_ACCOUNT } from "@/zod/category.validation";
import { buildLinkedAccountOptions } from "./categoryOptions";

const account = (id: string, name: string, accountType: IAccountTemplate["accountType"], extra: Partial<IAccountTemplate> = {}) =>
  ({ id, name, accountType, isActive: true, children: [], ...extra }) as IAccountTemplate;

const templates = [
  account("rent", "Rent Expense", "EXPENSE"),
  account("loan", "Loan Payable", "LIABILITY"),
  account("bank", "Bank", "ASSET", { children: [account("bkash", "bKash", "ASSET")] }),
  account("old", "Old Expense", "EXPENSE", { isActive: false }),
];

describe("buildLinkedAccountOptions", () => {
  it("starts with 'Not linked', then the category's own direction, then the rest by type", () => {
    const options = buildLinkedAccountOptions(templates, "EXPENSE");

    expect(options.map((option) => option.value)).toEqual([NO_LINKED_ACCOUNT, "rent", "loan", "bank", "bkash"]);
    expect(options[2].label).toBe("Loan Payable (Liability)");
  });

  it("includes sub-accounts", () => {
    expect(buildLinkedAccountOptions(templates, "INCOME").some((option) => option.value === "bkash")).toBe(true);
  });

  it("keeps an inactive account only when it's the current link", () => {
    expect(buildLinkedAccountOptions(templates, "EXPENSE").some((option) => option.value === "old")).toBe(false);
    expect(buildLinkedAccountOptions(templates, "EXPENSE", "old").some((option) => option.value === "old")).toBe(true);
  });
});
